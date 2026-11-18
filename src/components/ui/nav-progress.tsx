"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { setPendingPath } from "@/lib/nav-pending";

type Phase = "idle" | "loading" | "done";

/**
 * A thin blueberry-to-tomato bar across the top of the screen that starts the
 * instant a link is tapped and finishes when the next screen is in, so a slow
 * network never feels like a dead tap.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return; // same screen (hash or query tweak)
      if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;
      setPendingPath(url.pathname);
      setPhase("loading");
      if (safety.current) clearTimeout(safety.current);
      safety.current = setTimeout(() => {
        setPendingPath(null);
        setPhase("idle");
      }, 15000);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    setPendingPath(null);
    if (safety.current) clearTimeout(safety.current);
    setPhase((p) => (p === "loading" ? "done" : p));
  }, [pathname]);

  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => setPhase("idle"), 450);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px]" aria-hidden>
      <div className="nav-progress" data-phase={phase} />
    </div>
  );
}
