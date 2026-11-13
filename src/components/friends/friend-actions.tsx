"use client";
import { useState } from "react";
import { Check, Copy, Share2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useAction } from "@/lib/use-action";
import { cancelFriendRequest, removeFriend, respondFriendRequest, sendFriendRequest } from "@/app/actions/friends";

export function AddFriendForm({ initial = "" }: { initial?: string }) {
  const [name, setName] = useState(initial);
  const [send, pending] = useAction(sendFriendRequest, { onSuccess: () => setName("") });
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        send(name);
      }}
    >
      <div className="relative min-w-0 flex-1">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">@</span>
        <Input
          aria-label="Friend's username"
          value={name}
          onChange={(e) => setName(e.target.value.toLowerCase().replace(/^@/, ""))}
          placeholder="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="pl-8"
          required
        />
      </div>
      <Button type="submit" loading={pending}>
        {pending ? null : <UserPlus className="h-4 w-4" />} Add
      </Button>
    </form>
  );
}

export function ShareMyUsername({ username }: { username: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/friends?add=${username}` : `/friends?add=${username}`;
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Add me on nudge", text: `Add me on nudge: @${username}`, url: link });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("Couldn't copy. Your username is @" + username, "error");
    }
  }
  return (
    <button type="button" onClick={share} className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.05] px-4 py-3 text-left transition hover:bg-white/[0.08] cursor-pointer">
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted">Your username</span>
        <span className="wrap-text block font-semibold">@{username}</span>
      </span>
      <span className="flex items-center gap-1.5 text-sm font-semibold text-lime">
        {copied ? <Check className="h-4 w-4" /> : typeof navigator !== "undefined" && "share" in navigator ? <Share2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Share"}
      </span>
    </button>
  );
}

export function RequestButtons({ id, incoming }: { id: string; incoming: boolean }) {
  const [respond, responding] = useAction(respondFriendRequest);
  const [cancel, cancelling] = useAction(cancelFriendRequest);
  if (!incoming)
    return (
      <Button variant="ghost" size="sm" loading={cancelling} onClick={() => cancel(id)}>
        Cancel
      </Button>
    );
  return (
    <div className="flex shrink-0 gap-1.5">
      <Button size="sm" loading={responding} onClick={() => respond(id, true)}>
        <Check className="h-4 w-4" /> Accept
      </Button>
      <Button variant="secondary" size="icon" aria-label="Decline" disabled={responding} onClick={() => respond(id, false)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function RemoveFriendButton({ userId, name }: { userId: string; name: string }) {
  const [remove, pending] = useAction(removeFriend);
  return (
    <Button variant="ghost" size="sm" loading={pending} className="hover:text-danger" onClick={() => confirm(`Remove ${name} as a friend?`) && remove(userId)}>
      Remove friend
    </Button>
  );
}
