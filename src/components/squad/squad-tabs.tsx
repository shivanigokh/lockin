"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { squadNav, isActive } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

/** Horizontal squad navigation for small screens (desktop uses the sidebar). */
export function SquadTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  return (
    <nav className="scrollbar-none sticky top-[57px] z-30 flex gap-1 overflow-x-auto border-b border-line bg-bg/85 px-3 py-2 backdrop-blur md:hidden">
      {squadNav(groupId).map((i) => {
        const active = isActive(pathname, i);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition",
              active ? "bg-lime text-black" : "text-muted",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
