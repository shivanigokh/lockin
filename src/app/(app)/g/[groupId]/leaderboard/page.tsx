import type { Metadata } from "next";
import { Crown, Lock } from "lucide-react";
import { getGroup } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress";
import { SegmentLinks } from "@/components/ui/tabs";
import { Empty } from "@/components/ui/empty";
import { AWARDS, COPY, MIN_MEMBERS } from "@/lib/constants";
import { cn, displayName } from "@/lib/utils";
import { LeaderboardChart } from "@/components/charts/leaderboard-chart";

export const metadata: Metadata = { title: "Leaderboard" };

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ period?: string; by?: string }>;
}) {
  const { groupId } = await params;
  const sp = await searchParams;
  const period = PERIODS.some((p) => p.value === sp.period) ? sp.period! : "week";
  const by = sp.by === "minutes" ? "minutes" : "workouts";
  const { group, me } = await getGroup(groupId);
  const supabase = await createClient();

  if (group.member_count < MIN_MEMBERS) {
    return (
      <Page className="max-w-3xl">
        <PageHeader label={`// ${group.name}`} title="Leaderboard" />
        <Empty title="Locked until 3 members" body={`Competing with yourself is called "journaling". Invite ${MIN_MEMBERS - group.member_count} more to unlock.`} />
      </Page>
    );
  }

  const [{ data: rows }, { data: awards }] = await Promise.all([
    supabase.rpc("group_leaderboard", { p_group: groupId, p_period: period, p_today: me.today }),
    supabase.rpc("group_awards", { p_group: groupId, p_today: me.today }),
  ]);
  const list = [...(rows ?? [])].sort((a, b) =>
    by === "minutes" ? b.active_minutes - a.active_minutes || b.workouts - a.workouts : a.rank - b.rank,
  );
  const top = by === "minutes" ? Math.max(1, ...list.map((r) => r.active_minutes)) : Math.max(1, ...list.map((r) => r.workouts));
  let rank = 0;
  let prev: number | null = null;
  const ranked = list.map((r, i) => {
    const v = by === "minutes" ? r.active_minutes : r.workouts;
    if (v !== prev) rank = i + 1;
    prev = v;
    return { ...r, value: v, place: rank };
  });
  const mine = ranked.find((r) => r.user_id === me.user.id);

  return (
    <Page>
      <PageHeader label={`// ${group.name}`} title="Leaderboard" sub={`${COPY.leaderboard} But your workout count is. One session = one workout. Never weight, calories or looks.`} />

      <div className="mb-4 flex flex-wrap gap-2 sm:mb-5">
        <SegmentLinks param="period" options={PERIODS} defaultValue="week" />
        <SegmentLinks param="by" options={[{ value: "workouts", label: "Sessions" }, { value: "minutes", label: "Minutes" }]} defaultValue="workouts" />
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            label={by === "minutes" ? "ranked by active minutes" : "ranked by workout sessions"}
            title={mine ? `You're #${mine.place} of ${ranked.length}` : "Rankings"}
          />
          <ol className="space-y-2">
            {ranked.map((r) => {
              const isMe = r.user_id === me.user.id;
              return (
                <li
                  key={r.user_id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-2.5 py-2.5 transition sm:rounded-2xl sm:px-3 sm:py-3",
                    isMe ? "border-lime/40 bg-lime/5" : "border-transparent bg-surface-2 sm:border-line",
                  )}
                >
                  <span className={cn("w-6 shrink-0 text-center font-display text-xl font-black sm:w-7 sm:text-2xl", r.place === 1 && r.value > 0 ? "text-lime" : "text-faint")}>
                    {r.place}
                  </span>
                  <span className="relative">
                    <Avatar name={displayName(r)} src={r.avatar_url} seed={r.user_id} size={34} />
                    {r.place === 1 && r.value > 0 ? <Crown className="absolute -right-1.5 -top-2.5 h-4 w-4 rotate-12 text-lime" /> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="wrap-text text-sm font-bold">{isMe ? "You" : displayName(r)}</div>
                    <ProgressBar value={(r.value / top) * 100} size="sm" color={isMe ? "var(--color-lime)" : "var(--color-lavender)"} className="mt-1.5" />
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-lg font-bold tabular-nums">{r.workouts}</div>
                    <div className="text-[11px] text-muted">{r.active_minutes} min</div>
                  </div>
                </li>
              );
            })}
          </ol>
          {ranked.every((r) => r.value === 0) ? (
            <p className="mt-4 text-center text-sm text-muted">Nobody has logged anything {period === "today" ? "today" : "yet"}. First one wins by default.</p>
          ) : null}
        </Card>

        <div className="space-y-4 sm:space-y-5">
          <Card>
            <CardHeader label="rotating awards" title="Hall of fame" />
            <ul className="space-y-2">
              {Object.entries(AWARDS).map(([key, a]) => {
                const w = awards?.find((x) => x.award === key);
                return (
                  <li key={key} className="flex items-center gap-3 rounded-xl bg-surface-2 p-2.5 sm:rounded-2xl sm:border sm:border-line sm:p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl" style={{ background: `color-mix(in srgb, ${a.color} 15%, transparent)`, color: a.color }}>
                      <a.icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="label-mono text-[10px]" style={{ color: a.color }}>
                        {a.label}
                      </div>
                      {w ? (
                        <>
                          <div className="wrap-text text-sm font-bold">{w.user_id === me.user.id ? "You" : displayName(w)}</div>
                          <div className="wrap-text text-xs text-muted">{w.detail}</div>
                        </>
                      ) : (
                        <div className="text-sm text-faint">Up for grabs. {a.blurb}.</div>
                      )}
                    </div>
                    {w ? <Avatar name={displayName(w)} src={w.avatar_url} seed={w.user_id} size={30} /> : null}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
              <Lock className="h-3 w-3" /> Awards recalculate from squad-visible workouts.
            </p>
          </Card>
          <Card className="hidden sm:block">
            <CardHeader label="visualised" title="Who's carrying" />
            <LeaderboardChart
              data={ranked.map((r) => ({ name: r.user_id === me.user.id ? "You" : displayName(r), value: r.value, me: r.user_id === me.user.id }))}
              unit={by === "minutes" ? "min" : "workouts"}
            />
          </Card>
        </div>
      </div>
    </Page>
  );
}
