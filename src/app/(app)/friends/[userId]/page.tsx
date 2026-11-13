import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getMe } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Page } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ProgressRing } from "@/components/ui/progress";
import { RemoveFriendButton } from "@/components/friends/friend-actions";
import { activity, habitIcon } from "@/lib/constants";
import { cn, displayName, fmtNum } from "@/lib/utils";
import { prettyDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Friend" };

export default async function FriendPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const me = await getMe();
  const supabase = await createClient();
  const { data: isFriend } = await supabase.rpc("is_friend", { p_user: userId });
  if (!isFriend) notFound();

  const since = new Date(new Date(me.today).getTime() - 29 * 864e5).toISOString().slice(0, 10);
  const weekStart = new Date(new Date(me.today).getTime() - 6 * 864e5).toISOString().slice(0, 10);
  // Every query below is filtered again by RLS: only shared workouts and visible habits come back.
  const [{ data: profile }, { data: workouts }, { data: habits }, { data: done }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, avatar_url, bio").eq("id", userId).single(),
    supabase
      .from("workouts")
      .select("id, activity_type, performed_on, duration_min, distance_km")
      .eq("user_id", userId)
      .gte("performed_on", since)
      .order("performed_on", { ascending: false })
      .limit(30),
    supabase.from("daily_habits").select("id, name, icon").eq("user_id", userId).eq("archived", false).order("sort_order"),
    supabase.from("habit_completions").select("habit_id").eq("user_id", userId).eq("completed_on", me.today),
  ]);
  if (!profile) notFound();

  const name = displayName(profile);
  const ws = workouts ?? [];
  const week = ws.filter((w) => w.performed_on >= weekStart);
  const doneSet = new Set((done ?? []).map((d) => d.habit_id));
  const hs = habits ?? [];

  return (
    <Page className="max-w-2xl">
      <Link href="/friends" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" /> Friends
      </Link>
      <div className="mb-5 flex items-center gap-4">
        <Avatar name={name} src={profile.avatar_url} seed={profile.id} size={64} />
        <div className="min-w-0">
          <h1 className="display wrap-text text-[30px]">{name}</h1>
          <p className="wrap-text text-sm text-muted">@{profile.username}</p>
          {profile.bio ? <p className="mt-1 text-sm text-muted">{profile.bio}</p> : null}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="card px-4 py-3">
          <div className="font-display text-3xl font-bold tabular-nums text-lime">{week.length}</div>
          <div className="text-xs text-muted">workouts this week</div>
        </div>
        <div className="card px-4 py-3">
          <div className="font-display text-3xl font-bold tabular-nums text-pink">{week.reduce((s, w) => s + w.duration_min, 0)}</div>
          <div className="text-xs text-muted">active minutes this week</div>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Habits today" />
          {hs.length ? (
            <>
              <div className="mb-3 flex items-center gap-3">
                <ProgressRing value={doneSet.size / hs.length} label={`${doneSet.size}/${hs.length}`} size={52} />
                <p className="text-sm text-muted">{doneSet.size === hs.length ? "All done today." : `${hs.length - doneSet.size} still to go.`}</p>
              </div>
              <ul className="grid grid-cols-2 gap-2">
                {hs.map((h) => {
                  const I = habitIcon(h.icon);
                  const d = doneSet.has(h.id);
                  return (
                    <li key={h.id} className={cn("flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px]", d ? "bg-lime/10 text-lime" : "bg-white/[0.05] text-muted")}>
                      <I className="h-4 w-4 shrink-0" />
                      <span className="wrap-text leading-tight">{h.name}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted">{name} keeps their habits private.</p>
          )}
        </Card>

        <Card>
          <CardHeader title="Last 30 days" />
          {ws.length ? (
            <ul className="space-y-2">
              {ws.map((w) => {
                const a = activity(w.activity_type);
                return (
                  <li key={w.id} className="flex items-center gap-3 rounded-xl bg-white/[0.05] px-3 py-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#141218]" style={{ background: a.color }}>
                      <a.icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-sm font-semibold">{a.label}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {prettyDate(w.performed_on)} · {w.duration_min} min{w.distance_km ? ` · ${fmtNum(Number(w.distance_km), 1)} km` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">No shared workouts in the last 30 days. A gentle nudge might help.</p>
          )}
        </Card>

        <div className="flex justify-center">
          <RemoveFriendButton userId={profile.id} name={name} />
        </div>
      </div>
    </Page>
  );
}
