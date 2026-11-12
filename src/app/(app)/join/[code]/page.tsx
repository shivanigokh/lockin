import Link from "next/link";
import type { Metadata } from "next";
import { Page } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { JoinForm } from "@/components/squads/join-form";
import { SquadBadge } from "@/components/shell/squad-switcher";
import { buttonClass } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Squad invite" };

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("preview_invite", { p_code: code });
  const inv = data?.[0];

  return (
    <Page className="max-w-xl">
      {!inv?.group_id ? (
        <Card className="text-center">
          <p className="label-mono mb-2">// hmm</p>
          <h1 className="display text-4xl">Invite not found.</h1>
          <p className="mt-3 text-sm text-muted">Double-check the link, or ask for a fresh code.</p>
          <Link href="/squads/join" className={buttonClass("secondary", "md", "mt-6")}>
            Enter a code
          </Link>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <p className="label-mono mb-6">// you&apos;ve been summoned</p>
          <div className="flex justify-center">
            <SquadBadge g={{ icon: inv.icon!, color: inv.color! }} size={88} />
          </div>
          <h1 className="display mt-6 text-4xl">{inv.name}</h1>
          {inv.description ? <p className="mt-3 text-muted">{inv.description}</p> : null}
          <p className="label-mono mt-4">{inv.member_count}/10 members</p>
          <div className="mt-8">
            {inv.already_member ? (
              <Link href={`/g/${inv.group_id}`} className={buttonClass("primary", "lg")}>
                You&apos;re already in. Go to squad
              </Link>
            ) : inv.valid ? (
              <JoinForm initialCode={code.toUpperCase()} />
            ) : (
              <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-[#ffb3b3]">{inv.reason}</p>
            )}
          </div>
          <p className="mt-6 text-xs text-faint">Joining shares your username, avatar, squad-visible workouts and habit check-ins with this squad. Never your health data.</p>
        </Card>
      )}
    </Page>
  );
}
