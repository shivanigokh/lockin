import { addDays, format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

/** YYYY-MM-DD for "today" in the given IANA timezone. */
export function todayIn(tz: string | null | undefined): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export const iso = (d: Date) => format(d, "yyyy-MM-dd");
export const parse = (s: string) => parseISO(s);

export function weekRange(day: string) {
  const d = parseISO(day);
  return { from: iso(startOfWeek(d, { weekStartsOn: 1 })), to: iso(endOfWeek(d, { weekStartsOn: 1 })) };
}

export function monthRange(day: string) {
  const d = parseISO(day);
  return { from: iso(startOfMonth(d)), to: iso(endOfMonth(d)) };
}

export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let d = parseISO(from);
  const end = parseISO(to);
  while (d <= end) {
    out.push(iso(d));
    d = addDays(d, 1);
  }
  return out;
}

export function prettyDate(s: string) {
  return format(parseISO(s), "EEE d MMM");
}

export function relTime(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return format(new Date(ts), "d MMM");
}

/** Current streak (consecutive days ending today or yesterday) from a set of active days. */
export function streak(days: Set<string>, today: string) {
  let d = parseISO(today);
  if (!days.has(iso(d))) d = addDays(d, -1);
  let n = 0;
  while (days.has(iso(d))) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
