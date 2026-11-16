"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { syncStrava } from "@/app/actions/integrations";

/** Quietly pulls new Strava activities once when the app opens (if due). */
export function StravaAutoSync() {
  const ran = useRef(false);
  const router = useRouter();
  const toast = useToast();
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    syncStrava({ quiet: true })
      .then((r) => {
        if (r.ok && r.data?.added) {
          toast(r.message ?? "New workouts from Strava.");
          router.refresh();
        }
      })
      .catch(() => {});
  }, [router, toast]);
  return null;
}
