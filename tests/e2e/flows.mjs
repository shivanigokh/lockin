/**
 * End-to-end smoke test of the main user flows in a real browser.
 *
 *   BASE_URL=http://localhost:3000 node tests/e2e/flows.mjs
 *
 * Needs `playwright` (npx playwright install chromium) and a running app pointed
 * at a Supabase project with email confirmations OFF (the local stack is).
 * Screenshots land in tests/e2e/screenshots/.
 */
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)("playwright");
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = new URL("./screenshots/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const run = Math.random().toString(36).slice(2, 6);
const log = (...a) => console.log("✓", ...a);

const browser = await chromium.launch();
const failures = [];
async function step(name, fn) {
  try {
    await fn();
    log(name);
  } catch (e) {
    failures.push(name);
    console.error("✗", name, "\n ", e.message.split("\n")[0]);
  }
}

async function newUser(name, mobile = false) {
  const ctx = await browser.newContext(mobile ? { ...devices["iPhone 13"] } : { viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error(`[${name} pageerror]`, e.message));
  const username = `${name}_${run}`;
  await page.goto(`${BASE}/signup`);
  await page.fill("#username", username);
  await page.fill("#email", `${username}@lockin.test`);
  await page.fill("#password", "password-123456");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/home/);
  return { ctx, page, username };
}

const riva = await newUser("riva");
const alex = await newUser("alex");
const sam = await newUser("sam", true);
const { page: p1 } = riva;

let groupUrl = "";
let code = "";

await step("landing + squadless home", async () => {
  await p1.getByText("You're squadless.").waitFor();
});

await step("create squad (filling state)", async () => {
  await p1.goto(`${BASE}/squads/new`);
  await p1.fill("#s-name", `Running From Our Problems ${run}`);
  await p1.fill("#s-desc", "We run. Mostly from responsibilities.");
  await p1.getByRole("button", { name: "Create squad" }).click();
  await p1.waitForURL(/\/g\/[0-9a-f-]{36}\/squad/);
  groupUrl = p1.url().replace(/\/squad.*$/, "");
  code = (await p1.locator("button[title='Copy code']").first().innerText()).trim();
  if (!/^[A-Z0-9]{8}$/.test(code)) throw new Error("no invite code: " + code);
  await p1.getByText("Members · 1/10").waitFor();
});

await step("invite link preview + join (2nd and 3rd member)", async () => {
  for (const u of [alex, sam]) {
    await u.page.goto(`${BASE}/join/${code}`);
    await u.page.getByText(`Running From Our Problems ${run}`).first().waitFor();
    await u.page.getByRole("button", { name: "Join squad" }).click();
    await u.page.waitForURL(/\/g\/[0-9a-f-]{36}$/);
  }
  await p1.goto(`${groupUrl}/squad`);
  await p1.getByText("Members · 3/10").waitFor();
});

await step("tick habits on dashboard", async () => {
  await p1.goto(groupUrl);
  await p1.getByRole("button", { name: "Went for a walk" }).click();
  await p1.getByRole("button", { name: "Drank enough water" }).click();
  await p1.getByText("2/6").first().waitFor();
  await p1.reload();
  await p1.getByRole("button", { name: "Went for a walk", pressed: true }).waitFor();
});

await step("log a workout from the sidebar", async () => {
  await p1.getByRole("button", { name: "Log workout" }).first().click();
  const dlg = p1.locator("dialog[open]");
  await dlg.getByRole("button", { name: "Run" }).click();
  await dlg.locator("#w-dist").fill("3");
  await dlg.getByRole("button", { name: "30" }).click();
  await dlg.getByRole("button", { name: "Log it" }).click();
  await p1.locator("dialog[open]").waitFor({ state: "detached" }).catch(() => {});
  await p1.getByText("You logged a 3 km run").first().waitFor();
});

await step("squad-mate sees the workout in the feed and reacts", async () => {
  await alex.page.goto(`${groupUrl}/feed`);
  await alex.page.getByText(`riva_${run}`, { exact: false }).first().waitFor();
  await alex.page.getByText("completed a 3 km run").first().waitFor();
  const runPost = alex.page.locator("li", { hasText: "completed a 3 km run" }).first();
  await runPost.getByRole("button", { name: "Add reaction" }).click();
  await runPost.getByRole("button", { name: /^fire/ }).click();
  await alex.page.getByRole("button", { name: /^fire \(1\)/ }).first().waitFor();
});

await step("post a message", async () => {
  await alex.page.fill("textarea[aria-label='Post to the squad']", "Be less of a couch creature, Sam.");
  await alex.page.getByRole("button", { name: "Post" }).click();
  await alex.page.getByText("Be less of a couch creature, Sam.").waitFor();
});

await step("reaction notification reaches the author", async () => {
  await p1.goto(`${BASE}/notifications`);
  await p1.getByText(/reacted to your post/).first().waitFor();
});

await step("private workout stays private", async () => {
  await p1.goto(`${BASE}/workouts`);
  await p1.getByRole("button", { name: "Log a workout" }).click();
  const dlg = p1.locator("dialog[open]");
  await dlg.getByRole("button", { name: "Yoga" }).click();
  await dlg.getByRole("button", { name: /Just me/ }).click();
  await dlg.getByRole("button", { name: "Log it" }).click();
  await p1.locator("[aria-label='Private']").first().waitFor();
  await alex.page.goto(`${groupUrl}/feed`);
  if (await alex.page.getByText("yoga session").count()) throw new Error("private yoga leaked into feed");
});

await step("private health data: weigh-in + measurement", async () => {
  await p1.goto(`${BASE}/me`);
  await p1.fill("#hp-h", "178");
  await p1.fill("#hp-s", "90");
  await p1.fill("#hp-t", "80");
  await p1.getByRole("button", { name: "Save", exact: true }).click();
  await p1.getByText("Saved. Only you can see this.").waitFor();
  await p1.fill("#wf-w", "87.4");
  await p1.getByRole("button", { name: "Log weigh-in" }).click();
  await p1.getByText("87.4 kg").first().waitFor();
  await p1.fill("#m-waist_cm", "92");
  await p1.getByRole("button", { name: "Save measurements" }).click();
  await p1.getByText("Measurements saved.").waitFor();
});

await step("squad-mates can't see health data anywhere", async () => {
  for (const path of [groupUrl, `${groupUrl}/feed`, `${groupUrl}/leaderboard`, `${groupUrl}/goals`, `${groupUrl}/squad`, `${groupUrl}/calendar`]) {
    await alex.page.goto(path);
    // visible text must not contain the values; the raw HTML / RSC payload must not contain health fields
    const text = await alex.page.innerText("body");
    for (const secret of ["87.4", "178", "92 cm", "kg"]) if (text.includes(secret)) throw new Error(`${secret} visible on ${path}`);
    const html = await alex.page.content();
    for (const field of ["weight_kg", "height_cm", "waist_cm", "body_fat", "health_goals", "Secret sauna"]) if (html.includes(field)) throw new Error(`${field} in payload of ${path}`);
  }
  await alex.page.goto(`${BASE}/me`);
  if ((await alex.page.content()).includes("87.4")) throw new Error("alex sees riva's weight");
});

await step("create a shared goal with percentage on the squad board", async () => {
  await p1.goto(`${groupUrl}/goals`);
  await p1.getByRole("link", { name: /Share a goal/ }).first().click();
  const dlg = p1.locator("dialog[open]");
  await dlg.getByRole("button", { name: "4 workouts / week" }).click();
  await dlg.getByRole("button", { name: "Set goal" }).click();
  await p1.getByText("Goal set and shared").waitFor();
  await alex.page.goto(`${groupUrl}/goals`);
  await alex.page.getByText("Complete 4 workouts this week").waitFor();
  await alex.page.getByText("50%").first().waitFor(); // run + yoga (private still counts toward own goal)
  await alex.page.getByText("2 / 4 workouts completed").waitFor();
});

await step("private goal stays off the squad board", async () => {
  await p1.goto(`${BASE}/goals`);
  await p1.getByRole("button", { name: "New goal" }).click();
  const dlg = p1.locator("dialog[open]");
  await dlg.locator("#g-title").fill("Secret sauna plan");
  await dlg.getByRole("button", { name: "Set goal" }).click();
  await p1.getByText("Private goal set.").waitFor();
  await alex.page.goto(`${groupUrl}/goals`);
  if (await alex.page.getByText("Secret sauna plan").count()) throw new Error("private goal leaked");
});

await step("leaderboard filters + awards", async () => {
  await alex.page.goto(`${groupUrl}/leaderboard?period=today`);
  await alex.page.getByText("Hall of fame").waitFor();
  await alex.page.goto(`${groupUrl}/leaderboard?period=all&by=minutes`);
  await alex.page.getByText("ranked by active minutes").waitFor();
});

await step("non-admin can't create challenges; admin can; member joins", async () => {
  await alex.page.goto(`${groupUrl}/challenges`);
  if (await alex.page.getByRole("button", { name: "New challenge" }).count()) throw new Error("member sees create button");
  await p1.goto(`${groupUrl}/challenges`);
  await p1.getByRole("button", { name: "New challenge" }).click();
  const dlg = p1.locator("dialog[open]");
  await dlg.getByRole("button", { name: "7-day walking" }).click();
  await dlg.getByRole("button", { name: "Launch challenge" }).click();
  await p1.getByText("7-day walking challenge").first().waitFor();
  await alex.page.reload();
  await alex.page.getByRole("button", { name: "Join challenge" }).click();
  await alex.page.getByRole("button", { name: "Leave" }).waitFor();
});

await step("calendar week/month views", async () => {
  await p1.goto(`${BASE}/calendar?view=week`);
  await p1.getByText("streak").waitFor();
  await p1.goto(`${groupUrl}/calendar`);
  await p1.getByText("Squad calendar").waitFor();
});

await step("mobile: bottom nav + quick log", async () => {
  await sam.page.goto(groupUrl);
  await sam.page.getByRole("button", { name: "Log workout" }).click();
  const dlg = sam.page.locator("dialog[open]");
  await dlg.getByRole("button", { name: "Swim" }).click();
  await dlg.getByRole("button", { name: "45" }).click();
  await dlg.getByRole("button", { name: "Log it" }).click();
  await sam.page.getByText("You logged a 45-minute swim").first().waitFor();
});

await step("screenshots", async () => {
  await p1.goto(groupUrl);
  await p1.waitForTimeout(600);
  await p1.screenshot({ path: `${SHOTS}dashboard-desktop.png`, fullPage: true });
  await p1.goto(`${BASE}/me`);
  await p1.waitForTimeout(800);
  await p1.screenshot({ path: `${SHOTS}health-desktop.png`, fullPage: true });
  await p1.goto(`${groupUrl}/leaderboard`);
  await p1.waitForTimeout(800);
  await p1.screenshot({ path: `${SHOTS}leaderboard-desktop.png`, fullPage: true });
  await alex.page.goto(`${groupUrl}/goals`);
  await alex.page.screenshot({ path: `${SHOTS}goals-desktop.png`, fullPage: true });
  await p1.goto(`${groupUrl}/challenges`);
  await p1.screenshot({ path: `${SHOTS}challenges-desktop.png`, fullPage: true });
  await p1.goto(`${BASE}/calendar`);
  await p1.screenshot({ path: `${SHOTS}calendar-desktop.png`, fullPage: true });
  const m = await browser.newContext({ ...devices["iPhone 13"] });
  const mp = await m.newPage();
  await mp.goto(BASE);
  await mp.screenshot({ path: `${SHOTS}landing-mobile.png`, fullPage: true });
  await alex.ctx.close();
  const mob = await browser.newContext({ ...devices["iPhone 13"] });
  const mpage = await mob.newPage();
  await mpage.goto(`${BASE}/login`);
  await mpage.fill("#email", `alex_${run}@lockin.test`);
  await mpage.fill("#password", "password-123456");
  await mpage.click("button[type=submit]");
  await mpage.waitForURL(/\/g\//);
  await mpage.getByText("Did you though?").waitFor();
  await mpage.screenshot({ path: `${SHOTS}dashboard-mobile.png`, fullPage: true });
});

await step("friends: add by username, accept, see stats", async () => {
  await p1.goto(`${BASE}/friends`);
  await p1.fill("input[aria-label=\"Friend's username\"]", `sam_${run}`);
  await p1.getByRole("button", { name: "Add" }).click();
  await p1.getByText(`Request sent to @sam_${run}.`).waitFor();
  await sam.page.goto(`${BASE}/friends`);
  await sam.page.getByRole("button", { name: "Accept" }).click();
  await sam.page.getByText(/Your friends \(1\)/).waitFor();
  await p1.goto(`${BASE}/friends`);
  await p1.getByText(/Your friends \(1\)/).waitFor();
  await p1.getByRole("link", { name: new RegExp(`sam_${run}`) }).click();
  await p1.getByText("Last 30 days").waitFor();
  // sam views riva's page: riva logged a 87.4 kg weigh-in earlier, which must never show
  await sam.page.goto(`${BASE}/friends`);
  await sam.page.getByRole("link", { name: new RegExp(`riva_${run}`) }).click();
  await sam.page.getByText("Last 30 days").waitFor();
  const text = await sam.page.innerText("body");
  const html = await sam.page.content();
  if (text.includes("87.4")) throw new Error("weight leaked to friend page");
  for (const s of ["weight_kg", "waist_cm", "height_cm"]) if (html.includes(s)) throw new Error("health field leaked: " + s);
});

await step("admin removes a member, member loses access", async () => {
  await p1.goto(`${groupUrl}/squad`);
  p1.once("dialog", (d) => d.accept());
  await p1.locator("li", { hasText: `sam_${run}` }).getByRole("button", { name: /Remove/ }).click();
  await p1.getByText("Member removed.").waitFor();
  await sam.page.goto(groupUrl);
  await sam.page.getByText("Not here.").waitFor();
});

await step("log out", async () => {
  await p1.goto(`${BASE}/settings`);
  await p1.getByRole("button", { name: "Log out" }).click();
  await p1.waitForURL(/\/login/);
});

await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} step(s) failed:`, failures);
  process.exit(1);
}
console.log("\nAll flows passed.");
