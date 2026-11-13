"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, KeyRound, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { colorVar, squadIcon, MIN_MEMBERS } from "@/lib/constants";
import type { MyGroup } from "@/lib/data";

export function SquadBadge({ g, size = 32 }: { g: Pick<MyGroup, "icon" | "color">; size?: number }) {
  const Icon = squadIcon(g.icon);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[30%] text-[#141218]"
      style={{ width: size, height: size, background: colorVar(g.color) }}
    >
      <Icon style={{ width: size * 0.55, height: size * 0.55 }} />
    </span>
  );
}

export function SquadSwitcher({ groups, activeId, className, compact }: { groups: MyGroup[]; activeId: string | null; className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = groups.find((g) => g.id === activeId) ?? null;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex w-full items-center text-left transition cursor-pointer",
          compact ? "gap-2 rounded-full p-1 pr-2 active:bg-white/[0.06]" : "gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-2 pr-3 hover:bg-white/[0.08]",
        )}
      >
        {active ? <SquadBadge g={active} size={compact ? 28 : 32} /> : <span className="h-8 w-8 rounded-xl border border-dashed border-faint" />}
        <span className="min-w-0 flex-1">
          {compact ? null : <span className="label-mono block text-[10px]">squad</span>}
          <span className={cn("wrap-text block text-sm font-bold", compact && "leading-tight")}>{active?.name ?? "Pick a squad"}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 min-w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-3xl border border-white/10 bg-sheet/85 p-1.5 shadow-2xl backdrop-blur-3xl animate-rise"
        >
          {groups.length === 0 ? <p className="px-3 py-2 text-sm text-muted">No squads yet.</p> : null}
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/g/${g.id}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.08]"
            >
              <SquadBadge g={g} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block wrap-text text-sm font-semibold">{g.name}</span>
                <span className="label-mono text-[10px]">
                  {g.member_count}/10 {g.member_count < MIN_MEMBERS ? "· filling" : ""} {g.role === "admin" ? "· admin" : ""}
                </span>
              </span>
              {g.id === activeId ? <Check className="h-4 w-4 text-lime" /> : null}
            </Link>
          ))}
          <div className="my-1 h-px bg-line" />
          <Link href="/squads/new" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-white/[0.08]">
            <Plus className="h-4 w-4 text-lime" /> New squad
          </Link>
          <Link href="/squads/join" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-white/[0.08]">
            <KeyRound className="h-4 w-4 text-pink" /> Join with a code
          </Link>
        </div>
      ) : null}
    </div>
  );
}
