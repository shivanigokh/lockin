import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import { getMe } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress";
import { AddFriendForm, RequestButtons, ShareMyUsername } from "@/components/friends/friend-actions";
import { displayName } from "@/lib/utils";
import { prettyDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Friends" };

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const { add } = await searchParams;
  const me = await getMe();
  const supabase = await createClient();
  const [{ data: friends }, { data: requests }] = await Promise.all([
    supabase.rpc("my_friends", { p_today: me.today }),
    supabase.rpc("my_friend_requests"),
  ]);
  const incoming = (requests ?? []).filter((r) => r.direction === "incoming");
  const outgoing = (requests ?? []).filter((r) => r.direction === "outgoing");
  const addName = add && add !== me.profile.username ? add.replace(/[^a-z0-9_]/gi, "").toLowerCase() : "";

  return (
    <Page className="max-w-2xl">
      <PageHeader title="Friends" sub="Follow a friend one-to-one, no squad needed. You both see each other's shared workouts and habits." />

      <div className="space-y-4">
        {incoming.length ? (
          <Card>
            <CardHeader title={`Requests (${incoming.length})`} />
            <ul className="space-y-3">
              {incoming.map((r) => (
                <li key={r.id} className="flex items-center gap-3">
                  <Avatar name={displayName(r)} src={r.avatar_url} seed={r.user_id} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="wrap-text font-semibold">{displayName(r)}</div>
                    <div className="wrap-text text-xs text-muted">@{r.username} wants to be friends</div>
                  </div>
                  <RequestButtons id={r.id} incoming />
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Add a friend" />
          <AddFriendForm initial={addName} />
          <div className="mt-3">
            <ShareMyUsername username={me.profile.username} />
          </div>
          {outgoing.length ? (
            <ul className="mt-4 space-y-2">
              {outgoing.map((r) => (
                <li key={r.id} className="flex items-center gap-3 text-sm">
                  <Avatar name={displayName(r)} src={r.avatar_url} seed={r.user_id} size={28} />
                  <span className="wrap-text flex-1 text-muted">
                    Waiting on <span className="text-ink">@{r.username}</span>
                  </span>
                  <RequestButtons id={r.id} incoming={false} />
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card className="p-2 sm:p-2">
          <div className="px-3 pb-1 pt-3 sm:px-4">
            <CardHeader title={friends?.length ? `Your friends (${friends.length})` : "No friends yet"} className="mb-1" />
            {!friends?.length ? <p className="pb-3 text-sm text-muted">Add someone above. Two is enough for a little healthy pressure.</p> : null}
          </div>
          <ul className="divide-y divide-white/[0.07]">
            {(friends ?? []).map((f) => {
              const pct = f.habits_total ? (f.habits_done / f.habits_total) * 100 : 0;
              return (
                <li key={f.user_id}>
                  <Link href={`/friends/${f.user_id}`} className="flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-white/[0.04] sm:px-4">
                    <Avatar name={displayName(f)} src={f.avatar_url} seed={f.user_id} size={42} />
                    <div className="min-w-0 flex-1">
                      <div className="wrap-text font-semibold">{displayName(f)}</div>
                      <div className="text-xs text-muted">
                        {f.workouts_7d} {f.workouts_7d === 1 ? "workout" : "workouts"} · {f.minutes_7d} min this week
                      </div>
                      {f.habits_total ? (
                        <div className="mt-1.5 flex items-center gap-2">
                          <ProgressBar value={pct} size="sm" color={pct >= 100 ? "var(--color-lime)" : "var(--color-lavender)"} />
                          <span className="shrink-0 text-[11px] text-muted">
                            {f.habits_done}/{f.habits_total} habits
                          </span>
                        </div>
                      ) : (
                        <p className="mt-0.5 text-xs text-faint">
                          {f.last_workout ? `Last workout ${prettyDate(f.last_workout)}` : "No shared workouts yet"}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-faint" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        <p className="flex items-start gap-2 px-1 text-xs text-faint">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Friends see your shared workouts and habit check-ins, like squad-mates do. Never your weight, measurements, notes or private goals.
        </p>
      </div>
    </Page>
  );
}
