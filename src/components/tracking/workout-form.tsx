"use client";
import { useState } from "react";
import { Lock, Users } from "lucide-react";
import { ACTIVITIES, type ActivityType } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { useAction } from "@/lib/use-action";
import { saveWorkout } from "@/app/actions/tracking";

export type WorkoutRow = {
  id: string;
  activity_type: ActivityType;
  performed_on: string;
  duration_min: number;
  distance_km: number | null;
  note: string | null;
  visibility: "groups" | "private";
};

const QUICK_MINUTES = [15, 30, 45, 60, 90];
const DISTANCE_TYPES: ActivityType[] = ["walking", "running", "swimming", "cycling", "other"];

export function WorkoutForm({
  today,
  defaultVisibility,
  initial,
  onDone,
}: {
  today: string;
  defaultVisibility: "groups" | "private";
  initial?: WorkoutRow;
  onDone?: () => void;
}) {
  const [type, setType] = useState<ActivityType>(initial?.activity_type ?? "walking");
  const [date, setDate] = useState(initial?.performed_on ?? today);
  const [minutes, setMinutes] = useState<string>(initial ? String(initial.duration_min) : "30");
  const [distance, setDistance] = useState<string>(initial?.distance_km != null ? String(initial.distance_km) : "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [visibility, setVisibility] = useState<"groups" | "private">(initial?.visibility ?? defaultVisibility);
  const [run, pending] = useAction(saveWorkout, { onSuccess: () => onDone?.() });

  const [more, setMore] = useState(Boolean(initial && (initial.note || initial.performed_on !== today)));
  const showDistance = DISTANCE_TYPES.includes(type) || distance !== "";

  return (
    <form
      className="space-y-4 sm:space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(initial?.id ?? null, {
          activity_type: type,
          performed_on: date,
          duration_min: Number(minutes),
          distance_km: distance === "" ? null : Number(distance),
          note,
          visibility,
        });
      }}
    >
      <div>
        <div className="label-mono mb-2">What did you do?</div>
        <div className="grid grid-cols-4 gap-2">
          {ACTIVITIES.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => setType(a.value)}
              aria-pressed={type === a.value}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-xs font-semibold transition cursor-pointer sm:rounded-2xl sm:py-3",
                type === a.value ? "border-transparent text-black" : "border-transparent bg-surface-2 text-muted hover:text-ink",
              )}
              style={type === a.value ? { background: a.color } : undefined}
            >
              <a.icon className="h-5 w-5" />
              <span>{a.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="label-mono mb-2">Minutes</div>
        <div className="flex gap-1.5">
          {QUICK_MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(String(m))}
              className={cn(
                "h-10 min-w-0 flex-1 rounded-xl border font-mono text-sm transition cursor-pointer",
                minutes === String(m) ? "border-lime bg-lime/10 text-lime" : "border-transparent bg-surface-2 text-muted hover:text-ink",
              )}
            >
              {m}
            </button>
          ))}
          <Input
            aria-label="Custom minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            required
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="h-10 w-16 shrink-0 px-2 py-1 text-center"
          />
        </div>
      </div>

      {showDistance ? (
        <Field label="Distance (km, optional)" htmlFor="w-dist">
          <Input
            id="w-dist"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            max={1000}
            placeholder="e.g. 5"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
        </Field>
      ) : null}

      <div className="flex rounded-xl bg-surface-2 p-1" role="group" aria-label="Who can see this">
        {(
          [
            { v: "groups", label: "Share with squads", icon: Users },
            { v: "private", label: "Just me", icon: Lock },
          ] as const
        ).map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setVisibility(o.v)}
            aria-pressed={visibility === o.v}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition cursor-pointer",
              visibility === o.v ? "bg-surface-3 text-ink" : "text-muted hover:text-ink",
            )}
          >
            <o.icon className={cn("h-4 w-4", visibility === o.v ? "text-lime" : "")} />
            {o.label}
          </button>
        ))}
      </div>
      <p className="-mt-2 text-xs text-muted">
        {visibility === "groups" ? "Counts on your squads' leaderboards." : "Hidden from everyone. Still counts for your own goals."}
      </p>

      {more ? (
        <div className="space-y-4">
          <Field label="Date" htmlFor="w-date">
            <Input id="w-date" type="date" required max={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Note (optional)" htmlFor="w-note">
            <Textarea id="w-note" maxLength={280} rows={2} placeholder="Ran from my problems. They kept up." value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      ) : (
        <button type="button" onClick={() => setMore(true)} className="text-sm text-muted underline-offset-4 hover:text-lime hover:underline cursor-pointer">
          + Different day or add a note
        </button>
      )}

      <div className="sticky bottom-0 -mx-5 -mb-5 bg-surface px-5 pt-2 pb-5 sm:static sm:m-0 sm:p-0">
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          {initial ? "Save changes" : "Log it"}
        </Button>
      </div>
    </form>
  );
}
