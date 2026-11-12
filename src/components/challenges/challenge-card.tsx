"use client";
import { useState } from "react";
import { CheckCircle2, Plus, Swords, Trash2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress";
import { useAction } from "@/lib/use-action";
import { addChallengeProgress, deleteChallenge, setChallengeParticipation } from "@/app/actions/social";
import { activity, HABIT_KEYS } from "@/lib/constants";
import { cn, displayName, fmtNum } from "@/lib/utils";
import { prettyDate } from "@/lib/dates";

export type ChallengeView = {
  id: string;
  title: string;
  description: string | null;
  metric: string;
  activity_type: string | null;
  habit_key: string | null;
  scope: "individual" | "group";
  unit: string;
  target: number;
  start_date: string;
  end_date: string;
  status: "upcoming" | "active" | "ended";
  completed: boolean;
  total: number;
  joined: boolean;
  canDelete: boolean;
  board: { user_id: string; username: string; display_name: string | null; avatar_url: string | null; progress: number; pct: number }[];
};

function metricLabel(c: ChallengeView) {
  switch (c.metric) {
    case "workout_count":
      return c.activity_type ? `${activity(c.activity_type).label} sessions` : "Workouts";
    case "active_minutes":
      return c.activity_type ? `${activity(c.activity_type).label} minutes` : "Active minutes";
    case "distance_km":
      return c.activity_type ? `${activity(c.activity_type).label} km` : "Kilometres";
    case "habit_days":
      return `Days: ${HABIT_KEYS.find((h) => h.value === c.habit_key)?.label ?? c.habit_key}`;
    default:
      return "Self-reported";
  }
}

const statusColor = { upcoming: "var(--color-lavender)", active: "var(--color-lime)", ended: "var(--color-muted)" };

export function ChallengeCard({ c, groupId, meId }: { c: ChallengeView; groupId: string; meId: string }) {
  const [participate, joining] = useAction(setChallengeParticipation);
  const [remove, removing] = useAction(deleteChallenge);
  const [addProgress, adding] = useAction(addChallengeProgress, { onSuccess: () => setAmount("") });
  const [amount, setAmount] = useState("");
  const groupPct = c.target ? Math.min(100, Math.floor((c.total / c.target) * 100)) : 0;

  return (
    <Card id={c.id} className={cn("scroll-mt-24", c.status === "active" && "border-orange/40")}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge color={statusColor[c.status]}>{c.status}</Badge>
            {c.completed ? (
              <Badge color="var(--color-lime)">
                <CheckCircle2 className="h-3 w-3" /> completed
              </Badge>
            ) : null}
            <Badge>{c.scope === "group" ? "squad total" : "each person"}</Badge>
          </div>
          <h3 className="flex items-center gap-2 text-xl font-bold">
            <Swords className="h-5 w-5 shrink-0 text-orange" /> <span className="truncate">{c.title}</span>
          </h3>
          {c.description ? <p className="mt-1 text-sm text-muted">{c.description}</p> : null}
        </div>
        {c.canDelete ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete challenge"
            loading={removing}
            onClick={() => confirm(`Delete "${c.title}"?`) && remove(groupId, c.id)}
          >
            {removing ? null : <Trash2 className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 font-mono text-xs">
        <div className="rounded-xl bg-surface-2 p-2.5">
          <div className="label-mono text-[9px]">target</div>
          {fmtNum(c.target)} {c.unit}
        </div>
        <div className="rounded-xl bg-surface-2 p-2.5">
          <div className="label-mono text-[9px]">counts</div>
          <span className="line-clamp-1">{metricLabel(c)}</span>
        </div>
        <div className="rounded-xl bg-surface-2 p-2.5">
          <div className="label-mono text-[9px]">dates</div>
          {prettyDate(c.start_date).slice(4)} → {prettyDate(c.end_date).slice(4)}
        </div>
      </div>

      {c.scope === "group" ? (
        <div className="mb-4">
          <div className="mb-1 flex justify-between font-mono text-xs">
            <span>
              Squad: {fmtNum(c.total)} / {fmtNum(c.target)} {c.unit}
            </span>
            <span className="text-orange">{groupPct}%</span>
          </div>
          <ProgressBar value={groupPct} color="var(--color-orange)" size="lg" />
        </div>
      ) : null}

      <div className="label-mono mb-2 flex items-center gap-1.5">
        <Users className="h-3 w-3" /> {c.board.length} {c.board.length === 1 ? "participant" : "participants"}
      </div>
      <ul className="space-y-2.5">
        {c.board.map((b) => {
          const pct = c.scope === "group" ? (c.total ? Math.round((b.progress / c.total) * 100) : 0) : b.pct;
          return (
            <li key={b.user_id} className="flex items-center gap-2.5">
              <Avatar name={displayName(b)} src={b.avatar_url} seed={b.user_id} size={26} />
              <span className="w-20 truncate text-sm font-semibold">{b.user_id === meId ? "You" : displayName(b)}</span>
              <ProgressBar value={pct} size="sm" color={b.user_id === meId ? "var(--color-lime)" : "var(--color-lavender)"} className="flex-1" />
              <span className="w-24 text-right font-mono text-xs text-muted">
                {fmtNum(b.progress)}
                {c.scope === "individual" ? ` / ${fmtNum(c.target)} · ${b.pct}%` : ` ${c.unit}`}
              </span>
            </li>
          );
        })}
      </ul>

      {c.status !== "ended" ? (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          {c.joined ? (
            <>
              {c.metric === "manual" && c.status === "active" ? (
                <form
                  className="flex flex-1 gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    addProgress(groupId, c.id, Number(amount));
                  }}
                >
                  <Input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder={`+ ${c.unit}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-9 min-w-0 flex-1 py-1"
                    aria-label={`Add ${c.unit}`}
                    required
                  />
                  <Button size="sm" type="submit" loading={adding} className="h-9">
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </form>
              ) : (
                <span className="flex-1 text-xs text-muted">Progress updates automatically from your logs.</span>
              )}
              <Button variant="ghost" size="sm" loading={joining} onClick={() => participate(groupId, c.id, false)}>
                Leave
              </Button>
            </>
          ) : (
            <Button className="w-full" loading={joining} onClick={() => participate(groupId, c.id, true)}>
              Join challenge
            </Button>
          )}
        </div>
      ) : null}
    </Card>
  );
}
