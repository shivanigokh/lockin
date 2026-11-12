# LOCK IN

**LESS TALK. MORE ACTION.**

A chaotic little social accountability club for 3–10 friends. Make squads, tick off daily habits, log workouts, share goals as percentages and compete on friendly leaderboards, while your body data stays in a vault nobody else can open.

Built with Next.js (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Auth, Postgres, RLS, Storage) · Recharts · Lucide · Vercel.

---

## What's in it

| Area | Features |
| --- | --- |
| **Accounts** | Email + password sign-up/login/logout, password reset by email, username, display name, bio, avatar upload, change password, delete account |
| **Squads** | Create many squads, join many squads, unique names, description, icon + colour, invite links/codes (expiry + max uses, revocable), invite by username, admin roles, promote/demote, remove members, leave, delete, per-squad settings, squad switcher (sidebar on desktop, top bar on mobile) |
| **3–10 members** | A new squad starts in a *filling* state with just its creator. Leaderboards and challenges unlock at 3 members. The database rejects member #11. |
| **Squad dashboard** | Today's habit checklist (one tap), quick workout logging, who's locked in today, weekly squad pulse, feed preview, live challenges |
| **Workouts** | Walk, run, swim, gym, cycle, yoga, sports, other. Date, duration, optional distance and note, *squad-visible or private*. Edit and delete your own. |
| **Habits** | Six defaults (balanced meals, alcohol-free, walk, exercise, water, sleep). Add, rename, re-icon, reorder, archive, hide individual habits from squads. |
| **Feed** | Auto posts for workouts, all-habits-done days, joins/leaves, weekly squad milestones (10/25/50/75/100 workouts), challenges and shared goals. Short messages and six reactions. |
| **Leaderboard** | Today / week / month / all time, ranked by sessions (one workout = one point) or active minutes. Never weight, calories or looks. Rotating awards: first place, most consistent, biggest comeback, weekend warrior, most active. |
| **Goals** | Private by default; explicitly share to one or more squads. Weekly, monthly or custom periods. Auto-tracked from workouts (count / distance / minutes, optionally per activity) or habit days, or logged manually. Squads see **only name, target, progress and %**. Weight goals can never be shared. |
| **Challenges** | Admins create (optionally members). Name, description, dates, target, metric (workouts, minutes, km, habit days, self-reported), per-person or squad-total. Join/leave, live progress, completion status. Presets for the classics. |
| **Calendar** | Week and month views. Personal (everything incl. private workouts, habit scores, streak, joined challenges) and squad (squad-visible workouts + challenge dates). Colour per activity type. |
| **Private health** | Height, starting/target weight, weigh-ins with history chart, body measurements (waist, hips, chest, body fat, resting HR, VO₂ max, push-ups, plank), personal notes, health goals text, kg/lb + cm/in. Progress charts: weekly consistency, 30-day habit trend, monthly summary, goal completion. |
| **Settings** | Profile, habits, privacy (habit sharing, default workout visibility), units, timezone, in-app notification preferences, manage squads, pending invitations, password, delete account |
| **Notifications** | In-app: reactions, new challenges, username invites, new squad members, each switchable in settings |

## Privacy model (enforced in Postgres, not the UI)

All tables have Row Level Security. See `supabase/migrations/20261112000002_rls.sql`.

1. `private_health_profiles`, `weight_entries`, `body_measurements`, `health_notes`, `goal_progress_entries`, `user_settings`: **owner only**, for every operation.
2. `personal_goals`: owner, plus members of a squad the goal was explicitly shared into (`shared_goals`). Weight-category goals are blocked from sharing by policy *and* trigger.
3. Squad tables (`groups`, `group_members`, `group_invites`, `group_activity`, `activity_reactions`, `group_challenges`, `challenge_participants`, `shared_goals`): members of that squad only.
4. `workouts` / `daily_habits` / `habit_completions`: owner, plus people who share a squad with the owner, and only rows marked squad-visible.
5. Admins get **no** extra read access to anyone's personal data.
6. Group-facing RPCs (`group_leaderboard`, `group_awards`, `group_goal_board`, `group_habits_today`, `challenge_board`, `group_calendar`) are `SECURITY DEFINER`, check membership first, and never read health tables.
7. Logged-out visitors have no table privileges at all.
8. The app only ever uses the **anon/publishable key**. No service-role key exists anywhere in the code; account deletion runs through a locked-down `delete_my_account()` function.

These rules are covered by `tests/rls.test.ts` (35 tests) which talk to a real Supabase stack as different signed-in users.

## Local development

Requirements: Node 20+, Docker (for the local Supabase stack).

```bash
npm install
npx supabase start            # starts Postgres, Auth, Storage locally and applies migrations
cp .env.example .env.local    # then paste the API URL + anon key printed by `supabase start`
npm run dev                   # http://localhost:3000
```

Local auth has email confirmation turned off, so you can sign up instantly.

Useful scripts:

```bash
npm run db:reset    # re-create the local DB from migrations
npm run db:types    # regenerate src/lib/database.types.ts
npm run typecheck
npm run lint
npm run test:rls    # privacy/permission tests (needs `supabase start`)
npm run build && npm start
BASE_URL=http://localhost:3000 npm run test:e2e   # browser flows (needs `npx playwright install chromium`)
```

## Deploying (Supabase + Vercel)

### 1. Supabase project

1. Create a project at <https://supabase.com/dashboard> (any region near your friends).
2. Apply the migrations. Either:
   - **CLI:** `npx supabase login` → `npx supabase link --project-ref <your-ref>` → `npx supabase db push`, or
   - **Dashboard:** SQL Editor → New query → paste all of `supabase/setup.sql` (the four migrations combined) → Run.
3. **Authentication → URL Configuration**
   - Site URL: `https://<your-vercel-domain>`
   - Redirect URLs: `https://<your-vercel-domain>/**` (and `http://localhost:3000/**` for local dev)
4. **Authentication → Providers → Email**: keep email + password on. "Confirm email" is recommended (users click a link that lands on `/auth/callback`).
5. Optional but recommended for real use: **Authentication → Emails → SMTP** with your own provider. Supabase's built-in mailer is rate-limited to a handful of emails per hour.
6. **Project Settings → API**: copy the *Project URL* and the *anon / publishable* key.

### 2. Vercel

1. Push this repo to GitHub.
2. <https://vercel.com/new> → import the repo (framework preset: Next.js, defaults are fine).
3. Environment variables (Production + Preview):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon / publishable key |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-vercel-domain>` |

4. Deploy. Then put the final domain back into Supabase's Site URL / Redirect URLs if it changed.

### 3. Smoke test production

Sign up three accounts (or three friends), create a squad, join with the code, log a workout, tick habits, add a weigh-in and check it doesn't show up for the others, share a goal and watch the percentage appear on the squad's Shared goals page. Or run `BASE_URL=https://<domain> npm run test:e2e` against a project with email confirmation temporarily off.

## Project structure

```
src/
  app/
    (auth)/           login, signup, forgot/reset password
    (app)/            authenticated shell
      g/[groupId]/    squad dashboard, feed, leaderboard, goals, challenges, calendar, squad admin
      me/             private health dashboard
      goals/ workouts/ calendar/ settings/ notifications/ squads/ join/[code]/
    actions/          server actions (all writes go through these, as the signed-in user)
    auth/             email callback + sign-out route handlers
  components/         UI kit, shell, feature components, Recharts charts
  lib/                Supabase clients, data loaders, constants, date/unit helpers
supabase/
  migrations/         schema, RLS, functions/triggers, storage
tests/
  rls.test.ts         permission tests against real Supabase
  e2e/flows.mjs       browser flows (Playwright)
```

---

*Your body is not a leaderboard. Hydrated? Emotionally? Physically? Unclear.*
