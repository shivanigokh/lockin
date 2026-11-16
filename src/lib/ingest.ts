// Pure helpers that turn loosely-shaped data from Strava or an iOS Shortcut
// into rows the database accepts. No I/O here, so it is easy to test.
import type { ActivityType } from "@/lib/constants";

const RULES: [RegExp, ActivityType][] = [
  [/run|jog/i, "running"],
  [/walk|hik/i, "walking"],
  [/ride|cycl|bik|velomobile|handcycle/i, "cycling"],
  [/swim/i, "swimming"],
  [/yoga|pilates|mind.?and.?body|stretch/i, "yoga"],
  [/strength|weight|crossfit|hiit|high.?intensity|functional|core|training/i, "strength"],
  [/soccer|football|tennis|badminton|basketball|pickleball|squash|racquet|volleyball|cricket|hockey|golf|rugby|table.?tennis|boxing|martial|climb/i, "sports"],
];

/** Strava sport_type ("TrailRun"), Apple workout names ("Outdoor Run",
 * "HKWorkoutActivityTypeTraditionalStrengthTraining") or plain words. */
export function mapActivityType(raw: unknown): ActivityType {
  const s = String(raw ?? "").replace(/^HKWorkoutActivityType/, "");
  if (!s) return "other";
  for (const [re, t] of RULES) if (re.test(s)) return t;
  return "other";
}

const clampMinutes = (m: number) => Math.min(1440, Math.max(1, Math.round(m)));

/** Accepts minutes as a number, "45", "45 min", "1 hr 5 min", "1:05:00", "00:32". */
export function parseMinutes(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? clampMinutes(raw) : null;
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;
  const clock = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (clock) {
    const [h, m, sec] = clock[3] !== undefined ? [+clock[1]!, +clock[2]!, +clock[3]] : [0, +clock[1]!, +clock[2]!];
    const total = h * 60 + m + sec / 60;
    return total > 0 ? clampMinutes(total) : null;
  }
  let total = 0;
  let matched = false;
  for (const [, n, unit] of s.matchAll(/([\d.,]+)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)\b/g)) {
    const v = Number(n!.replace(",", "."));
    if (!Number.isFinite(v)) continue;
    matched = true;
    total += unit!.startsWith("h") ? v * 60 : unit!.startsWith("s") ? v / 60 : v;
  }
  if (!matched) {
    const v = Number(s.replace(",", "."));
    if (Number.isFinite(v)) total = v;
  }
  return total > 0 ? clampMinutes(total) : null;
}

/** Accepts km as a number, or "5.2 km", "3.1 mi", "5200 m". */
export function parseKm(raw: unknown): number | null {
  let km: number;
  if (typeof raw === "number") km = raw;
  else {
    const s = String(raw ?? "").trim().toLowerCase().replace(/,/g, "");
    if (!s) return null;
    const m = s.match(/^([\d.]+)\s*(km|kilometers?|kilometres?|mi|miles?|m|meters?|metres?)?$/);
    if (!m) return null;
    const v = Number(m[1]);
    const unit = m[2] ?? "km";
    km = unit.startsWith("mi") ? v * 1.609344 : unit.startsWith("k") ? v : v / 1000;
  }
  if (!Number.isFinite(km) || km <= 0) return null;
  return Math.min(1000, Math.round(km * 100) / 100);
}

/** Integer calories from 1850, "1850", "1,850 kcal", "1850.4 Cal". */
export function parseCalories(raw: unknown): number | null {
  const v = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(v) || v < 0 || v > 20000) return null;
  return Math.round(v);
}

/** The local calendar day. ISO strings keep the wall-clock date they were
 * written with ("2026-11-16T07:30:00+05:30" -> 2026-11-16). */
export function parseDay(raw: unknown, fallback: string): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return fallback;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1]!;
  return null;
}

export type WorkoutItem = {
  kind: "workout";
  activity_type: ActivityType;
  date: string;
  duration_min: number;
  distance_km: number | null;
  external_id: string;
};
export type CaloriesItem = { kind: "calories"; date: string; calories: number };
export type IngestItem = WorkoutItem | CaloriesItem;

type Loose = Record<string, unknown>;
const pick = (o: Loose, ...keys: string[]) => keys.map((k) => o[k]).find((v) => v !== undefined && v !== null && v !== "");

/**
 * Normalises whatever an iOS Shortcut sends. Accepts a single object or
 * `{ items: [...] }` / `{ workouts: [...] }` / an array. Each item is either a
 * workout (has a type / duration) or a calorie total (has `calories`).
 */
export function normaliseIngest(body: unknown, today: string): { items: IngestItem[]; errors: string[] } {
  const errors: string[] = [];
  const items: IngestItem[] = [];
  let raw: unknown[] = [];
  if (Array.isArray(body)) raw = body;
  else if (body && typeof body === "object") {
    const b = body as Loose;
    if (Array.isArray(b.items)) raw = b.items;
    else if (Array.isArray(b.workouts)) raw = b.workouts.map((w) => ({ kind: "workout", ...(w as Loose) }));
    else raw = [b];
  }
  if (raw.length > 100) {
    errors.push("Send at most 100 items at a time.");
    raw = raw.slice(0, 100);
  }

  raw.forEach((r, i) => {
    if (!r || typeof r !== "object") return void errors.push(`Item ${i + 1}: not an object.`);
    const o = r as Loose;
    const kind = String(o.kind ?? (pick(o, "calories", "dietary_energy", "kcal") !== undefined ? "calories" : "workout"));
    const date = parseDay(pick(o, "date", "start", "start_date", "startDate"), today);
    if (!date) return void errors.push(`Item ${i + 1}: use an ISO date like 2026-11-16 (format the date as ISO 8601 in Shortcuts).`);
    if (date > today) return void errors.push(`Item ${i + 1}: date is in the future.`);

    if (kind === "calories") {
      const calories = parseCalories(pick(o, "calories", "dietary_energy", "kcal"));
      if (calories === null) return void errors.push(`Item ${i + 1}: calories must be a number.`);
      items.push({ kind: "calories", date, calories });
      return;
    }

    let minutes = parseMinutes(pick(o, "duration_min", "minutes", "duration"));
    const seconds = pick(o, "duration_s", "seconds");
    if (minutes === null && seconds !== undefined) minutes = parseMinutes(Number(seconds) / 60);
    if (minutes === null) return void errors.push(`Item ${i + 1}: missing duration.`);
    const distance = pick(o, "distance_km", "distance");
    const distanceM = pick(o, "distance_m");
    const type = mapActivityType(pick(o, "type", "activity_type", "workout_type", "name"));
    const start = String(pick(o, "start", "start_date", "startDate", "date") ?? date);
    items.push({
      kind: "workout",
      activity_type: type,
      date,
      duration_min: minutes,
      distance_km: distance !== undefined ? parseKm(distance) : distanceM !== undefined ? parseKm(Number(distanceM) / 1000) : null,
      external_id: String(pick(o, "id", "external_id", "uuid") ?? `${start}|${type}|${minutes}`).slice(0, 200),
    });
  });
  return { items, errors };
}

// ------------------------------------------------------------------ strava ---

export type StravaActivity = {
  id: number;
  name?: string;
  sport_type?: string;
  type?: string;
  start_date_local: string;
  moving_time?: number;
  elapsed_time?: number;
  distance?: number;
};

export function stravaToWorkout(a: StravaActivity) {
  const seconds = a.moving_time || a.elapsed_time || 60;
  return {
    activity_type: mapActivityType(a.sport_type ?? a.type),
    performed_on: a.start_date_local.slice(0, 10),
    duration_min: clampMinutes(seconds / 60),
    distance_km: a.distance ? parseKm(a.distance / 1000) : null,
    note: a.name ? a.name.slice(0, 280) : null,
    source: "strava" as const,
    external_id: String(a.id),
  };
}
