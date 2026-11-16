import { NextResponse, type NextRequest } from "next/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { normaliseIngest } from "@/lib/ingest";

// Receives data from the user's iOS Shortcut (Apple Health workouts and daily
// calories). Authenticated by a personal sync key, not a session: the key is
// checked inside the ingest_health_items() database function, using only the
// public anon key.
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }
  const token = auth.replace(/^Bearer\s+/i, "").trim() || String((body as { key?: unknown })?.key ?? "");
  if (!token) return NextResponse.json({ error: "Missing sync key." }, { status: 401 });

  // "today" in UTC+14 so nobody's legit same-day data is rejected as "future"
  const today = new Date(Date.now() + 14 * 3_600_000).toISOString().slice(0, 10);
  const { items, errors } = normaliseIngest(body, today);
  if (!items.length) return NextResponse.json({ error: errors[0] ?? "Nothing to import.", errors }, { status: 400 });

  const supabase = createAnonClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("ingest_health_items", { p_token: token, p_items: items });
  if (error) {
    const bad = error.code === "28000";
    return NextResponse.json({ error: bad ? "That sync key isn't valid. Make a new one in Settings." : "Couldn't save that." }, { status: bad ? 401 : 400 });
  }
  return NextResponse.json({ ok: true, ...(data as object), skipped: errors });
}
