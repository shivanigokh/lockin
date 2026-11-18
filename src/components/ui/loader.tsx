import { cn } from "@/lib/utils";

/**
 * The branded loader: the nudge "n" draws itself on its blueberry tile while
 * the tomato dot bounces in and gives it a little push, then it all repeats.
 * Pure CSS, so it works before any JavaScript has loaded.
 */
export function NudgeLoader({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("nudge-loader relative inline-block", className)} style={{ width: size, height: size }} role="presentation">
      <span className="nudge-loader-glow" aria-hidden />
      <svg viewBox="0 0 64 64" className="nudge-loader-tile relative h-full w-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="nl-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8d90f0" />
            <stop offset="1" stopColor="#6064d4" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="url(#nl-bg)" />
        <path d="M18 48V30a14 14 0 0 1 28 0v18" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="9" strokeLinecap="round" />
        <path
          className="nudge-loader-arch"
          d="M18 48V30a14 14 0 0 1 28 0v18"
          pathLength={100}
          fill="none"
          stroke="#fff"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <circle className="nudge-loader-dot" cx="51" cy="20" r="6.5" fill="#ff5a45" />
      </svg>
    </span>
  );
}

const LINES = ["Lacing up", "Warming up", "Rounding up the squad", "Checking the receipts"];

/** Full-screen version for the first load and big jumps between areas. */
export function FullScreenLoader() {
  return (
    <div className="loader-screen fixed inset-0 z-50 flex flex-col items-center justify-center gap-5" aria-busy="true" aria-live="polite">
      <NudgeLoader size={76} />
      <div className="relative h-5 w-56 overflow-hidden text-center">
        {LINES.map((l, i) => (
          <span key={l} className="loader-line label-mono absolute inset-x-0" style={{ animationDelay: `${i * 1.6}s` }}>
            {l}…
          </span>
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** Placeholder block with a soft sweeping highlight. */
export function Shimmer({ className }: { className?: string }) {
  return <div className={cn("shimmer", className)} aria-hidden />;
}
