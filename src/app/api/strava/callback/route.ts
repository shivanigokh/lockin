import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { connectStrava, syncStrava } from "@/lib/strava";

const STATE_COOKIE = "strava_oauth_state";

// Strava redirects here after the user approves (or cancels).
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const back = (status: string) => {
    const res = NextResponse.redirect(`${origin}/settings?strava=${status}#connected-apps`);
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/strava" });
    return res;
  };

  const user = await getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?next=/settings`);
  const state = searchParams.get("state");
  if (!state || state !== request.cookies.get(STATE_COOKIE)?.value) return back("error");
  if (searchParams.get("error")) return back("cancelled");
  const code = searchParams.get("code");
  const scope = searchParams.get("scope") ?? "";
  if (!code) return back("error");
  if (!scope.split(",").some((s) => s === "activity:read" || s === "activity:read_all")) return back("needs-activity");

  const supabase = await createClient();
  try {
    await connectStrava(supabase, user.id, code, scope);
  } catch {
    return back("error");
  }
  try {
    await syncStrava(supabase, user.id);
  } catch {
    // connected fine; the next sync will retry
  }
  return back("connected");
}
