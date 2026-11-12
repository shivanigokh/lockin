import type { Metadata } from "next";
import { getMe, getMyGroups } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/page-header";
import { GoalList, type GoalWithProgress } from "@/components/goals/goal-list";

export const metadata: Metadata = { title: "My goals" };

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ new?: string; share?: string }> }) {
  const sp = await searchParams;
  const [me, groups] = await Promise.all([getMe(), getMyGroups()]);
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_goals", { p_today: me.today });
  const goals: GoalWithProgress[] = (data ?? []).map((g) => ({
    ...g,
    target_value: Number(g.target_value),
    progress: Number(g.progress),
    shared_group_ids: g.shared_group_ids ?? [],
  }));
  const presetShare = sp.share && groups.some((g) => g.id === sp.share) ? sp.share : null;

  return (
    <Page>
      <PageHeader
        label="// just you (unless you share)"
        title="My goals"
        sub="Goals are private by default. Share one with a squad and they'll see its name, target, progress and percentage. Nothing else."
      />
      <GoalList goals={goals} groups={groups} today={me.today} openNew={sp.new === "1"} presetShare={presetShare} />
    </Page>
  );
}
