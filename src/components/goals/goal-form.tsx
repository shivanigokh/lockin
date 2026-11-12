"use client";
import { useState } from "react";
import { Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Segment } from "@/components/ui/tabs";
import { SquadBadge } from "@/components/shell/squad-switcher";
import { useAction } from "@/lib/use-action";
import { saveGoal, type GoalInput } from "@/app/actions/goals";
import { ACTIVITIES, GOAL_CATEGORIES, HABIT_KEYS, TRACKING, type ActivityType, type GoalCategory, type GoalPeriod, type GoalTracking } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MyGroup } from "@/lib/data";

export type GoalRow = {
  id: string;
  title: string;
  category: GoalCategory;
  tracking: GoalTracking;
  activity_type: ActivityType | null;
  habit_key: string | null;
  target_value: number;
  unit: string;
  period: GoalPeriod;
  start_date: string | null;
  end_date: string | null;
  shared_group_ids: string[];
};

const EXAMPLES: { label: string; g: Partial<GoalInput> }[] = [
  { label: "Run 10 km this month", g: { title: "Run 10 km this month", category: "running", tracking: "distance_km", activity_type: "running", target_value: 10, unit: "km", period: "month" } },
  { label: "Swim 8× this month", g: { title: "Swim 8 times this month", category: "swimming", tracking: "workout_count", activity_type: "swimming", target_value: 8, unit: "swims", period: "month" } },
  { label: "4 workouts / week", g: { title: "Complete 4 workouts this week", category: "workouts", tracking: "workout_count", activity_type: null, target_value: 4, unit: "workouts", period: "week" } },
  { label: "50k steps / week", g: { title: "Walk 50,000 steps this week", category: "steps", tracking: "manual", target_value: 50000, unit: "steps", period: "week" } },
  { label: "5 alcohol-free days", g: { title: "5 alcohol-free days this week", category: "alcohol_free", tracking: "habit_days", habit_key: "alcohol_free", target_value: 5, unit: "days", period: "week" } },
  { label: "Cook at home 4×", g: { title: "Cook at home 4 times this week", category: "cooking", tracking: "manual", target_value: 4, unit: "meals", period: "week" } },
];

export function GoalForm({
  groups,
  today,
  initial,
  presetShare,
  onDone,
}: {
  groups: MyGroup[];
  today: string;
  initial?: GoalRow;
  presetShare?: string | null;
  onDone?: () => void;
}) {
  const [g, setG] = useState<GoalInput>({
    title: initial?.title ?? "",
    category: initial?.category ?? "workouts",
    tracking: initial?.tracking ?? "workout_count",
    activity_type: initial?.activity_type ?? null,
    habit_key: initial?.habit_key ?? null,
    target_value: initial?.target_value ?? 4,
    unit: initial?.unit ?? "workouts",
    period: initial?.period ?? "week",
    start_date: initial?.start_date ?? today,
    end_date: initial?.end_date ?? null,
    share_with: initial?.shared_group_ids ?? (presetShare ? [presetShare] : []),
  });
  const set = (p: Partial<GoalInput>) => setG((x) => ({ ...x, ...p }));
  const [save, pending] = useAction(saveGoal, { onSuccess: () => onDone?.() });
  const isWeight = g.category === "weight";
  const shared = (g.share_with ?? []).length > 0 && !isWeight;
  const [mode, setMode] = useState<"private" | "shared">(shared ? "shared" : "private");
  const usesActivity = ["workout_count", "distance_km", "active_minutes"].includes(g.tracking);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        save(initial?.id ?? null, { ...g, share_with: mode === "shared" && !isWeight ? g.share_with : [] });
      }}
    >
      {!initial ? (
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button key={ex.label} type="button" onClick={() => set(ex.g)} className="rounded-full border border-line px-2.5 py-1 font-mono text-[10px] uppercase text-muted transition hover:border-pink hover:text-pink cursor-pointer">
              {ex.label}
            </button>
          ))}
        </div>
      ) : null}

      <Field label="Goal" htmlFor="g-title">
        <Input id="g-title" required maxLength={80} value={g.title} onChange={(e) => set({ title: e.target.value })} placeholder="Run 10 km this month" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category" htmlFor="g-cat">
          <Select id="g-cat" value={g.category} onChange={(e) => set({ category: e.target.value as GoalCategory })}>
            {GOAL_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Track progress by" htmlFor="g-track" hint={TRACKING.find((t) => t.value === g.tracking)?.hint}>
          <Select id="g-track" value={g.tracking} onChange={(e) => set({ tracking: e.target.value as GoalTracking })}>
            {TRACKING.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        {usesActivity ? (
          <Field label="Which activity" htmlFor="g-act">
            <Select id="g-act" value={g.activity_type ?? ""} onChange={(e) => set({ activity_type: (e.target.value || null) as ActivityType | null })}>
              <option value="">Any activity</option>
              {ACTIVITIES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        {g.tracking === "habit_days" ? (
          <Field label="Which habit" htmlFor="g-habit">
            <Select id="g-habit" required value={g.habit_key ?? ""} onChange={(e) => set({ habit_key: e.target.value || null })}>
              <option value="">Pick one</option>
              {HABIT_KEYS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Target" htmlFor="g-target">
          <Input id="g-target" type="number" min={0.01} step="any" required value={g.target_value as number} onChange={(e) => set({ target_value: e.target.value as unknown as number })} />
        </Field>
        <Field label="Unit" htmlFor="g-unit">
          <Input id="g-unit" required maxLength={20} value={g.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="km, swims, days…" />
        </Field>
      </div>

      <div>
        <div className="label-mono mb-1.5">Time period</div>
        <Segment
          value={g.period}
          onChange={(v) => set({ period: v })}
          options={[
            { value: "week", label: "Weekly" },
            { value: "month", label: "Monthly" },
            { value: "custom", label: "Custom dates" },
          ]}
        />
        {g.period === "custom" ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="From" htmlFor="g-from">
              <Input id="g-from" type="date" required value={g.start_date ?? ""} onChange={(e) => set({ start_date: e.target.value })} />
            </Field>
            <Field label="To" htmlFor="g-to">
              <Input id="g-to" type="date" required min={g.start_date ?? undefined} value={g.end_date ?? ""} onChange={(e) => set({ end_date: e.target.value })} />
            </Field>
          </div>
        ) : (
          <p className="mt-1.5 text-xs text-faint">Resets every {g.period === "week" ? "Monday" : "1st of the month"}.</p>
        )}
      </div>

      <div>
        <div className="label-mono mb-1.5">Who can see this goal?</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("private")}
            aria-pressed={mode === "private"}
            className={cn("flex items-start gap-2 rounded-2xl border p-3 text-left transition cursor-pointer", mode === "private" ? "border-lime bg-lime/5" : "border-line")}
          >
            <Lock className="mt-0.5 h-4 w-4 text-muted" />
            <span>
              <span className="block text-sm font-semibold">Private</span>
              <span className="block text-xs text-muted">Only you</span>
            </span>
          </button>
          <button
            type="button"
            disabled={isWeight || groups.length === 0}
            onClick={() => setMode("shared")}
            aria-pressed={mode === "shared"}
            className={cn("flex items-start gap-2 rounded-2xl border p-3 text-left transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-40", mode === "shared" ? "border-lime bg-lime/5" : "border-line")}
          >
            <Users className="mt-0.5 h-4 w-4 text-muted" />
            <span>
              <span className="block text-sm font-semibold">Share with squads</span>
              <span className="block text-xs text-muted">{isWeight ? "Weight goals stay private" : "They see name, target, %"}</span>
            </span>
          </button>
        </div>
        {mode === "shared" && !isWeight ? (
          <ul className="mt-2 space-y-1.5">
            {groups.map((gr) => {
              const on = (g.share_with ?? []).includes(gr.id);
              return (
                <li key={gr.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2 transition hover:border-faint">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--color-lime)]"
                      checked={on}
                      onChange={(e) => set({ share_with: e.target.checked ? [...(g.share_with ?? []), gr.id] : (g.share_with ?? []).filter((x) => x !== gr.id) })}
                    />
                    <SquadBadge g={gr} size={24} />
                    <span className="text-sm font-semibold">{gr.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {initial ? "Save goal" : "Set goal"}
      </Button>
    </form>
  );
}
