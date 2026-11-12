"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_GROUP_COOKIE, requireUser } from "@/lib/data";
import { errResult, okResult, type ActionResult } from "@/lib/action";
import { friendlyError } from "@/lib/utils";
import { SQUAD_COLORS, SQUAD_ICONS } from "@/lib/constants";

const squadSchema = z.object({
  name: z.string().trim().min(3, "Squad names need at least 3 characters.").max(40, "Keep the name under 40 characters."),
  description: z.string().trim().max(280).optional(),
  icon: z.string().refine((v) => v in SQUAD_ICONS, "Pick an icon."),
  color: z.enum(SQUAD_COLORS),
});

async function setActive(groupId: string) {
  const c = await cookies();
  c.set(ACTIVE_GROUP_COOKIE, groupId, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

export async function createSquad(input: z.input<typeof squadSchema>): Promise<ActionResult> {
  await requireUser();
  const parsed = squadSchema.safeParse(input);
  if (!parsed.success) return errResult(parsed.error.issues[0]!.message);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_group", {
    p_name: parsed.data.name,
    p_description: parsed.data.description ?? "",
    p_icon: parsed.data.icon,
    p_color: parsed.data.color,
  });
  if (error) return errResult(friendlyError(error));
  await setActive(data);
  revalidatePath("/", "layout");
  redirect(`/g/${data}/squad?created=1`);
}

export async function updateSquad(groupId: string, input: z.input<typeof squadSchema> & {
  members_can_invite: boolean;
  members_can_create_challenges: boolean;
  auto_feed_posts: boolean;
}): Promise<ActionResult> {
  await requireUser();
  const parsed = squadSchema.safeParse(input);
  if (!parsed.success) return errResult(parsed.error.issues[0]!.message);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      icon: parsed.data.icon,
      color: parsed.data.color,
      members_can_invite: !!input.members_can_invite,
      members_can_create_challenges: !!input.members_can_create_challenges,
      auto_feed_posts: !!input.auto_feed_posts,
    })
    .eq("id", groupId)
    .select("id");
  if (error) {
    if (error.message.includes("groups_name_key")) return errResult("That squad name is taken.");
    return errResult(friendlyError(error));
  }
  if (!data?.length) return errResult("Only squad admins can change settings.");
  revalidatePath("/", "layout");
  return okResult("Squad updated.");
}

export async function deleteSquad(groupId: string, confirmName: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { data: g } = await supabase.from("groups").select("name").eq("id", groupId).single();
  if (!g || g.name.trim().toLowerCase() !== confirmName.trim().toLowerCase()) return errResult("Type the squad name exactly to confirm.");
  const { data, error } = await supabase.from("groups").delete().eq("id", groupId).select("id");
  if (error) return errResult(friendlyError(error));
  if (!data?.length) return errResult("Only squad admins can delete a squad.");
  (await cookies()).delete(ACTIVE_GROUP_COOKIE);
  revalidatePath("/", "layout");
  redirect("/home");
}

export async function joinSquad(code: string): Promise<ActionResult> {
  await requireUser();
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,12}$/.test(clean)) return errResult("Invite codes are 8 letters and numbers.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_group_with_code", { p_code: clean });
  if (error) return errResult(friendlyError(error));
  await setActive(data);
  revalidatePath("/", "layout");
  redirect(`/g/${data}`);
}

export async function leaveSquad(groupId: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_group", { p_group: groupId });
  if (error) return errResult(friendlyError(error));
  const c = await cookies();
  if (c.get(ACTIVE_GROUP_COOKIE)?.value === groupId) c.delete(ACTIVE_GROUP_COOKIE);
  revalidatePath("/", "layout");
  return okResult("You left the squad. They'll miss you (probably).");
}

export async function removeMember(groupId: string, userId: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", { p_group: groupId, p_user: userId });
  if (error) return errResult(friendlyError(error));
  revalidatePath(`/g/${groupId}`, "layout");
  return okResult("Member removed.");
}

export async function setMemberRole(groupId: string, userId: string, role: "admin" | "member"): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_members")
    .update({ role })
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return errResult(friendlyError(error));
  if (!data?.length) return errResult("Only admins can change roles.");
  revalidatePath(`/g/${groupId}`, "layout");
  return okResult(role === "admin" ? "Promoted to admin." : "Now a regular member.");
}

export async function createInviteCode(groupId: string, expiresInDays: number | null, maxUses: number | null): Promise<ActionResult<string>> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invite_code", {
    p_group: groupId,
    p_expires_in_days: expiresInDays ?? undefined,
    p_max_uses: maxUses ?? undefined,
  });
  if (error) return errResult(friendlyError(error));
  revalidatePath(`/g/${groupId}/squad`);
  return okResult("New invite code created.", data);
}

export async function revokeInvite(groupId: string, inviteId: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_invite", { p_invite: inviteId });
  if (error) return errResult(friendlyError(error));
  revalidatePath(`/g/${groupId}/squad`);
  revalidatePath("/settings");
  return okResult("Invite revoked.");
}

export async function inviteByUsername(groupId: string, username: string): Promise<ActionResult> {
  await requireUser();
  if (!username.trim()) return errResult("Type a username.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_user", { p_group: groupId, p_username: username });
  if (error) return errResult(friendlyError(error));
  revalidatePath(`/g/${groupId}/squad`);
  return okResult(`Invite sent to @${username.replace(/^@/, "")}.`);
}

export async function respondToInvite(inviteId: string, accept: boolean): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("respond_to_invite", { p_invite: inviteId, p_accept: accept });
  if (error) return errResult(friendlyError(error));
  revalidatePath("/", "layout");
  if (accept) {
    await setActive(data);
    redirect(`/g/${data}`);
  }
  return okResult("Invite declined.");
}

export async function rememberSquad(groupId: string) {
  await setActive(groupId);
}
