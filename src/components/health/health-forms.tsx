"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useAction } from "@/lib/use-action";
import { addHealthNote, addMeasurement, addWeight, deleteHealthNote, deleteMeasurement, deleteWeight, saveHealthProfile } from "@/app/actions/health";
import { cmTo, kgTo, round1, toCm, toKg, type LengthUnit, type WeightUnit } from "@/lib/units";
import { prettyDate, relTime } from "@/lib/dates";
import { fmtNum } from "@/lib/utils";

const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));
const show = (v: number | null | undefined, conv: (n: number) => number) => (v == null ? "" : String(round1(conv(Number(v)))));

export function HealthProfileForm({
  initial,
  wu,
  lu,
}: {
  initial: { height_cm: number | null; starting_weight_kg: number | null; target_weight_kg: number | null; health_goals: string | null };
  wu: WeightUnit;
  lu: LengthUnit;
}) {
  const [height, setHeight] = useState(show(initial.height_cm, (n) => cmTo(n, lu)));
  const [start, setStart] = useState(show(initial.starting_weight_kg, (n) => kgTo(n, wu)));
  const [target, setTarget] = useState(show(initial.target_weight_kg, (n) => kgTo(n, wu)));
  const [goals, setGoals] = useState(initial.health_goals ?? "");
  const [save, pending] = useAction(saveHealthProfile);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const h = numOrNull(height);
        const s = numOrNull(start);
        const t = numOrNull(target);
        save({
          height_cm: h == null ? null : round1(toCm(h, lu)),
          starting_weight_kg: s == null ? null : round1(toKg(s, wu)),
          target_weight_kg: t == null ? null : round1(toKg(t, wu)),
          health_goals: goals,
        });
      }}
    >
      <div className="grid grid-cols-3 gap-3">
        <Field label={`Height (${lu})`} htmlFor="hp-h">
          <Input id="hp-h" type="number" step="0.1" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="–" />
        </Field>
        <Field label={`Start (${wu})`} htmlFor="hp-s">
          <Input id="hp-s" type="number" step="0.1" inputMode="decimal" value={start} onChange={(e) => setStart(e.target.value)} placeholder="–" />
        </Field>
        <Field label={`Target (${wu})`} htmlFor="hp-t">
          <Input id="hp-t" type="number" step="0.1" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="–" />
        </Field>
      </div>
      <Field label="Personal health goals" htmlFor="hp-g" hint="Private. Write whatever keeps you honest.">
        <Textarea id="hp-g" rows={3} maxLength={2000} value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="Sleep 7h. Fewer 2am kebabs. Run a 10k by spring." />
      </Field>
      <Button type="submit" loading={pending}>
        Save
      </Button>
    </form>
  );
}

export function WeightForm({ today, wu }: { today: string; wu: WeightUnit }) {
  const [date, setDate] = useState(today);
  const [w, setW] = useState("");
  const [add, pending] = useAction(addWeight, { onSuccess: () => setW("") });
  return (
    <form
      className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap"
      onSubmit={(e) => {
        e.preventDefault();
        add({ entry_date: date, weight_kg: round1(toKg(Number(w), wu)) });
      }}
    >
      <Field label="Date" htmlFor="wf-d" className="min-w-0 sm:w-44">
        <Input id="wf-d" type="date" max={today} required value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label={`Weight (${wu})`} htmlFor="wf-w" className="min-w-0 sm:w-32">
        <Input id="wf-w" type="number" step="0.1" inputMode="decimal" placeholder="e.g. 62.5" required value={w} onChange={(e) => setW(e.target.value)} />
      </Field>
      <Button type="submit" loading={pending} className="col-span-2 sm:col-span-1">
        Log weigh-in
      </Button>
    </form>
  );
}

export function WeightList({ entries, wu }: { entries: { id: string; entry_date: string; weight_kg: number }[]; wu: WeightUnit }) {
  const [del, pending] = useAction(deleteWeight);
  if (!entries.length) return <p className="text-sm text-muted">No weigh-ins yet.</p>;
  return (
    <ul className="max-h-72 divide-y divide-line overflow-y-auto">
      {entries.map((e, i) => {
        const prev = entries[i + 1];
        const diff = prev ? kgTo(Number(e.weight_kg) - Number(prev.weight_kg), wu) : null;
        return (
          <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="w-28 font-mono text-xs text-muted">{prettyDate(e.entry_date)}</span>
            <span className="flex-1 font-semibold">
              {fmtNum(round1(kgTo(Number(e.weight_kg), wu)))} {wu}
            </span>
            {diff !== null && Math.abs(diff) >= 0.05 ? (
              <span className="font-mono text-xs text-muted">
                {diff > 0 ? "+" : ""}
                {fmtNum(round1(diff))}
              </span>
            ) : null}
            <button type="button" aria-label="Delete weigh-in" disabled={pending} onClick={() => del(e.id)} className="rounded-lg p-1.5 text-faint transition hover:text-danger cursor-pointer">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const MEASURE_FIELDS = [
  { key: "waist_cm", label: "Waist", length: true },
  { key: "hips_cm", label: "Hips", length: true },
  { key: "chest_cm", label: "Chest", length: true },
  { key: "body_fat_pct", label: "Body fat %", length: false },
  { key: "resting_hr", label: "Resting HR (bpm)", length: false },
  { key: "vo2max", label: "VO₂ max", length: false },
  { key: "pushups_max", label: "Max push-ups", length: false },
  { key: "plank_seconds", label: "Plank (sec)", length: false },
] as const;

export function MeasurementForm({ today, lu }: { today: string; lu: LengthUnit }) {
  const blank = Object.fromEntries(MEASURE_FIELDS.map((f) => [f.key, ""])) as Record<string, string>;
  const [vals, setVals] = useState(blank);
  const [date, setDate] = useState(today);
  const [add, pending] = useAction(addMeasurement, { onSuccess: () => setVals(blank) });
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const payload: Record<string, number | null | string> = { measured_on: date };
        for (const f of MEASURE_FIELDS) {
          const n = numOrNull(vals[f.key]!);
          payload[f.key] = n == null ? null : f.length ? round1(toCm(n, lu)) : n;
        }
        add(payload as Parameters<typeof addMeasurement>[0]);
      }}
    >
      <Field label="Date" htmlFor="m-date" className="max-w-44">
        <Input id="m-date" type="date" max={today} required value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MEASURE_FIELDS.map((f) => (
          <Field key={f.key} label={f.length ? `${f.label} (${lu})` : f.label} htmlFor={`m-${f.key}`}>
            <Input
              id={`m-${f.key}`}
              type="number"
              step="0.1"
              inputMode="decimal"
              placeholder="–"
              value={vals[f.key]}
              onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          </Field>
        ))}
      </div>
      <p className="text-xs text-faint">Everything is optional. Fill in what you measured.</p>
      <Button type="submit" loading={pending}>
        Save measurements
      </Button>
    </form>
  );
}

type Measurement = { id: string; measured_on: string } & Record<string, number | string | null>;

export function MeasurementTable({ rows, lu }: { rows: Measurement[]; lu: LengthUnit }) {
  const [del, pending] = useAction(deleteMeasurement);
  if (!rows.length) return <p className="text-sm text-muted">No measurements yet.</p>;
  const used = MEASURE_FIELDS.filter((f) => rows.some((r) => r[f.key] != null));
  return (
    <div data-scroll-x className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="label-mono text-[10px]">
            <th className="py-2 pr-3 font-normal">date</th>
            {used.map((f) => (
              <th key={f.key} className="whitespace-nowrap py-2 pr-3 font-normal">
                {f.label}
              </th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody className="divide-y divide-line font-mono text-xs">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap py-2 pr-3 text-muted">{prettyDate(r.measured_on)}</td>
              {used.map((f) => (
                <td key={f.key} className="py-2 pr-3">
                  {r[f.key] == null ? "–" : fmtNum(f.length ? round1(cmTo(Number(r[f.key]), lu)) : Number(r[f.key]))}
                </td>
              ))}
              <td className="py-2 text-right">
                <button type="button" aria-label="Delete measurement" disabled={pending} onClick={() => del(r.id)} className="rounded-lg p-1 text-faint hover:text-danger cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NotesPanel({ notes }: { notes: { id: string; body: string; created_at: string }[] }) {
  const [text, setText] = useState("");
  const [add, adding] = useAction(addHealthNote, { onSuccess: () => setText("") });
  const [del, deleting] = useAction(deleteHealthNote);
  return (
    <div>
      <form
        className="mb-4 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(text);
        }}
      >
        <Textarea rows={3} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Knee felt weird after the run. Slept 5h. Ate a salad (voluntarily)." aria-label="New note" />
        <Button type="submit" variant="secondary" loading={adding} disabled={!text.trim()}>
          Add note
        </Button>
      </form>
      {notes.length ? (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="group rounded-2xl border border-line bg-surface-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                <button type="button" aria-label="Delete note" disabled={deleting} onClick={() => del(n.id)} className="rounded-lg p-1 text-faint opacity-60 transition hover:text-danger group-hover:opacity-100 cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="label-mono mt-1 text-[10px]">{relTime(n.created_at)}</div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No notes yet. Dear diary…</p>
      )}
    </div>
  );
}
