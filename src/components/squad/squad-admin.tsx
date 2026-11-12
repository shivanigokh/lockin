"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, LogOut, Shield, ShieldOff, UserMinus, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { InviteLink } from "./invite-panel";
import { useAction } from "@/lib/use-action";
import {
  createInviteCode, deleteSquad, inviteByUsername, leaveSquad, removeMember, revokeInvite, setMemberRole,
} from "@/app/actions/squads";
import { displayName } from "@/lib/utils";
import { relTime } from "@/lib/dates";

type Member = {
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  profile: { id: string; username: string; display_name: string | null; avatar_url: string | null };
};

export function MembersList({ groupId, meId, isAdmin, members }: { groupId: string; meId: string; isAdmin: boolean; members: Member[] }) {
  const [remove, removing] = useAction(removeMember);
  const [role, changing] = useAction(setMemberRole);
  return (
    <ul className="divide-y divide-line/60">
      {members.map((m) => {
        const name = displayName(m.profile);
        const isMe = m.user_id === meId;
        return (
          <li key={m.user_id} className="flex items-center gap-3 py-2.5">
            <Avatar name={name} src={m.profile.avatar_url} seed={m.user_id} size={34} />
            <div className="min-w-0 flex-1">
              <div className="wrap-text text-sm font-semibold">
                {name} {isMe ? <span className="font-normal text-muted">· you</span> : null}
              </div>
              <div className="wrap-text text-xs text-muted">
                @{m.profile.username} · joined {relTime(m.joined_at)}
              </div>
            </div>
            {m.role === "admin" ? (
              <Badge color="var(--color-lime)">
                <Crown className="h-3 w-3" /> admin
              </Badge>
            ) : null}
            {isAdmin && !isMe ? (
              <div className="flex shrink-0 gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={changing}
                  onClick={() => role(groupId, m.user_id, m.role === "admin" ? "member" : "admin")}
                  title={m.role === "admin" ? "Remove admin" : "Make admin"}
                >
                  {m.role === "admin" ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                  <span className="hidden sm:inline">{m.role === "admin" ? "Demote" : "Make admin"}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={removing}
                  className="hover:text-danger"
                  onClick={() => confirm(`Remove ${name} from the squad?`) && remove(groupId, m.user_id)}
                  title="Remove from squad"
                >
                  <UserMinus className="h-4 w-4" />
                  <span className="hidden sm:inline">Remove</span>
                </Button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

type Invite = {
  id: string;
  code: string;
  status: string;
  invited_user_id: string | null;
  invitee: string | null;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  created_by: string | null;
};

export function InviteManager({ groupId, groupName, isAdmin, meId, invites }: { groupId: string; groupName: string; isAdmin: boolean; meId: string; invites: Invite[] }) {
  const now = Date.now();
  const codes = invites.filter(
    (i) => !i.invited_user_id && i.status === "active" && (!i.expires_at || new Date(i.expires_at).getTime() > now) && (i.max_uses === null || i.use_count < i.max_uses),
  );
  const direct = invites.filter((i) => i.invited_user_id && i.status === "pending");
  const [username, setUsername] = useState("");
  const [expiry, setExpiry] = useState("7");
  const [maxUses, setMaxUses] = useState("");
  const [invite, inviting] = useAction(inviteByUsername, { onSuccess: () => setUsername("") });
  const [create, creating] = useAction(createInviteCode);
  const [revoke, revoking] = useAction(revokeInvite);

  return (
    <div className="space-y-6">
      <div>
        <div className="label-mono mb-2">invite link / code</div>
        {codes.length ? (
          <ul className="space-y-3">
            {codes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3">
                <InviteLink code={c.code} groupName={groupName} />
                <span className="font-mono text-[11px] text-muted">
                  {c.use_count} used{c.max_uses ? ` / ${c.max_uses}` : ""}
                  {c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString()}` : " · never expires"}
                </span>
                {isAdmin || c.created_by === meId ? (
                  <Button variant="ghost" size="sm" disabled={revoking} onClick={() => revoke(groupId, c.id)}>
                    <X className="h-3.5 w-3.5" /> Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No active codes. Make one below.</p>
        )}
        <form
          className="mt-4 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            create(groupId, expiry ? Number(expiry) : null, maxUses ? Number(maxUses) : null);
          }}
        >
          <Field label="Expires" htmlFor="inv-exp">
            <Select id="inv-exp" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="h-10 py-1">
              <option value="1">in 1 day</option>
              <option value="7">in 7 days</option>
              <option value="30">in 30 days</option>
              <option value="">never</option>
            </Select>
          </Field>
          <Field label="Max uses" htmlFor="inv-max">
            <Select id="inv-max" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className="h-10 py-1">
              <option value="">unlimited</option>
              {[1, 2, 3, 5, 9].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" variant="secondary" loading={creating}>
            New code
          </Button>
        </form>
      </div>

      <div>
        <div className="label-mono mb-2">invite by username</div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            invite(groupId, username);
          }}
        >
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@couch_creature" aria-label="Username to invite" />
          <Button type="submit" loading={inviting}>
            Invite
          </Button>
        </form>
        {direct.length ? (
          <ul className="mt-3 space-y-1.5">
            {direct.map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm">
                <span>
                  @{i.invitee ?? "someone"} <span className="text-muted">· pending</span>
                </span>
                {isAdmin || i.created_by === meId ? (
                  <Button variant="ghost" size="sm" disabled={revoking} onClick={() => revoke(groupId, i.id)}>
                    Cancel
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export function DangerZone({ groupId, groupName, isAdmin }: { groupId: string; groupName: string; isAdmin: boolean }) {
  const router = useRouter();
  const [leave, leaving] = useAction(leaveSquad, { onSuccess: () => router.push("/home") });
  const [del, deleting] = useAction(deleteSquad);
  const [confirmName, setConfirmName] = useState("");
  return (
    <Card className="border-danger/30">
      <CardHeader label="danger zone" title="Exit strategies" />
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Leave the squad. Your shared goals leave with you.{isAdmin ? " If you're the last admin, the longest-standing member takes over." : ""}
          </p>
          <Button variant="danger" loading={leaving} onClick={() => confirm(`Leave ${groupName}?`) && leave(groupId)}>
            <LogOut className="h-4 w-4" /> Leave squad
          </Button>
        </div>
        {isAdmin ? (
          <form
            className="flex flex-wrap items-end gap-2 border-t border-line pt-5"
            onSubmit={(e) => {
              e.preventDefault();
              del(groupId, confirmName);
            }}
          >
            <Field label={`Type "${groupName}" to delete the squad for everyone`} htmlFor="del-name" className="min-w-0 flex-1">
              <Input id="del-name" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
            </Field>
            <Button type="submit" variant="danger" loading={deleting} disabled={confirmName.trim().toLowerCase() !== groupName.trim().toLowerCase()}>
              Delete squad
            </Button>
          </form>
        ) : null}
      </div>
    </Card>
  );
}
