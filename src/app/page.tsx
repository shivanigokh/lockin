import Link from "next/link";
import { Flame, Lock, Trophy, Users } from "lucide-react";
import { Logo, Marquee } from "@/components/brand";
import { buttonClass } from "@/components/ui/button";
import { COPY } from "@/lib/constants";

const features = [
  { icon: Users, title: "Squads of 3–10", body: "Make a squad for every chaotic group chat. Swim crew, run club, sober-ish October. Each one has its own feed, leaderboard and challenges.", color: "var(--color-lime)" },
  { icon: Lock, title: "Your body stays yours", body: "Weight, measurements and notes live in a vault only you can open. Not your friends, not your squad admin. Enforced by the database, not vibes.", color: "var(--color-pink)" },
  { icon: Trophy, title: "Competitive, not toxic", body: "Ranked by sessions and minutes. Never by weight, calories or looks. Rotating awards for the consistent, the comeback kids and weekend warriors.", color: "var(--color-lavender)" },
  { icon: Flame, title: "Seconds, not minutes", body: "Tick off today's habits and log a workout in two taps. Then go outside.", color: "var(--color-orange)" },
];

export default async function Landing({ searchParams }: { searchParams: Promise<{ bye?: string }> }) {
  const { bye } = await searchParams;
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="group">
          <Logo />
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/login" className={buttonClass("ghost", "md")}>
            Log in
          </Link>
          <Link href="/signup" className={buttonClass("primary", "md")}>
            Join
          </Link>
        </nav>
      </header>

      {bye ? (
        <p className="mx-auto max-w-6xl px-5 text-sm text-muted">Your account and all its data are gone. Stay hydrated out there.</p>
      ) : null}

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:pt-20">
        <div className="relative">
          <div className="pointer-events-none relative mb-6 hidden h-24 w-28 sm:absolute sm:block sm:-top-10 sm:right-10 sm:mb-0 sm:h-72 sm:w-72" aria-hidden>
            <span className="absolute left-[8%] top-[30%] h-[58%] w-[58%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#d9daff_40%,#7579e0)] shadow-[0_0_80px_10px_rgba(117,121,224,0.55)]" />
            <span className="absolute right-[6%] top-[8%] h-[40%] w-[40%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#ffd2cb_40%,#e94b3c)] shadow-[0_0_70px_6px_rgba(233,75,60,0.5)]" />
          </div>
          <p className="relative mb-4 text-[15px] font-medium text-lavender">A tiny accountability club for you and your friends</p>
          <h1 className="display relative max-w-3xl text-[clamp(3rem,12vw,7.5rem)]">
            Get <span className="bg-gradient-to-r from-[#c6c7ff] to-[#ff8a78] bg-clip-text text-transparent">nudged</span>
            <br />
            off the couch.
          </h1>
        </div>
        <div className="mt-10 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-lg text-lg text-muted">
            The social accountability app for you and your friends. Eat better, drink less, walk, run, swim, sleep. Then rub it in the group chat. {COPY.couch}
          </p>
          <div className="flex gap-3">
            <Link href="/signup" className={buttonClass("primary", "lg")}>
              Start a squad
            </Link>
            <Link href="/login" className={buttonClass("secondary", "lg")}>
              I have a code
            </Link>
          </div>
        </div>
      </section>

      <Marquee />

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-20 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="card group p-7 transition hover:-translate-y-0.5">
            <f.icon className="mb-6 h-8 w-8 transition group-hover:animate-wiggle" style={{ color: f.color }} />
            <h2 className="font-display text-2xl font-semibold tracking-tight">{f.title}</h2>
            <p className="mt-3 text-muted">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="card relative overflow-hidden p-10 text-center sm:p-16">
          <p className="label-mono mb-4">{COPY.hydrated}</p>
          <h2 className="display text-5xl sm:text-7xl">{COPY.leaderboard}</h2>
          <p className="mx-auto mt-6 max-w-md text-muted">But your workout count is. Fair game.</p>
          <Link href="/signup" className={buttonClass("primary", "lg", "mt-8")}>
            Get in, loser
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 text-xs text-faint sm:flex-row">
          <span>{COPY.tagline}</span>
          <span>Made for friends. Not medical advice.</span>
        </div>
      </footer>
    </div>
  );
}
