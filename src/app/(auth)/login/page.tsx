import Link from "next/link";
import type { Metadata } from "next";
import { signIn } from "@/app/actions/auth";
import { AuthForm } from "../auth-form";
import { Field, Input } from "@/components/ui/field";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="display mb-8 text-5xl">Welcome back.</h1>
      {error ? <p className="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-[#ffb3b3]">{error}</p> : null}
      <AuthForm action={signIn} submit="Log in" next={next}>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@couch.club" />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
        </Field>
        <div className="text-right">
          <Link href="/forgot-password" className="text-xs text-muted underline-offset-4 hover:text-lime hover:underline">
            Forgot your password?
          </Link>
        </div>
      </AuthForm>
      <p className="mt-8 text-sm text-muted">
        New here?{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="font-semibold text-lime hover:underline">
          Join the club
        </Link>
      </p>
    </>
  );
}
