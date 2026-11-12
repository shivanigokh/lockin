import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-5 text-center">
      <p className="label-mono mb-4 text-lime">// 404</p>
      <h1 className="display text-6xl sm:text-8xl">Not here.</h1>
      <p className="mt-4 max-w-sm text-muted">Either this doesn&apos;t exist or it&apos;s not yours to see. Privacy is a feature.</p>
      <Link href="/home" className={buttonClass("primary", "lg", "mt-8")}>
        Back to safety
      </Link>
    </div>
  );
}
