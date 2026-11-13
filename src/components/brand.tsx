import { cn } from "@/lib/utils";
import { COPY } from "@/lib/constants";

export const APP_NAME = "nudge";

/** A lowercase "n" arch getting a push from a tomato dot, on a blueberry tile. */
export function NudgeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-7 w-7", className)} aria-hidden>
      <defs>
        <linearGradient id="nm-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8d90f0" />
          <stop offset="1" stopColor="#6064d4" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#nm-bg)" />
      <path d="M18 48V30a14 14 0 0 1 28 0v18" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
      <circle cx="51" cy="20" r="6.5" fill="#ff5a45" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <NudgeMark className="h-8 w-8 transition-transform group-hover:animate-wiggle" />
      {compact ? null : <span className="font-display text-[22px] font-semibold tracking-[-0.04em]">{APP_NAME}</span>}
    </span>
  );
}

export function Marquee({ className }: { className?: string }) {
  const items = [COPY.tagline, COPY.leaderboard, COPY.couch, COPY.hydrated];
  const row = [...items, ...items];
  return (
    <div className={cn("glass overflow-hidden rounded-none border-x-0 py-3", className)}>
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap text-sm font-medium text-lavender">
        {[...row, ...row].map((t, i) => (
          <span key={i} className="flex items-center gap-10">
            {t} <span aria-hidden className="text-pink">●</span>
          </span>
        ))}
      </div>
    </div>
  );
}
