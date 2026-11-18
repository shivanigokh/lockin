import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { todayIn } from "@/lib/dates";

export const ACTIVE_GROUP_COOKIE = "lockin_squad";

/**
 * The signed-in user, from the verified session JWT. getClaims() checks the
 * token's signature locally when the project uses asymmetric signing keys
 * (no network round trip to Supabase Auth); with legacy shared-secret keys it
 * falls back to getUser(), so it is never less safe than before.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined };
});

export const requireUser = cache(async () => {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
});

export const getMe = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
  ]);
  if (!profile || !settings) redirect("/login");
  return { user, profile, settings, today: todayIn(settings.timezone) };
});

export type MyGroup = {
  id: string;
  name: string;
  icon: string;
  color: string;
  member_count: number;
  role: "admin" | "member";
};

export const getMyGroups = cache(async (): Promise<MyGroup[]> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("role, joined_at, groups!inner(id, name, icon, color, member_count)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });
  return (data ?? []).map((r) => ({ ...(r.groups as unknown as Omit<MyGroup, "role">), role: r.role }));
});

export const getGroup = cache(async (groupId: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) notFound();
  const user = await requireUser();
  const supabase = await createClient();
  // one round trip instead of three: profile, group and membership load together
  const [me, { data: group }, { data: membership }] = await Promise.all([
    getMe(),
    supabase.from("groups").select("*").eq("id", groupId).maybeSingle(),
    supabase.from("group_members").select("role").eq("group_id", groupId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!group || !membership) notFound();
  return { group, isAdmin: membership.role === "admin", me };
});

export async function getActiveGroupId() {
  const c = await cookies();
  return c.get(ACTIVE_GROUP_COOKIE)?.value ?? null;
}

export const getUnreadCount = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);
  return count ?? 0;
});
