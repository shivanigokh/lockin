import type { Metadata } from "next";
import { getGroup } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/page-header";
import { Empty } from "@/components/ui/empty";
import { ChallengeCard, type ChallengeView } from "@/components/challenges/challenge-card";
import { NewChallengeButton } from "@/components/challenges/new-challenge";
import { MIN_MEMBERS } from "@/lib/constants";

export const metadata: Metadata = { title: "Challenges" };

export default async function ChallengesPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const { group, isAdmin, me } = await getGroup(groupId);
  const supabase = await createClient();
  const canCreate = isAdmin || group.members_can_create_challenges;

  if (group.member_count < MIN_MEMBERS) {
    return (
      <Page className="max-w-4xl">
        <PageHeader label={`// ${group.name}`} title="Challenges" />
        <Empty title="Locked until 3 members" body="Challenges need rivals. Invite more people from the Squad tab." />
      </Page>
    );
  }

  const { data: challenges } = await supabase
    .from("group_challenges")
    .select("*, participants:challenge_participants(user_id)")
    .eq("group_id", groupId)
    .order("end_date", { ascending: false })
    .limit(50);

  const boards = await Promise.all(
    (challenges ?? []).map((c) => supabase.rpc("challenge_board", { p_challenge: c.id }).then((r) => r.data ?? [])),
  );

  const views: ChallengeView[] = (challenges ?? []).map((c, i) => {
    const board = boards[i]!;
    const status = me.today < c.start_date ? "upcoming" : me.today > c.end_date ? "ended" : "active";
    const total = board.reduce((s, b) => s + Number(b.progress), 0);
    const target = Number(c.target_value);
    const completed =
      c.scope === "group" ? total >= target : board.length > 0 && board.every((b) => Number(b.progress) >= target);
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      metric: c.metric,
      activity_type: c.activity_type,
      habit_key: c.habit_key,
      scope: c.scope,
      unit: c.unit,
      target,
      start_date: c.start_date,
      end_date: c.end_date,
      status,
      completed,
      total,
      joined: (c.participants as { user_id: string }[]).some((p) => p.user_id === me.user.id),
      canDelete: isAdmin || c.created_by === me.user.id,
      board: board.map((b) => ({ ...b, progress: Number(b.progress) })),
    };
  });

  const order = { active: 0, upcoming: 1, ended: 2 } as const;
  views.sort((a, b) => order[a.status] - order[b.status] || a.end_date.localeCompare(b.end_date));

  return (
    <Page className="max-w-5xl">
      <PageHeader
        label={`// ${group.name}`}
        title="Challenges"
        sub="Admins set them. Everyone can join or bail. Progress comes from squad-visible workouts and habits, or self-reported numbers."
      >
        {canCreate ? <NewChallengeButton groupId={groupId} today={me.today} /> : null}
      </PageHeader>
      {views.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {views.map((v) => (
            <ChallengeCard key={v.id} c={v} groupId={groupId} meId={me.user.id} />
          ))}
        </div>
      ) : (
        <Empty
          title="No challenges yet"
          body={canCreate ? "Try a 7-day walking challenge or a no-alcohol week. Chaos is a ladder." : "Only admins can start challenges in this squad. Go poke one."}
        />
      )}
    </Page>
  );
}
