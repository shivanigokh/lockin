import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Handles email confirmation, password recovery and magic links (PKCE `code` or `token_hash`).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const rawNext = searchParams.get("next") ?? "/home";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/home";
  const supabase = await createClient();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  let error: string | null = null;
  if (code) {
    const res = await supabase.auth.exchangeCodeForSession(code);
    error = res.error?.message ?? null;
  } else if (tokenHash && type) {
    const res = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    error = res.error?.message ?? null;
    if (!error && type === "recovery") return NextResponse.redirect(`${origin}/reset-password`);
  } else {
    error = "Missing confirmation code.";
  }

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("That link is invalid or expired. Try again.")}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
