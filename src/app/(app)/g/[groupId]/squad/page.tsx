import type { Metadata } from "next";
import { getGroup } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { SquadForm } from "@/components/squads/squad-form";
import { MembersList, InviteManager, DangerZone } from "@/components/squad/squad-admin";
import { SquadBadge } from "@/components/shell/squad-switcher";
import { ProgressBar } from "@/components/ui/progress";
import { MAX_MEMBERS, MIN_MEMBERS } from "@/lib/constants";

export const metadata: Metadata = { title: "Squad" };

export default async function SquadPage({ params, searchParams }: { params: Promise<{ groupId: string }>; searchParams: Promise<{ created?: string }> }) {
  const { groupId } = await params;
  const { created } = await searchParams;
  const { group, isAdmin, me } = await getGroup(groupId);
  const supabase = await createClient();
  const canInvite = isAdmin || group.members_can_invite;

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("group_members")
      .select("user_id, role, joined_at, profile:profiles!group_members_user_id_fkey(id, username, display_name, avatar_url)")
      .eq("group_id", groupId)
      .order("joined_at"),
    supabase
      .from("group_invites")
      .select("id, code, status, invited_user_id, max_uses, use_count, expires_at, created_at, created_by, invitee:profiles!group_invites_invited_user_id_fkey(username)")
      .eq("group_id", groupId)
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false }),
  ]);

  return (
    <Page className="max-w-4xl">
      <PageHeader label="squad hq" title={group.name} sub={group.description ?? undefined}>
        <span className="hidden sm:block">
          <SquadBadge g={group} size={56} />
        </span>
      </PageHeader>

      {created ? (
        <Card className="mb-4 border-lime/50 bg-lime/5 sm:mb-5">
          <p className="label-mono hidden text-lime sm:block">squad created</p>
          <p className="font-semibold sm:mt-1">Now send the invite code to 2+ friends. The squad unlocks at {MIN_MEMBERS} members.</p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:gap-5">
        <Card>
          <CardHeader label="the roster" title={`Members · ${group.member_count}/${MAX_MEMBERS}`} />
          <div className="mb-4">
            <ProgressBar value={(group.member_count / MAX_MEMBERS) * 100} size="sm" color={group.member_count < MIN_MEMBERS ? "var(--color-pink)" : "var(--color-lime)"} />
            <p className="mt-1.5 text-xs text-muted">
              {group.member_count < MIN_MEMBERS
                ? `${MIN_MEMBERS - group.member_count} more to unlock leaderboards and challenges.`
                : group.member_count >= MAX_MEMBERS
                  ? "Full house. Someone has to leave before anyone else joins."
                  : `Room for ${MAX_MEMBERS - group.member_count} more.`}
            </p>
          </div>

          <MembersList
            groupId={groupId}
            meId={me.user.id}
            isAdmin={isAdmin}
            members={(members ?? []).map((m) => ({ ...m, profile: m.profile as unknown as { id: string; username: string; display_name: string | null; avatar_url: string | null } }))}
          />
        </Card>

        {canInvite && group.member_count < MAX_MEMBERS ? (
          <Card>
            <CardHeader label="invitations" title="Invite friends" />
            <InviteManager
              groupId={groupId}
              groupName={group.name}
              isAdmin={isAdmin}
              meId={me.user.id}
              invites={(invites ?? []).map((i) => ({ ...i, invitee: (i.invitee as { username: string } | null)?.username ?? null }))}
            />
          </Card>
        ) : null}

        {isAdmin ? (
          <Card>
            <CardHeader label="admin" title="Squad settings" />
            <SquadForm initial={group} />
          </Card>
        ) : null}

        <DangerZone groupId={groupId} groupName={group.name} isAdmin={isAdmin} />
      </div>
    </Page>
  );
}
