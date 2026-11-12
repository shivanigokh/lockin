/**
 * Privacy & permission tests against a real Supabase stack (auth + PostgREST + Postgres RLS).
 *
 *   npx supabase start && npx supabase db reset
 *   npm run test:rls
 *
 * Each test talks to the database exactly the way the browser would: with the
 * anon key and a signed-in user's JWT. Nothing here uses the service-role key,
 * so every assertion is enforced by RLS / RPC checks, not by the UI.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_TEST_URL ?? "http://127.0.0.1:54321";
const ANON =
  process.env.SUPABASE_TEST_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const run = Math.random().toString(36).slice(2, 7);
const today = new Date().toISOString().slice(0, 10);

type U = { c: SupabaseClient; id: string; username: string };

async function makeUser(name: string): Promise<U> {
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const username = `${name}_${run}`;
  const { data, error } = await c.auth.signUp({
    email: `${username}@lockin.test`,
    password: "password-123456",
    options: { data: { username } },
  });
  if (error) throw error;
  if (!data.session) throw new Error("expected a session (email confirmations must be off locally)");
  return { c, id: data.user!.id, username };
}

const ok = <T>(r: { data: T; error: unknown }) => {
  if (r.error) throw r.error;
  return r.data;
};

let A: U, B: U, C: U, D: U; // A creates squad, B+C join, D is an outsider
let groupId: string;
let code: string;

beforeAll(async () => {
  [A, B, C, D] = await Promise.all(["alice", "bob", "cleo", "dan"].map(makeUser));

  groupId = ok(await A.c.rpc("create_group", { p_name: `Swim Squad ${run}`, p_description: "test" })) as string;
  const invites = ok(await A.c.from("group_invites").select("code").eq("group_id", groupId)) as { code: string }[];
  code = invites[0].code;

  // A's private health data
  ok(await A.c.from("private_health_profiles").update({ height_cm: 181.5, starting_weight_kg: 93.3, target_weight_kg: 80.1 }).eq("user_id", A.id));
  ok(await A.c.from("weight_entries").insert({ user_id: A.id, entry_date: today, weight_kg: 88.8 }));
  ok(await A.c.from("body_measurements").insert({ user_id: A.id, measured_on: today, waist_cm: 97.7, body_fat_pct: 23.4 }));
  ok(await A.c.from("health_notes").insert({ user_id: A.id, body: "secret note about knees" }));
});

describe("squad lifecycle", () => {
  it("a new squad starts in the filling state with only the creator as admin", async () => {
    const g = ok(await A.c.from("groups").select("member_count").eq("id", groupId).single()) as { member_count: number };
    expect(g.member_count).toBe(1);
    const m = ok(await A.c.from("group_members").select("user_id, role").eq("group_id", groupId)) as { role: string }[];
    expect(m).toEqual([{ user_id: A.id, role: "admin" }]);
  });

  it("squad names are unique (case-insensitive)", async () => {
    const r = await B.c.rpc("create_group", { p_name: `swim squad ${run}` });
    expect(r.error?.message).toMatch(/NAME_TAKEN/);
  });

  it("outsiders only get a minimal preview of an invite code", async () => {
    const p = ok(await D.c.rpc("preview_invite", { p_code: code })) as Record<string, unknown>[];
    expect(Object.keys(p[0]).sort()).toEqual(
      ["already_member", "color", "description", "group_id", "icon", "member_count", "name", "reason", "valid"].sort(),
    );
    expect(ok(await D.c.from("groups").select("*").eq("id", groupId))).toEqual([]);
  });

  it("members join with a code and the squad activates at 3", async () => {
    ok(await B.c.rpc("join_group_with_code", { p_code: code }));
    ok(await C.c.rpc("join_group_with_code", { p_code: code.toLowerCase() }));
    const g = ok(await B.c.from("groups").select("member_count").eq("id", groupId).single()) as { member_count: number };
    expect(g.member_count).toBe(3);
  });

  it("users cannot add themselves to a squad directly", async () => {
    const r = await D.c.from("group_members").insert({ group_id: groupId, user_id: D.id, role: "admin" });
    expect(r.error).not.toBeNull();
  });

  it("members cannot tamper with member_count or promote themselves", async () => {
    await B.c.from("groups").update({ member_count: 1 }).eq("id", groupId);
    await B.c.from("group_members").update({ role: "admin" }).eq("group_id", groupId).eq("user_id", B.id);
    const g = ok(await A.c.from("groups").select("member_count").eq("id", groupId).single()) as { member_count: number };
    expect(g.member_count).toBe(3);
    const m = ok(await A.c.from("group_members").select("role").eq("group_id", groupId).eq("user_id", B.id).single()) as { role: string };
    expect(m.role).toBe("member");
  });

  it("outsiders see nothing of the squad", async () => {
    expect(ok(await D.c.from("group_members").select("*").eq("group_id", groupId))).toEqual([]);
    expect(ok(await D.c.from("group_activity").select("*").eq("group_id", groupId))).toEqual([]);
    expect(ok(await D.c.from("group_invites").select("*").eq("group_id", groupId))).toEqual([]);
    const lb = await D.c.rpc("group_leaderboard", { p_group: groupId, p_period: "all", p_today: today });
    expect(lb.error).not.toBeNull();
    const board = await D.c.rpc("group_goal_board", { p_group: groupId, p_today: today });
    expect(board.error).not.toBeNull();
  });

  it("caps a squad at 10 members", async () => {
    const big = (ok(await D.c.rpc("create_group", { p_name: `Big Squad ${run}` })) as string);
    const bigCode = ((ok(await D.c.from("group_invites").select("code").eq("group_id", big)) as { code: string }[])[0]).code;
    const extras = await Promise.all(Array.from({ length: 10 }, (_, i) => makeUser(`x${i}`)));
    const results = [];
    for (const u of extras) results.push(await u.c.rpc("join_group_with_code", { p_code: bigCode }));
    expect(results.slice(0, 9).every((r) => !r.error)).toBe(true);
    expect(results[9].error?.message).toMatch(/SQUAD_FULL|no longer valid/);
    const g = ok(await D.c.from("groups").select("member_count").eq("id", big).single()) as { member_count: number };
    expect(g.member_count).toBe(10);
  });
});

describe("private health data", () => {
  const tables = ["private_health_profiles", "weight_entries", "body_measurements", "health_notes"] as const;

  it("owners can read their own health data", async () => {
    for (const t of tables) {
      const rows = ok(await A.c.from(t).select("*")) as unknown[];
      expect(rows.length, t).toBeGreaterThan(0);
    }
  });

  it("squad-mates cannot read it", async () => {
    for (const t of tables) {
      expect(ok(await B.c.from(t).select("*").eq("user_id", A.id)), t).toEqual([]);
    }
  });

  it("squad admins cannot read members' health data either", async () => {
    // A is admin; B logs some health data
    ok(await B.c.from("weight_entries").insert({ user_id: B.id, entry_date: today, weight_kg: 70.2 }));
    expect(ok(await A.c.from("weight_entries").select("*").eq("user_id", B.id))).toEqual([]);
    expect(ok(await A.c.from("private_health_profiles").select("*").eq("user_id", B.id))).toEqual([]);
  });

  it("nobody can write into someone else's health data", async () => {
    const r = await B.c.from("weight_entries").insert({ user_id: A.id, entry_date: "2020-01-01", weight_kg: 50 });
    expect(r.error).not.toBeNull();
    await B.c.from("private_health_profiles").update({ height_cm: 100 }).eq("user_id", A.id);
    await B.c.from("weight_entries").delete().eq("user_id", A.id);
    const mine = ok(await A.c.from("private_health_profiles").select("height_cm").single()) as { height_cm: number };
    expect(Number(mine.height_cm)).toBe(181.5);
    expect((ok(await A.c.from("weight_entries").select("*")) as unknown[]).length).toBe(1);
  });

  it("logged-out visitors get nothing", async () => {
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    for (const t of [...tables, "profiles", "groups", "workouts", "group_activity"]) {
      const r = await anon.from(t).select("*");
      expect(r.data ?? [], t).toEqual([]);
    }
  });
});

describe("workouts & habits visibility", () => {
  let privateWorkoutId: string;

  beforeAll(async () => {
    ok(await A.c.from("workouts").insert({ user_id: A.id, activity_type: "running", performed_on: today, duration_min: 30, distance_km: 5 }));
    ok(await A.c.from("workouts").insert({ user_id: A.id, activity_type: "swimming", performed_on: today, duration_min: 40 }));
    const p = ok(await A.c.from("workouts").insert({ user_id: A.id, activity_type: "yoga", performed_on: today, duration_min: 20, visibility: "private" }).select("id").single()) as { id: string };
    privateWorkoutId = p.id;
  });

  it("squad-mates see squad-visible workouts but not private ones", async () => {
    const rows = ok(await B.c.from("workouts").select("activity_type").eq("user_id", A.id)) as { activity_type: string }[];
    expect(rows.map((r) => r.activity_type).sort()).toEqual(["running", "swimming"]);
    expect(ok(await B.c.from("workouts").select("*").eq("id", privateWorkoutId))).toEqual([]);
  });

  it("outsiders see no workouts", async () => {
    expect(ok(await D.c.from("workouts").select("*").eq("user_id", A.id))).toEqual([]);
  });

  it("workouts post to the squad feed, private ones don't", async () => {
    const feed = ok(await B.c.from("group_activity").select("kind, payload").eq("group_id", groupId).eq("kind", "workout")) as { payload: { activity_type: string } }[];
    expect(feed.map((f) => f.payload.activity_type).sort()).toEqual(["running", "swimming"]);
  });

  it("only the owner can edit or delete a workout", async () => {
    const r = ok(await B.c.from("workouts").update({ duration_min: 999 }).eq("user_id", A.id).select()) as unknown[];
    expect(r).toEqual([]);
    const d = ok(await B.c.from("workouts").delete().eq("user_id", A.id).select()) as unknown[];
    expect(d).toEqual([]);
  });

  it("making a workout private removes it from the feed", async () => {
    const w = ok(await A.c.from("workouts").insert({ user_id: A.id, activity_type: "cycling", performed_on: today, duration_min: 15 }).select("id").single()) as { id: string };
    ok(await A.c.from("workouts").update({ visibility: "private" }).eq("id", w.id));
    const feed = ok(await B.c.from("group_activity").select("*").eq("workout_id", w.id)) as unknown[];
    expect(feed).toEqual([]);
    ok(await A.c.from("workouts").delete().eq("id", w.id));
  });

  it("habit check-ins are visible to squad-mates unless the habit is hidden", async () => {
    const habits = ok(await A.c.from("daily_habits").select("id, key").eq("user_id", A.id)) as { id: string; key: string }[];
    expect(habits).toHaveLength(6);
    const walk = habits.find((h) => h.key === "walk")!;
    const water = habits.find((h) => h.key === "water")!;
    ok(await A.c.from("habit_completions").insert([
      { habit_id: walk.id, user_id: A.id, completed_on: today },
      { habit_id: water.id, user_id: A.id, completed_on: today },
    ]));
    ok(await A.c.from("daily_habits").update({ visible_to_groups: false }).eq("id", water.id));
    const seen = ok(await B.c.from("habit_completions").select("habit_id").eq("user_id", A.id)) as { habit_id: string }[];
    expect(seen.map((s) => s.habit_id)).toEqual([walk.id]);
    expect(ok(await D.c.from("habit_completions").select("*").eq("user_id", A.id))).toEqual([]);

    const status = ok(await B.c.rpc("group_habits_today", { p_group: groupId, p_today: today })) as { user_id: string; done: number; total: number }[];
    const a = status.find((s) => s.user_id === A.id)!;
    expect(a).toMatchObject({ done: 1, total: 5 });
  });

  it("users cannot check off someone else's habit", async () => {
    const habits = ok(await A.c.from("daily_habits").select("id").eq("user_id", A.id).limit(1)) as { id: string }[];
    const r = await B.c.from("habit_completions").insert({ habit_id: habits[0].id, user_id: B.id, completed_on: today });
    expect(r.error).not.toBeNull();
  });
});

describe("goals: private vs shared", () => {
  let privateGoal: string, sharedGoal: string, weightGoal: string;

  beforeAll(async () => {
    privateGoal = (ok(await A.c.from("personal_goals").insert({ user_id: A.id, title: "Secret plan", target_value: 3 }).select("id").single()) as { id: string }).id;
    sharedGoal = (ok(await A.c.from("personal_goals").insert({
      user_id: A.id, title: "Run 4 times", category: "running", tracking: "workout_count", activity_type: "running", target_value: 4, unit: "runs",
    }).select("id").single()) as { id: string }).id;
    weightGoal = (ok(await A.c.from("personal_goals").insert({ user_id: A.id, title: "Lose 5kg", category: "weight", target_value: 5, unit: "kg" }).select("id").single()) as { id: string }).id;
    ok(await A.c.from("shared_goals").insert({ goal_id: sharedGoal, group_id: groupId, user_id: A.id }));
  });

  it("squad-mates see only goals shared into their squad", async () => {
    const rows = ok(await B.c.from("personal_goals").select("id").eq("user_id", A.id)) as { id: string }[];
    expect(rows.map((r) => r.id)).toEqual([sharedGoal]);
    expect(ok(await D.c.from("personal_goals").select("*").eq("user_id", A.id))).toEqual([]);
  });

  it("the group goal board shows name, target, progress and percentage", async () => {
    const board = ok(await B.c.rpc("group_goal_board", { p_group: groupId, p_today: today })) as Record<string, unknown>[];
    expect(board).toHaveLength(1);
    expect(board[0]).toMatchObject({ title: "Run 4 times", user_id: A.id, pct: 25 });
    expect(Number(board[0].progress)).toBe(1);
    expect(Number(board[0].target_value)).toBe(4);
  });

  it("weight goals can never be shared", async () => {
    const r = await A.c.from("shared_goals").insert({ goal_id: weightGoal, group_id: groupId, user_id: A.id });
    expect(r.error).not.toBeNull();
  });

  it("re-categorising a shared goal as weight unshares it", async () => {
    ok(await A.c.from("personal_goals").update({ category: "weight" }).eq("id", sharedGoal));
    expect(ok(await B.c.from("personal_goals").select("id").eq("id", sharedGoal))).toEqual([]);
    ok(await A.c.from("personal_goals").update({ category: "running" }).eq("id", sharedGoal));
    ok(await A.c.from("shared_goals").insert({ goal_id: sharedGoal, group_id: groupId, user_id: A.id }));
  });

  it("you can't share someone else's goal or share into a squad you're not in", async () => {
    const r1 = await B.c.from("shared_goals").insert({ goal_id: privateGoal, group_id: groupId, user_id: B.id });
    expect(r1.error).not.toBeNull();
    const own = (ok(await D.c.from("personal_goals").insert({ user_id: D.id, title: "Mine", target_value: 1 }).select("id").single()) as { id: string }).id;
    const r2 = await D.c.from("shared_goals").insert({ goal_id: own, group_id: groupId, user_id: D.id });
    expect(r2.error).not.toBeNull();
  });

  it("progress entries are owner-only", async () => {
    ok(await A.c.from("goal_progress_entries").insert({ goal_id: privateGoal, user_id: A.id, amount: 1, logged_on: today }));
    expect(ok(await B.c.from("goal_progress_entries").select("*"))).toEqual([]);
    const r = await B.c.from("goal_progress_entries").insert({ goal_id: privateGoal, user_id: B.id, amount: 1, logged_on: today });
    expect(r.error).not.toBeNull();
  });
});

describe("leaderboards, challenges and feed", () => {
  it("leaderboard counts only squad-visible workouts", async () => {
    const lb = ok(await B.c.rpc("group_leaderboard", { p_group: groupId, p_period: "week", p_today: today })) as { user_id: string; workouts: number; active_minutes: number; rank: number }[];
    const a = lb.find((r) => r.user_id === A.id)!;
    expect(a).toMatchObject({ workouts: 2, active_minutes: 70, rank: 1 });
    expect(lb).toHaveLength(3);
  });

  it("no group-facing RPC response contains health values", async () => {
    const responses = [
      await B.c.rpc("group_leaderboard", { p_group: groupId, p_period: "all", p_today: today }),
      await B.c.rpc("group_awards", { p_group: groupId, p_today: today }),
      await B.c.rpc("group_goal_board", { p_group: groupId, p_today: today }),
      await B.c.rpc("group_habits_today", { p_group: groupId, p_today: today }),
      await B.c.rpc("group_calendar", { p_group: groupId, p_from: today, p_to: today }),
      await B.c.from("group_activity").select("*").eq("group_id", groupId),
      await B.c.from("profiles").select("*"),
    ];
    const blob = JSON.stringify(responses.map((r) => r.data));
    for (const secret of ["181.5", "93.3", "80.1", "88.8", "97.7", "23.4", "knees", "weight", "height"]) {
      expect(blob, secret).not.toContain(secret);
    }
  });

  it("only admins create challenges (by default); members can join and leave", async () => {
    const challenge = { group_id: groupId, title: "Swim 5 times", metric: "workout_count", activity_type: "swimming", target_value: 5, unit: "swims", start_date: today, end_date: today };
    const r = await B.c.from("group_challenges").insert({ ...challenge, created_by: B.id });
    expect(r.error).not.toBeNull();
    const c = ok(await A.c.from("group_challenges").insert({ ...challenge, created_by: A.id }).select("id").single()) as { id: string };
    ok(await B.c.from("challenge_participants").insert({ challenge_id: c.id, user_id: B.id }));
    const board = ok(await B.c.rpc("challenge_board", { p_challenge: c.id })) as { user_id: string; progress: number }[];
    expect(board.find((x) => x.user_id === A.id)?.progress).toBe(1);
    expect(board).toHaveLength(2);
    ok(await B.c.from("challenge_participants").delete().eq("challenge_id", c.id).eq("user_id", B.id));
    expect(ok(await D.c.from("group_challenges").select("*").eq("group_id", groupId))).toEqual([]);
    const r2 = await D.c.from("challenge_participants").insert({ challenge_id: c.id, user_id: D.id });
    expect(r2.error).not.toBeNull();
  });

  it("members post messages and react; nobody can forge system events", async () => {
    const msg = ok(await B.c.from("group_activity").insert({ group_id: groupId, actor_id: B.id, kind: "message", body: "couch creature no more" }).select("id").single()) as { id: string };
    ok(await C.c.from("activity_reactions").insert({ activity_id: msg.id, user_id: C.id, emoji: "fire" }));
    const forged = await B.c.from("group_activity").insert({ group_id: groupId, actor_id: B.id, kind: "workout", payload: { duration_min: 999 } });
    expect(forged.error).not.toBeNull();
    const impersonate = await B.c.from("group_activity").insert({ group_id: groupId, actor_id: A.id, kind: "message", body: "hi" });
    expect(impersonate.error).not.toBeNull();
    const outsider = await D.c.from("group_activity").insert({ group_id: groupId, actor_id: D.id, kind: "message", body: "hi" });
    expect(outsider.error).not.toBeNull();
    // B gets nothing, but the reaction notified B
    const notes = ok(await B.c.from("notifications").select("kind")) as { kind: string }[];
    expect(notes.some((n) => n.kind === "reaction")).toBe(true);
    expect(ok(await A.c.from("notifications").select("*").eq("user_id", B.id))).toEqual([]);
  });
});

describe("membership management", () => {
  it("non-admins cannot remove members; admins can", async () => {
    const r = await B.c.rpc("remove_member", { p_group: groupId, p_user: C.id });
    expect(r.error).not.toBeNull();
    const del = ok(await B.c.from("group_members").delete().eq("group_id", groupId).eq("user_id", C.id).select()) as unknown[];
    expect(del).toEqual([]);
    ok(await A.c.rpc("remove_member", { p_group: groupId, p_user: C.id }));
    expect(ok(await C.c.from("groups").select("*").eq("id", groupId))).toEqual([]);
    // C can no longer see A's workouts (no shared squad any more)
    expect(ok(await C.c.from("workouts").select("*").eq("user_id", A.id))).toEqual([]);
  });

  it("direct invites by username can be accepted", async () => {
    ok(await A.c.rpc("invite_user", { p_group: groupId, p_username: C.username }));
    const pending = ok(await C.c.rpc("my_pending_invites")) as { invite_id: string; group_name: string }[];
    expect(pending[0].group_name).toBe(`Swim Squad ${run}`);
    ok(await C.c.rpc("respond_to_invite", { p_invite: pending[0].invite_id, p_accept: true }));
    expect((ok(await C.c.from("groups").select("id").eq("id", groupId)) as unknown[]).length).toBe(1);
  });

  it("revoked codes stop working", async () => {
    const newCode = ok(await A.c.rpc("create_invite_code", { p_group: groupId, p_expires_in_days: 7, p_max_uses: 2 })) as string;
    const inv = ok(await A.c.from("group_invites").select("id").eq("code", newCode).single()) as { id: string };
    ok(await A.c.rpc("revoke_invite", { p_invite: inv.id }));
    const r = await D.c.rpc("join_group_with_code", { p_code: newCode });
    expect(r.error?.message).toMatch(/no longer valid/);
  });

  it("the last admin leaving promotes the longest-standing member", async () => {
    ok(await A.c.rpc("leave_group", { p_group: groupId }));
    const m = ok(await B.c.from("group_members").select("user_id, role").eq("group_id", groupId).eq("user_id", B.id).single()) as { role: string };
    expect(m.role).toBe("admin");
    // A's shared goal left the squad with A
    expect(ok(await B.c.rpc("group_goal_board", { p_group: groupId, p_today: today }))).toEqual([]);
  });

  it("deleting an account removes the user and their data", async () => {
    const tmp = await makeUser("tmp");
    ok(await tmp.c.from("weight_entries").insert({ user_id: tmp.id, entry_date: today, weight_kg: 60 }));
    ok(await tmp.c.rpc("delete_my_account"));
    const again = await tmp.c.from("weight_entries").select("*");
    expect(again.data ?? []).toEqual([]);
  });
});

describe("owner-only usage dashboard", () => {
  it("regular users (even squad admins) are refused", async () => {
    expect(ok(await A.c.rpc("is_app_admin"))).toBe(false);
    const r = await A.c.rpc("admin_usage_stats", { p_today: today });
    expect(r.error).not.toBeNull();
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    const r2 = await anon.rpc("admin_usage_stats", { p_today: today });
    expect(r2.error).not.toBeNull();
    expect((await A.c.from("app_admins").select("*")).data ?? []).toEqual([]);
    expect((await A.c.rpc("admin_squads", { p_today: today })).error).not.toBeNull();
  });

  it("the owner email gets aggregate counts only", async () => {
    const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const email = "shivani.gokh@gmail.com";
    const signUp = await c.auth.signUp({ email, password: "password-123456", options: { data: { username: `owner_${run}` } } });
    if (signUp.error) {
      // already exists from a previous run
      const s = await c.auth.signInWithPassword({ email, password: "password-123456" });
      if (s.error) throw s.error;
    }
    expect(ok(await c.rpc("is_app_admin"))).toBe(true);
    const stats = ok(await c.rpc("admin_usage_stats", { p_today: today })) as Record<string, unknown>;
    expect(Number(stats.users_total)).toBeGreaterThanOrEqual(4);
    expect(Number(stats.squads_total)).toBeGreaterThanOrEqual(1);
    expect((stats.daily as unknown[]).length).toBe(30);
    const blob = JSON.stringify(stats);
    for (const s of ["181.5", "88.8", "97.7", "knees", "weight", "height", "@lockin.test", "alice_"]) expect(blob, s).not.toContain(s);

    const squads = ok(await c.rpc("admin_squads", { p_today: today })) as { name: string; members: { username: string }[] }[];
    const swim = squads.find((g) => g.name === `Swim Squad ${run}`)!;
    expect(swim.members.map((m) => m.username)).toContain(B.username);
    const squadBlob = JSON.stringify(squads);
    for (const s of ["181.5", "88.8", "knees", "weight", "@lockin.test", "Secret plan", "couch creature no more"]) expect(squadBlob, s).not.toContain(s);
  });
});
