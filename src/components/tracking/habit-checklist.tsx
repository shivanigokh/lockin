"use client";
import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { Check, EyeOff, Settings2 } from "lucide-react";
import { habitIcon } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toggleHabit } from "@/app/actions/tracking";
import { useToast } from "@/components/ui/toast";
import { ProgressRing } from "@/components/ui/progress";

export type HabitRow = { id: string; name: string; icon: string; visible_to_groups: boolean; done: boolean };

const CHEERS = ["Look at you.", "Main character energy.", "Discipline? In this economy?", "Your ancestors are proud.", "OK we see you."];

export function HabitChecklist({ habits, day, shareHabits }: { habits: HabitRow[]; day: string; shareHabits: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(habits, (state, { id, done }: { id: string; done: boolean }) =>
    state.map((h) => (h.id === id ? { ...h, done } : h)),
  );
  const [, start] = useTransition();
  const toast = useToast();
  const done = optimistic.filter((h) => h.done).length;
  const total = optimistic.length;

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <ProgressRing value={total ? done / total : 0} label={`${done}/${total}`} />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">
            {done === total && total > 0 ? "All done. Insufferable." : done === 0 ? "Nothing ticked yet" : `${total - done} to go`}
          </p>
          <p className="text-[13px] text-muted">Tap a habit when you&apos;ve done it.</p>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {optimistic.map((h) => {
          const Icon = habitIcon(h.icon);
          return (
            <li key={h.id}>
              <button
                type="button"
                aria-pressed={h.done}
                onClick={() => {
                  const next = !h.done;
                  start(async () => {
                    setOptimistic({ id: h.id, done: next });
                    const res = await toggleHabit(h.id, day, next);
                    if (!res.ok) toast(res.error, "error");
                    else if (next && done + 1 === total) toast(CHEERS[Math.floor(Math.random() * CHEERS.length)]!);
                  });
                }}
                className={cn(
                  "flex h-full min-h-14 w-full items-center gap-2.5 rounded-xl border px-2.5 py-2.5 text-left transition cursor-pointer active:scale-[0.97] sm:gap-3 sm:rounded-2xl sm:px-3 sm:py-3",
                  h.done ? "border-lime/40 bg-lime/10" : "border-transparent bg-surface-2 hover:border-faint",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition sm:h-8 sm:w-8 sm:rounded-xl",
                    h.done ? "bg-lime text-[#141218] animate-pop" : "bg-surface-3 text-muted",
                  )}
                >
                  {h.done ? <Check className="h-5 w-5" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
                </span>
                <span className={cn("wrap-text flex-1 text-[13px] font-semibold leading-tight sm:text-sm", h.done && "text-lime")}>{h.name}</span>
                {!h.visible_to_groups || !shareHabits ? (
                  <EyeOff className="h-3.5 w-3.5 shrink-0 text-faint" aria-label="Hidden from squads" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <Link href="/settings#habits" className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted hover:text-lime">
        <Settings2 className="h-3.5 w-3.5" /> Customise habits
      </Link>
    </div>
  );
}
