"use client";
import { useState } from "react";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { activity } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { WorkoutForm, type WorkoutRow } from "./workout-form";
import { useAction } from "@/lib/use-action";
import { deleteWorkout } from "@/app/actions/tracking";
import { fmtNum } from "@/lib/utils";
import { prettyDate } from "@/lib/dates";

export function WorkoutItem({ w, today, defaultVisibility, showDate }: { w: WorkoutRow; today: string; defaultVisibility: "groups" | "private"; showDate?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [del, deleting] = useAction(deleteWorkout);
  const a = activity(w.activity_type);
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 px-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-black" style={{ background: a.color }}>
        <a.icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {a.label}
          {w.visibility === "private" ? <Lock className="h-3 w-3 text-faint" aria-label="Private" /> : null}
        </div>
        <div className="truncate font-mono text-xs text-muted">
          {showDate ? `${prettyDate(w.performed_on)} · ` : ""}
          {w.duration_min} min{w.distance_km ? ` · ${fmtNum(w.distance_km, 2)} km` : ""}
          {w.note ? ` · ${w.note}` : ""}
        </div>
      </div>
      <Button variant="ghost" size="icon" aria-label="Edit workout" onClick={() => setEditing(true)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete workout"
        loading={deleting}
        onClick={() => {
          if (confirm("Delete this workout? It'll vanish from leaderboards too.")) del(w.id);
        }}
      >
        {deleting ? null : <Trash2 className="h-4 w-4" />}
      </Button>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit workout">
        <WorkoutForm today={today} defaultVisibility={defaultVisibility} initial={w} onDone={() => setEditing(false)} />
      </Modal>
    </li>
  );
}

export function MyTodayWorkouts({ workouts, today, defaultVisibility }: { workouts: WorkoutRow[]; today: string; defaultVisibility: "groups" | "private" }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {workouts.length ? (
        <ul className="mb-3 space-y-2">
          {workouts.map((w) => (
            <WorkoutItem key={w.id} w={w} today={today} defaultVisibility={defaultVisibility} />
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-muted">Even a 10-minute walk counts. Probably.</p>
      )}
      <Button variant={workouts.length ? "secondary" : "primary"} onClick={() => setOpen(true)} className="w-full">
        <Plus className="h-4 w-4" /> Log a workout
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Log a workout" label="// receipts or it didn't happen">
        <WorkoutForm today={today} defaultVisibility={defaultVisibility} onDone={() => setOpen(false)} />
      </Modal>
    </div>
  );
}
