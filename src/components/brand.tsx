import { cn } from "@/lib/utils";
import { COPY } from "@/lib/constants";

export function LockGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-6 w-6", className)} aria-hidden>
      <rect x="4" y="10" width="16" height="11" rx="3" fill="currentColor" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="1.7" fill="var(--color-bg)" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <LockGlyph className="h-7 w-7 text-lime transition-transform group-hover:animate-wiggle" />
      {compact ? null : <span className="font-display text-xl font-black tracking-tight">LOCK IN</span>}
    </span>
  );
}

export function Marquee({ className }: { className?: string }) {
  const items = [COPY.tagline, COPY.leaderboard, COPY.couch, COPY.hydrated];
  const row = [...items, ...items];
  return (
    <div className={cn("overflow-hidden border-y border-line bg-lime py-2 text-black", className)}>
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-mono text-xs font-medium uppercase tracking-widest">
        {[...row, ...row].map((t, i) => (
          <span key={i} className="flex items-center gap-10">
            {t} <span aria-hidden>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
