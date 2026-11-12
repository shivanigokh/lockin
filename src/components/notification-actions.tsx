"use client";
import { Button } from "@/components/ui/button";
import { useAction } from "@/lib/use-action";
import { clearNotifications, markNotificationsRead } from "@/app/actions/profile";

export function NotificationActions({ unread, total }: { unread: number; total: number }) {
  const [mark, marking] = useAction(markNotificationsRead);
  const [clear, clearing] = useAction(clearNotifications);
  return (
    <>
      {unread ? (
        <Button variant="secondary" size="sm" loading={marking} onClick={() => mark()}>
          Mark all read
        </Button>
      ) : null}
      {total ? (
        <Button variant="ghost" size="sm" loading={clearing} onClick={() => clear()}>
          Clear all
        </Button>
      ) : null}
    </>
  );
}
