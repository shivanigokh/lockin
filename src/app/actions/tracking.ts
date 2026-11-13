"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/data";
import { errResult, okResult, type ActionResult } from "@/lib/action";
import { friendlyError } from "@/lib/utils";
import { HABIT_ICONS } from "@/lib/constants";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function toggleHabit(habitId: string, day: string, done: boolean): Promise<ActionResult> {
  const user = await requireUser();
  if (!date.safeParse(day).success) return errResult("Bad date.");
  const supabase = await createClient();
  if (done) {
    const { error } = await supabase
      .from("habit_completions")
      .upsert({ habit_id: habitId, user_id: user.id, completed_on: day }, { onConflict: "habit_id,completed_on", ignoreDuplicates: true });
    if (error) return errResult(friendlyError(error));
  } else {
    const { error } = await supabase
      .from("habit_completions")
      .delete()
      .eq("habit_id", habitId)
      .eq("completed_on", day)
      .eq("user_id", user.id);
    if (error) return errResult(friendlyError(error));
  }
  revalidatePath("/", "layout");
  return okResult();
}

const habitSchema = z.object({
  name: z.string().trim().min(1, "Name it.").max(40),
  icon: z.string().refine((v) => v in HABIT_ICONS),
  visible_to_groups: z.boolean(),
});

export async function saveHabit(id: string | null, input: z.input<typeof habitSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = habitSchema.safeParse(input);
  if (!parsed.success) return errResult(parsed.error.issues[0]!.message);
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("daily_habits").update(parsed.data).eq("id", id).eq("user_id", user.id);
    if (error) return errResult(friendlyError(error));
  } else {
    const { count } = await supabase
      .from("daily_habits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("archived", false);
    if ((count ?? 0) >= 12) return errResult("12 habits max. You're not a robot.");
    const { error } = await supabase.from("daily_habits").insert({ ...parsed.data, user_id: user.id, sort_order: (count ?? 0) + 1 });
    if (error) return errResult(friendlyError(error));
  }
  revalidatePath("/", "layout");
  return okResult(id ? "Habit updated." : "Habit added.");
}

export async function archiveHabit(id: string, archived: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("daily_habits").update({ archived }).eq("id", id).eq("user_id", user.id);
  if (error) return errResult(friendlyError(error));
  revalidatePath("/", "layout");
  return okResult(archived ? "Habit hidden from your daily list." : "Habit is back.");
}

export async function moveHabit(id: string, direction: -1 | 1): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: habits } = await supabase
    .from("daily_habits")
    .select("id, sort_order")
    .eq("user_id", user.id)
    .eq("archived", false)
    .order("sort_order");
  if (!habits) return errResult("Couldn't load habits.");
  const i = habits.findIndex((h) => h.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= habits.length) return okResult();
  [habits[i], habits[j]] = [habits[j]!, habits[i]!];
  await Promise.all(
    habits.map((h, idx) => supabase.from("daily_habits").update({ sort_order: idx + 1 }).eq("id", h.id).eq("user_id", user.id)),
  );
  revalidatePath("/", "layout");
  return okResult();
}

const workoutSchema = z.object({
  activity_type: z.enum(["walking", "running", "swimming", "strength", "cycling", "yoga", "sports", "other"]),
  performed_on: date,
  duration_min: z.coerce.number().int("Whole minutes please.").min(1, "At least a minute.").max(1440, "That's more than a day."),
  distance_km: z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().min(0).max(1000).nullable()),
  note: z.string().trim().max(280).optional(),
  visibility: z.enum(["groups", "private"]),
});

export async function saveWorkout(id: string | null, input: z.input<typeof workoutSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = workoutSchema.safeParse(input);
  if (!parsed.success) return errResult(parsed.error.issues[0]!.message);
  const row = { ...parsed.data, note: parsed.data.note || null };
  const supabase = await createClient();
  if (id) {
    const { data, error } = await supabase.from("workouts").update(row).eq("id", id).eq("user_id", user.id).select("id");
    if (error) return errResult(friendlyError(error));
    if (!data?.length) return errResult("You can only edit your own workouts.");
  } else {
    const { error } = await supabase.from("workouts").insert({ ...row, user_id: user.id });
    if (error) return errResult(friendlyError(error));
  }
  revalidatePath("/", "layout");
  const lines = ["Logged. Couch creature: defeated.", "Logged. The squad has been notified.", "Logged. Less talk, more action.", "Logged. Your future self says thanks."];
  return okResult(id ? "Workout updated." : lines[Math.floor(Math.random() * lines.length)]);
}

export async function deleteWorkout(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("workouts").delete().eq("id", id).eq("user_id", user.id);
  if (error) return errResult(friendlyError(error));
  revalidatePath("/", "layout");
  return okResult("Workout deleted.");
}
