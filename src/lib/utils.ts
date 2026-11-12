import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function displayName(p: { display_name?: string | null; username?: string | null } | null | undefined) {
  if (!p) return "Someone";
  return (p.display_name && p.display_name.trim()) || p.username || "Someone";
}

export function initials(name: string) {
  return name
    .split(/[\s_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");
}

export function fmtNum(n: number | string | null | undefined, digits = 1) {
  if (n === null || n === undefined || n === "") return "–";
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return "–";
  return Number.isInteger(v) ? String(v) : v.toFixed(digits).replace(/\.0+$/, "");
}

export function pct(progress: number, target: number) {
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.floor((progress * 100) / target)));
}

/** Turns a Postgres/PostgREST error into something a human can read. */
export function friendlyError(err: unknown): string {
  const msg = typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : String(err);
  const m = msg.match(/^[A-Z_]+: (.*)$/);
  if (m) return m[1]!.charAt(0).toUpperCase() + m[1]!.slice(1) + ".";
  if (msg.includes("duplicate key") && msg.includes("username")) return "That username is taken.";
  if (msg.includes("duplicate key") && msg.includes("weight_entries")) return "You already have a weigh-in for that date.";
  if (msg.includes("duplicate key")) return "That already exists.";
  if (msg.includes("username_format")) return "Usernames are 3–20 characters: lowercase letters, numbers, underscores.";
  if (msg.includes("violates check constraint")) return "One of those values is out of range.";
  if (msg.includes("row-level security")) return "You don't have permission to do that.";
  if (msg.includes("FORBIDDEN")) return "You don't have permission to do that.";
  return msg || "Something went wrong.";
}
