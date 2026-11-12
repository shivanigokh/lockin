import type { Metadata } from "next";
import { getMe, getMyGroups } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { ActivityCalendar, calendarRange, type CalDay, type CalEvent } from "@/components/calendar/activity-calendar";
import { activity } from "@/lib/constants";
import { streak } from "@/lib/dates";

export const metadata: Metadata = { title: "My calendar" };

export default async function MyCalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; d?: string }> }) {
  const sp = await searchParams;
  const [me, groups] = await Promise.all([getMe(), getMyGroups()]);
  const view = sp.view === "week" ? "week" : "month";
  const anchor = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : me.today;
  const { from, to } = calendarRange(view, anchor);
  const supabase = await createClient();

  const [{ data: workouts }, { data: habits }, { data: completions }, { data: streakRows }, { data: challenges }] = await Promise.all([
    supabase.from("workouts").select("performed_on, activity_type, duration_min").eq("user_id", me.user.id).gte("performed_on", from).lte("performed_on", to),
    supabase.from("daily_habits").select("id").eq("user_id", me.user.id).eq("archived", false),
    supabase.from("habit_completions").select("completed_on, habit_id").eq("user_id", me.user.id).gte("completed_on", from).lte("completed_on", to),
    supabase.from("workouts").select("performed_on").eq("user_id", me.user.id).order("performed_on", { ascending: false }).limit(400),
    supabase
      .from("challenge_participants")
      .select("challenge:group_challenges!inner(title, start_date, end_date, group_id)")
      .eq("user_id", me.user.id),
  ]);

  const activeHabits = new Set((habits ?? []).map((h) => h.id));
  const total = activeHabits.size;
  const days: Record<string, CalDay> = {};
  for (const w of workouts ?? []) {
    (days[w.performed_on] ??= { entries: [] }).entries.push({ type: w.activity_type, label: activity(w.activity_type).label, minutes: w.duration_min });
  }
  const perDay = new Map<string, number>();
  for (const c of completions ?? []) if (activeHabits.has(c.habit_id)) perDay.set(c.completed_on, (perDay.get(c.completed_on) ?? 0) + 1);
  for (const [d, n] of perDay) {
    const cell = (days[d] ??= { entries: [] });
    cell.habitsDone = n;
    cell.habitsTotal = total;
    cell.allHabits = n >= total && total > 0;
  }
  const events: CalEvent[] = [];
  const groupIds = new Set(groups.map((g) => g.id));
  for (const row of challenges ?? []) {
    const c = row.challenge as unknown as { title: string; start_date: string; end_date: string; group_id: string };
    if (!groupIds.has(c.group_id)) continue;
    if (c.start_date >= from && c.start_date <= to) events.push({ date: c.start_date, label: c.title, kind: "start" });
    if (c.end_date >= from && c.end_date <= to && c.end_date !== c.start_date) events.push({ date: c.end_date, label: c.title, kind: "end" });
  }
  const s = streak(new Set((streakRows ?? []).map((r) => r.performed_on)), me.today);

  return (
    <Page>
      <PageHeader label="// just you" title="My calendar" sub="All your workouts (private ones too), daily habit scores and the challenges you've joined." />
      <Card>
        <ActivityCalendar basePath="/calendar" view={view} anchor={anchor} today={me.today} days={days} events={events} showHabits streak={s} />
      </Card>
    </Page>
  );
}
