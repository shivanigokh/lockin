"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Toggle } from "@/components/ui/field";
import { SQUAD_COLORS, SQUAD_ICONS, colorVar } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAction } from "@/lib/use-action";
import { createSquad, updateSquad } from "@/app/actions/squads";

type Initial = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  members_can_invite: boolean;
  members_can_create_challenges: boolean;
  auto_feed_posts: boolean;
};

const SUGGESTIONS = ["THE SWIM SQUAD", "RUNNING FROM OUR PROBLEMS", "OPERATION: LESS ALCOHOL", "COUCH TO SOMETHING"];

export function SquadForm({ initial }: { initial?: Initial }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "flame");
  const [color, setColor] = useState(initial?.color ?? "lime");
  const [canInvite, setCanInvite] = useState(initial?.members_can_invite ?? true);
  const [canChallenge, setCanChallenge] = useState(initial?.members_can_create_challenges ?? false);
  const [autoFeed, setAutoFeed] = useState(initial?.auto_feed_posts ?? true);
  const [create, creating] = useAction(createSquad);
  const [update, updating] = useAction(updateSquad);
  const Icon = SQUAD_ICONS[icon]!;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const base = { name, description, icon, color: color as (typeof SQUAD_COLORS)[number] };
        if (initial)
          update(initial.id, {
            ...base,
            members_can_invite: canInvite,
            members_can_create_challenges: canChallenge,
            auto_feed_posts: autoFeed,
          });
        else create(base);
      }}
    >
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[#141218] transition sm:h-20 sm:w-20 sm:rounded-3xl" style={{ background: colorVar(color) }}>
          <Icon className="h-7 w-7 sm:h-10 sm:w-10" />
        </span>
        <div className="min-w-0">
          <div className="label-mono">preview</div>
          <div className="display wrap-text text-xl sm:text-3xl">{name || "Your squad"}</div>
        </div>
      </div>

      <Field label="Squad name" htmlFor="s-name" hint="Unique across nudge. 3–40 characters.">
        <Input id="s-name" required minLength={3} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="RUNNING FROM OUR PROBLEMS" />
      </Field>
      {!initial ? (
        <div className="-mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setName(s)} className="rounded-full border border-line px-2.5 py-1 font-mono text-[10px] text-muted transition hover:border-lime hover:text-lime cursor-pointer">
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <Field label="Description" htmlFor="s-desc">
        <Textarea id="s-desc" maxLength={280} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="We swim. We suffer. We brunch." />
      </Field>

      <div>
        <div className="label-mono mb-2">Icon</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SQUAD_ICONS).map(([k, I]) => (
            <button
              key={k}
              type="button"
              aria-label={k}
              aria-pressed={icon === k}
              onClick={() => setIcon(k)}
              className={cn("flex h-11 w-11 items-center justify-center rounded-xl border transition cursor-pointer", icon === k ? "border-lime bg-lime/10 text-lime" : "border-line text-muted hover:text-ink")}
            >
              <I className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="label-mono mb-2">Colour</div>
        <div className="flex gap-2">
          {SQUAD_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={cn("h-10 w-10 rounded-full border-2 transition cursor-pointer", color === c ? "scale-110 border-ink" : "border-transparent")}
              style={{ background: colorVar(c) }}
            />
          ))}
        </div>
      </div>

      {initial ? (
        <div className="divide-y divide-line rounded-2xl border border-line px-4">
          <Toggle checked={canInvite} onChange={setCanInvite} label="Members can invite" description="Otherwise only admins can create invite codes." />
          <Toggle checked={canChallenge} onChange={setCanChallenge} label="Members can create challenges" description="Admins can always create them." />
          <Toggle checked={autoFeed} onChange={setAutoFeed} label="Hype posts" description="Auto-post milestones and all-habits-done shoutouts to the feed." />
        </div>
      ) : null}

      <Button type="submit" size="lg" className="w-full" loading={creating || updating}>
        {initial ? "Save squad" : "Create squad"}
      </Button>
    </form>
  );
}
