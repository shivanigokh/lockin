"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/** Segmented control driven by a search param, so views are linkable and server-rendered. */
export function SegmentLinks({
  param,
  options,
  defaultValue,
}: {
  param: string;
  options: { value: string; label: string }[];
  defaultValue: string;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get(param) ?? defaultValue;
  return (
    <div data-scroll-x className="glass inline-flex max-w-full overflow-x-auto rounded-full p-1 scrollbar-none">
      {options.map((o) => {
        const next = new URLSearchParams(sp.toString());
        next.set(param, o.value);
        return (
          <Link
            key={o.value}
            href={`${pathname}?${next.toString()}`}
            scroll={false}
            className={cn(
              "whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition",
              current === o.value ? "bg-white/[0.14] text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

export function Segment<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="glass inline-flex max-w-full flex-wrap rounded-full p-1">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition cursor-pointer",
            value === o.value ? "bg-white/[0.14] text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
