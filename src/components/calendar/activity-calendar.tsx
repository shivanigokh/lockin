import Link from "next/link";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Flag, Swords } from "lucide-react";
import { ACTIVITIES, activity } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { iso } from "@/lib/dates";

export type CalEntry = { type: string; label: string; minutes: number; who?: string };
export type CalDay = { entries: CalEntry[]; habitsDone?: number; habitsTotal?: number; allHabits?: boolean };
export type CalEvent = { date: string; label: string; kind: "start" | "end" };

export function calendarRange(view: "month" | "week", anchor: string) {
  const d = parseISO(anchor);
  if (view === "week") {
    const from = startOfWeek(d, { weekStartsOn: 1 });
    return { from: iso(from), to: iso(endOfWeek(d, { weekStartsOn: 1 })) };
  }
  return {
    from: iso(startOfWeek(startOfMonth(d), { weekStartsOn: 1 })),
    to: iso(endOfWeek(endOfMonth(d), { weekStartsOn: 1 })),
  };
}

export function ActivityCalendar({
  basePath,
  view,
  anchor,
  today,
  days,
  events = [],
  showHabits,
  streak,
}: {
  basePath: string;
  view: "month" | "week";
  anchor: string;
  today: string;
  days: Record<string, CalDay>;
  events?: CalEvent[];
  showHabits?: boolean;
  streak?: number;
}) {
  const d = parseISO(anchor);
  const { from, to } = calendarRange(view, anchor);
  const prev = iso(view === "week" ? addDays(d, -7) : addMonths(d, -1));
  const next = iso(view === "week" ? addDays(d, 7) : addMonths(d, 1));
  const cells: string[] = [];
  for (let x = parseISO(from); x <= parseISO(to); x = addDays(x, 1)) cells.push(iso(x));
  const link = (p: Record<string, string>) => `${basePath}?${new URLSearchParams({ view, d: anchor, ...p })}`;
  const title = view === "week" ? `${format(parseISO(from), "d MMM")} – ${format(parseISO(to), "d MMM yyyy")}` : format(d, "MMMM yyyy");
  const eventsByDay = new Map<string, CalEvent[]>();
  events.forEach((e) => eventsByDay.set(e.date, [...(eventsByDay.get(e.date) ?? []), e]));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={link({ d: prev })} className="glass flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:text-ink" aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h2 className="min-w-32 text-center font-display text-lg font-semibold tracking-tight leading-tight sm:min-w-44 sm:text-xl">{title}</h2>
          <Link href={link({ d: next })} className="glass flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:text-ink" aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link href={link({ d: today })} className="ml-1 text-[13px] font-medium text-muted hover:text-lime">
            Today
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {typeof streak === "number" ? (
            <span className="font-mono text-xs text-muted">
              streak <b className="text-lime">{streak}d</b>
            </span>
          ) : null}
          <div className="glass inline-flex rounded-full p-1">
            {(["week", "month"] as const).map((v) => (
              <Link
                key={v}
                href={`${basePath}?${new URLSearchParams({ view: v, d: anchor })}`}
                className={cn("rounded-full px-3.5 py-1.5 text-[13px] font-semibold capitalize", view === v ? "bg-white/[0.14] text-ink" : "text-muted hover:text-ink")}
              >
                {v}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className={cn("grid gap-1 sm:grid-cols-7 sm:gap-1.5", view === "week" ? "grid-cols-1" : "grid-cols-7")}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
          <div key={w} className={cn("label-mono pb-1 text-center text-[10px]", view === "week" && "hidden sm:block")}>
            {w}
          </div>
        ))}
        {cells.map((day) => {
          const info = days[day];
          const entries = info?.entries ?? [];
          const evs = eventsByDay.get(day) ?? [];
          const outside = view === "month" && !isSameMonth(parseISO(day), d);
          const isToday = day === today;
          const types = [...new Set(entries.map((e) => e.type))];
          return (
            <div
              key={day}
              className={cn(
                "relative flex flex-col rounded-lg border p-1.5 transition sm:rounded-xl sm:p-2",
                view === "week" ? "min-h-11 sm:min-h-40" : "min-h-12 sm:min-h-24",
                outside ? "border-transparent opacity-35" : "border-transparent bg-surface-2 sm:border-line",
                isToday && "border-lime",
                entries.length > 0 && !outside && "bg-[color-mix(in_srgb,var(--color-lime)_5%,var(--color-surface-2))]",
              )}
            >
              <div className="flex items-start justify-between">
                <span className={cn("font-mono text-[11px]", isToday ? "text-lime" : "text-muted")}>
                  {view === "week" ? <span className="sm:hidden">{format(parseISO(day), "EEE")} </span> : null}
                  {format(parseISO(day), "d")}
                </span>
                {showHabits && info?.habitsDone ? (
                  <span
                    className={cn("rounded-full px-1 font-mono text-[9px]", info.allHabits ? "bg-lime text-[#141218]" : "bg-surface-3 text-muted")}
                    title={`${info.habitsDone}/${info.habitsTotal} habits`}
                  >
                    {info.habitsDone}/{info.habitsTotal}
                  </span>
                ) : null}
              </div>
              {view === "month" ? (
                <div className="mt-auto flex flex-wrap gap-0.5 sm:gap-1">
                  {types.slice(0, 4).map((t) => {
                    const a = activity(t);
                    const n = entries.filter((e) => e.type === t).length;
                    return (
                      <span key={t} className="flex items-center gap-0.5" title={`${n} × ${a.label}`}>
                        <span className="h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5" style={{ background: a.color }} />
                        {n > 1 ? <span className="hidden font-mono text-[9px] text-muted sm:inline">{n}</span> : null}
                      </span>
                    );
                  })}
                  {evs.map((e, i) => (
                    <span key={i} title={`${e.kind === "start" ? "Starts" : "Ends"}: ${e.label}`}>
                      {e.kind === "start" ? <Swords className="h-3 w-3 text-orange" /> : <Flag className="h-3 w-3 text-orange" />}
                    </span>
                  ))}
                </div>
              ) : (
                <ul className="mt-1.5 flex flex-wrap gap-1 sm:mt-2 sm:block sm:space-y-1">
                  {evs.map((e, i) => (
                    <li key={`e${i}`} className="flex items-center gap-1 rounded-md bg-orange/10 px-1.5 py-0.5 text-xs text-orange sm:truncate sm:px-1 sm:text-[10px]">
                      {e.kind === "start" ? <Swords className="h-3 w-3 shrink-0" /> : <Flag className="h-3 w-3 shrink-0" />}
                      <span className="sm:truncate">{e.label}</span>
                    </li>
                  ))}
                  {entries.map((e, i) => {
                    const a = activity(e.type);
                    return (
                      <li key={i} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-[#141218] sm:truncate sm:px-1 sm:text-[10px]" style={{ background: a.color }} title={`${e.who ? e.who + ": " : ""}${e.label} ${e.minutes}m`}>
                        <a.icon className="h-3 w-3 shrink-0" />
                        <span className="sm:truncate">{e.who ? `${e.who} · ${e.minutes}m` : `${e.label} · ${e.minutes}m`}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {ACTIVITIES.map((a) => (
          <span key={a.value} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} /> {a.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <Swords className="h-3 w-3 text-orange" /> challenge
        </span>
        {showHabits ? (
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className="rounded-full bg-lime px-1 font-mono text-[9px] text-[#141218]">6/6</span> all habits done
          </span>
        ) : null}
      </div>
    </div>
  );
}
