"use client";
import { Button } from "@/components/ui/button";
import { SquadBadge } from "@/components/shell/squad-switcher";
import { useAction } from "@/lib/use-action";
import { respondToInvite } from "@/app/actions/squads";
import { cn } from "@/lib/utils";

type Invite = { invite_id: string; group_name: string; icon: string; color: string; member_count: number; invited_by: string | null };

export function PendingInvites({ invites, className }: { invites: Invite[]; className?: string }) {
  const [respond, pending] = useAction(respondToInvite);
  if (!invites.length) return <p className={cn("text-sm text-muted", className)}>No pending invitations.</p>;
  return (
    <ul className={cn("space-y-3", className)}>
      {invites.map((i) => (
        <li key={i.invite_id} className="card flex flex-wrap items-center gap-4 p-4">
          <SquadBadge g={i} size={40} />
          <div className="min-w-0 flex-1">
            <div className="wrap-text font-bold">{i.group_name}</div>
            <div className="text-xs text-muted">
              {i.invited_by ?? "Someone"} invited you · {i.member_count}/10 members
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => respond(i.invite_id, false)}>
              Decline
            </Button>
            <Button size="sm" disabled={pending || i.member_count >= 10} onClick={() => respond(i.invite_id, true)}>
              {i.member_count >= 10 ? "Full" : "Accept"}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
