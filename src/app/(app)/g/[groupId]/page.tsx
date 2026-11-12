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
import { COPY, MIN_MEMBERS } from "@/lib/constants";
import { displayName } from "@/lib/utils";
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
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4 sm:mb-6">
        <div className="flex min-w-0 items-center gap-4">
          <span className="hidden sm:block">
            <SquadBadge g={group} size={56} />
          </span>
          <div className="min-w-0">
            <p className="label-mono text-lime">{prettyDate(today)}</p>
            <h1 className="display wrap-text hidden text-5xl sm:block">{group.name}</h1>
            <p className="mt-1 text-sm text-muted sm:hidden">{greeting}</p>
          </div>
        </div>
        <p className="label-mono hidden sm:block">{greeting}</p>
      </div>

      {filling ? (
        <Card className="mb-4 border-pink/40 bg-[color-mix(in_srgb,var(--color-pink)_6%,var(--color-surface))] sm:mb-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="label-mono hidden text-pink sm:block">// squad filling · {group.member_count}/{MIN_MEMBERS} to unlock</p>
              <h2 className="text-base font-bold sm:mt-1 sm:text-xl">
                Invite {MIN_MEMBERS - group.member_count} more {MIN_MEMBERS - group.member_count === 1 ? "friend" : "friends"} to unlock leaderboards and challenges.
              </h2>
              <p className="mt-1 hidden text-sm text-muted sm:block">You can already log workouts and tick habits. Peer pressure starts at 3.</p>
            </div>
            {code ? <InviteLink code={code} groupName={group.name} /> : (
              <Link href={`/g/${groupId}/squad`} className="text-sm text-lime hover:underline">Create an invite code →</Link>
            )}
          </div>
        </Card>
      ) : null}

      {/* On phones the two columns collapse into one list, ordered by what you do most. */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1.35fr_1fr] lg:items-start lg:gap-5">
        <div className="contents lg:block lg:space-y-5">
          <Card className="order-1">
            <CardHeader label="today's accountability" title="Did you though?" />
            <HabitChecklist habits={habits} day={today} shareHabits={me.settings.share_habits} />
          </Card>

          <Card className="order-2">
            <CardHeader label="your workouts today" title={myWorkouts.data?.length ? "Today's workouts" : "Nothing logged yet"} />
            <MyTodayWorkouts workouts={myWorkouts.data ?? []} today={today} defaultVisibility={me.settings.default_workout_visibility} />
          </Card>

          <Card className="order-5">
            <CardHeader
              label="squad feed"
              title="What's happening"
              action={
                <Link href={`/g/${groupId}/feed`} className="inline-flex items-center gap-1 py-1 text-xs text-muted hover:text-lime">
                  All <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <Composer groupId={groupId} />
            <FeedList items={feed} meId={me.user.id} groupId={groupId} isAdmin={isAdmin} />
          </Card>
        </div>

        <div className="contents lg:block lg:space-y-5">
          <Card className="order-3">
            <CardHeader
              label="squad check-ins"
              title="Your squad today"
              action={
                <Link href={`/g/${groupId}/leaderboard`} className="inline-flex items-center gap-1 py-1 text-xs text-muted hover:text-lime">
                  <Trophy className="h-3.5 w-3.5" /> Board
                </Link>
              }
            />
            <div className="mb-4 grid grid-cols-2 gap-2">
              <Stat value={squadWeek} label="squad workouts this week" color="var(--color-lime)" />
              <Stat value={myRow?.workouts ?? 0} label={myRow && !filling ? `yours · #${myRow.rank} of ${lb.length}` : "yours this week"} color="var(--color-pink)" />
            </div>
            <ul className="space-y-3">
              {(squadToday.data ?? []).map((m) => {
                const pct = m.total ? (m.done / m.total) * 100 : 0;
                const wk = lb.find((r) => r.user_id === m.user_id)?.workouts ?? 0;
                return (
                  <li key={m.user_id} className="flex items-center gap-3">
                    <Avatar name={displayName(m)} src={m.avatar_url} seed={m.user_id} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="wrap-text text-sm font-semibold">{m.user_id === me.user.id ? "You" : displayName(m)}</span>
                        <span className="shrink-0 font-mono text-[11px] text-muted">
                          {m.total ? `${m.done}/${m.total} habits` : "habits private"} · {wk} wk
                        </span>
                      </div>
                      {m.total ? (
                        <ProgressBar value={pct} size="sm" color={pct >= 100 ? "var(--color-lime)" : "var(--color-lavender)"} className="mt-1.5" />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="order-4">
            <CardHeader
              label="challenges"
              title={filling ? "Challenges locked" : challenges.data?.length ? "Challenges live now" : "No challenges running"}
              action={
                <Link href={`/g/${groupId}/challenges`} className="inline-flex items-center gap-1 py-1 text-xs text-muted hover:text-lime">
                  All <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            {filling ? (
              <p className="text-sm text-muted">Challenges unlock at {MIN_MEMBERS} members.</p>
            ) : challenges.data?.length ? (
              <ul className="space-y-1">
                {challenges.data.map((c) => (
                  <li key={c.id}>
                    <Link href={`/g/${groupId}/challenges#${c.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-2">
                      <Swords className="h-4 w-4 shrink-0 text-orange" />
                      <span className="wrap-text flex-1 text-sm font-semibold">{c.title}</span>
                      <span className="shrink-0 text-xs text-muted">ends {prettyDate(c.end_date)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{isAdmin ? "Start one. Chaos is a ladder." : "Nudge an admin to start one."}</p>
            )}
          </Card>

          <Link href={`/g/${groupId}/squad`} className="order-6 flex items-center gap-3 px-1 py-2 text-sm text-muted transition hover:text-ink lg:rounded-[var(--radius-card)] lg:border lg:border-line lg:bg-surface lg:p-4">
            <Users className="h-4 w-4" /> {group.member_count}/10 members · {isAdmin ? "you're an admin" : "see the squad"}
            <ArrowRight className="ml-auto h-4 w-4" />
          </Link>
        </div>
      </div>
    </Page>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <div className="font-display text-3xl font-black tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}
