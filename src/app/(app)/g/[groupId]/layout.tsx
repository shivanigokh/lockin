import { getGroup } from "@/lib/data";
import { SquadTabs } from "@/components/squad/squad-tabs";

export default async function GroupLayout({ children, params }: { children: React.ReactNode; params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  await getGroup(groupId); // 404s for non-members
  return (
    <>
      <SquadTabs groupId={groupId} />
      {children}
    </>
  );
}
