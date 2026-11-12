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
    <div className="inline-flex rounded-xl border border-line bg-surface p-1 scrollbar-none overflow-x-auto max-w-full">
      {options.map((o) => {
        const next = new URLSearchParams(sp.toString());
        next.set(param, o.value);
        return (
          <Link
            key={o.value}
            href={`${pathname}?${next.toString()}`}
            scroll={false}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition",
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
    <div className="inline-flex rounded-xl border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "whitespace-nowrap rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition cursor-pointer",
            value === o.value ? "bg-lime text-black" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
