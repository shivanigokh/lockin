"use client";
import { useActionState, useEffect, useState } from "react";
import type { ActionResult } from "@/lib/action";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Action = (prev: unknown, form: FormData) => Promise<ActionResult>;

export function AuthForm({
  action,
  submit,
  children,
  next,
  withTimezone,
}: {
  action: Action;
  submit: string;
  children: React.ReactNode;
  next?: string;
  withTimezone?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [tz, setTz] = useState("");
  useEffect(() => {
    if (withTimezone) setTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [withTimezone]);

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {withTimezone ? <input type="hidden" name="timezone" value={tz} /> : null}
      {children}
      {state ? (
        <p
          role="alert"
          className={cn(
            "rounded-xl border px-3 py-2 text-sm",
            state.ok ? "border-lime/30 bg-lime/5 text-lime" : "border-danger/30 bg-danger/5 text-[#ffb3b3]",
          )}
        >
          {state.ok ? state.message : state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {submit}
      </Button>
    </form>
  );
}
