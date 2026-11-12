"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, Bell, HeartPulse, LayoutGrid, LogOut, Plus, Target, Trophy } from "lucide-react";
import { Logo } from "@/components/brand";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { WorkoutForm } from "@/components/tracking/workout-form";
import { SquadSwitcher } from "./squad-switcher";
import { personalNav, squadNav, isActive, type NavItem } from "./nav-config";
import type { MyGroup } from "@/lib/data";
import { cn, displayName } from "@/lib/utils";
import { COPY } from "@/lib/constants";

type Me = { id: string; username: string; display_name: string | null; avatar_url: string | null };

function NavLink({ item, pathname, onClick }: { item: NavItem; pathname: string; onClick?: () => void }) {
  const active = isActive(pathname, item);
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
        active ? "bg-lime text-black" : "text-muted hover:bg-surface-2 hover:text-ink",
      )}
    >
      <item.icon className={cn("h-4 w-4", !active && "group-hover:text-lime")} />
      {item.label}
    </Link>
  );
}

export function Shell({
  me,
  groups,
  cookieGroupId,
  unread,
  isAdmin,
  today,
  defaultVisibility,
  children,
}: {
  me: Me;
  groups: MyGroup[];
  cookieGroupId: string | null;
  unread: number;
  isAdmin?: boolean;
  today: string;
  defaultVisibility: "groups" | "private";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [logOpen, setLogOpen] = useState(false);
  const urlGroup = pathname.match(/^\/g\/([0-9a-f-]{36})/i)?.[1] ?? null;
  const activeId =
    (urlGroup && groups.some((g) => g.id === urlGroup) ? urlGroup : null) ??
    (cookieGroupId && groups.some((g) => g.id === cookieGroupId) ? cookieGroupId : null) ??
    groups[0]?.id ??
    null;
  const name = displayName(me);

  const bottom: NavItem[] = [
    { href: activeId ? `/g/${activeId}` : "/home", label: "Squad", icon: LayoutGrid, exact: true },
    { href: activeId ? `/g/${activeId}/leaderboard` : "/home#board", label: "Board", icon: Trophy },
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/me", label: "Me", icon: HeartPulse },
  ];

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[260px_1fr]">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-5 overflow-y-auto border-r border-line bg-surface/60 p-4 md:flex">
        <Link href="/home" className="group px-2 pt-1">
          <Logo />
        </Link>
        <SquadSwitcher groups={groups} activeId={activeId} />
        <button
          type="button"
          onClick={() => setLogOpen(true)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-lime py-3 font-bold text-black transition hover:shadow-[0_0_24px_-6px_rgba(200,255,46,0.7)] cursor-pointer"
        >
          <Plus className="h-5 w-5" /> Log workout
        </button>
        {activeId ? (
          <nav className="space-y-0.5">
            <div className="label-mono px-3 pb-1.5">this squad</div>
            {squadNav(activeId).map((i) => (
              <NavLink key={i.href} item={i} pathname={pathname} />
            ))}
          </nav>
        ) : null}
        <nav className="space-y-0.5">
          <div className="label-mono px-3 pb-1.5">just you</div>
          {personalNav.map((i) => (
            <NavLink key={i.href} item={i} pathname={pathname} />
          ))}
        </nav>
        <div className="mt-auto space-y-2">
          {isAdmin ? (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-surface-2",
                pathname === "/admin" ? "text-lime" : "text-muted",
              )}
            >
              <BarChart3 className="h-4 w-4" /> Usage (admin)
            </Link>
          ) : null}
          <Link
            href="/notifications"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-surface-2",
              pathname === "/notifications" ? "text-ink" : "text-muted",
            )}
          >
            <Bell className="h-4 w-4" /> Notifications
            {unread > 0 ? <span className="ml-auto rounded-full bg-pink px-2 font-mono text-[10px] font-bold text-black">{unread}</span> : null}
          </Link>
          <div className="flex items-center gap-3 rounded-2xl border border-line p-2">
            <Avatar name={name} src={me.avatar_url} seed={me.id} size={34} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{name}</div>
              <div className="label-mono truncate text-[10px]">@{me.username}</div>
            </div>
            <form action="/auth/signout" method="post">
              <button type="submit" className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-danger cursor-pointer" aria-label="Log out" title="Log out">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
          <p className="label-mono px-2 text-[9px] text-faint">{COPY.hydrated}</p>
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center gap-1.5 bg-bg/90 px-3 py-2 backdrop-blur md:hidden">
        <Link href="/home" aria-label="Home" className="group">
          <Logo compact />
        </Link>
        <SquadSwitcher groups={groups} activeId={activeId} className="min-w-0 flex-1" compact />
        <Link href="/notifications" className="relative rounded-xl p-2 text-muted" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 ? <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-pink" /> : null}
        </Link>
        <Link href="/settings" aria-label="Settings">
          <Avatar name={name} src={me.avatar_url} seed={me.id} size={32} />
        </Link>
      </header>

      <main className="min-w-0 pb-24 md:pb-12">{children}</main>

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line/60 bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2 py-1.5">
          {bottom.slice(0, 2).map((i) => (
            <BottomLink key={i.label} item={i} pathname={pathname} />
          ))}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              aria-label="Log workout"
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime text-black shadow-[0_8px_30px_-8px_rgba(200,255,46,0.8)] transition active:scale-95 cursor-pointer"
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </button>
          </div>
          {bottom.slice(2).map((i) => (
            <BottomLink key={i.label} item={i} pathname={pathname} />
          ))}
        </div>
      </nav>

      <Modal open={logOpen} onClose={() => setLogOpen(false)} title="Log a workout" label="// receipts or it didn't happen">
        <WorkoutForm today={today} defaultVisibility={defaultVisibility} onDone={() => setLogOpen(false)} />
      </Modal>
    </div>
  );
}

function BottomLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item);
  return (
    <Link href={item.href} className={cn("flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-semibold", active ? "text-lime" : "text-muted")}>
      <item.icon className="h-5 w-5" />
      {item.label}
    </Link>
  );
}
