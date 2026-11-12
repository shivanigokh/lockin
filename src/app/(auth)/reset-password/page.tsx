import type { Metadata } from "next";
import Link from "next/link";
import { updatePassword } from "@/app/actions/auth";
import { AuthForm } from "../auth-form";
import { Field, Input } from "@/components/ui/field";

export const metadata: Metadata = { title: "New password" };

export default function ResetPasswordPage() {
  return (
    <>
      <p className="label-mono mb-2">// fresh start</p>
      <h1 className="display mb-8 text-5xl">New password.</h1>
      <AuthForm action={updatePassword} submit="Save password">
        <Field label="New password" htmlFor="password" hint="8+ characters.">
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Confirm" htmlFor="confirm">
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
      </AuthForm>
      <p className="mt-8 text-sm text-muted">
        Done?{" "}
        <Link href="/home" className="font-semibold text-lime hover:underline">
          Back to your squad
        </Link>
      </p>
    </>
  );
}
