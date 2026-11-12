import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getMe } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TypeChart, UsageChart } from "@/components/charts/usage-chart";
import { activity, MIN_MEMBERS } from "@/lib/constants";
import { SquadBadge } from "@/components/shell/squad-switcher";
import { Avatar } from "@/components/ui/avatar";
import { displayName } from "@/lib/utils";
import { relTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Usage", robots: { index: false } };

type Stats = Record<string, number> & {
  workouts_by_type: Record<string, number>;
  daily: { date: string; signups: number; active: number; workouts: number }[];
};

export default async function AdminPage() {
  const me = await getMe();
  const supabase = await createClient();
  // The database decides: admin_usage_stats() raises for anyone not on the owner list.
  const [{ data, error }, { data: squads }] = await Promise.all([
    supabase.rpc("admin_usage_stats", { p_today: me.today }),
    supabase.rpc("admin_squads", { p_today: me.today }),
  ]);
  if (error || !data) notFound();
  const s = data as unknown as Stats;

  const tiles: [string, number | string, string, string?][] = [
    ["total users", s.users_total, "var(--color-lime)", `${s.users_confirmed} confirmed email`],
    ["new this week", s.signups_7d, "var(--color-pink)", "sign-ups, last 7 days"],
    ["active this week", s.active_7d, "var(--color-lavender)", `${s.active_today} today · ${s.active_30d} in 30 days`],
    ["signed in this week", s.signins_7d, "var(--color-cyan)"],
    ["squads", s.squads_total, "var(--color-orange)", `${s.squads_active} unlocked (3+) · ${s.squads_full} full`],
    ["in a squad", s.users_in_a_squad, "var(--color-lime)", `avg squad size ${s.avg_squad_size}`],
    ["workouts", s.workouts_total, "var(--color-pink)", `${s.workouts_7d} this week · ${s.minutes_7d} min`],
    ["habit check-ins", s.habit_checks_7d, "var(--color-lavender)", "last 7 days"],
    ["goals", s.goals_total, "var(--color-cyan)", `${s.goals_shared} shared with squads`],
    ["challenges", s.challenges_total, "var(--color-orange)", `${s.challenges_live} live now`],
    ["feed messages", s.messages_7d, "var(--color-lime)", "last 7 days"],
  ];
  const types = Object.entries(s.workouts_by_type ?? {})
    .map(([k, v]) => ({ name: activity(k).label, value: Number(v), color: activity(k).color }))
    .sort((a, b) => b.value - a.value);

  return (
    <Page>
      <PageHeader label="// owner only" title="Usage" sub="How many people are locking in, and which squads exist. No emails, health data, goals or messages.">
        <Badge color="var(--color-lime)">
          <ShieldCheck className="h-3 w-3" /> admin
        </Badge>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {tiles.map(([label, value, color, sub]) => (
          <div key={label} className="card p-4">
            <div className="label-mono text-[10px]">{label}</div>
            <div className="mt-1 font-display text-4xl font-black tabular-nums" style={{ color }}>
              {value}
            </div>
            {sub ? <div className="mt-1 text-xs text-muted">{sub}</div> : null}
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader label="last 30 days" title="Sign-ups, active users, workouts" />
          <UsageChart data={s.daily} />
          <p className="mt-2 text-xs text-faint">&ldquo;Active&rdquo; = logged a workout or ticked a habit that day.</p>
        </Card>
        <Card>
          <CardHeader label="all time" title="Workouts by type" />
          <TypeChart data={types} />
        </Card>
      </div>

      <h2 className="display mb-4 mt-10 text-3xl">Squads ({squads?.length ?? 0})</h2>
      {squads?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {squads.map((g) => {
            const members = (g.members as { username: string; display_name: string | null; avatar_url: string | null; role: string; joined_at: string }[]) ?? [];
            return (
              <Card key={g.group_id}>
                <div className="mb-3 flex items-center gap-3">
                  <SquadBadge g={{ icon: g.icon, color: g.color }} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="wrap-text font-bold">{g.name}</div>
                    <div className="label-mono text-[10px]">
                      {g.member_count}/10 · {g.member_count < MIN_MEMBERS ? "filling" : "active"} · created {relTime(g.created_at)}
                    </div>
                  </div>
                  <Badge color="var(--color-lavender)">{g.workouts_7d} workouts/wk</Badge>
                </div>
                <ul className="space-y-1.5">
                  {members.map((m) => (
                    <li key={m.username} className="flex items-center gap-2.5 text-sm">
                      <Avatar name={displayName(m)} src={m.avatar_url} seed={m.username} size={24} />
                      <span className="min-w-0 flex-1 wrap-text">
                        <span className="font-semibold">{displayName(m)}</span> <span className="text-muted">@{m.username}</span>
                      </span>
                      {m.role === "admin" ? <Badge color="var(--color-lime)">admin</Badge> : null}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted">No squads yet.</p>
      )}
    </Page>
  );
}
