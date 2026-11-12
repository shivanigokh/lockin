import { Shell } from "@/components/shell/shell";
import { getActiveGroupId, getMe, getMyGroups, getUnreadCount } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [me, groups, cookieGroupId, unread, admin] = await Promise.all([
    getMe(),
    getMyGroups(),
    getActiveGroupId(),
    getUnreadCount(),
    supabase.rpc("is_app_admin"),
  ]);
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
      {children}
    </Shell>
  );
}
