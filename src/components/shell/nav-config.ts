import {
  CalendarDays, Dumbbell, HeartPulse, Home, LayoutGrid, MessagesSquare, Settings, Target, Trophy, Swords, Users, UsersRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; short?: string; icon: LucideIcon; exact?: boolean };

export const squadNav = (id: string): NavItem[] => [
  { href: `/g/${id}`, label: "Dashboard", short: "Today", icon: LayoutGrid, exact: true },
  { href: `/g/${id}/feed`, label: "Feed", icon: MessagesSquare },
  { href: `/g/${id}/leaderboard`, label: "Leaderboard", short: "Board", icon: Trophy },
  { href: `/g/${id}/goals`, label: "Shared goals", icon: Target },
  { href: `/g/${id}/challenges`, label: "Challenges", icon: Swords },
  { href: `/g/${id}/calendar`, label: "Calendar", icon: CalendarDays },
  { href: `/g/${id}/squad`, label: "Squad", short: "Members", icon: Users },
];

export const personalNav: NavItem[] = [
  { href: "/friends", label: "Friends", icon: UsersRound },
  { href: "/me", label: "My health", icon: HeartPulse },
  { href: "/goals", label: "My goals", icon: Target },
  { href: "/workouts", label: "My workouts", icon: Dumbbell },
  { href: "/calendar", label: "My calendar", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const HomeIcon = Home;

export function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
}
