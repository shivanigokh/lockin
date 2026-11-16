"use server";
import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/data";
import { errResult, okResult, type ActionResult } from "@/lib/action";
import { friendlyError } from "@/lib/utils";
import { disconnectStrava as revokeStrava, stravaErrorMessage, syncStrava as pullStrava } from "@/lib/strava";

// ------------------------------------------------------------------ strava ---

export async function syncStrava(opts: { quiet?: boolean } = {}): Promise<ActionResult<{ added: number }>> {
  const user = await requireUser();
  const supabase = await createClient();
  try {
    const { added } = await pullStrava(supabase, user.id);
    if (added) revalidatePath("/", "layout");
    if (opts.quiet && !added) return okResult(undefined, { added });
    return okResult(added ? `Pulled ${added} workout${added === 1 ? "" : "s"} from Strava.` : "Up to date with Strava.", { added });
  } catch (e) {
    if (opts.quiet) return okResult(undefined, { added: 0 });
    return errResult(stravaErrorMessage(e));
  }
}

export async function disconnectStrava(): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  await revokeStrava(supabase, user.id);
  // Strava's terms ask apps to delete Strava data when a user disconnects.
  const { error } = await supabase.from("workouts").delete().eq("user_id", user.id).eq("source", "strava");
  if (error) return errResult(friendlyError(error));
  revalidatePath("/", "layout");
  return okResult("Strava disconnected and its workouts removed.");
}

// ----------------------------------------------- apple health (shortcut) ---

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/** Creates (or replaces) the personal token the iOS Shortcut uses. Shown once. */
export async function createIngestToken(): Promise<ActionResult<{ token: string }>> {
  const user = await requireUser();
  const token = `nk_${randomBytes(24).toString("base64url")}`;
  const supabase = await createClient();
  const { error } = await supabase
    .from("ingest_tokens")
    .upsert({ user_id: user.id, token_hash: hash(token), created_at: new Date().toISOString(), last_used_at: null });
  if (error) return errResult(friendlyError(error));
  revalidatePath("/settings");
  return okResult("New sync key made. Copy it now, it won't be shown again.", { token });
}

export async function revokeIngestToken(): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("ingest_tokens").delete().eq("user_id", user.id);
  if (error) return errResult(friendlyError(error));
  revalidatePath("/settings");
  return okResult("Sync key revoked. Your Shortcut will stop working.");
}

// ------------------------------------------------------------------- meals ---

const optNum = (max: number) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().min(0).max(max).nullable());

const mealSchema = z.object({
  eaten_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  meal: z.enum(["breakfast", "lunch", "dinner", "snack", "day_total"]),
  name: z.string().trim().max(80).optional(),
  calories: z.coerce.number().int("Whole calories please.").min(0).max(20000, "That's a lot of calories."),
  protein_g: optNum(2000),
  carbs_g: optNum(2000),
  fat_g: optNum(2000),
});

export async function addMeal(input: z.input<typeof mealSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = mealSchema.safeParse(input);
  if (!parsed.success) return errResult(parsed.error.issues[0]!.message);
  const supabase = await createClient();
  const { error } = await supabase.from("meal_entries").insert({ ...parsed.data, name: parsed.data.name || null, user_id: user.id });
  if (error) return errResult(friendlyError(error));
  revalidatePath("/me");
  return okResult("Logged. Only you can see this.");
}

export async function deleteMeal(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("meal_entries").delete().eq("id", id).eq("user_id", user.id);
  if (error) return errResult(friendlyError(error));
  revalidatePath("/me");
  return okResult("Deleted.");
}

const targetSchema = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().int().min(500, "Between 500 and 10,000.").max(10000, "Between 500 and 10,000.").nullable(),
);

export async function saveCalorieTarget(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = targetSchema.safeParse(input);
  if (!parsed.success) return errResult(parsed.error.issues[0]!.message);
  const supabase = await createClient();
  const { error } = await supabase.from("private_health_profiles").upsert({ user_id: user.id, calorie_target: parsed.data });
  if (error) return errResult(friendlyError(error));
  revalidatePath("/me");
  return okResult(parsed.data ? "Daily target saved." : "Target cleared.");
}

const dayTotalSchema = z.object({
  eaten_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  calories: z.coerce.number().int("Whole calories please.").min(0).max(20000, "That's a lot of calories."),
});

/** Sets (or replaces) the day's total, e.g. copied from HealthifyMe each night. */
export async function setDayCalories(input: z.input<typeof dayTotalSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = dayTotalSchema.safeParse(input);
  if (!parsed.success) return errResult(parsed.error.issues[0]!.message);
  const supabase = await createClient();
  const { error } = await supabase.from("meal_entries").upsert(
    {
      user_id: user.id,
      eaten_on: parsed.data.eaten_on,
      meal: "day_total",
      name: "Daily total",
      calories: parsed.data.calories,
      source: "manual",
      external_id: `day:${parsed.data.eaten_on}`,
    },
    { onConflict: "user_id,source,external_id" },
  );
  if (error) return errResult(friendlyError(error));
  revalidatePath("/", "layout");
  return okResult("Saved. Only you can see this.");
}
