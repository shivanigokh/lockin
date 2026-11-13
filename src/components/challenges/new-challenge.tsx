"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { addDays, format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Segment } from "@/components/ui/tabs";
import { useAction } from "@/lib/use-action";
import { createChallenge, type ChallengeInput } from "@/app/actions/social";
import { ACTIVITIES, CHALLENGE_METRICS, HABIT_KEYS, type ActivityType, type ChallengeMetric } from "@/lib/constants";

const plus = (d: string, n: number) => format(addDays(parseISO(d), n), "yyyy-MM-dd");

type Preset = { label: string; make: (today: string) => Partial<ChallengeInput> };
const PRESETS: Preset[] = [
  { label: "7-day walking", make: (t) => ({ title: "7-day walking challenge", metric: "workout_count", activity_type: "walking", scope: "individual", target_value: 7, unit: "walks", start_date: t, end_date: plus(t, 6) }) },
  { label: "No-alcohol week", make: (t) => ({ title: "No-alcohol week", metric: "habit_days", habit_key: "alcohol_free", scope: "individual", target_value: 7, unit: "days", start_date: t, end_date: plus(t, 6) }) },
  { label: "Swim 5× this month", make: (t) => ({ title: "Swim 5 times this month", metric: "workout_count", activity_type: "swimming", scope: "individual", target_value: 5, unit: "swims", start_date: t, end_date: plus(t, 29) }) },
  { label: "100 squad workouts", make: (t) => ({ title: "100 group workouts", metric: "workout_count", activity_type: null, scope: "group", target_value: 100, unit: "workouts", start_date: t, end_date: plus(t, 29) }) },
  { label: "10k steps daily", make: (t) => ({ title: "10,000 steps daily", description: "Log your steps each day. 70k for the week.", metric: "manual", scope: "individual", target_value: 70000, unit: "steps", start_date: t, end_date: plus(t, 6) }) },
  { label: "Cook at home 5×", make: (t) => ({ title: "Cook at home 5 times", metric: "manual", scope: "individual", target_value: 5, unit: "meals", start_date: t, end_date: plus(t, 6) }) },
];

export function NewChallengeButton({ groupId, today }: { groupId: string; today: string }) {
  const [open, setOpen] = useState(false);
  const blank: ChallengeInput = {
    title: "",
    description: "",
    metric: "workout_count",
    activity_type: null,
    habit_key: null,
    scope: "individual",
    target_value: 5,
    unit: "workouts",
    start_date: today,
    end_date: plus(today, 6),
  };
  const [form, setForm] = useState<ChallengeInput>(blank);
  const set = (p: Partial<ChallengeInput>) => setForm((f) => ({ ...f, ...p }));
  const [create, pending] = useAction(createChallenge, {
    onSuccess: () => {
      setOpen(false);
      setForm(blank);
    },
  });
  const usesActivity = ["workout_count", "active_minutes", "distance_km"].includes(form.metric);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New challenge
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New challenge" label="chaos is a ladder">
        <div className="mb-5 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => set({ ...blank, ...p.make(today) })} className="rounded-full border border-line px-2.5 py-1 font-mono text-[10px] uppercase text-muted transition hover:border-orange hover:text-orange cursor-pointer">
              {p.label}
            </button>
          ))}
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create(groupId, form);
          }}
        >
          <Field label="Name" htmlFor="c-title">
            <Input id="c-title" required minLength={3} maxLength={80} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="No-alcohol week" />
          </Field>
          <Field label="Description" htmlFor="c-desc">
            <Textarea id="c-desc" rows={2} maxLength={500} value={form.description ?? ""} onChange={(e) => set({ description: e.target.value })} placeholder="Rules, stakes, loser buys smoothies…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="What counts" htmlFor="c-metric">
              <Select id="c-metric" value={form.metric} onChange={(e) => set({ metric: e.target.value as ChallengeMetric })}>
                {CHALLENGE_METRICS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            {usesActivity ? (
              <Field label="Activity" htmlFor="c-act">
                <Select id="c-act" value={form.activity_type ?? ""} onChange={(e) => set({ activity_type: (e.target.value || null) as ActivityType | null })}>
                  <option value="">Any activity</option>
                  {ACTIVITIES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : form.metric === "habit_days" ? (
              <Field label="Habit" htmlFor="c-habit">
                <Select id="c-habit" required value={form.habit_key ?? ""} onChange={(e) => set({ habit_key: e.target.value || null })}>
                  <option value="">Pick one</option>
                  {HABIT_KEYS.map((h) => (
                    <option key={h.value} value={h.value}>
                      {h.label}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <div />
            )}
          </div>
          <div>
            <div className="label-mono mb-1.5">Target is for</div>
            <Segment
              value={form.scope}
              onChange={(v) => set({ scope: v })}
              options={[
                { value: "individual", label: "Each person" },
                { value: "group", label: "Whole squad" },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target" htmlFor="c-target">
              <Input id="c-target" type="number" min={0.01} step="any" required value={form.target_value as number} onChange={(e) => set({ target_value: e.target.value as unknown as number })} />
            </Field>
            <Field label="Unit" htmlFor="c-unit">
              <Input id="c-unit" required maxLength={20} value={form.unit} onChange={(e) => set({ unit: e.target.value })} />
            </Field>
            <Field label="Starts" htmlFor="c-start">
              <Input id="c-start" type="date" required value={form.start_date} onChange={(e) => set({ start_date: e.target.value })} />
            </Field>
            <Field label="Ends" htmlFor="c-end">
              <Input id="c-end" type="date" required min={form.start_date} value={form.end_date} onChange={(e) => set({ end_date: e.target.value })} />
            </Field>
          </div>
          <Button type="submit" size="lg" className="w-full" loading={pending}>
            Launch challenge
          </Button>
        </form>
      </Modal>
    </>
  );
}
