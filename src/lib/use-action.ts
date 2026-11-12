"use client";
import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/action";

/**
 * Wraps a server action: shows a toast on error (or on success when the action
 * returns a message), refreshes server components, and exposes a pending flag.
 */
export function useAction<A extends unknown[], T>(
  action: (...args: A) => Promise<ActionResult<T>>,
  opts: { onSuccess?: (data: T | undefined) => void; refresh?: boolean } = {},
) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const { onSuccess, refresh = true } = opts;
  const run = useCallback(
    (...args: A) =>
      new Promise<ActionResult<T>>((resolve) => {
        start(async () => {
          try {
            const res = await action(...args);
            if (!res.ok) toast(res.error, "error");
            else {
              if (res.message) toast(res.message);
              onSuccess?.(res.data);
              if (refresh) router.refresh();
            }
            resolve(res);
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Something went wrong.";
            toast(msg, "error");
            resolve({ ok: false, error: msg });
          }
        });
      }),
    [action, onSuccess, refresh, router, toast],
  );
  return [run, pending] as const;
}
