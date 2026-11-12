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
    <div data-scroll-x className="inline-flex max-w-full overflow-x-auto rounded-xl bg-surface p-1 scrollbar-none sm:border sm:border-line">
      {options.map((o) => {
        const next = new URLSearchParams(sp.toString());
        next.set(param, o.value);
        return (
          <Link
            key={o.value}
            href={`${pathname}?${next.toString()}`}
            scroll={false}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold transition",
              current === o.value ? "bg-lime text-black" : "text-muted hover:text-ink",
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
    <div className="inline-flex max-w-full flex-wrap rounded-xl bg-surface p-1 sm:border sm:border-line">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold transition cursor-pointer",
            value === o.value ? "bg-lime text-black" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
