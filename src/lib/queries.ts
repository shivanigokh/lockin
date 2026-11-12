import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { HabitRow } from "@/components/tracking/habit-checklist";

export async function getMyHabitsFor(userId: string, day: string): Promise<HabitRow[]> {
  const supabase = await createClient();
  const [{ data: habits }, { data: done }] = await Promise.all([
    supabase.from("daily_habits").select("id, name, icon, visible_to_groups").eq("user_id", userId).eq("archived", false).order("sort_order"),
    supabase.from("habit_completions").select("habit_id").eq("user_id", userId).eq("completed_on", day),
  ]);
  const doneSet = new Set((done ?? []).map((d) => d.habit_id));
  return (habits ?? []).map((h) => ({ ...h, done: doneSet.has(h.id) }));
}

export async function getActiveInviteCode(groupId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_invites")
    .select("code, expires_at, max_uses, use_count")
    .eq("group_id", groupId)
    .eq("status", "active")
    .is("invited_user_id", null)
    .order("created_at", { ascending: true });
  const now = Date.now();
  return (
    (data ?? []).find(
      (i) => (!i.expires_at || new Date(i.expires_at).getTime() > now) && (i.max_uses === null || i.use_count < i.max_uses),
    )?.code ?? null
  );
}
