import "server-only";
import { createClient } from "@/lib/supabase/server";

export type FeedItemData = {
  id: string;
  kind: string;
  body: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  actor: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
  reactions: { emoji: string; user_id: string }[];
};

export async function getFeed(groupId: string, limit = 30, before?: string): Promise<FeedItemData[]> {
  const supabase = await createClient();
  let q = supabase
    .from("group_activity")
    .select(
      "id, kind, body, payload, created_at, actor:profiles!group_activity_actor_id_fkey(id, username, display_name, avatar_url), reactions:activity_reactions(emoji, user_id)",
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) q = q.lt("created_at", before);
  const { data } = await q;
  return (data ?? []) as unknown as FeedItemData[];
}
