/**
 * Seeds a small squad and screenshots every screen at phone width.
 *
 *   WIDTH=375 BASE_URL=http://localhost:3000 node tests/e2e/mobile-shots.mjs
 *
 * Also reports any element whose text is clipped (overflowing its box) or any
 * page that scrolls sideways. Screenshots land in tests/e2e/screenshots/mobile-<width>/.
 */
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const WIDTH = Number(process.env.WIDTH ?? 375);
const SHOTS = new URL(`./screenshots/mobile-${WIDTH}/`, import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const run = Math.random().toString(36).slice(2, 6);

const browser = await chromium.launch();
const ctxOpts = { viewport: { width: WIDTH, height: 800 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true };

async function newUser(name) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error(`[${name} pageerror]`, e.message));
  const username = `${name}_${run}`;
  await page.goto(`${BASE}/signup`);
  await page.fill("#username", username);
  await page.fill("#email", `${username}@lockin.test`);
  await page.fill("#password", "password-123456");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/home/, { timeout: 60000 });
  return { ctx, page, username };
}

const issues = [];
async function audit(page, label) {
  const found = await page.evaluate(() => {
    const out = [];
    if (document.documentElement.scrollWidth > window.innerWidth + 1)
      out.push(`page scrolls sideways (${document.documentElement.scrollWidth}px)`);
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (el.closest("[data-scroll-x]") || el.closest("svg") || el.closest("dialog:not([open])")) continue;
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) continue;
      const clipped =
        (cs.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1) ||
        (cs.overflow !== "visible" && el.scrollWidth > el.clientWidth + 1 && cs.whiteSpace === "nowrap") ||
        (Number(cs.webkitLineClamp) > 0 && el.scrollHeight > el.clientHeight + 1);
      if (clipped) out.push(`clipped: "${el.textContent.trim().slice(0, 50)}"`);
      const r = el.getBoundingClientRect();
      if (r.width && r.right > window.innerWidth + 1) out.push(`off-screen: "${el.textContent.trim().slice(0, 50)}"`);
    }
    return [...new Set(out)];
  });
  for (const f of found) issues.push(`${label}: ${f}`);
}

async function shot(page, name, url) {
  if (url) await page.goto(url).catch(() => page.goto(url));
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(500);
  await audit(page, name);
  await page.screenshot({ path: `${SHOTS}${name}.png`, fullPage: true });
}

// Landing and auth while logged out
{
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await shot(page, "landing", BASE);
  await shot(page, "login", `${BASE}/login`);
  await shot(page, "signup", `${BASE}/signup`);
  await ctx.close();
}

const a = await newUser("riva_longer_name");
const b = await newUser("alex");
const c = await newUser("sam");
const p = a.page;
await shot(p, "home-squadless");

await p.goto(`${BASE}/squads/new`);
await shot(p, "squad-new");
await p.fill("#s-name", `Running From Our Problems ${run}`);
await p.fill("#s-desc", "We run. Mostly from responsibilities and group chats.");
await p.getByRole("button", { name: "Create squad" }).click();
await p.waitForURL(/\/g\/[0-9a-f-]{36}\/squad/);
const groupUrl = p.url().replace(/\/squad.*$/, "");
const code = (await p.locator("button[title='Copy code']").first().innerText()).trim();
await b.page.goto(`${BASE}/join/${code}`);
await shot(b.page, "join");
await b.page.getByRole("button", { name: "Join squad" }).click();
await b.page.waitForURL(/\/g\/[0-9a-f-]{36}$/);
await c.page.goto(`${BASE}/join/${code}`);
await c.page.getByRole("button", { name: "Join squad" }).click();
await c.page.waitForURL(/\/g\/[0-9a-f-]{36}$/);

await p.goto(groupUrl);
await p.getByRole("button", { name: "Went for a walk" }).click();
await p.getByRole("button", { name: "Log workout" }).first().click();
const dlg = p.locator("dialog[open]");
await dlg.waitFor();
await shot(p, "log-workout");
await dlg.getByRole("button", { name: "Run" }).click();
await dlg.locator("#w-dist").fill("5");
await dlg.getByRole("button", { name: "30" }).click();
await dlg.getByRole("button", { name: "Log it" }).click();
await p.getByText("You logged a 5 km run").first().waitFor();
await b.page.goto(`${groupUrl}/feed`);
await b.page.fill("textarea[aria-label='Post to the squad']", "Be less of a couch creature. Hydrated? Emotionally? Physically? Unclear.");
await b.page.getByRole("button", { name: "Post" }).click();
await b.page.getByText("Be less of a couch creature.", { exact: false }).first().waitFor();

await p.goto(`${groupUrl}/goals`);
await p.getByRole("link", { name: /Share a goal/ }).first().click();
await p.locator("dialog[open]").getByRole("button", { name: "4 workouts / week" }).click();
await p.locator("dialog[open]").getByRole("button", { name: "Set goal" }).click();
await p.getByText("Goal set and shared").waitFor();
await p.goto(`${groupUrl}/challenges`);
await p.getByRole("button", { name: "New challenge" }).click();
await p.locator("dialog[open]").getByRole("button", { name: "7-day walking" }).click();
await p.locator("dialog[open]").getByRole("button", { name: "Launch challenge" }).click();
await p.getByText("7-day walking challenge").first().waitFor();

await shot(p, "dashboard", groupUrl);
await shot(p, "feed", `${groupUrl}/feed`);
await shot(p, "leaderboard", `${groupUrl}/leaderboard`);
await shot(p, "goals", `${groupUrl}/goals`);
await shot(p, "challenges", `${groupUrl}/challenges`);
await shot(p, "squad", `${groupUrl}/squad`);
await shot(p, "squad-calendar", `${groupUrl}/calendar`);
await shot(p, "me", `${BASE}/me`);
await shot(p, "my-goals", `${BASE}/goals`);
await shot(p, "workouts", `${BASE}/workouts`);
await shot(p, "calendar", `${BASE}/calendar`);
await shot(p, "notifications", `${BASE}/notifications`);
await shot(p, "settings", `${BASE}/settings`);
await shot(p, "squads", `${BASE}/squads`);
// Open whatever opens the squad switcher / menu on phones
const menu = p.getByRole("button", { name: /switch squad|menu|more/i }).first();
if (await menu.count()) {
  await p.goto(groupUrl);
  await menu.click().catch(() => {});
  await shot(p, "menu-open");
}

console.log(issues.length ? issues.join("\n") : "no clipping or sideways scroll found");
console.log("shots:", SHOTS);
await browser.close();
