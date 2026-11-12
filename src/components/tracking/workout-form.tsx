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

  return (
    <form
      className="space-y-5"
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
                "flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-[11px] font-semibold transition cursor-pointer",
                type === a.value ? "border-transparent text-black" : "border-line bg-surface-2 text-muted hover:text-ink",
              )}
              style={type === a.value ? { background: a.color } : undefined}
            >
              <a.icon className="h-5 w-5" />
              <span className="truncate">{a.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="label-mono mb-2">Minutes</div>
        <div className="flex flex-wrap gap-2">
          {QUICK_MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(String(m))}
              className={cn(
                "h-9 rounded-xl border px-3 font-mono text-sm transition cursor-pointer",
                minutes === String(m) ? "border-lime bg-lime/10 text-lime" : "border-line text-muted hover:text-ink",
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
            className="h-9 w-24 py-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" htmlFor="w-date">
          <Input id="w-date" type="date" required max={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={DISTANCE_TYPES.includes(type) ? "Distance (km)" : "Distance (optional)"} htmlFor="w-dist">
          <Input
            id="w-dist"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            max={1000}
            placeholder="optional"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Note (optional)" htmlFor="w-note">
        <Textarea id="w-note" maxLength={280} rows={2} placeholder="Ran from my problems. They kept up." value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        {(
          [
            { v: "groups", label: "Share with squads", icon: Users, hint: "Counts on leaderboards" },
            { v: "private", label: "Just me", icon: Lock, hint: "Hidden from everyone" },
          ] as const
        ).map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setVisibility(o.v)}
            aria-pressed={visibility === o.v}
            className={cn(
              "flex items-start gap-2 rounded-2xl border p-3 text-left transition cursor-pointer",
              visibility === o.v ? "border-lime bg-lime/5" : "border-line hover:border-faint",
            )}
          >
            <o.icon className={cn("mt-0.5 h-4 w-4", visibility === o.v ? "text-lime" : "text-muted")} />
            <span>
              <span className="block text-sm font-semibold">{o.label}</span>
              <span className="block text-xs text-muted">{o.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {initial ? "Save changes" : "Log it"}
      </Button>
    </form>
  );
}
