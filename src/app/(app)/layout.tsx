import { Shell } from "@/components/shell/shell";
import { getActiveGroupId, getMe, getMyGroups, getUnreadCount } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [me, groups, cookieGroupId, unread] = await Promise.all([getMe(), getMyGroups(), getActiveGroupId(), getUnreadCount()]);
  return (
    <Shell
      me={me.profile}
      groups={groups}
      cookieGroupId={cookieGroupId}
      unread={unread}
      today={me.today}
      defaultVisibility={me.settings.default_workout_visibility}
    >
      {children}
    </Shell>
  );
}
