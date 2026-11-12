import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getMe } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { NotificationActions } from "@/components/notification-actions";
import { relTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const me = await getMe();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", me.user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <Page className="max-w-2xl">
      <PageHeader label="// pings" title="Notifications" sub="Change what pings you in Settings → Notifications.">
        <NotificationActions unread={unread} total={items.length} />
      </PageHeader>
      {items.length ? (
        <Card className="p-2">
          <ul className="divide-y divide-line">
            {items.map((n) => (
              <li key={n.id}>
                <Link href={n.link ?? "#"} className={cn("flex gap-3 rounded-xl p-3 transition hover:bg-surface-2", !n.read_at && "bg-lime/5")}>
                  <Bell className={cn("mt-0.5 h-4 w-4 shrink-0", n.read_at ? "text-faint" : "text-lime")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{n.title}</p>
                    {n.body ? <p className="text-sm text-muted">{n.body}</p> : null}
                    <p className="label-mono mt-1 text-[10px]">{relTime(n.created_at)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Empty title="All quiet" body="Reactions, invites, new challenges and squad joins show up here." />
      )}
    </Page>
  );
}
