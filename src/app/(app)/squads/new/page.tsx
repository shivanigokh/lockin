import type { Metadata } from "next";
import { Page, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { SquadForm } from "@/components/squads/squad-form";

export const metadata: Metadata = { title: "New squad" };

export default function NewSquadPage() {
  return (
    <Page className="max-w-2xl">
      <PageHeader label="// new squad" title="Assemble." sub="You'll be the admin. Squads unlock leaderboards and challenges once 3 people are in (max 10)." />
      <Card>
        <SquadForm />
      </Card>
    </Page>
  );
}
