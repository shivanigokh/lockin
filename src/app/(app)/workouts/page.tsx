import type { Metadata } from "next";
import { addMonths, format, parseISO } from "date-fns";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMe } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { WorkoutItem, MyTodayWorkouts } from "@/components/tracking/my-today-workouts";
import { iso, monthRange } from "@/lib/dates";
import { fmtNum } from "@/lib/utils";

export const metadata: Metadata = { title: "My workouts" };

export default async function WorkoutsPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const me = await getMe();
  const anchor = m && /^\d{4}-\d{2}$/.test(m) ? `${m}-01` : me.today;
  const { from, to } = monthRange(anchor);
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("id, activity_type, performed_on, duration_min, distance_km, note, visibility")
    .eq("user_id", me.user.id)
    .gte("performed_on", from)
    .lte("performed_on", to)
    .order("performed_on", { ascending: false })
    .order("created_at", { ascending: false });
  const ws = data ?? [];
  const prev = format(addMonths(parseISO(anchor), -1), "yyyy-MM");
  const next = format(addMonths(parseISO(anchor), 1), "yyyy-MM");
  const isCurrent = iso(parseISO(anchor)).slice(0, 7) === me.today.slice(0, 7);

  return (
    <Page className="max-w-3xl">
      <PageHeader label="receipts" title="My workouts" sub="Edit or delete anything you've logged. Private workouts (lock icon) never leave this page." />
      <Card className="mb-5">
        <MyTodayWorkouts workouts={[]} today={me.today} defaultVisibility={me.settings.default_workout_visibility} />
      </Card>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/workouts?m=${prev}`} className="rounded-xl border border-line p-2 text-muted hover:text-ink" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h2 className="min-w-36 text-center font-display text-xl font-semibold tracking-tight">{format(parseISO(anchor), "MMM yyyy")}</h2>
          {!isCurrent ? (
            <Link href={`/workouts?m=${next}`} className="rounded-xl border border-line p-2 text-muted hover:text-ink" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
        <span className="font-mono text-xs text-muted">
          {ws.length} sessions · {ws.reduce((s, w) => s + w.duration_min, 0)} min · {fmtNum(ws.reduce((s, w) => s + Number(w.distance_km ?? 0), 0))} km
        </span>
      </div>
      {ws.length ? (
        <ul className="space-y-2">
          {ws.map((w) => (
            <WorkoutItem key={w.id} w={w} today={me.today} defaultVisibility={me.settings.default_workout_visibility} showDate />
          ))}
        </ul>
      ) : (
        <Empty title="Nothing this month" body="The couch is winning. For now." />
      )}
    </Page>
  );
}
