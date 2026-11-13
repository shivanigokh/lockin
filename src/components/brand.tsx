import { cn } from "@/lib/utils";
import { COPY } from "@/lib/constants";

export const APP_NAME = "nudge";

/** Two soft orbs: a small tomato one nudging a bigger blueberry one into motion. */
export function NudgeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-7 w-7", className)} aria-hidden>
      <defs>
        <radialGradient id="nm-b" cx="38%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".45" stopColor="#d9daff" />
          <stop offset="1" stopColor="#7579e0" />
        </radialGradient>
        <radialGradient id="nm-t" cx="38%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".45" stopColor="#ffd2cb" />
          <stop offset="1" stopColor="#e94b3c" />
        </radialGradient>
        <filter id="nm-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="nm-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#nm-glow)" opacity=".85">
        <circle cx="25" cy="36" r="15" fill="#7579e0" />
        <circle cx="45" cy="27" r="11" fill="#e94b3c" />
      </g>
      <g filter="url(#nm-soft)">
        <circle cx="25" cy="36" r="14" fill="url(#nm-b)" />
        <circle cx="45" cy="26" r="10" fill="url(#nm-t)" />
      </g>
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
