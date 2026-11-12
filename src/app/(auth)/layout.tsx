import Link from "next/link";
import { Logo } from "@/components/brand";
import { COPY } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-line bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href="/" aria-label="LOCK IN home">
          <Logo />
        </Link>
        <div>
          <p className="label-mono mb-6 text-lime">// private accountability club</p>
          <h1 className="display text-[clamp(4rem,8vw,8rem)]">
            Less talk.
            <br />
            <span className="text-lime">More action.</span>
          </h1>
          <p className="mt-8 max-w-md text-lg text-muted">{COPY.couch} Track workouts, tick off habits and bully your friends (lovingly) into moving.</p>
        </div>
        <p className="label-mono">{COPY.hydrated}</p>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-lime/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-24 h-72 w-72 rounded-full bg-pink/10 blur-3xl" />
      </aside>
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" className="lg:hidden" aria-label="LOCK IN home">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
