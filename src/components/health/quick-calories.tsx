"use client";
import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { ProgressBar } from "@/components/ui/progress";
import { useAction } from "@/lib/use-action";
import { setDayCalories } from "@/app/actions/integrations";

/** One-number daily calorie entry (e.g. copied from HealthifyMe). Private. */
export function QuickCalories({ today, dayTotal, otherToday, target }: { today: string; dayTotal: number | null; otherToday: number; target: number | null }) {
  const [v, setV] = useState(dayTotal != null ? String(dayTotal) : "");
  const [save, pending] = useAction(setDayCalories);
  const total = (dayTotal ?? 0) + otherToday;
  return (
    <div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (v.trim() !== "") save({ eaten_on: today, calories: Number(v) });
        }}
      >
        <Input
          aria-label="Calories eaten today"
          type="number"
          inputMode="numeric"
          min={0}
          max={20000}
          required
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="Today's total from your food app"
          className="min-w-0 flex-1"
        />
        <span className="font-mono text-xs text-muted">kcal</span>
        <Button type="submit" size="sm" loading={pending}>
          {dayTotal != null ? "Update" : "Save"}
        </Button>
      </form>
      {target ? (
        <div className="mt-3">
          <div className="mb-1 flex justify-between font-mono text-xs text-muted">
            <span>
              {total} / {target} kcal{otherToday ? ` (incl. ${otherToday} from meals)` : ""}
            </span>
            <span className="text-cyan">{Math.round((total / target) * 100)}%</span>
          </div>
          <ProgressBar value={Math.min(100, (total / target) * 100)} size="sm" color="var(--color-cyan)" />
        </div>
      ) : null}
      <p className="mt-2 flex items-center gap-1.5 text-xs text-faint">
        <Lock className="h-3 w-3" />
        <span>
          Only you see this. History in <a href="/me" className="underline">My health</a>.
        </span>
      </p>
    </div>
  );
}
