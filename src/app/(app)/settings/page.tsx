import type { Metadata } from "next";
import { getMe, getMyGroups } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { DeleteAccount, HabitManager, MySquads, NotificationPrefs, PrivacyForm, ProfileForm } from "@/components/settings/settings-forms";
import { PendingInvites } from "@/components/squads/pending-invites";
import { AuthForm } from "@/app/(auth)/auth-form";
import { Field, Input } from "@/components/ui/field";
import { updatePassword } from "@/app/actions/auth";
import { ConnectedApps } from "@/components/settings/connected-apps";
import { stravaConfigured } from "@/lib/strava";
import { SITE_URL } from "@/lib/env";

export const metadata: Metadata = { title: "Settings" };

const SECTIONS = [
  ["profile", "Profile"],
  ["habits", "Habits"],
  ["connected-apps", "Connected apps"],
  ["privacy", "Privacy"],
  ["notifications", "Notifications"],
  ["squads", "Squads"],
  ["invitations", "Invitations"],
  ["password", "Password"],
  ["account", "Account"],
] as const;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ strava?: string }> }) {
  const [me, groups, { strava: stravaStatus }] = await Promise.all([getMe(), getMyGroups(), searchParams]);
  const supabase = await createClient();
  const [{ data: habits }, { data: invites }, { data: strava }, { data: ingestKey }] = await Promise.all([
    supabase.from("daily_habits").select("id, name, icon, visible_to_groups, archived").eq("user_id", me.user.id).order("sort_order"),
    supabase.rpc("my_pending_invites"),
    supabase.from("strava_connections").select("athlete_name, last_synced_at").eq("user_id", me.user.id).maybeSingle(),
    supabase.from("ingest_tokens").select("created_at, last_used_at").eq("user_id", me.user.id).maybeSingle(),
  ]);

  return (
    <Page className="max-w-3xl">
      <PageHeader label="control panel" title="Settings" />
      <nav className="scrollbar-none -mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium capitalize text-muted transition hover:border-lime hover:text-lime">
            {label}
          </a>
        ))}
      </nav>
      <div className="space-y-5">
        <Card id="profile" className="scroll-mt-28">
          <CardHeader label="profile" title="How your squads see you" />
          <ProfileForm profile={me.profile} />
        </Card>
        <Card id="habits" className="scroll-mt-28">
          <CardHeader label="daily habits" title="Your checklist" />
          <HabitManager habits={habits ?? []} />
        </Card>
        <Card id="connected-apps" className="scroll-mt-28">
          <CardHeader label="connected apps" title="Sync workouts & calories" />
          <ConnectedApps strava={strava} stravaReady={stravaConfigured()} ingestKey={ingestKey} ingestUrl={`${SITE_URL}/api/ingest`} status={stravaStatus} />
        </Card>
        <Card id="privacy" className="scroll-mt-28">
          <CardHeader label="privacy & preferences" title="What squads can see" />
          <PrivacyForm settings={me.settings} />
        </Card>
        <Card id="notifications" className="scroll-mt-28">
          <CardHeader label="notifications" title="What pings you" />
          <NotificationPrefs settings={me.settings} />
        </Card>
        <Card id="squads" className="scroll-mt-28">
          <CardHeader label="manage squads" title="Your squads" />
          <MySquads groups={groups} />
        </Card>
        <Card id="invitations" className="scroll-mt-28">
          <CardHeader label="invitations" title="Pending invites" />
          <PendingInvites invites={invites ?? []} />
        </Card>
        <Card id="password" className="scroll-mt-28">
          <CardHeader label="security" title="Change password" />
          <div className="max-w-sm">
            <AuthForm action={updatePassword} submit="Update password">
              <Field label="New password" htmlFor="np">
                <Input id="np" name="password" type="password" autoComplete="new-password" required minLength={8} />
              </Field>
              <Field label="Confirm" htmlFor="npc">
                <Input id="npc" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
              </Field>
            </AuthForm>
          </div>
          <p className="mt-3 text-xs text-faint">Signed in as {me.user.email}</p>
        </Card>
        <Card id="account" className="scroll-mt-28 border-danger/30">
          <CardHeader label="danger zone" title="Delete account" />
          <DeleteAccount />
        </Card>
      </div>
    </Page>
  );
}
