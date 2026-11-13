"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/data";
import { errResult, okResult, type ActionResult } from "@/lib/action";
import { friendlyError } from "@/lib/utils";

export async function sendFriendRequest(username: string): Promise<ActionResult> {
  await requireUser();
  const name = username.trim().replace(/^@/, "").toLowerCase();
  if (!name) return errResult("Type their username.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_friend_request", { p_username: name });
  if (error) {
    if (/NO_SUCH_USER/.test(error.message)) return errResult(`Nobody called @${name} here yet.`);
    if (/SELF/.test(error.message)) return errResult("You're already your own biggest fan.");
    return errResult(friendlyError(error));
  }
  revalidatePath("/friends");
  const status = (data as { status: string } | null)?.status;
  if (status === "already_friends") return okResult(`You and @${name} are already friends.`);
  if (status === "already_sent") return okResult(`Request to @${name} is still waiting.`);
  if (status === "accepted") return okResult(`You and @${name} are now friends.`);
  return okResult(`Request sent to @${name}.`);
}

export async function respondFriendRequest(id: string, accept: boolean): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_friend_request", { p_id: id, p_accept: accept });
  if (error) return errResult(friendlyError(error));
  revalidatePath("/friends");
  return okResult(accept ? "Friend added." : "Request declined.");
}

export async function cancelFriendRequest(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("friendships").delete().eq("id", id);
  if (error) return errResult(friendlyError(error));
  revalidatePath("/friends");
  return okResult("Request cancelled.");
}

export async function removeFriend(userId: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_friend", { p_user: userId });
  if (error) return errResult(friendlyError(error));
  revalidatePath("/friends");
  return okResult("Removed. They can't see your activity any more.");
}
