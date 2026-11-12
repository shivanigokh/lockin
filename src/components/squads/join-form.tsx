"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useAction } from "@/lib/use-action";
import { joinSquad } from "@/app/actions/squads";

export function JoinForm({ initialCode = "", disabled }: { initialCode?: string; disabled?: boolean }) {
  const [code, setCode] = useState(initialCode);
  const [join, pending] = useAction(joinSquad);
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        join(code);
      }}
    >
      <Input
        aria-label="Invite code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="AB12CD34"
        maxLength={12}
        required
        className="h-12 font-mono text-lg tracking-[0.3em] uppercase"
      />
      <Button type="submit" size="lg" loading={pending} disabled={disabled}>
        Join squad
      </Button>
    </form>
  );
}
