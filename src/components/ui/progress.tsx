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
      className={cn("w-full overflow-hidden rounded-full bg-surface-3", h, className)}
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
