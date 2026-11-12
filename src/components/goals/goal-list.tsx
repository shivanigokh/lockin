"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Lock, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Empty } from "@/components/ui/empty";
import { ProgressBar } from "@/components/ui/progress";
import { GoalForm, type GoalRow } from "./goal-form";
import { useAction } from "@/lib/use-action";
import { archiveGoal, deleteGoal, logGoalProgress } from "@/app/actions/goals";
import { GOAL_CATEGORIES, TRACKING } from "@/lib/constants";
import { cn, fmtNum } from "@/lib/utils";
import { prettyDate } from "@/lib/dates";
import type { MyGroup } from "@/lib/data";

export type GoalWithProgress = GoalRow & { archived: boolean; progress: number; pct: number; period_from: string; period_to: string };

function GoalCard({ goal, groups, today }: { goal: GoalWithProgress; groups: MyGroup[]; today: string }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const [log, logging] = useAction(logGoalProgress, { onSuccess: () => setAmount("") });
  const [archive, archiving] = useAction(archiveGoal);
  const [del, deleting] = useAction(deleteGoal);
  const sharedWith = groups.filter((g) => goal.shared_group_ids.includes(g.id));
  const done = goal.pct >= 100;

  return (
    <Card className={cn("flex flex-col", done && "border-lime/50", goal.archived && "opacity-60")}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            <Badge>{GOAL_CATEGORIES.find((c) => c.value === goal.category)?.label}</Badge>
            {sharedWith.length ? (
              <Badge color="var(--color-lavender)">
                <Users className="h-3 w-3" /> {sharedWith.map((g) => g.name).join(", ")}
              </Badge>
            ) : (
              <Badge>
                <Lock className="h-3 w-3" /> private
              </Badge>
            )}
          </div>
          <h3 className="text-lg font-bold leading-tight">{goal.title}</h3>
        </div>
        <span className={cn("font-display text-4xl font-black tabular-nums", done ? "text-lime" : "text-ink")}>{goal.pct}%</span>
      </div>
      <ProgressBar value={goal.pct} size="lg" color={done ? "var(--color-lime)" : "var(--color-pink)"} />
      <div className="mt-2 flex justify-between font-mono text-xs text-muted">
        <span>
          {fmtNum(goal.progress)} / {fmtNum(goal.target_value)} {goal.unit}
        </span>
        <span>
          {goal.period === "custom" ? `${prettyDate(goal.period_from)} → ${prettyDate(goal.period_to)}` : goal.period === "week" ? "this week" : "this month"}
        </span>
      </div>
      <p className="mt-1 text-xs text-faint">{TRACKING.find((t) => t.value === goal.tracking)?.hint}{goal.tracking !== "manual" ? " (you can also add manual adjustments)" : ""}</p>

      {!goal.archived ? (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            log(goal.id, Number(amount), today);
          }}
        >
          <Input type="number" step="any" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`+ ${goal.unit}`} className="h-9 py-1" aria-label={`Add progress in ${goal.unit}`} />
          <Button type="submit" size="sm" className="h-9" loading={logging}>
            <Plus className="h-4 w-4" /> Log
          </Button>
        </form>
      ) : null}

      <div className="mt-auto flex justify-end gap-1 pt-3">
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button variant="ghost" size="sm" loading={archiving} onClick={() => archive(goal.id, !goal.archived)}>
          {goal.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
          {goal.archived ? "Restore" : "Archive"}
        </Button>
        <Button variant="ghost" size="sm" className="hover:text-danger" loading={deleting} onClick={() => confirm("Delete this goal and its progress?") && del(goal.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit goal">
        <GoalForm groups={groups} today={today} initial={goal} onDone={() => setEditing(false)} />
      </Modal>
    </Card>
  );
}

export function GoalList({ goals, groups, today, openNew, presetShare }: { goals: GoalWithProgress[]; groups: MyGroup[]; today: string; openNew?: boolean; presetShare?: string | null }) {
  const [open, setOpen] = useState(!!openNew);
  const router = useRouter();
  useEffect(() => {
    if (openNew) router.replace("/goals", { scroll: false });
  }, [openNew, router]);
  const active = goals.filter((g) => !g.archived);
  const archived = goals.filter((g) => g.archived);

  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New goal
        </Button>
      </div>
      {active.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {active.map((g) => (
            <GoalCard key={g.id} goal={g} groups={groups} today={today} />
          ))}
        </div>
      ) : (
        <Empty title="No goals" body="Pick something small and slightly annoying. Then share it so someone notices." action={<Button onClick={() => setOpen(true)}>Set a goal</Button>} />
      )}
      {archived.length ? (
        <details className="mt-8">
          <summary className="label-mono cursor-pointer">archived ({archived.length})</summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {archived.map((g) => (
              <GoalCard key={g.id} goal={g} groups={groups} today={today} />
            ))}
          </div>
        </details>
      ) : null}
      <Modal open={open} onClose={() => setOpen(false)} title="New goal" label="// say it out loud">
        <GoalForm groups={groups} today={today} presetShare={presetShare} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
