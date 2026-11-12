"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/data";
import { errResult, okResult, type ActionResult } from "@/lib/action";
import { friendlyError } from "@/lib/utils";

// All values arrive already converted to metric by the client.
const num = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().min(min).max(max).nullable());
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.");

const healthSchema = z.object({
  height_cm: num(50, 272),
  starting_weight_kg: num(20, 400),
  target_weight_kg: num(20, 400),
  health_goals: z.string().max(2000).nullable().optional(),
});

export async function saveHealthProfile(input: z.input<typeof healthSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = healthSchema.safeParse(input);
  if (!parsed.success) return errResult("One of those numbers is out of range.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("private_health_profiles")
    .upsert({ user_id: user.id, ...parsed.data, health_goals: parsed.data.health_goals || null });
  if (error) return errResult(friendlyError(error));
  revalidatePath("/me");
  return okResult("Saved. Only you can see this.");
}

const weightSchema = z.object({ entry_date: date, weight_kg: num(20, 400), note: z.string().max(500).optional() });

export async function addWeight(input: z.input<typeof weightSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = weightSchema.safeParse(input);
  if (!parsed.success || parsed.data.weight_kg === null) return errResult("Enter a weight between 20 and 400 kg.");
  const supabase = await createClient();
  const { error } = await supabase.from("weight_entries").upsert(
    { user_id: user.id, entry_date: parsed.data.entry_date, weight_kg: parsed.data.weight_kg, note: parsed.data.note || null },
    { onConflict: "user_id,entry_date" },
  );
  if (error) return errResult(friendlyError(error));
  revalidatePath("/me");
  return okResult("Weigh-in logged. Private, as always.");
}

export async function deleteWeight(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("weight_entries").delete().eq("id", id).eq("user_id", user.id);
  if (error) return errResult(friendlyError(error));
  revalidatePath("/me");
  return okResult("Deleted.");
}

const measurementSchema = z.object({
  measured_on: date,
  waist_cm: num(20, 300),
  hips_cm: num(20, 300),
  chest_cm: num(20, 300),
  body_fat_pct: num(1, 75),
  resting_hr: num(20, 250),
  vo2max: num(5, 100),
  pushups_max: num(0, 1000),
  plank_seconds: num(0, 36000),
  note: z.string().max(500).optional(),
});

export async function addMeasurement(input: z.input<typeof measurementSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = measurementSchema.safeParse(input);
  if (!parsed.success) return errResult("One of those numbers is out of range.");
  const { note, ...rest } = parsed.data;
  const values = Object.entries(rest).filter(([k, v]) => k !== "measured_on" && v !== null);
  if (values.length === 0) return errResult("Fill in at least one measurement.");
  const supabase = await createClient();
  const { error } = await supabase.from("body_measurements").insert({
    user_id: user.id,
    ...rest,
    resting_hr: rest.resting_hr === null ? null : Math.round(rest.resting_hr),
    pushups_max: rest.pushups_max === null ? null : Math.round(rest.pushups_max),
    plank_seconds: rest.plank_seconds === null ? null : Math.round(rest.plank_seconds),
    note: note || null,
  });
  if (error) return errResult(friendlyError(error));
  revalidatePath("/me");
  return okResult("Measurements saved.");
}

export async function deleteMeasurement(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("body_measurements").delete().eq("id", id).eq("user_id", user.id);
  if (error) return errResult(friendlyError(error));
  revalidatePath("/me");
  return okResult("Deleted.");
}

export async function addHealthNote(body: string): Promise<ActionResult> {
  const user = await requireUser();
  const text = body.trim();
  if (!text) return errResult("Write something first.");
  if (text.length > 4000) return errResult("That's a novel. Keep it under 4000 characters.");
  const supabase = await createClient();
  const { error } = await supabase.from("health_notes").insert({ user_id: user.id, body: text });
  if (error) return errResult(friendlyError(error));
  revalidatePath("/me");
  return okResult("Note saved.");
}

export async function deleteHealthNote(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("health_notes").delete().eq("id", id).eq("user_id", user.id);
  if (error) return errResult(friendlyError(error));
  revalidatePath("/me");
  return okResult("Deleted.");
}
