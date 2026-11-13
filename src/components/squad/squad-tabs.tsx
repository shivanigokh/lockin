"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { squadNav, isActive } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

/** Horizontal squad navigation for small screens (desktop uses the sidebar). */
export function SquadTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  return (
    <nav data-scroll-x className="scrollbar-none flex gap-1.5 overflow-x-auto px-4 pt-3 md:hidden">
      {squadNav(groupId)
        // Leaderboard lives in the tab bar and the calendar on the Today screen, so keep this row short.
        .filter((i) => !i.href.endsWith("/leaderboard") && !i.href.endsWith("/calendar"))
        .map((i) => {
        const active = isActive(pathname, i);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition",
              active ? "border-white/15 bg-white/[0.14] text-ink" : "border-white/[0.06] bg-white/[0.04] text-muted",
            )}
          >
            {i.short ?? i.label}
          </Link>
        );
      })}
    </nav>
  );
}
