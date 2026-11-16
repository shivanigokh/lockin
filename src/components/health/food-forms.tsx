"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useAction } from "@/lib/use-action";
import { addMeal, deleteMeal, saveCalorieTarget } from "@/app/actions/integrations";
import { prettyDate } from "@/lib/dates";
import { fmtNum } from "@/lib/utils";

export const MEALS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "day_total", label: "Whole day" },
] as const;
type Meal = (typeof MEALS)[number]["value"];
const mealLabel = (m: string) => MEALS.find((x) => x.value === m)?.label ?? m;

function defaultMeal(): Meal {
  const h = new Date().getHours();
  return h < 11 ? "breakfast" : h < 16 ? "lunch" : h < 21 ? "dinner" : "snack";
}

export function MealForm({ today }: { today: string }) {
  const [date, setDate] = useState(today);
  const [meal, setMeal] = useState<Meal>(defaultMeal);
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [more, setMore] = useState(false);
  const [add, pending] = useAction(addMeal, {
    onSuccess: () => {
      setName("");
      setKcal("");
      setProtein("");
      setCarbs("");
      setFat("");
    },
  });
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        add({ eaten_on: date, meal, name, calories: Number(kcal), protein_g: protein, carbs_g: carbs, fat_g: fat });
      }}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Date" htmlFor="mf-d">
          <Input id="mf-d" type="date" max={today} required value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Meal" htmlFor="mf-m">
          <Select id="mf-m" value={meal} onChange={(e) => setMeal(e.target.value as Meal)}>
            {MEALS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="What" htmlFor="mf-n" className="col-span-2 sm:col-span-1">
          <Input id="mf-n" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Dal, rice, salad" />
        </Field>
        <Field label="Calories" htmlFor="mf-k" className="col-span-2 sm:col-span-1">
          <Input id="mf-k" type="number" inputMode="numeric" min={0} max={20000} required value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="kcal" />
        </Field>
      </div>
      {more ? (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Protein (g)" htmlFor="mf-p">
            <Input id="mf-p" type="number" step="0.1" inputMode="decimal" min={0} value={protein} onChange={(e) => setProtein(e.target.value)} />
          </Field>
          <Field label="Carbs (g)" htmlFor="mf-c">
            <Input id="mf-c" type="number" step="0.1" inputMode="decimal" min={0} value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          </Field>
          <Field label="Fat (g)" htmlFor="mf-f">
            <Input id="mf-f" type="number" step="0.1" inputMode="decimal" min={0} value={fat} onChange={(e) => setFat(e.target.value)} />
          </Field>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" loading={pending}>
          Log food
        </Button>
        {!more ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setMore(true)}>
            + macros
          </Button>
        ) : null}
      </div>
    </form>
  );
}

type Entry = { id: string; eaten_on: string; meal: string; name: string | null; calories: number; protein_g: number | string | null; source: string };

export function MealList({ entries }: { entries: Entry[] }) {
  const [del, pending] = useAction(deleteMeal);
  if (!entries.length) return <p className="text-sm text-muted">Nothing logged in the last week.</p>;
  return (
    <ul className="max-h-80 divide-y divide-line overflow-y-auto">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
          <span className="w-24 shrink-0 font-mono text-xs text-muted">{prettyDate(e.eaten_on)}</span>
          <span className="wrap-text min-w-0 flex-1">
            <span className="font-semibold">{e.name || mealLabel(e.meal)}</span>
            <span className="ml-1.5 text-xs text-faint">
              {[
                e.name && e.meal !== "day_total" ? mealLabel(e.meal) : null,
                e.source === "apple_health" ? "synced" : null,
                e.protein_g != null ? `${fmtNum(e.protein_g)} g protein` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
          <span className="shrink-0 font-mono text-xs">{e.calories} kcal</span>
          <button type="button" aria-label="Delete entry" disabled={pending} onClick={() => del(e.id)} className="cursor-pointer rounded-lg p-1.5 text-faint transition hover:text-danger">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CalorieTargetForm({ target }: { target: number | null }) {
  const [v, setV] = useState(target != null ? String(target) : "");
  const [save, pending] = useAction(saveCalorieTarget);
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        save(v);
      }}
    >
      <Field label="Daily target (kcal)" htmlFor="ct" className="w-40">
        <Input id="ct" type="number" inputMode="numeric" min={500} max={10000} value={v} onChange={(e) => setV(e.target.value)} placeholder="optional" />
      </Field>
      <Button type="submit" variant="secondary" size="sm" loading={pending} className="mb-1">
        Save
      </Button>
    </form>
  );
}
