"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/data";
import { errResult, okResult, type ActionResult } from "@/lib/action";
import { friendlyError } from "@/lib/utils";

export async function postMessage(groupId: string, body: string): Promise<ActionResult> {
  const user = await requireUser();
  const text = body.trim();
  if (!text) return errResult("Say something.");
  if (text.length > 280) return errResult("280 characters max. Less talk.");
  const supabase = await createClient();
  const { error } = await supabase.from("group_activity").insert({ group_id: groupId, actor_id: user.id, kind: "message", body: text });
  if (error) return errResult(friendlyError(error));
  revalidatePath(`/g/${groupId}`, "layout");
  return okResult();
}

export async function deleteActivity(groupId: string, id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("group_activity").delete().eq("id", id).select("id");
  if (error) return errResult(friendlyError(error));
  if (!data?.length) return errResult("You can only delete your own posts.");
  revalidatePath(`/g/${groupId}`, "layout");
  return okResult("Deleted.");
}

export async function toggleReaction(groupId: string, activityId: string, emoji: string, on: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  if (on) {
    const { error } = await supabase
      .from("activity_reactions")
      .upsert({ activity_id: activityId, user_id: user.id, emoji }, { ignoreDuplicates: true });
    if (error) return errResult(friendlyError(error));
  } else {
    await supabase.from("activity_reactions").delete().eq("activity_id", activityId).eq("user_id", user.id).eq("emoji", emoji);
  }
  revalidatePath(`/g/${groupId}`, "layout");
  return okResult();
}

const challengeSchema = z
  .object({
    title: z.string().trim().min(3, "Name the challenge (3+ characters).").max(80),
    description: z.string().trim().max(500).optional(),
    metric: z.enum(["workout_count", "active_minutes", "distance_km", "habit_days", "manual"]),
    activity_type: z.enum(["walking", "running", "swimming", "strength", "cycling", "yoga", "sports", "other"]).nullable(),
    habit_key: z.string().nullable(),
    scope: z.enum(["individual", "group"]),
    target_value: z.coerce.number().positive("Target must be above zero.").max(10_000_000),
    unit: z.string().trim().min(1).max(20),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a start date."),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an end date."),
  })
  .refine((c) => c.end_date >= c.start_date, { message: "The end date must be after the start." })
  .refine((c) => c.metric !== "habit_days" || !!c.habit_key, { message: "Pick which habit counts." });

export type ChallengeInput = z.input<typeof challengeSchema>;

export async function createChallenge(groupId: string, input: ChallengeInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = challengeSchema.safeParse(input);
  if (!parsed.success) return errResult(parsed.error.issues[0]!.message);
  const c = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("group_challenges").insert({
    ...c,
    description: c.description || null,
    activity_type: ["workout_count", "active_minutes", "distance_km"].includes(c.metric) ? c.activity_type : null,
    habit_key: c.metric === "habit_days" ? c.habit_key : null,
    group_id: groupId,
    created_by: user.id,
  });
  if (error) {
    if (error.message.includes("row-level security")) return errResult("Only squad admins can create challenges here.");
    return errResult(friendlyError(error));
  }
  revalidatePath(`/g/${groupId}`, "layout");
  return okResult("Challenge is live. Let the chaos begin.");
}

export async function deleteChallenge(groupId: string, id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("group_challenges").delete().eq("id", id).select("id");
  if (error) return errResult(friendlyError(error));
  if (!data?.length) return errResult("Only admins or the creator can delete this.");
  revalidatePath(`/g/${groupId}`, "layout");
  return okResult("Challenge deleted.");
}

export async function setChallengeParticipation(groupId: string, challengeId: string, join: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  if (join) {
    const { error } = await supabase.from("challenge_participants").insert({ challenge_id: challengeId, user_id: user.id });
    if (error && !error.message.includes("duplicate")) return errResult(friendlyError(error));
  } else {
    const { error } = await supabase.from("challenge_participants").delete().eq("challenge_id", challengeId).eq("user_id", user.id);
    if (error) return errResult(friendlyError(error));
  }
  revalidatePath(`/g/${groupId}`, "layout");
  return okResult(join ? "You're in. No excuses." : "You left the challenge.");
}

export async function addChallengeProgress(groupId: string, challengeId: string, amount: number): Promise<ActionResult> {
  const user = await requireUser();
  if (!Number.isFinite(amount) || amount === 0) return errResult("Enter an amount.");
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("challenge_participants")
    .select("manual_progress")
    .eq("challenge_id", challengeId)
    .eq("user_id", user.id)
    .single();
  if (!row) return errResult("Join the challenge first.");
  const next = Math.max(0, Number(row.manual_progress) + amount);
  const { error } = await supabase
    .from("challenge_participants")
    .update({ manual_progress: next })
    .eq("challenge_id", challengeId)
    .eq("user_id", user.id);
  if (error) return errResult(friendlyError(error));
  revalidatePath(`/g/${groupId}`, "layout");
  return okResult("Progress updated.");
}
