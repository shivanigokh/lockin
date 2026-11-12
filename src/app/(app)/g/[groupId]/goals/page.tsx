import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";
import { getGroup } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { buttonClass } from "@/components/ui/button";
import { cn, displayName, fmtNum } from "@/lib/utils";
import { prettyDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Shared goals" };

const periodLabel = (p: string, from: string, to: string) =>
  p === "week" ? "this week" : p === "month" ? "this month" : `${prettyDate(from)} → ${prettyDate(to)}`;

export default async function SharedGoalsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const { group, me } = await getGroup(groupId);
  const supabase = await createClient();
  const { data: board } = await supabase.rpc("group_goal_board", { p_group: groupId, p_today: me.today });
  const rows = board ?? [];

  // group by member so each person is a block
  const byUser = new Map<string, typeof rows>();
  for (const r of rows) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]);
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0;

  return (
    <Page className="max-w-4xl">
      <PageHeader label={`// ${group.name}`} title="Shared goals" sub="Goals people chose to share with this squad. Only the name, target, progress and percentage show up here.">
        <Link href={`/goals?new=1&share=${groupId}`} className={buttonClass("primary")}>
          <Plus className="h-4 w-4" /> Share a goal
        </Link>
      </PageHeader>

      {rows.length ? (
        <>
          <Card className="mb-5 flex items-center gap-5">
            <div className="font-display text-6xl font-black text-lime tabular-nums">{avg}%</div>
            <div>
              <div className="label-mono">squad average</div>
              <p className="text-sm text-muted">
                {rows.filter((r) => r.pct >= 100).length} of {rows.length} shared goals smashed.
              </p>
            </div>
          </Card>
          <div className="space-y-4">
            {[...byUser.entries()].map(([uid, goals]) => {
              const p = goals[0]!;
              const isMe = uid === me.user.id;
              return (
                <Card key={uid} className={cn(isMe && "border-lime/40")}>
                  <div className="mb-4 flex items-center gap-3">
                    <Avatar name={displayName(p)} src={p.avatar_url} seed={uid} size={36} />
                    <span className="display text-xl">{isMe ? "You" : displayName(p)}</span>
                  </div>
                  <ul className="space-y-4">
                    {goals.map((g) => (
                      <li key={g.goal_id}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-3">
                          <span className="min-w-0 wrap-text font-semibold">{g.title}</span>
                          <span className={cn("font-display text-2xl font-black tabular-nums", g.pct >= 100 ? "text-lime" : "text-ink")}>{g.pct}%</span>
                        </div>
                        <ProgressBar value={g.pct} size="lg" color={g.pct >= 100 ? "var(--color-lime)" : isMe ? "var(--color-pink)" : "var(--color-lavender)"} />
                        <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-xs text-muted">
                          <span>
                            {fmtNum(g.progress)} / {fmtNum(g.target_value)} {g.unit} completed
                          </span>
                          <Badge>{periodLabel(g.period, g.period_from, g.period_to)}</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <Empty
          title="No shared goals yet"
          body="Share a goal with this squad and they'll see your percentage. Accountability is scary. Good."
          action={
            <Link href={`/goals?new=1&share=${groupId}`} className={buttonClass("primary")}>
              Share your first goal
            </Link>
          }
        />
      )}
      <p className="mt-6 flex items-center gap-2 text-xs text-faint">
        <ShieldCheck className="h-4 w-4" /> Weight goals, body measurements and private goals never appear here. The database refuses.
      </p>
    </Page>
  );
}
