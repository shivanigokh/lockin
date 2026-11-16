import { Shell } from "@/components/shell/shell";
import { getActiveGroupId, getMe, getMyGroups, getUnreadCount } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { StravaAutoSync } from "@/components/tracking/strava-auto-sync";

const STRAVA_SYNC_EVERY_MS = 30 * 60 * 1000;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [me, groups, cookieGroupId, unread, admin, strava] = await Promise.all([
    getMe(),
    getMyGroups(),
    getActiveGroupId(),
    getUnreadCount(),
    supabase.rpc("is_app_admin"),
    supabase.from("strava_connections").select("last_synced_at").maybeSingle(),
  ]);
  const syncedAt = strava.data?.last_synced_at;
  const stravaDue = strava.data != null && (!syncedAt || Date.now() - new Date(syncedAt).getTime() > STRAVA_SYNC_EVERY_MS);
  return (
    <Shell
      me={me.profile}
      groups={groups}
      cookieGroupId={cookieGroupId}
      unread={unread}
      isAdmin={admin.data === true}
      today={me.today}
      defaultVisibility={me.settings.default_workout_visibility}
    >
      {stravaDue ? <StravaAutoSync /> : null}
      {children}
    </Shell>
  );
}
