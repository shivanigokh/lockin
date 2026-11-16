// Public (browser-safe) configuration. The service-role key is never used by this app.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

// iCloud link of the shared "nudge sync" Shortcut (https://www.icloud.com/shortcuts/...).
// When set, Settings shows a one-tap "Add to iPhone" flow instead of build-it-yourself steps.
// Default: the owner's shared "nudge sync" Shortcut.
const shortcut = process.env.HEALTH_SHORTCUT_URL || "https://www.icloud.com/shortcuts/a06a80b0da854276bfb98bdcbc435180";
export const HEALTH_SHORTCUT_URL = /^https:\/\/www\.icloud\.com\/shortcuts\/[0-9a-f]{32}$/i.test(shortcut) ? shortcut : null;
