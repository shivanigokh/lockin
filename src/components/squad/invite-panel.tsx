"use client";
import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function InviteLink({ code, groupName }: { code: string; groupName: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const toast = useToast();
  const link = typeof window !== "undefined" ? `${window.location.origin}/join/${code}` : `/join/${code}`;

  async function copy(what: "code" | "link") {
    try {
      await navigator.clipboard.writeText(what === "code" ? code : link);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast("Couldn't copy. Select it manually.", "error");
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join ${groupName} on nudge`, text: `Get in, loser. Code: ${code}`, url: link });
      } catch {
        /* cancelled */
      }
    } else copy("link");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => copy("code")}
        className="rounded-xl border border-dashed border-lime/60 bg-lime/5 px-3 py-2 font-mono text-lg font-bold tracking-[0.2em] text-lime sm:px-4 sm:text-xl sm:tracking-[0.3em] transition hover:bg-lime/10 cursor-pointer"
        title="Copy code"
      >
        {code}
      </button>
      <Button variant="secondary" size="md" onClick={() => copy("link")}>
        {copied === "link" ? <Check className="h-4 w-4 text-lime" /> : <Copy className="h-4 w-4" />} Copy link
      </Button>
      <Button variant="secondary" size="md" onClick={share} aria-label="Share invite">
        <Share2 className="h-4 w-4" /> Share
      </Button>
      {copied === "code" ? <span className="label-mono text-lime">copied</span> : null}
    </div>
  );
}
