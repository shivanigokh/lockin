import type { Metadata } from "next";
import { getGroup } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { ActivityCalendar, calendarRange, type CalDay, type CalEvent } from "@/components/calendar/activity-calendar";
import { activity } from "@/lib/constants";

export const metadata: Metadata = { title: "Squad calendar" };

export default async function SquadCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ view?: string; d?: string }>;
}) {
  const { groupId } = await params;
  const sp = await searchParams;
  const { group, me } = await getGroup(groupId);
  const view = sp.view === "week" ? "week" : "month";
  const anchor = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : me.today;
  const { from, to } = calendarRange(view, anchor);
  const supabase = await createClient();

  const [{ data: rows }, { data: challenges }] = await Promise.all([
    supabase.rpc("group_calendar", { p_group: groupId, p_from: from, p_to: to }),
    supabase
      .from("group_challenges")
      .select("title, start_date, end_date")
      .eq("group_id", groupId)
      .or(`and(start_date.gte.${from},start_date.lte.${to}),and(end_date.gte.${from},end_date.lte.${to})`),
  ]);

  const days: Record<string, CalDay> = {};
  for (const r of rows ?? []) {
    (days[r.day] ??= { entries: [] }).entries.push({
      type: r.activity_type,
      label: activity(r.activity_type).label,
      minutes: r.duration_min,
      who: r.user_id === me.user.id ? "You" : r.username,
    });
  }
  const events: CalEvent[] = [];
  for (const c of challenges ?? []) {
    if (c.start_date >= from && c.start_date <= to) events.push({ date: c.start_date, label: c.title, kind: "start" });
    if (c.end_date >= from && c.end_date <= to && c.end_date !== c.start_date) events.push({ date: c.end_date, label: c.title, kind: "end" });
  }

  return (
    <Page>
      <PageHeader label={`// ${group.name}`} title="Squad calendar" sub="Everyone's squad-visible workouts and challenge dates. Private workouts never show up here." />
      <Card>
        <ActivityCalendar basePath={`/g/${groupId}/calendar`} view={view} anchor={anchor} today={me.today} days={days} events={events} />
      </Card>
    </Page>
  );
}
