import { cn } from "@/lib/utils";

export function Badge({
  children,
  color,
  className,
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider",
        className,
      )}
      style={{
        color: color ?? "var(--color-muted)",
        borderColor: color ? `color-mix(in srgb, ${color} 40%, transparent)` : "var(--color-line)",
        background: color ? `color-mix(in srgb, ${color} 10%, transparent)` : "transparent",
      }}
    >
      {children}
    </span>
  );
}
