import type { Metadata } from "next";
import Link from "next/link";
import { getGroup } from "@/lib/data";
import { getFeed } from "@/lib/feed";
import { Page, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Composer, FeedList } from "@/components/feed/feed";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Feed" };

export default async function FeedPage({ params, searchParams }: { params: Promise<{ groupId: string }>; searchParams: Promise<{ before?: string }> }) {
  const { groupId } = await params;
  const { before } = await searchParams;
  const { group, isAdmin, me } = await getGroup(groupId);
  const items = await getFeed(groupId, 40, before);
  const last = items.at(-1);

  return (
    <Page className="max-w-3xl">
      <PageHeader label={`${group.name}`} title="The feed" sub="Workouts, wins and unhinged motivational messages. Squad members only." />
      <Card>
        <Composer groupId={groupId} />
        <FeedList items={items} meId={me.user.id} groupId={groupId} isAdmin={isAdmin} />
        <div className="mt-4 flex justify-between">
          {before ? (
            <Link href={`/g/${groupId}/feed`} className={buttonClass("ghost", "sm")}>
              ← Newest
            </Link>
          ) : <span />}
          {items.length === 40 && last ? (
            <Link href={`/g/${groupId}/feed?before=${encodeURIComponent(last.created_at)}`} className={buttonClass("secondary", "sm")}>
              Older →
            </Link>
          ) : null}
        </div>
      </Card>
    </Page>
  );
}
