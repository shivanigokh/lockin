import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { stravaToWorkout, type StravaActivity } from "@/lib/ingest";

// Strava's OAuth app credentials (https://www.strava.com/settings/api).
// Server-only: the secret never reaches the browser.
const CLIENT_ID = process.env.STRAVA_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET ?? "";
export const stravaConfigured = () => Boolean(CLIENT_ID && CLIENT_SECRET);

export const STRAVA_SCOPE = "read,activity:read_all";
const FIRST_SYNC_DAYS = 30;
const MAX_PAGES = 3;

type DB = SupabaseClient<Database>;

export function stravaAuthorizeUrl(redirectUri: string, state: string) {
  const u = new URL("https://www.strava.com/oauth/authorize");
  u.searchParams.set("client_id", CLIENT_ID);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("approval_prompt", "auto");
  u.searchParams.set("scope", STRAVA_SCOPE);
  u.searchParams.set("state", state);
  return u.toString();
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname?: string; lastname?: string };
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...body }),
    cache: "no-store",
  });
  if (!res.ok) throw new StravaError(res.status === 400 || res.status === 401 ? "revoked" : "unavailable");
  return res.json();
}

export class StravaError extends Error {
  constructor(public kind: "revoked" | "unavailable" | "rate_limited" | "not_connected") {
    super(kind);
  }
}

/** Exchanges the OAuth code and stores the connection for the signed-in user. */
export async function connectStrava(supabase: DB, userId: string, code: string, scope: string) {
  const t = await tokenRequest({ code, grant_type: "authorization_code" });
  if (!t.athlete) throw new StravaError("unavailable");
  const name = [t.athlete.firstname, t.athlete.lastname].filter(Boolean).join(" ").slice(0, 120) || null;
  const { error } = await supabase.from("strava_connections").upsert({
    user_id: userId,
    athlete_id: t.athlete.id,
    athlete_name: name,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: new Date(t.expires_at * 1000).toISOString(),
    scope,
    last_synced_at: null,
  });
  if (error) throw error;
}

type Connection = Database["public"]["Tables"]["strava_connections"]["Row"];

async function freshToken(supabase: DB, conn: Connection) {
  if (new Date(conn.expires_at).getTime() - Date.now() > 120_000) return conn.access_token;
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: conn.refresh_token });
  await supabase
    .from("strava_connections")
    .update({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: new Date(t.expires_at * 1000).toISOString() })
    .eq("user_id", conn.user_id);
  return t.access_token;
}

/**
 * Pulls new activities since the last sync (first sync: last 30 days) into
 * `workouts` as PRIVATE rows. Strava's API terms only allow showing a user's
 * Strava data to that same user, so imports never go to squad feeds unless the
 * user changes a workout's visibility themselves.
 */
export async function syncStrava(supabase: DB, userId: string): Promise<{ added: number }> {
  const { data: conn } = await supabase.from("strava_connections").select("*").eq("user_id", userId).maybeSingle();
  if (!conn) throw new StravaError("not_connected");
  const token = await freshToken(supabase, conn);

  // re-scan two days before the last sync to catch late uploads from watches
  const since = conn.last_synced_at
    ? new Date(conn.last_synced_at).getTime() - 2 * 86_400_000
    : Date.now() - FIRST_SYNC_DAYS * 86_400_000;
  const startedAt = new Date().toISOString();
  const activities: StravaActivity[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const u = new URL("https://www.strava.com/api/v3/athlete/activities");
    u.searchParams.set("after", String(Math.floor(since / 1000)));
    u.searchParams.set("per_page", "100");
    u.searchParams.set("page", String(page));
    const res = await fetch(u, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    if (res.status === 401) throw new StravaError("revoked");
    if (res.status === 429) throw new StravaError("rate_limited");
    if (!res.ok) throw new StravaError("unavailable");
    const batch = (await res.json()) as StravaActivity[];
    activities.push(...batch);
    if (batch.length < 100) break;
  }

  let added = 0;
  if (activities.length) {
    const rows = activities.map((a) => ({ ...stravaToWorkout(a), user_id: userId, visibility: "private" as const }));
    const { data, error } = await supabase
      .from("workouts")
      .upsert(rows, { onConflict: "user_id,source,external_id", ignoreDuplicates: true })
      .select("id");
    if (error) throw error;
    added = data?.length ?? 0;
  }
  await supabase.from("strava_connections").update({ last_synced_at: startedAt }).eq("user_id", userId);
  return { added };
}

/** Revokes our access at Strava (best effort) and forgets the tokens. */
export async function disconnectStrava(supabase: DB, userId: string) {
  const { data: conn } = await supabase.from("strava_connections").select("*").eq("user_id", userId).maybeSingle();
  if (conn) {
    try {
      const token = await freshToken(supabase, conn);
      await fetch("https://www.strava.com/oauth/deauthorize", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    } catch {
      // already revoked on Strava's side; nothing to do
    }
  }
  await supabase.from("strava_connections").delete().eq("user_id", userId);
}

export function stravaErrorMessage(e: unknown) {
  if (e instanceof StravaError) {
    if (e.kind === "revoked") return "Strava access was revoked. Disconnect and connect again.";
    if (e.kind === "rate_limited") return "Strava says slow down. Try again in 15 minutes.";
    if (e.kind === "not_connected") return "Strava isn't connected.";
  }
  return "Couldn't reach Strava. Try again in a bit.";
}
