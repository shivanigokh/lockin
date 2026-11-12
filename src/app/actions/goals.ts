"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/data";
import { errResult, okResult, type ActionResult } from "@/lib/action";
import { friendlyError } from "@/lib/utils";

const goalSchema = z
  .object({
    title: z.string().trim().min(1, "Give the goal a name.").max(80),
    category: z.enum(["workouts", "running", "walking", "swimming", "cycling", "strength", "steps", "alcohol_free", "nutrition", "cooking", "sleep", "hydration", "mindfulness", "weight", "other"]),
    tracking: z.enum(["manual", "workout_count", "distance_km", "active_minutes", "habit_days"]),
    activity_type: z.enum(["walking", "running", "swimming", "strength", "cycling", "yoga", "sports", "other"]).nullable(),
    habit_key: z.string().nullable(),
    target_value: z.coerce.number().positive("Target must be above zero.").max(10_000_000),
    unit: z.string().trim().min(1, "Add a unit, e.g. runs or km.").max(20),
    period: z.enum(["week", "month", "custom"]),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    share_with: z.array(z.string().uuid()).default([]),
  })
  .refine((g) => g.period !== "custom" || (g.start_date && g.end_date && g.end_date >= g.start_date), {
    message: "Custom goals need a start and end date.",
  })
  .refine((g) => g.tracking !== "habit_days" || !!g.habit_key, { message: "Pick which habit to count." })
  .refine((g) => g.category !== "weight" || g.share_with.length === 0, {
    message: "Weight goals stay private. Always.",
  });

export type GoalInput = z.input<typeof goalSchema>;

async function syncSharing(goalId: string, userId: string, groupIds: string[]) {
  const supabase = await createClient();
  const { data: current } = await supabase.from("shared_goals").select("group_id").eq("goal_id", goalId);
  const have = new Set((current ?? []).map((r) => r.group_id));
  const want = new Set(groupIds);
  const toRemove = [...have].filter((g) => !want.has(g));
  const toAdd = [...want].filter((g) => !have.has(g));
  if (toRemove.length) await supabase.from("shared_goals").delete().eq("goal_id", goalId).in("group_id", toRemove);
  if (toAdd.length) {
    const { error } = await supabase
      .from("shared_goals")
      .insert(toAdd.map((group_id) => ({ goal_id: goalId, group_id, user_id: userId })));
    if (error) return friendlyError(error);
  }
  return null;
}

export async function saveGoal(id: string | null, input: GoalInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return errResult(parsed.error.issues[0]!.message);
  const { share_with, ...g } = parsed.data;
  const row = {
    ...g,
    activity_type: ["workout_count", "distance_km", "active_minutes"].includes(g.tracking) ? g.activity_type : null,
    habit_key: g.tracking === "habit_days" ? g.habit_key : null,
    start_date: g.period === "custom" ? g.start_date : null,
    end_date: g.period === "custom" ? g.end_date : null,
  };
  const supabase = await createClient();
  let goalId = id;
  if (id) {
    const { error } = await supabase.from("personal_goals").update(row).eq("id", id).eq("user_id", user.id);
    if (error) return errResult(friendlyError(error));
  } else {
    const { data, error } = await supabase.from("personal_goals").insert({ ...row, user_id: user.id }).select("id").single();
    if (error) return errResult(friendlyError(error));
    goalId = data.id;
  }
  const shareErr = await syncSharing(goalId!, user.id, share_with);
  if (shareErr) return errResult(shareErr);
  revalidatePath("/", "layout");
  return okResult(id ? "Goal updated." : share_with.length ? "Goal set and shared. No backing out now." : "Private goal set.");
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("personal_goals").delete().eq("id", id).eq("user_id", user.id);
  if (error) return errResult(friendlyError(error));
  revalidatePath("/", "layout");
  return okResult("Goal deleted.");
}

export async function archiveGoal(id: string, archived: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("personal_goals").update({ archived }).eq("id", id).eq("user_id", user.id);
  if (error) return errResult(friendlyError(error));
  revalidatePath("/", "layout");
  return okResult(archived ? "Goal archived." : "Goal restored.");
}

export async function logGoalProgress(goalId: string, amount: number, day: string, note?: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!Number.isFinite(amount) || amount === 0) return errResult("Enter an amount (negative numbers undo).");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return errResult("Bad date.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("goal_progress_entries")
    .insert({ goal_id: goalId, user_id: user.id, amount, logged_on: day, note: note?.trim() || null });
  if (error) return errResult(friendlyError(error));
  revalidatePath("/", "layout");
  return okResult(amount > 0 ? "Progress logged." : "Progress adjusted.");
}
