import Link from "next/link";
import type { Metadata } from "next";
import { signUp } from "@/app/actions/auth";
import { AuthForm } from "../auth-form";
import { Field, Input } from "@/components/ui/field";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <p className="label-mono mb-2">membership is free, excuses are not</p>
      <h1 className="display mb-8 text-5xl">Join the club.</h1>
      <AuthForm action={signUp} submit="Create account" next={next} withTimezone>
        <Field label="Username" htmlFor="username" hint="What your squad calls you. Lowercase, numbers, underscores.">
          <Input id="username" name="username" required pattern="[a-zA-Z0-9_]{3,20}" maxLength={20} placeholder="couch_creature" autoComplete="username" />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@couch.club" />
        </Field>
        <Field label="Password" htmlFor="password" hint="8+ characters.">
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
      </AuthForm>
      <p className="mt-8 text-sm text-muted">
        Already a member?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-lime hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
