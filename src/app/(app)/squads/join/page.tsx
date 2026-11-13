import type { Metadata } from "next";
import { Page, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { JoinForm } from "@/components/squads/join-form";

export const metadata: Metadata = { title: "Join a squad" };

export default function JoinPage() {
  return (
    <Page className="max-w-2xl">
      <PageHeader label="got a code?" title="Get in." sub="Paste the 8-character invite code your friend sent. Or just open their invite link." />
      <Card>
        <JoinForm />
      </Card>
    </Page>
  );
}
