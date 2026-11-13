import type { Metadata } from "next";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { Lock, ShieldCheck } from "lucide-react";
import { getMe } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { HabitTrendChart, MeasurementChart, WeeklyWorkoutsChart, WeightChart } from "@/components/charts/health-charts";
import { HealthProfileForm, MeasurementForm, MeasurementTable, NotesPanel, WeightForm, WeightList } from "@/components/health/health-forms";
import { ACTIVITIES } from "@/lib/constants";
import { cmTo, kgTo, round1, type LengthUnit, type WeightUnit } from "@/lib/units";
import { daysBetween, iso, monthRange, streak } from "@/lib/dates";
import { fmtNum } from "@/lib/utils";

export const metadata: Metadata = { title: "My health" };

export default async function MyHealthPage() {
  const me = await getMe();
  const supabase = await createClient();
  const wu = me.settings.weight_unit as WeightUnit;
  const lu = me.settings.length_unit as LengthUnit;
  const today = me.today;
  const twelveWeeksAgo = iso(addDays(startOfWeek(parseISO(today), { weekStartsOn: 1 }), -7 * 11));
  const thirtyAgo = iso(addDays(parseISO(today), -29));
  const month = monthRange(today);

  const [hp, weights, measurements, notes, workouts, habits, completions, goals] = await Promise.all([
    supabase.from("private_health_profiles").select("*").eq("user_id", me.user.id).maybeSingle(),
    supabase.from("weight_entries").select("id, entry_date, weight_kg").eq("user_id", me.user.id).order("entry_date", { ascending: false }).limit(400),
    supabase.from("body_measurements").select("*").eq("user_id", me.user.id).order("measured_on", { ascending: false }).limit(200),
    supabase.from("health_notes").select("id, body, created_at").eq("user_id", me.user.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("workouts").select("performed_on, activity_type, duration_min, distance_km").eq("user_id", me.user.id).gte("performed_on", twelveWeeksAgo < month.from ? twelveWeeksAgo : month.from),
    supabase.from("daily_habits").select("id").eq("user_id", me.user.id).eq("archived", false),
    supabase.from("habit_completions").select("completed_on, habit_id").eq("user_id", me.user.id).gte("completed_on", thirtyAgo),
    supabase.rpc("my_goals", { p_today: today }),
  ]);

  const profile = hp.data ?? { height_cm: null, starting_weight_kg: null, target_weight_kg: null, health_goals: null };
  const w = (weights.data ?? []).map((x) => ({ ...x, weight_kg: Number(x.weight_kg) }));
  const current = w[0]?.weight_kg ?? null;
  const start = profile.starting_weight_kg != null ? Number(profile.starting_weight_kg) : (w.at(-1)?.weight_kg ?? null);
  const target = profile.target_weight_kg != null ? Number(profile.target_weight_kg) : null;
  const change = current != null && start != null ? current - start : null;
  const toTarget = current != null && start != null && target != null && start !== target ? Math.max(0, Math.min(100, ((start - current) / (start - target)) * 100)) : null;

  // weekly workouts for 12 weeks
  const ws = workouts.data ?? [];
  const weeks: { week: string; workouts: number; minutes: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const wk = iso(addDays(startOfWeek(parseISO(today), { weekStartsOn: 1 }), -7 * i));
    const end = iso(addDays(parseISO(wk), 6));
    const inWeek = ws.filter((x) => x.performed_on >= wk && x.performed_on <= end);
    weeks.push({ week: wk, workouts: inWeek.length, minutes: inWeek.reduce((s, x) => s + x.duration_min, 0) });
  }
  const activeWeeks = weeks.filter((x) => x.workouts > 0).length;
  const workoutDays = new Set(ws.map((x) => x.performed_on));
  const currentStreak = streak(workoutDays, today);

  // this month
  const monthWs = ws.filter((x) => x.performed_on >= month.from && x.performed_on <= month.to);
  const byType = ACTIVITIES.map((a) => ({
    ...a,
    n: monthWs.filter((x) => x.activity_type === a.value).length,
    km: monthWs.filter((x) => x.activity_type === a.value).reduce((s, x) => s + Number(x.distance_km ?? 0), 0),
  })).filter((a) => a.n > 0);

  // habit trend
  const habitTotal = habits.data?.length ?? 0;
  const activeHabitIds = new Set((habits.data ?? []).map((h) => h.id));
  const perDay = new Map<string, number>();
  (completions.data ?? []).forEach((c) => activeHabitIds.has(c.habit_id) && perDay.set(c.completed_on, (perDay.get(c.completed_on) ?? 0) + 1));
  const habitTrend = daysBetween(thirtyAgo, today).map((d) => ({ date: d, pct: habitTotal ? Math.round(((perDay.get(d) ?? 0) / habitTotal) * 100) : 0 }));
  const habitAvg = habitTrend.length ? Math.round(habitTrend.reduce((s, x) => s + x.pct, 0) / habitTrend.length) : 0;

  const goalData = (goals.data ?? []).filter((g) => !g.archived).map((g) => ({ name: g.title, pct: g.pct }));

  const ms = (measurements.data ?? []) as unknown as ({ id: string; measured_on: string } & Record<string, number | string | null>)[];
  const msChart = [...ms].reverse().map((m) => ({
    date: m.measured_on,
    waist: m.waist_cm == null ? null : round1(cmTo(Number(m.waist_cm), lu)),
    hips: m.hips_cm == null ? null : round1(cmTo(Number(m.hips_cm), lu)),
    chest: m.chest_cm == null ? null : round1(cmTo(Number(m.chest_cm), lu)),
    bodyfat: m.body_fat_pct == null ? null : Number(m.body_fat_pct),
  }));

  return (
    <Page>
      <PageHeader label="the vault" title="My health" sub="Only you can see this page. Not your squads, not your squad admins, not us showing off at parties.">
        <Badge color="var(--color-pink)">
          <Lock className="h-3 w-3" /> private
        </Badge>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-5 sm:gap-3 lg:grid-cols-4">
        <BigStat label="current" value={current != null ? `${fmtNum(round1(kgTo(current, wu)))}` : "–"} unit={wu} color="var(--color-lime)" />
        <BigStat label="change since start" value={change != null ? `${change > 0 ? "+" : ""}${fmtNum(round1(kgTo(change, wu)))}` : "–"} unit={wu} color="var(--color-lavender)" />
        <BigStat label="target" value={target != null ? fmtNum(round1(kgTo(target, wu))) : "–"} unit={wu} color="var(--color-pink)" />
        <BigStat label="height" value={profile.height_cm != null ? fmtNum(round1(cmTo(Number(profile.height_cm), lu))) : "–"} unit={lu} color="var(--color-cyan)" />
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader label="weight history" title="The trend, not the day" />
          {toTarget != null ? (
            <div className="mb-4">
              <div className="mb-1 flex justify-between font-mono text-xs text-muted">
                <span>progress to target</span>
                <span className="text-pink">{Math.round(toTarget)}%</span>
              </div>
              <ProgressBar value={toTarget} color="var(--color-pink)" />
            </div>
          ) : null}
          <WeightChart data={[...w].reverse().map((x) => ({ date: x.entry_date, value: round1(kgTo(x.weight_kg, wu)) }))} target={target != null ? round1(kgTo(target, wu)) : null} unit={wu} />
          <div className="mt-4 border-t border-line/60 pt-4 sm:mt-5 sm:pt-5">
            <WeightForm today={today} wu={wu} />
          </div>
        </Card>
        <Card>
          <CardHeader label="check-ins" title="Weigh-ins" />
          <WeightList entries={w} wu={wu} />
        </Card>
      </div>

      <h2 className="display mb-3 mt-8 text-2xl sm:mb-4 sm:mt-10 sm:text-3xl">Progress</h2>
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader label="workout consistency · 12 weeks" title={`${activeWeeks}/12 active weeks`} action={<Badge color="var(--color-lime)">streak {currentStreak}d</Badge>} />
          <WeeklyWorkoutsChart data={weeks} />
        </Card>
        <Card>
          <CardHeader label="habit completion · 30 days" title={`${habitAvg}% average`} />
          <HabitTrendChart data={habitTrend} />
        </Card>
        <Card>
          <CardHeader label={`monthly summary · ${format(parseISO(today), "MMMM")}`} title={`${monthWs.length} workouts · ${monthWs.reduce((s, x) => s + x.duration_min, 0)} min`} />
          {byType.length ? (
            <ul className="space-y-2.5">
              {byType.map((a) => (
                <li key={a.value} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#141218]" style={{ background: a.color }}>
                    <a.icon className="h-4 w-4" />
                  </span>
                  <span className="wrap-text flex-1 text-sm font-semibold">{a.label}</span>
                  <span className="whitespace-nowrap font-mono text-xs text-muted">
                    {a.n}× {a.km ? `· ${fmtNum(a.km, 1)} km` : ""}
                  </span>
                  <div className="w-14 shrink-0 sm:w-24">
                    <ProgressBar value={(a.n / Math.max(...byType.map((b) => b.n))) * 100} size="sm" color={a.color} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nothing logged this month yet. {"Be less of a couch creature."}</p>
          )}
        </Card>
        <Card>
          <CardHeader label="goal completion" title={goalData.length ? `${goalData.filter((g) => g.pct >= 100).length}/${goalData.length} done` : "No goals yet"} />
          {goalData.length ? (
            <ul className="space-y-3">
              {goalData.map((g, i) => (
                <li key={i}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="wrap-text font-semibold">{g.name}</span>
                    <span className="shrink-0 font-mono text-xs text-pink">{Math.round(g.pct)}%</span>
                  </div>
                  <ProgressBar value={g.pct} size="sm" color={g.pct >= 100 ? "var(--color-lime)" : "var(--color-pink)"} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Set some in My goals.</p>
          )}
        </Card>
      </div>

      <h2 className="display mb-3 mt-8 text-2xl sm:mb-4 sm:mt-10 sm:text-3xl">Body & fitness</h2>
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader label="profile" title="Baseline" />
          <HealthProfileForm initial={{ ...profile, height_cm: profile.height_cm != null ? Number(profile.height_cm) : null, starting_weight_kg: profile.starting_weight_kg != null ? Number(profile.starting_weight_kg) : null, target_weight_kg: target }} wu={wu} lu={lu} />
        </Card>
        <Card>
          <CardHeader label="notes" title="Dear diary" />
          <NotesPanel notes={notes.data ?? []} />
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader label="measurements" title="Optional, private, yours" />
          <MeasurementChart
            data={msChart}
            keys={[
              { key: "waist", label: `waist ${lu}`, color: "#979aff" },
              { key: "hips", label: `hips ${lu}`, color: "#ff6b57" },
              { key: "chest", label: `chest ${lu}`, color: "#7fd3e6" },
              { key: "bodyfat", label: "body fat %", color: "#c6c7ff" },
            ]}
          />
          <div className="mt-4 border-t border-line/60 pt-4 sm:mt-5 sm:pt-5">
            <MeasurementForm today={today} lu={lu} />
          </div>
          <div className="mt-6">
            <MeasurementTable rows={ms} lu={lu} />
          </div>
        </Card>
      </div>

      <p className="mt-8 flex items-center gap-2 text-xs text-faint">
        <ShieldCheck className="h-4 w-4" /> Protected by row-level security: the database only returns these rows to your account.
      </p>
    </Page>
  );
}

function BigStat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="card px-3 py-2.5 sm:p-4">
      <div className="label-mono text-[10px]">{label}</div>
      <div className="mt-0.5 font-display text-2xl font-bold tabular-nums sm:mt-1 sm:text-4xl" style={{ color }}>
        {value}
        {value !== "–" ? <span className="ml-1 font-mono text-sm font-normal text-muted">{unit}</span> : null}
      </div>
    </div>
  );
}
