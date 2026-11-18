"use client";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

/**
 * Where the user is navigating to, from the moment they tap a link until the
 * new screen arrives. Nav bars read this so the tapped tab lights up instantly
 * instead of waiting for the server.
 */
let target: string | null = null;
const listeners = new Set<() => void>();

export function setPendingPath(path: string | null) {
  if (target === path) return;
  target = path;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePendingPath() {
  return useSyncExternalStore(
    subscribe,
    () => target,
    () => null,
  );
}

/** The pathname nav should highlight: the pending destination if there is one. */
export function useNavPathname() {
  const pathname = usePathname();
  const pending = usePendingPath();
  return pending ?? pathname;
}
