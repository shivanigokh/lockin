"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { squadNav, isActive } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

/** Horizontal squad navigation for small screens (desktop uses the sidebar). */
export function SquadTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  return (
    <nav data-scroll-x className="scrollbar-none flex gap-1 overflow-x-auto border-b border-line/60 px-3 pb-2 md:hidden">
      {squadNav(groupId).map((i) => {
        const active = isActive(pathname, i);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold transition",
              active ? "bg-surface-3 text-lime" : "text-muted",
            )}
          >
            {i.short ?? i.label}
          </Link>
        );
      })}
    </nav>
  );
}
