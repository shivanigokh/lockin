"use client";
import { useState } from "react";
import { SmilePlus, Flag, Megaphone, PartyPopper, Swords, Target, Trash2, UserMinus, UserPlus, CheckCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Empty } from "@/components/ui/empty";
import { activity, REACTIONS } from "@/lib/constants";
import { cn, displayName, fmtNum } from "@/lib/utils";
import { relTime } from "@/lib/dates";
import { useAction } from "@/lib/use-action";
import { deleteActivity, postMessage, toggleReaction } from "@/app/actions/social";

export type FeedItemData = {
  id: string;
  kind: string;
  body: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  actor: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
  reactions: { emoji: string; user_id: string }[];
};

function describe(item: FeedItemData, meId: string): { text: React.ReactNode; icon?: React.ReactNode } {
  const who = item.actor?.id === meId ? "You" : displayName(item.actor);
  const p = item.payload as Record<string, string | number | null>;
  switch (item.kind) {
    case "workout": {
      const a = activity(p.activity_type as string);
      const dist = p.distance_km ? Number(p.distance_km) : null;
      const verb = who === "You" ? "logged" : "completed";
      const what = dist ? `a ${fmtNum(dist, 2)} km ${a.verb}` : `a ${p.duration_min}-minute ${a.verb}`;
      return {
        text: (
          <>
            <b>{who}</b> {verb} {what}
            {dist ? <span className="text-muted"> · {p.duration_min} min</span> : null}.
          </>
        ),
        icon: <a.icon className="h-4 w-4" style={{ color: a.color }} />,
      };
    }
    case "habits_all":
      return {
        text: (
          <>
            <b>{who}</b> completed all {p.count} habits today. Insufferable.
          </>
        ),
        icon: <CheckCheck className="h-4 w-4 text-lime" />,
      };
    case "joined":
      return {
        text: (
          <>
            <b>{who}</b> joined the squad. <span className="text-muted">({p.member_count}/10)</span>
          </>
        ),
        icon: <UserPlus className="h-4 w-4 text-lavender" />,
      };
    case "left":
      return { text: <><b>{(p.name as string) || "Someone"}</b> left the squad.</>, icon: <UserMinus className="h-4 w-4 text-muted" /> };
    case "milestone":
      return {
        text: (
          <>
            The squad just completed <b className="text-lime">{p.count} workouts</b> this week.
          </>
        ),
        icon: <PartyPopper className="h-4 w-4 text-pink" />,
      };
    case "challenge_created":
      return { text: <><b>{who}</b> started a challenge: <b>{p.title}</b></>, icon: <Swords className="h-4 w-4 text-orange" /> };
    case "challenge_joined":
      return { text: <><b>{who}</b> joined <b>{p.title}</b></>, icon: <Flag className="h-4 w-4 text-orange" /> };
    case "goal_shared":
      return { text: <><b>{who}</b> shared a goal: <b>{p.title}</b></>, icon: <Target className="h-4 w-4 text-cyan" /> };
    default:
      return { text: item.body, icon: <Megaphone className="h-4 w-4 text-muted" /> };
  }
}

export function Composer({ groupId }: { groupId: string }) {
  const [text, setText] = useState("");
  const [post, pending] = useAction(postMessage, { onSuccess: () => setText("") });
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        post(groupId, text);
      }}
    >
      <Textarea
        aria-label="Post to the squad"
        rows={1}
        maxLength={280}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (text.trim()) post(groupId, text);
          }
        }}
        placeholder="Say something…"
        className="!min-h-10 h-10 resize-none py-2"
      />
      <Button type="submit" loading={pending} disabled={!text.trim()} className="h-10">
        Post
      </Button>
    </form>
  );
}

function FeedRow({ item, meId, groupId, isAdmin }: { item: FeedItemData; meId: string; groupId: string; isAdmin: boolean }) {
  const [react] = useAction(toggleReaction);
  const [del, deleting] = useAction(deleteActivity);
  const [optimistic, setOptimistic] = useState(item.reactions);
  const { text, icon } = describe(item, meId);
  const isMessage = item.kind === "message";
  const name = item.actor ? displayName(item.actor) : "LOCK IN";
  const counts = REACTIONS.map((r) => ({
    ...r,
    n: optimistic.filter((x) => x.emoji === r.key).length,
    mine: optimistic.some((x) => x.emoji === r.key && x.user_id === meId),
  }));
  const canDelete = isMessage && (item.actor?.id === meId || isAdmin);
  const [picker, setPicker] = useState(false);

  return (
    <li className="group flex gap-3 py-3 animate-rise">
      {item.actor ? (
        <Avatar name={name} src={item.actor.avatar_url} seed={item.actor.id} size={32} />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3">{icon}</span>
      )}
      <div className="min-w-0 flex-1">
        {isMessage ? (
          <>
            <span className="wrap-text text-sm font-bold">{item.actor?.id === meId ? "You" : name}</span>
            <p className="wrap-text mt-0.5 whitespace-pre-wrap text-[15px] leading-snug">{item.body}</p>
          </>
        ) : (
          <>
            <p className="flex items-start gap-2 text-sm leading-snug sm:text-[15px]">
              {item.actor ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
              <span className="wrap-text">{text}</span>
            </p>
            {item.kind === "workout" && item.payload.note ? (
              <p className="mt-1 border-l-2 border-line pl-3 text-sm italic text-muted">&ldquo;{String(item.payload.note)}&rdquo;</p>
            ) : null}
          </>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-faint">{relTime(item.created_at)}</span>
          {counts.filter((r) => r.n > 0 || picker).map((r) => (
            <button
              key={r.key}
              type="button"
              title={r.label}
              aria-label={`${r.label}${r.n ? ` (${r.n})` : ""}`}
              aria-pressed={r.mine}
              onClick={() => {
                const on = !r.mine;
                setPicker(false);
                setOptimistic((cur) =>
                  on ? [...cur, { emoji: r.key, user_id: meId }] : cur.filter((x) => !(x.emoji === r.key && x.user_id === meId)),
                );
                react(groupId, item.id, r.key, on);
              }}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs transition cursor-pointer active:animate-pop",
                r.mine ? "border-lime/60 bg-lime/10 text-lime" : "border-line text-muted hover:border-faint",
              )}
            >
              <span>{r.glyph}</span>
              {r.n ? <span className="font-mono">{r.n}</span> : null}
            </button>
          ))}
          <button
            type="button"
            aria-label={picker ? "Close reactions" : "Add reaction"}
            aria-expanded={picker}
            onClick={() => setPicker((v) => !v)}
            className="inline-flex h-7 items-center rounded-full px-1.5 text-xs text-faint transition hover:text-ink cursor-pointer"
          >
            {picker ? "×" : <SmilePlus className="h-3.5 w-3.5" />}
          </button>
          {canDelete ? (
            <button
              type="button"
              aria-label="Delete post"
              disabled={deleting}
              onClick={() => del(groupId, item.id)}
              className="ml-auto rounded-lg p-1.5 text-faint opacity-0 transition hover:text-danger group-hover:opacity-100 focus:opacity-100 max-md:opacity-60 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function FeedList({ items, meId, groupId, isAdmin }: { items: FeedItemData[]; meId: string; groupId: string; isAdmin: boolean }) {
  if (!items.length) return <Empty title="Dead quiet." body="Log a workout or say something. Someone has to go first." />;
  return (
    <ul className="divide-y divide-line/60">
      {items.map((i) => (
        <FeedRow key={i.id + i.reactions.length} item={i} meId={meId} groupId={groupId} isAdmin={isAdmin} />
      ))}
    </ul>
  );
}
