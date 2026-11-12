import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Swords, Trophy, Users } from "lucide-react";
import { getGroup } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { getFeed } from "@/lib/feed";
import { getActiveInviteCode, getMyHabitsFor } from "@/lib/queries";
import { Page } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress";
import { HabitChecklist } from "@/components/tracking/habit-checklist";
import { Composer, FeedList } from "@/components/feed/feed";
import { InviteLink } from "@/components/squad/invite-panel";
import { SquadBadge } from "@/components/shell/squad-switcher";
import { MyTodayWorkouts } from "@/components/tracking/my-today-workouts";
import { COPY, MIN_MEMBERS, habitIcon } from "@/lib/constants";
import { cn, displayName } from "@/lib/utils";
import { prettyDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Squad" };

const GREETINGS = [COPY.tagline, COPY.couch, COPY.hydrated, "Today's agenda: move a little.", "The couch called. Don't pick up."];

export default async function GroupDashboard({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const { group, isAdmin, me } = await getGroup(groupId);
  const supabase = await createClient();
  const today = me.today;

  const [habits, squadToday, board, feed, challenges, myWorkouts, code] = await Promise.all([
    getMyHabitsFor(me.user.id, today),
    supabase.rpc("group_habits_today", { p_group: groupId, p_today: today }),
    supabase.rpc("group_leaderboard", { p_group: groupId, p_period: "week", p_today: today }),
    getFeed(groupId, 8),
    supabase
      .from("group_challenges")
      .select("id, title, end_date, start_date")
      .eq("group_id", groupId)
      .gte("end_date", today)
      .lte("start_date", today)
      .order("end_date")
      .limit(3),
    supabase
      .from("workouts")
      .select("id, activity_type, performed_on, duration_min, distance_km, note, visibility")
      .eq("user_id", me.user.id)
      .eq("performed_on", today)
      .order("created_at", { ascending: false }),
    group.member_count < MIN_MEMBERS ? getActiveInviteCode(groupId) : Promise.resolve(null),
  ]);

  const lb = board.data ?? [];
  const squadWeek = lb.reduce((s, r) => s + r.workouts, 0);
  const myRow = lb.find((r) => r.user_id === me.user.id);
  const filling = group.member_count < MIN_MEMBERS;
  const greeting = GREETINGS[new Date(today).getDate() % GREETINGS.length];

  return (
    <Page>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <SquadBadge g={group} size={56} />
          <div className="min-w-0">
            <p className="label-mono text-lime">// {prettyDate(today)}</p>
            <h1 className="display truncate text-3xl sm:text-5xl">{group.name}</h1>
          </div>
        </div>
        <p className="label-mono hidden sm:block">{greeting}</p>
      </div>

      {filling ? (
        <Card className="mb-5 border-pink/40 bg-[color-mix(in_srgb,var(--color-pink)_6%,var(--color-surface))]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="label-mono text-pink">// squad filling · {group.member_count}/{MIN_MEMBERS} to unlock</p>
              <h2 className="mt-1 text-xl font-bold">
                Recruit {MIN_MEMBERS - group.member_count} more {MIN_MEMBERS - group.member_count === 1 ? "friend" : "friends"} to unlock leaderboards and challenges.
              </h2>
              <p className="mt-1 text-sm text-muted">You can already log workouts and tick habits. Peer pressure starts at 3.</p>
            </div>
            {code ? <InviteLink code={code} groupName={group.name} /> : (
              <Link href={`/g/${groupId}/squad`} className="text-sm text-lime hover:underline">Create an invite code →</Link>
            )}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader label="today's accountability" title="Did you though?" />
            <HabitChecklist habits={habits} day={today} shareHabits={me.settings.share_habits} />
          </Card>

          <Card>
            <CardHeader label="your workouts today" title={myWorkouts.data?.length ? "Receipts" : "Nothing logged yet"} />
            <MyTodayWorkouts workouts={myWorkouts.data ?? []} today={today} defaultVisibility={me.settings.default_workout_visibility} />
          </Card>

          <Card>
            <CardHeader
              label="squad feed"
              title="What's happening"
              action={
                <Link href={`/g/${groupId}/feed`} className="inline-flex items-center gap-1 text-xs text-muted hover:text-lime">
                  All <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <Composer groupId={groupId} />
            <FeedList items={feed} meId={me.user.id} groupId={groupId} isAdmin={isAdmin} />
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader label="this week" title="Squad pulse" />
            <div className="grid grid-cols-2 gap-3">
              <Stat value={squadWeek} label="squad workouts" color="var(--color-lime)" />
              <Stat value={myRow?.workouts ?? 0} label="yours" color="var(--color-pink)" sub={myRow && !filling ? `#${myRow.rank} of ${lb.length}` : undefined} />
            </div>
            {!filling ? (
              <ol className="mt-4 space-y-2">
                {lb.slice(0, 3).map((r, i) => (
                  <li key={r.user_id} className="flex items-center gap-3">
                    <span className={cn("w-5 font-mono text-sm", i === 0 ? "text-lime" : "text-muted")}>{r.rank}</span>
                    <Avatar name={displayName(r)} src={r.avatar_url} seed={r.user_id} size={28} />
                    <span className="flex-1 truncate text-sm font-semibold">{r.user_id === me.user.id ? "You" : displayName(r)}</span>
                    <span className="font-mono text-sm">{r.workouts}</span>
                  </li>
                ))}
              </ol>
            ) : null}
            <Link href={`/g/${groupId}/leaderboard`} className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-lime">
              <Trophy className="h-3.5 w-3.5" /> Full leaderboard
            </Link>
          </Card>

          <Card>
            <CardHeader label="squad check-ins" title="Who's locked in today" />
            <ul className="space-y-3">
              {(squadToday.data ?? []).map((m) => {
                const pct = m.total ? (m.done / m.total) * 100 : 0;
                const hs = (m.habits as { name: string; icon: string; done: boolean }[]) ?? [];
                return (
                  <li key={m.user_id}>
                    <div className="mb-1.5 flex items-center gap-2.5">
                      <Avatar name={displayName(m)} src={m.avatar_url} seed={m.user_id} size={28} />
                      <span className="flex-1 truncate text-sm font-semibold">{m.user_id === me.user.id ? "You" : displayName(m)}</span>
                      <span className="font-mono text-xs text-muted">{m.total ? `${m.done}/${m.total}` : "private"}</span>
                    </div>
                    {m.total ? (
                      <div className="flex items-center gap-2 pl-[38px]">
                        <ProgressBar value={pct} size="sm" color={pct >= 100 ? "var(--color-lime)" : "var(--color-lavender)"} className="flex-1" />
                        <span className="flex gap-0.5">
                          {hs.map((h, i) => {
                            const I = habitIcon(h.icon);
                            return <I key={i} className={cn("h-3.5 w-3.5", h.done ? "text-lime" : "text-faint")} aria-label={`${h.name}: ${h.done ? "done" : "not yet"}`} />;
                          })}
                        </span>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <CardHeader
              label="challenges"
              title={filling ? "Locked" : challenges.data?.length ? "Live now" : "None running"}
              action={
                <Link href={`/g/${groupId}/challenges`} className="inline-flex items-center gap-1 text-xs text-muted hover:text-lime">
                  All <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            {filling ? (
              <p className="text-sm text-muted">Challenges unlock at {MIN_MEMBERS} members.</p>
            ) : challenges.data?.length ? (
              <ul className="space-y-2">
                {challenges.data.map((c) => (
                  <li key={c.id}>
                    <Link href={`/g/${groupId}/challenges#${c.id}`} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition hover:border-orange">
                      <Swords className="h-4 w-4 text-orange" />
                      <span className="flex-1 truncate text-sm font-semibold">{c.title}</span>
                      <span className="label-mono text-[10px]">ends {prettyDate(c.end_date)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{isAdmin ? "Start one. Chaos is a ladder." : "Nudge an admin to start one."}</p>
            )}
          </Card>

          <Link href={`/g/${groupId}/squad`} className="card flex items-center gap-3 p-4 text-sm text-muted transition hover:text-ink">
            <Users className="h-4 w-4" /> {group.member_count}/10 members · {isAdmin ? "you're an admin" : "manage squad"}
            <ArrowRight className="ml-auto h-4 w-4" />
          </Link>
        </div>
      </div>
    </Page>
  );
}

function Stat({ value, label, color, sub }: { value: number; label: string; color: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <div className="font-display text-4xl font-black tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="label-mono mt-1 text-[10px]">{label}</div>
      {sub ? <div className="mt-1 font-mono text-xs text-ink">{sub}</div> : null}
    </div>
  );
}
