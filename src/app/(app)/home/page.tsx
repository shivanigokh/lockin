import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, Plus, UsersRound } from "lucide-react";
import { getActiveGroupId, getMe, getMyGroups } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Page } from "@/components/page-header";
import { PendingInvites } from "@/components/squads/pending-invites";
import { COPY } from "@/lib/constants";
import { displayName } from "@/lib/utils";

export default async function HomePage() {
  const [me, groups, active] = await Promise.all([getMe(), getMyGroups(), getActiveGroupId()]);
  const supabase = await createClient();
  const { data: invites } = await supabase.rpc("my_pending_invites");

  if (groups.length > 0 && !(invites?.length)) {
    const target = groups.find((g) => g.id === active) ?? groups[0]!;
    redirect(`/g/${target.id}`);
  }

  return (
    <Page className="max-w-3xl">
      <p className="label-mono mb-3 text-lime">hi {displayName(me.profile)}</p>
      <h1 className="display text-5xl sm:text-7xl">{groups.length ? "You've got mail." : "You're squadless."}</h1>
      <p className="mt-4 max-w-lg text-muted">
        {groups.length
          ? "Someone wants you in their squad."
          : `Squads are where the magic (peer pressure) happens. Start one and invite 2–9 friends, or join with a code. ${COPY.couch}`}
      </p>

      {invites?.length ? <PendingInvites invites={invites} className="mt-8" /> : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/squads/new" className="card group p-6 transition hover:-translate-y-0.5 hover:border-lime">
          <Plus className="mb-8 h-8 w-8 text-lime transition group-hover:rotate-90" />
          <h2 className="font-display text-2xl font-semibold tracking-tight">Start a squad</h2>
          <p className="mt-2 text-sm text-muted">You&apos;re the admin. Get 3 people in and it unlocks.</p>
        </Link>
        <Link href="/squads/join" className="card group p-6 transition hover:-translate-y-0.5 hover:border-pink">
          <KeyRound className="mb-8 h-8 w-8 text-pink transition group-hover:animate-wiggle" />
          <h2 className="font-display text-2xl font-semibold tracking-tight">Join with a code</h2>
          <p className="mt-2 text-sm text-muted">A friend sent you a code or link? Get in.</p>
        </Link>
        <Link href="/friends" className="card group flex items-center gap-4 p-5 transition hover:-translate-y-0.5 sm:col-span-2">
          <UsersRound className="h-7 w-7 shrink-0 text-lavender" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Just one friend?</span>
            <span className="block text-sm text-muted">Add them as a friend instead. No squad needed.</span>
          </span>
        </Link>
      </div>
      {groups.length ? (
        <p className="mt-8 text-sm text-muted">
          Or head back to{" "}
          <Link className="text-lime hover:underline" href={`/g/${groups[0]!.id}`}>
            {groups[0]!.name}
          </Link>
          .
        </p>
      ) : null}
    </Page>
  );
}
