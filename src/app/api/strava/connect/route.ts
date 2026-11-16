import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/data";
import { stravaAuthorizeUrl, stravaConfigured } from "@/lib/strava";

const STATE_COOKIE = "strava_oauth_state";

// Sends the signed-in user to Strava's consent screen.
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?next=/settings`);
  if (!stravaConfigured()) return NextResponse.redirect(`${origin}/settings?strava=not-configured#connected-apps`);
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(stravaAuthorizeUrl(`${origin}/api/strava/callback`, state));
  res.cookies.set(STATE_COOKIE, state, { httpOnly: true, secure: origin.startsWith("https"), sameSite: "lax", maxAge: 600, path: "/api/strava" });
  return res;
}
