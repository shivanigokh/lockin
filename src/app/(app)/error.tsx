"use client";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-5 text-center">
      <p className="label-mono mb-4 text-pink">something broke</p>
      <h1 className="display text-5xl">Well, that&apos;s awkward.</h1>
      <p className="mt-4 max-w-sm text-sm text-muted">{error.digest ? `Error ${error.digest}. ` : ""}Try again. If it keeps happening, it&apos;s not you, it&apos;s us.</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
