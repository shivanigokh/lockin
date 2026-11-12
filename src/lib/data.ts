import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { todayIn } from "@/lib/dates";

export const ACTIVE_GROUP_COOKIE = "lockin_squad";

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
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
  const me = await getMe();
  const supabase = await createClient();
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) notFound();
  const { data: group } = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();
  if (!group) notFound();
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", me.user.id)
    .maybeSingle();
  if (!membership) notFound();
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
