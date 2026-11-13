import { cn, initials } from "@/lib/utils";

const palette = ["#979aff", "#ff6b57", "#c6c7ff", "#ff9a6b", "#7fd3e6"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({
  name,
  src,
  size = 36,
  className,
  seed,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
  seed?: string;
}) {
  const bg = palette[hash(seed ?? name) % palette.length];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-line", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-label={name}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-[#141218]", className)}
      style={{ width: size, height: size, background: bg, fontSize: Math.max(10, size * 0.36) }}
    >
      {initials(name) || "?"}
    </span>
  );
}
