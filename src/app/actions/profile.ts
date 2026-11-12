"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/data";
import { errResult, okResult, type ActionResult } from "@/lib/action";
import { friendlyError } from "@/lib/utils";
import { SUPABASE_URL } from "@/lib/env";

const profileSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, "Usernames are 3–20 characters: lowercase letters, numbers, underscores."),
  display_name: z.string().trim().max(40).optional().transform((v) => v || null),
  bio: z.string().trim().max(160).optional().transform((v) => v || null),
});

export async function updateProfile(form: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    username: form.get("username"),
    display_name: form.get("display_name") ?? undefined,
    bio: form.get("bio") ?? undefined,
  });
  if (!parsed.success) return errResult(parsed.error.issues[0]!.message);
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return errResult(friendlyError(error));
  revalidatePath("/", "layout");
  return okResult("Profile saved.");
}

/** The browser uploads straight to Storage (RLS restricts it to avatars/<uid>/); we just record the URL. */
export async function setAvatar(path: string | null): Promise<ActionResult> {
  const user = await requireUser();
  if (path && !path.startsWith(`${user.id}/`)) return errResult("Invalid avatar path.");
  const supabase = await createClient();
  const url = path ? `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}` : null;
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) return errResult(friendlyError(error));
  revalidatePath("/", "layout");
  return okResult(path ? "Looking good." : "Avatar removed.");
}

const settingsSchema = z.object({
  timezone: z.string().min(1).max(64).optional(),
  weight_unit: z.enum(["kg", "lb"]).optional(),
  length_unit: z.enum(["cm", "in"]).optional(),
  share_habits: z.boolean().optional(),
  default_workout_visibility: z.enum(["groups", "private"]).optional(),
  notify_reactions: z.boolean().optional(),
  notify_challenges: z.boolean().optional(),
  notify_invites: z.boolean().optional(),
  notify_squad_joins: z.boolean().optional(),
});

export async function updateSettings(patch: z.infer<typeof settingsSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = settingsSchema.safeParse(patch);
  if (!parsed.success) return errResult("Invalid setting.");
  if (parsed.data.timezone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: parsed.data.timezone });
    } catch {
      return errResult("Unknown timezone.");
    }
  }
  const supabase = await createClient();
  const { error } = await supabase.from("user_settings").update(parsed.data).eq("user_id", user.id);
  if (error) return errResult(friendlyError(error));
  revalidatePath("/", "layout");
  return okResult("Saved.");
}

export async function deleteAccount(confirm: string): Promise<ActionResult> {
  if (confirm !== "DELETE") return errResult('Type DELETE to confirm.');
  const user = await requireUser();
  const supabase = await createClient();
  // remove avatar files first (storage objects aren't cascaded)
  const { data: files } = await supabase.storage.from("avatars").list(user.id);
  if (files?.length) await supabase.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return errResult(friendlyError(error));
  await supabase.auth.signOut();
  redirect("/?bye=1");
}

export async function markNotificationsRead(): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/", "layout");
  return okResult();
}

export async function clearNotifications(): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").delete().eq("user_id", user.id);
  revalidatePath("/notifications");
  return okResult("Cleared.");
}
