"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import { errResult, okResult, type ActionResult } from "@/lib/action";
import { friendlyError } from "@/lib/utils";

async function origin() {
  const h = await headers();
  const o = h.get("origin");
  return o && /^https?:\/\//.test(o) ? o : SITE_URL;
}

function safeNext(next: unknown) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/home";
}

const credentials = z.object({
  email: z.string().trim().email("That email looks off."),
  password: z.string().min(8, "Passwords need at least 8 characters."),
});

export async function signIn(_: unknown, form: FormData): Promise<ActionResult> {
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return errResult(parsed.error.issues[0]!.message);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return errResult(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
  redirect(safeNext(form.get("next")));
}

const signupSchema = credentials.extend({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, "Usernames are 3–20 characters: lowercase letters, numbers, underscores."),
  timezone: z.string().max(64).optional(),
});

export async function signUp(_: unknown, form: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    username: form.get("username"),
    timezone: form.get("timezone") || undefined,
  });
  if (!parsed.success) return errResult(parsed.error.issues[0]!.message);
  const supabase = await createClient();

  const { data: taken } = await supabase.rpc("username_available", { p_username: parsed.data.username });
  if (taken === false) return errResult("That username is taken. Get creative.");

  const next = safeNext(form.get("next"));
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { username: parsed.data.username, timezone: parsed.data.timezone },
    },
  });
  if (error) return errResult(friendlyError(error));
  if (data.session) redirect(next);
  return okResult("Check your inbox to confirm your email, then log in.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_: unknown, form: FormData): Promise<ActionResult> {
  const email = z.string().trim().email().safeParse(form.get("email"));
  if (!email.success) return errResult("That email looks off.");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${await origin()}/auth/callback?next=/reset-password`,
  });
  if (error) return errResult(error.message);
  return okResult("If that email has an account, a reset link is on its way.");
}

export async function updatePassword(_: unknown, form: FormData): Promise<ActionResult> {
  const pw = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (pw.length < 8) return errResult("Passwords need at least 8 characters.");
  if (pw !== confirm) return errResult("Those passwords don't match.");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) return errResult(error.message);
  return okResult("Password updated. Lock it in.");
}
