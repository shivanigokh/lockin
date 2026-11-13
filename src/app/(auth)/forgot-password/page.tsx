import Link from "next/link";
import type { Metadata } from "next";
import { requestPasswordReset } from "@/app/actions/auth";
import { AuthForm } from "../auth-form";
import { Field, Input } from "@/components/ui/field";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <>
      <p className="label-mono mb-2">it happens to the best of us</p>
      <h1 className="display mb-8 text-5xl">Forgot it?</h1>
      <AuthForm action={requestPasswordReset} submit="Send reset link">
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
      </AuthForm>
      <p className="mt-8 text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-lime hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
