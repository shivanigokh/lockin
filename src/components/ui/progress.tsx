import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  color = "var(--color-lime)",
  className,
  size = "md",
}: {
  value: number;
  color?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const v = Math.max(0, Math.min(100, value));
  const h = size === "sm" ? "h-1.5" : size === "lg" ? "h-4" : "h-2.5";
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-white/[0.08]", h, className)}
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${v}%`, background: color, boxShadow: v >= 100 ? `0 0 12px ${color}` : undefined }}
      />
    </div>
  );
}

/** Glowing ring that fills as you get closer to the goal (goal-gradient effect). */
export function ProgressRing({ value, label, size = 64 }: { value: number; label: string; size?: number }) {
  const v = Math.max(0, Math.min(1, value));
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100}>
      <span
        className="absolute inset-2 rounded-full transition-opacity duration-700"
        style={{ background: "radial-gradient(circle, rgb(117 121 224 / 0.55), transparent 70%)", filter: "blur(8px)", opacity: 0.25 + v * 0.75 }}
        aria-hidden
      />
      <svg width={size} height={size} className="relative -rotate-90">
        <defs>
          <linearGradient id="ring-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c6c7ff" />
            <stop offset="1" stopColor="#7579e0" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.09)" strokeWidth="6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ring-g)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[15px] font-semibold tabular-nums">{label}</span>
    </div>
  );
}
