-- LOCK IN: all migrations in one file, for pasting into the Supabase SQL Editor.
-- Generated from supabase/migrations/. Run once on a fresh project.

-- ===== supabase/migrations/20261112000001_schema.sql =====
-- =============================================================================
-- LOCK IN — core schema
-- Every table lives in `public`, every table has RLS enabled (see 0002).
-- Body / health data is isolated in owner-only tables and is never joined into
-- any group-facing view or function.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- enums ------
create type public.activity_type as enum (
  'walking', 'running', 'swimming', 'strength', 'cycling', 'yoga', 'sports', 'other'
);

create type public.goal_category as enum (
  'workouts', 'running', 'walking', 'swimming', 'cycling', 'strength', 'steps',
  'alcohol_free', 'nutrition', 'cooking', 'sleep', 'hydration', 'mindfulness', 'weight', 'other'
);

-- how a goal's progress is measured
create type public.goal_tracking as enum (
  'manual',          -- user logs progress by hand
  'workout_count',   -- count of workouts (optionally one activity type)
  'distance_km',     -- sum of distance (optionally one activity type)
  'active_minutes',  -- sum of workout minutes (optionally one activity type)
  'habit_days'       -- days a given habit was checked off
);

create type public.goal_period as enum ('week', 'month', 'custom');

create type public.member_role as enum ('admin', 'member');

create type public.workout_visibility as enum ('groups', 'private');

create type public.challenge_metric as enum (
  'workout_count', 'active_minutes', 'distance_km', 'habit_days', 'manual'
);

create type public.challenge_scope as enum ('individual', 'group');

-- ------------------------------------------------------------- profiles ------
-- Public-ish identity. Visible to yourself and to people you share a squad with.
-- Contains NO health information.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null,
  display_name text,
  avatar_url   text,
  bio          text check (char_length(bio) <= 160),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,20}$')
);
create unique index profiles_username_key on public.profiles (lower(username));

-- Owner-only preferences (notifications, privacy, timezone, units).
create table public.user_settings (
  user_id                     uuid primary key references public.profiles (id) on delete cascade,
  timezone                    text not null default 'UTC',
  weight_unit                 text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  length_unit                 text not null default 'cm' check (length_unit in ('cm', 'in')),
  share_habits                boolean not null default true,
  default_workout_visibility  public.workout_visibility not null default 'groups',
  notify_reactions            boolean not null default true,
  notify_challenges           boolean not null default true,
  notify_invites              boolean not null default true,
  notify_squad_joins          boolean not null default true,
  updated_at                  timestamptz not null default now()
);

-- ------------------------------------------------- PRIVATE health data -------
-- One per user, shared with NOBODY. Not even squad admins.
create table public.private_health_profiles (
  user_id            uuid primary key references public.profiles (id) on delete cascade,
  height_cm          numeric(5,1) check (height_cm is null or height_cm between 50 and 272),
  starting_weight_kg numeric(5,1) check (starting_weight_kg is null or starting_weight_kg between 20 and 400),
  target_weight_kg   numeric(5,1) check (target_weight_kg is null or target_weight_kg between 20 and 400),
  health_goals       text check (char_length(health_goals) <= 2000),
  updated_at         timestamptz not null default now()
);

create table public.weight_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  entry_date  date not null,
  weight_kg   numeric(5,1) not null check (weight_kg between 20 and 400),
  note        text check (char_length(note) <= 500),
  created_at  timestamptz not null default now(),
  unique (user_id, entry_date)
);
create index weight_entries_user_date_idx on public.weight_entries (user_id, entry_date desc);

create table public.body_measurements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  measured_on     date not null,
  waist_cm        numeric(5,1) check (waist_cm is null or waist_cm between 20 and 300),
  hips_cm         numeric(5,1) check (hips_cm is null or hips_cm between 20 and 300),
  chest_cm        numeric(5,1) check (chest_cm is null or chest_cm between 20 and 300),
  body_fat_pct    numeric(4,1) check (body_fat_pct is null or body_fat_pct between 1 and 75),
  resting_hr      integer check (resting_hr is null or resting_hr between 20 and 250),
  vo2max          numeric(4,1) check (vo2max is null or vo2max between 5 and 100),
  pushups_max     integer check (pushups_max is null or pushups_max between 0 and 1000),
  plank_seconds   integer check (plank_seconds is null or plank_seconds between 0 and 36000),
  note            text check (char_length(note) <= 500),
  created_at      timestamptz not null default now()
);
create index body_measurements_user_date_idx on public.body_measurements (user_id, measured_on desc);

create table public.health_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now()
);
create index health_notes_user_idx on public.health_notes (user_id, created_at desc);

-- ---------------------------------------------------------------- squads -----
create table public.groups (
  id                           uuid primary key default gen_random_uuid(),
  name                         text not null check (char_length(btrim(name)) between 3 and 40),
  description                  text check (char_length(description) <= 280),
  icon                         text not null default 'flame',
  color                        text not null default 'lime' check (color in ('lime', 'pink', 'lavender', 'orange', 'cyan')),
  created_by                   uuid references public.profiles (id) on delete set null,
  member_count                 integer not null default 0,
  members_can_invite           boolean not null default true,
  members_can_create_challenges boolean not null default false,
  auto_feed_posts              boolean not null default true,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);
create unique index groups_name_key on public.groups (lower(btrim(name)));

create table public.group_members (
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.member_role not null default 'member',
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

create table public.group_invites (
  id               uuid primary key default gen_random_uuid(),
  group_id         uuid not null references public.groups (id) on delete cascade,
  code             text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_by       uuid references public.profiles (id) on delete set null,
  invited_user_id  uuid references public.profiles (id) on delete cascade,
  status           text not null default 'active'
                   check (status in ('active', 'pending', 'accepted', 'declined', 'revoked')),
  max_uses         integer check (max_uses is null or max_uses between 1 and 10),
  use_count        integer not null default 0,
  expires_at       timestamptz,
  created_at       timestamptz not null default now()
);
create index group_invites_group_idx on public.group_invites (group_id);
create index group_invites_invited_idx on public.group_invites (invited_user_id) where invited_user_id is not null;

-- --------------------------------------------------------------- workouts ----
create table public.workouts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  activity_type  public.activity_type not null,
  performed_on   date not null,
  duration_min   integer not null check (duration_min between 1 and 1440),
  distance_km    numeric(7,2) check (distance_km is null or distance_km between 0 and 1000),
  note           text check (char_length(note) <= 280),
  visibility     public.workout_visibility not null default 'groups',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index workouts_user_date_idx on public.workouts (user_id, performed_on desc);
create index workouts_date_idx on public.workouts (performed_on);

-- ----------------------------------------------------------------- habits ----
create table public.daily_habits (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  name               text not null check (char_length(btrim(name)) between 1 and 40),
  key                text,  -- stable key for built-ins: balanced_meals, alcohol_free, walk, exercise, water, sleep
  icon               text not null default 'check',
  sort_order         integer not null default 0,
  visible_to_groups  boolean not null default true,
  archived           boolean not null default false,
  created_at         timestamptz not null default now()
);
create index daily_habits_user_idx on public.daily_habits (user_id, sort_order);
create unique index daily_habits_user_key on public.daily_habits (user_id, key) where key is not null;

create table public.habit_completions (
  id            uuid primary key default gen_random_uuid(),
  habit_id      uuid not null references public.daily_habits (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  completed_on  date not null,
  created_at    timestamptz not null default now(),
  unique (habit_id, completed_on)
);
create index habit_completions_user_date_idx on public.habit_completions (user_id, completed_on);

-- ------------------------------------------------------------------ goals ----
-- A goal is private by default. Rows in `shared_goals` opt a goal into a squad.
create table public.personal_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  title          text not null check (char_length(btrim(title)) between 1 and 80),
  category       public.goal_category not null default 'other',
  tracking       public.goal_tracking not null default 'manual',
  activity_type  public.activity_type,         -- filter for workout-based tracking
  habit_key      text,                          -- for habit_days tracking
  target_value   numeric(10,2) not null check (target_value > 0),
  unit           text not null default 'times' check (char_length(unit) between 1 and 20),
  period         public.goal_period not null default 'week',
  start_date     date,
  end_date       date,
  archived       boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint custom_period_dates check (
    period <> 'custom' or (start_date is not null and end_date is not null and end_date >= start_date)
  ),
  -- weight goals can never be shared; enforced again in shared_goals trigger
  constraint habit_key_required check (tracking <> 'habit_days' or habit_key is not null)
);
create index personal_goals_user_idx on public.personal_goals (user_id);

create table public.goal_progress_entries (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid not null references public.personal_goals (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  amount      numeric(10,2) not null check (amount <> 0 and amount between -100000 and 100000),
  logged_on   date not null,
  note        text check (char_length(note) <= 200),
  created_at  timestamptz not null default now()
);
create index goal_progress_goal_idx on public.goal_progress_entries (goal_id, logged_on);

create table public.shared_goals (
  goal_id    uuid not null references public.personal_goals (id) on delete cascade,
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  shared_at  timestamptz not null default now(),
  primary key (goal_id, group_id)
);
create index shared_goals_group_idx on public.shared_goals (group_id);

-- ------------------------------------------------------------- challenges ----
create table public.group_challenges (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references public.groups (id) on delete cascade,
  created_by     uuid references public.profiles (id) on delete set null,
  title          text not null check (char_length(btrim(title)) between 3 and 80),
  description    text check (char_length(description) <= 500),
  metric         public.challenge_metric not null default 'workout_count',
  activity_type  public.activity_type,
  habit_key      text,
  scope          public.challenge_scope not null default 'individual',
  target_value   numeric(10,2) not null check (target_value > 0),
  unit           text not null default 'workouts' check (char_length(unit) between 1 and 20),
  start_date     date not null,
  end_date       date not null,
  created_at     timestamptz not null default now(),
  constraint challenge_dates check (end_date >= start_date and end_date - start_date <= 366),
  constraint challenge_habit_key check (metric <> 'habit_days' or habit_key is not null)
);
create index group_challenges_group_idx on public.group_challenges (group_id, end_date desc);

create table public.challenge_participants (
  challenge_id     uuid not null references public.group_challenges (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  manual_progress  numeric(10,2) not null default 0 check (manual_progress >= 0),
  joined_at        timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index challenge_participants_user_idx on public.challenge_participants (user_id);

-- ------------------------------------------------------------- activity ------
create table public.group_activity (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete cascade,
  kind        text not null check (kind in (
                'message', 'workout', 'habits_all', 'joined', 'left', 'milestone',
                'challenge_created', 'challenge_joined', 'goal_shared')),
  body        text check (char_length(body) <= 280),
  payload     jsonb not null default '{}'::jsonb,
  workout_id  uuid references public.workouts (id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint message_has_body check (kind <> 'message' or char_length(btrim(body)) >= 1)
);
create index group_activity_group_idx on public.group_activity (group_id, created_at desc);
create index group_activity_workout_idx on public.group_activity (workout_id) where workout_id is not null;

create table public.activity_reactions (
  activity_id  uuid not null references public.group_activity (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  emoji        text not null check (emoji in ('fire', 'flex', 'clap', 'skull', 'heart', 'eyes')),
  created_at   timestamptz not null default now(),
  primary key (activity_id, user_id, emoji)
);

-- ----------------------------------------------------------- notifications ---
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- -------------------------------------------------------- updated_at -------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger user_settings_touch before update on public.user_settings
  for each row execute function public.touch_updated_at();
create trigger private_health_touch before update on public.private_health_profiles
  for each row execute function public.touch_updated_at();
create trigger groups_touch before update on public.groups
  for each row execute function public.touch_updated_at();
create trigger workouts_touch before update on public.workouts
  for each row execute function public.touch_updated_at();

-- ===== supabase/migrations/20261112000002_rls.sql =====
-- =============================================================================
-- LOCK IN — Row Level Security
--
-- Privacy rules (enforced here, not in the UI):
--  1-3. private_health_profiles, weight_entries, body_measurements, health_notes,
--       goal_progress_entries, user_settings and private goals: owner only.
--  4.   Squad data (groups, members, invites, feed, challenges) only for members.
--  5.   Squad members see goals explicitly shared into *that* squad, never others.
--  6.   Squad members see workouts marked visible to squads and habit check-ins
--       for habits the owner has left visible, and only of people they share a
--       squad with.
--  7.   Squad admins get no extra read access to anybody's health data.
--  8.   Group-facing RPCs (see 0003) never select from health tables.
-- =============================================================================

-- ------------------------------------------------------------- helpers -------
-- SECURITY DEFINER so they can be used inside policies without recursive RLS.

create or replace function public.is_group_member(p_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = p_group and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_admin(p_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = p_group and m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

-- true when the caller and p_user are in at least one squad together
create or replace function public.shares_group_with(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.group_members a
    join public.group_members b on b.group_id = a.group_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

-- habit check-ins of p_user are visible to squad-mates when the habit is
-- visible and the owner hasn't switched habit sharing off globally.
create or replace function public.habit_visible_to_caller(p_habit uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.daily_habits h
    join public.user_settings s on s.user_id = h.user_id
    where h.id = p_habit
      and (
        h.user_id = auth.uid()
        or (h.visible_to_groups and s.share_habits and public.shares_group_with(h.user_id))
      )
  );
$$;

create or replace function public.can_view_goal(p_goal uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.personal_goals g
    where g.id = p_goal and g.user_id = auth.uid()
  ) or exists (
    select 1 from public.shared_goals sg
    where sg.goal_id = p_goal and public.is_group_member(sg.group_id)
  );
$$;

revoke all on function public.is_group_member(uuid) from public, anon;
revoke all on function public.is_group_admin(uuid) from public, anon;
revoke all on function public.shares_group_with(uuid) from public, anon;
revoke all on function public.habit_visible_to_caller(uuid) from public, anon;
revoke all on function public.can_view_goal(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_admin(uuid) to authenticated;
grant execute on function public.shares_group_with(uuid) to authenticated;
grant execute on function public.habit_visible_to_caller(uuid) to authenticated;
grant execute on function public.can_view_goal(uuid) to authenticated;

-- ------------------------------------------------------- enable RLS ----------
alter table public.profiles                enable row level security;
alter table public.user_settings           enable row level security;
alter table public.private_health_profiles enable row level security;
alter table public.weight_entries          enable row level security;
alter table public.body_measurements       enable row level security;
alter table public.health_notes            enable row level security;
alter table public.groups                  enable row level security;
alter table public.group_members           enable row level security;
alter table public.group_invites           enable row level security;
alter table public.workouts                enable row level security;
alter table public.daily_habits            enable row level security;
alter table public.habit_completions       enable row level security;
alter table public.personal_goals          enable row level security;
alter table public.goal_progress_entries   enable row level security;
alter table public.shared_goals            enable row level security;
alter table public.group_challenges        enable row level security;
alter table public.challenge_participants  enable row level security;
alter table public.group_activity          enable row level security;
alter table public.activity_reactions      enable row level security;
alter table public.notifications           enable row level security;

-- Logged-out visitors get nothing from any table.
revoke all on all tables in schema public from anon;

-- ------------------------------------------------------------ profiles -------
create policy "profiles: read self and squad-mates" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_group_with(id));

create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ----------------------------------------------------- owner-only tables -----
create policy "user_settings: owner" on public.user_settings
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "private_health_profiles: owner" on public.private_health_profiles
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "weight_entries: owner" on public.weight_entries
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "body_measurements: owner" on public.body_measurements
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "health_notes: owner" on public.health_notes
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "goal_progress_entries: owner" on public.goal_progress_entries
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.personal_goals g where g.id = goal_id and g.user_id = auth.uid())
  );

create policy "notifications: owner read" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications: owner mark read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: owner delete" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- -------------------------------------------------------------- squads -------
create policy "groups: members read" on public.groups
  for select to authenticated using (public.is_group_member(id));
-- creation goes through create_group() so the creator becomes admin atomically
create policy "groups: admins update" on public.groups
  for update to authenticated
  using (public.is_group_admin(id)) with check (public.is_group_admin(id));
create policy "groups: admins delete" on public.groups
  for delete to authenticated using (public.is_group_admin(id));

-- member_count is maintained by trigger; nobody may write it directly
revoke update on public.groups from authenticated;
grant update (name, description, icon, color, members_can_invite, members_can_create_challenges, auto_feed_posts)
  on public.groups to authenticated;

create policy "group_members: members read" on public.group_members
  for select to authenticated using (public.is_group_member(group_id));
create policy "group_members: leave or admin remove" on public.group_members
  for delete to authenticated
  using (user_id = auth.uid() or public.is_group_admin(group_id));
create policy "group_members: admins change roles" on public.group_members
  for update to authenticated
  using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));
revoke update on public.group_members from authenticated;
grant update (role) on public.group_members to authenticated;
-- inserts only through join/accept/create RPCs

create policy "group_invites: members and invitee read" on public.group_invites
  for select to authenticated
  using (invited_user_id = auth.uid() or public.is_group_member(group_id));
-- writes only through RPCs

-- ------------------------------------------------------------ workouts -------
create policy "workouts: owner full access" on public.workouts
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "workouts: squad-mates read squad-visible" on public.workouts
  for select to authenticated
  using (visibility = 'groups' and public.shares_group_with(user_id));

-- -------------------------------------------------------------- habits -------
create policy "daily_habits: owner full access" on public.daily_habits
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "daily_habits: squad-mates read visible" on public.daily_habits
  for select to authenticated
  using (user_id <> auth.uid() and public.habit_visible_to_caller(id));

create policy "habit_completions: owner full access" on public.habit_completions
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.daily_habits h where h.id = habit_id and h.user_id = auth.uid())
  );
create policy "habit_completions: squad-mates read visible" on public.habit_completions
  for select to authenticated
  using (user_id <> auth.uid() and public.habit_visible_to_caller(habit_id));

-- --------------------------------------------------------------- goals -------
create policy "personal_goals: owner full access" on public.personal_goals
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "personal_goals: squad-mates read shared" on public.personal_goals
  for select to authenticated
  using (
    exists (
      select 1 from public.shared_goals sg
      where sg.goal_id = personal_goals.id and public.is_group_member(sg.group_id)
    )
  );

create policy "shared_goals: members read" on public.shared_goals
  for select to authenticated using (public.is_group_member(group_id));
create policy "shared_goals: owner shares into own squads" on public.shared_goals
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_group_member(group_id)
    and exists (
      select 1 from public.personal_goals g
      where g.id = goal_id and g.user_id = auth.uid() and g.category <> 'weight'
    )
  );
create policy "shared_goals: owner unshares" on public.shared_goals
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------- challenges -------
create policy "group_challenges: members read" on public.group_challenges
  for select to authenticated using (public.is_group_member(group_id));
create policy "group_challenges: admins (or members if allowed) create" on public.group_challenges
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      public.is_group_admin(group_id)
      or (public.is_group_member(group_id) and exists (
            select 1 from public.groups g where g.id = group_id and g.members_can_create_challenges))
    )
  );
create policy "group_challenges: admins or creator update" on public.group_challenges
  for update to authenticated
  using (public.is_group_admin(group_id) or created_by = auth.uid())
  with check (public.is_group_member(group_id));
create policy "group_challenges: admins or creator delete" on public.group_challenges
  for delete to authenticated
  using (public.is_group_admin(group_id) or created_by = auth.uid());
revoke update on public.group_challenges from authenticated;
grant update (title, description, metric, activity_type, habit_key, scope, target_value, unit, start_date, end_date)
  on public.group_challenges to authenticated;

create policy "challenge_participants: members read" on public.challenge_participants
  for select to authenticated
  using (exists (
    select 1 from public.group_challenges c
    where c.id = challenge_id and public.is_group_member(c.group_id)
  ));
create policy "challenge_participants: join self" on public.challenge_participants
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.group_challenges c
      where c.id = challenge_id and public.is_group_member(c.group_id)
    )
  );
create policy "challenge_participants: update own progress" on public.challenge_participants
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.challenge_participants from authenticated;
grant update (manual_progress) on public.challenge_participants to authenticated;
create policy "challenge_participants: leave self" on public.challenge_participants
  for delete to authenticated using (user_id = auth.uid());

-- ------------------------------------------------------------ feed -----------
create policy "group_activity: members read" on public.group_activity
  for select to authenticated using (public.is_group_member(group_id));
create policy "group_activity: members post messages" on public.group_activity
  for insert to authenticated
  with check (
    kind = 'message' and actor_id = auth.uid() and workout_id is null
    and payload = '{}'::jsonb and public.is_group_member(group_id)
  );
create policy "group_activity: author or admin delete" on public.group_activity
  for delete to authenticated
  using (actor_id = auth.uid() or public.is_group_admin(group_id));

create policy "activity_reactions: members read" on public.activity_reactions
  for select to authenticated
  using (exists (
    select 1 from public.group_activity a
    where a.id = activity_id and public.is_group_member(a.group_id)
  ));
create policy "activity_reactions: members react" on public.activity_reactions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.group_activity a
      where a.id = activity_id and public.is_group_member(a.group_id)
    )
  );
create policy "activity_reactions: remove own" on public.activity_reactions
  for delete to authenticated using (user_id = auth.uid());

-- ===== supabase/migrations/20261112000003_functions.sql =====
-- =============================================================================
-- LOCK IN — triggers and RPCs
-- Every SECURITY DEFINER function checks the caller's membership explicitly and
-- returns only workout/habit/goal aggregates. None of them read from
-- private_health_profiles, weight_entries, body_measurements or health_notes.
-- =============================================================================

-- -------------------------------------------------------- new user setup -----
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_base text;
  v_username text;
  v_try int := 0;
begin
  v_base := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'member'), '[^a-zA-Z0-9_]', '', 'g'));
  if char_length(v_base) < 3 then v_base := v_base || 'member'; end if;
  v_base := substr(v_base, 1, 16);
  v_username := v_base;
  while exists (select 1 from public.profiles p where lower(p.username) = v_username) loop
    v_try := v_try + 1;
    v_username := substr(v_base, 1, 15) || '_' || substr(md5(random()::text), 1, 4);
    exit when v_try > 20;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''));

  insert into public.user_settings (user_id, timezone)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'UTC'));

  insert into public.private_health_profiles (user_id) values (new.id);

  insert into public.daily_habits (user_id, name, key, icon, sort_order) values
    (new.id, 'Ate balanced meals', 'balanced_meals', 'salad', 1),
    (new.id, 'Alcohol-free day',   'alcohol_free',   'glass-water', 2),
    (new.id, 'Went for a walk',    'walk',           'footprints', 3),
    (new.id, 'Exercised',          'exercise',       'dumbbell', 4),
    (new.id, 'Drank enough water', 'water',          'droplets', 5),
    (new.id, 'Slept sufficiently', 'sleep',          'moon', 6);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------- notifications -------
create or replace function public.notify_user(
  p_user uuid, p_pref text, p_kind text, p_title text, p_body text, p_link text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_ok boolean;
begin
  if p_user is null or p_user = auth.uid() then return; end if;
  execute format('select %I from public.user_settings where user_id = $1', p_pref) into v_ok using p_user;
  if coalesce(v_ok, true) then
    insert into public.notifications (user_id, kind, title, body, link)
    values (p_user, p_kind, p_title, p_body, p_link);
  end if;
end $$;
revoke all on function public.notify_user(uuid, text, text, text, text, text) from public, anon, authenticated;

create or replace function public.display_name_of(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(display_name, ''), username) from public.profiles where id = p_user;
$$;

-- ------------------------------------------------- membership bookkeeping ----
create or replace function public.on_member_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_group uuid := coalesce(new.group_id, old.group_id);
  v_count int;
  v_name text;
  r record;
begin
  if tg_op = 'INSERT' then
    -- lock the squad row so concurrent joins can't exceed the cap
    perform 1 from public.groups where id = v_group for update;
    select count(*) into v_count from public.group_members where group_id = v_group;
    if v_count > 10 then
      raise exception 'SQUAD_FULL: a squad can have at most 10 members' using errcode = 'P0001';
    end if;
    update public.groups set member_count = v_count where id = v_group returning name into v_name;
    insert into public.group_activity (group_id, actor_id, kind, payload)
    values (v_group, new.user_id, 'joined', jsonb_build_object('member_count', v_count));
    for r in select user_id from public.group_members where group_id = v_group and user_id <> new.user_id loop
      perform public.notify_user(r.user_id, 'notify_squad_joins', 'squad_join',
        public.display_name_of(new.user_id) || ' joined ' || v_name,
        case when v_count >= 3 and v_count - 1 < 3 then 'Squad unlocked. Leaderboards and challenges are live.' else null end,
        '/g/' || v_group);
    end loop;
    return new;
  else
    if not exists (select 1 from public.groups where id = v_group) then
      return old; -- squad itself is being deleted
    end if;
    select count(*) into v_count from public.group_members where group_id = v_group;
    if v_count = 0 then
      delete from public.groups where id = v_group;
      return old;
    end if;
    update public.groups set member_count = v_count where id = v_group;
    -- never leave a squad without an admin: promote the longest-standing member
    if not exists (select 1 from public.group_members where group_id = v_group and role = 'admin') then
      update public.group_members set role = 'admin'
      where (group_id, user_id) = (
        select group_id, user_id from public.group_members
        where group_id = v_group order by joined_at asc limit 1
      );
    end if;
    insert into public.group_activity (group_id, actor_id, kind, payload)
    values (v_group, null, 'left', jsonb_build_object('name', public.display_name_of(old.user_id)));
    -- unshare their goals from this squad and drop challenge participation
    delete from public.shared_goals where group_id = v_group and user_id = old.user_id;
    delete from public.challenge_participants cp
      using public.group_challenges c
      where cp.challenge_id = c.id and c.group_id = v_group and cp.user_id = old.user_id;
    return old;
  end if;
end $$;

create trigger group_members_change
  after insert or delete on public.group_members
  for each row execute function public.on_member_change();

-- Demoting the last admin is not allowed.
create or replace function public.guard_last_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'admin' and new.role <> 'admin' and not exists (
    select 1 from public.group_members
    where group_id = old.group_id and role = 'admin' and user_id <> old.user_id
  ) then
    raise exception 'LAST_ADMIN: promote someone else before stepping down' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger group_members_guard_admin
  before update on public.group_members
  for each row execute function public.guard_last_admin();

-- ---------------------------------------------------------- feed: workouts ---
create or replace function public.workout_payload(w public.workouts)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'activity_type', w.activity_type,
    'duration_min', w.duration_min,
    'distance_km', w.distance_km,
    'performed_on', w.performed_on,
    'note', w.note
  );
$$;

create or replace function public.on_workout_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_week_start date;
  v_count int;
begin
  if tg_op = 'UPDATE' then
    if new.visibility = 'private' then
      delete from public.group_activity where workout_id = new.id;
      return new;
    elsif old.visibility = 'groups' then
      update public.group_activity set payload = public.workout_payload(new) where workout_id = new.id;
      return new;
    end if;
    -- private -> groups falls through to posting
  end if;

  if new.visibility <> 'groups' then return new; end if;

  for r in
    select g.id, g.auto_feed_posts from public.group_members m
    join public.groups g on g.id = m.group_id
    where m.user_id = new.user_id
  loop
    insert into public.group_activity (group_id, actor_id, kind, payload, workout_id)
    values (r.id, new.user_id, 'workout', public.workout_payload(new), new.id);

    -- squad-wide weekly milestones (Mon-Sun)
    if tg_op = 'INSERT' and r.auto_feed_posts then
      v_week_start := date_trunc('week', new.performed_on)::date;
      select count(*) into v_count
      from public.workouts w
      join public.group_members m on m.user_id = w.user_id and m.group_id = r.id
      where w.visibility = 'groups' and w.performed_on between v_week_start and v_week_start + 6;
      if v_count in (10, 25, 50, 75, 100) and not exists (
        select 1 from public.group_activity a
        where a.group_id = r.id and a.kind = 'milestone'
          and a.payload ->> 'week_start' = v_week_start::text
          and (a.payload ->> 'count')::int = v_count
      ) then
        insert into public.group_activity (group_id, actor_id, kind, payload)
        values (r.id, null, 'milestone', jsonb_build_object('count', v_count, 'week_start', v_week_start));
      end if;
    end if;
  end loop;
  return new;
end $$;

create trigger workouts_feed
  after insert or update on public.workouts
  for each row execute function public.on_workout_change();

-- ------------------------------------------------- feed: all habits done -----
create or replace function public.on_habit_completed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_total int;
  v_done int;
  v_share boolean;
  r record;
begin
  select share_habits into v_share from public.user_settings where user_id = new.user_id;
  if not coalesce(v_share, true) then return new; end if;

  select count(*) into v_total from public.daily_habits
    where user_id = new.user_id and not archived and visible_to_groups;
  select count(*) into v_done from public.habit_completions c
    join public.daily_habits h on h.id = c.habit_id
    where c.user_id = new.user_id and c.completed_on = new.completed_on
      and not h.archived and h.visible_to_groups;

  if v_total > 0 and v_done = v_total then
    for r in select group_id from public.group_members m
             join public.groups g on g.id = m.group_id
             where m.user_id = new.user_id and g.auto_feed_posts loop
      if not exists (
        select 1 from public.group_activity a
        where a.group_id = r.group_id and a.actor_id = new.user_id and a.kind = 'habits_all'
          and a.payload ->> 'date' = new.completed_on::text
      ) then
        insert into public.group_activity (group_id, actor_id, kind, payload)
        values (r.group_id, new.user_id, 'habits_all',
                jsonb_build_object('date', new.completed_on, 'count', v_total));
      end if;
    end loop;
  end if;
  return new;
end $$;

create trigger habit_completions_feed
  after insert on public.habit_completions
  for each row execute function public.on_habit_completed();

-- ------------------------------------------------------- feed: reactions -----
create or replace function public.on_reaction()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_group uuid;
begin
  select actor_id, group_id into v_actor, v_group from public.group_activity where id = new.activity_id;
  perform public.notify_user(v_actor, 'notify_reactions', 'reaction',
    public.display_name_of(new.user_id) || ' reacted to your post', null, '/g/' || v_group || '/feed');
  return new;
end $$;

create trigger activity_reactions_notify
  after insert on public.activity_reactions
  for each row execute function public.on_reaction();

-- ------------------------------------------------------ feed: challenges -----
create or replace function public.on_challenge_created()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  insert into public.group_activity (group_id, actor_id, kind, payload)
  values (new.group_id, new.created_by, 'challenge_created',
          jsonb_build_object('challenge_id', new.id, 'title', new.title));
  -- creator joins automatically
  insert into public.challenge_participants (challenge_id, user_id)
  values (new.id, new.created_by) on conflict do nothing;
  for r in select user_id from public.group_members where group_id = new.group_id loop
    perform public.notify_user(r.user_id, 'notify_challenges', 'challenge',
      'New challenge: ' || new.title, 'Join it before you talk yourself out of it.',
      '/g/' || new.group_id || '/challenges');
  end loop;
  return new;
end $$;

create trigger group_challenges_created
  after insert on public.group_challenges
  for each row execute function public.on_challenge_created();

create or replace function public.on_challenge_joined()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_c public.group_challenges;
begin
  select * into v_c from public.group_challenges where id = new.challenge_id;
  if new.user_id is distinct from v_c.created_by then
    insert into public.group_activity (group_id, actor_id, kind, payload)
    values (v_c.group_id, new.user_id, 'challenge_joined',
            jsonb_build_object('challenge_id', v_c.id, 'title', v_c.title));
  end if;
  return new;
end $$;

create trigger challenge_participants_joined
  after insert on public.challenge_participants
  for each row execute function public.on_challenge_joined();

-- ---------------------------------------------------- feed: goal shared ------
create or replace function public.on_goal_shared()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_title text;
begin
  select title into v_title from public.personal_goals where id = new.goal_id;
  insert into public.group_activity (group_id, actor_id, kind, payload)
  values (new.group_id, new.user_id, 'goal_shared', jsonb_build_object('goal_id', new.goal_id, 'title', v_title));
  return new;
end $$;

create trigger shared_goals_feed
  after insert on public.shared_goals
  for each row execute function public.on_goal_shared();

-- weight goals can never be shared, even if the category is changed later
create or replace function public.guard_weight_goal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.category = 'weight' then
    delete from public.shared_goals where goal_id = new.id;
  end if;
  return new;
end $$;

create trigger personal_goals_guard_weight
  after update of category on public.personal_goals
  for each row execute function public.guard_weight_goal();

-- =============================================================================
-- RPCs: squads & invites
-- =============================================================================

create or replace function public.create_group(
  p_name text, p_description text default null, p_icon text default 'flame', p_color text default 'lime'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_count int;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select count(*) into v_count from public.group_members m
    join public.groups g on g.id = m.group_id where g.created_by = auth.uid() and m.user_id = auth.uid();
  if v_count >= 20 then raise exception 'TOO_MANY_SQUADS: slow down, squad tycoon' using errcode = 'P0001'; end if;
  if exists (select 1 from public.groups where lower(btrim(name)) = lower(btrim(p_name))) then
    raise exception 'NAME_TAKEN: that squad name is taken' using errcode = 'P0001';
  end if;
  insert into public.groups (name, description, icon, color, created_by)
  values (btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), coalesce(p_icon, 'flame'), coalesce(p_color, 'lime'), auth.uid())
  returning id into v_id;
  insert into public.group_members (group_id, user_id, role) values (v_id, auth.uid(), 'admin');
  insert into public.group_invites (group_id, created_by, status) values (v_id, auth.uid(), 'active');
  return v_id;
end $$;

-- what a would-be joiner sees before joining: name, description, icon, count. Nothing else.
create or replace function public.preview_invite(p_code text)
returns table (group_id uuid, name text, description text, icon text, color text, member_count int,
               already_member boolean, valid boolean, reason text)
language plpgsql stable security definer set search_path = '' as $$
declare v_inv public.group_invites; v_g public.groups;
begin
  select * into v_inv from public.group_invites i where i.code = upper(btrim(p_code)) and i.invited_user_id is null;
  if not found then
    return query select null::uuid, null::text, null::text, null::text, null::text, null::int, false, false, 'Invite code not found';
    return;
  end if;
  select * into v_g from public.groups g where g.id = v_inv.group_id;
  return query select v_g.id, v_g.name, v_g.description, v_g.icon, v_g.color, v_g.member_count,
    exists (select 1 from public.group_members m where m.group_id = v_g.id and m.user_id = auth.uid()),
    (v_inv.status = 'active' and (v_inv.expires_at is null or v_inv.expires_at > now())
      and (v_inv.max_uses is null or v_inv.use_count < v_inv.max_uses) and v_g.member_count < 10),
    case
      when v_inv.status <> 'active' then 'This invite was revoked'
      when v_inv.expires_at is not null and v_inv.expires_at <= now() then 'This invite expired'
      when v_inv.max_uses is not null and v_inv.use_count >= v_inv.max_uses then 'This invite has been used up'
      when v_g.member_count >= 10 then 'This squad is full (10/10)'
      else null end;
end $$;

create or replace function public.join_group_with_code(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_inv public.group_invites; v_count int;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_inv from public.group_invites
    where code = upper(btrim(p_code)) and invited_user_id is null for update;
  if not found then raise exception 'INVALID_CODE: invite code not found' using errcode = 'P0001'; end if;
  if exists (select 1 from public.group_members where group_id = v_inv.group_id and user_id = auth.uid()) then
    return v_inv.group_id;
  end if;
  if v_inv.status <> 'active'
     or (v_inv.expires_at is not null and v_inv.expires_at <= now())
     or (v_inv.max_uses is not null and v_inv.use_count >= v_inv.max_uses) then
    raise exception 'INVALID_CODE: this invite is no longer valid' using errcode = 'P0001';
  end if;
  insert into public.group_members (group_id, user_id, role) values (v_inv.group_id, auth.uid(), 'member');
  update public.group_invites set use_count = use_count + 1 where id = v_inv.id;
  -- any direct invites for this user to this squad are now moot
  update public.group_invites set status = 'accepted'
    where group_id = v_inv.group_id and invited_user_id = auth.uid() and status = 'pending';
  return v_inv.group_id;
end $$;

create or replace function public.can_invite(p_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_group_admin(p_group) or (
    public.is_group_member(p_group)
    and exists (select 1 from public.groups g where g.id = p_group and g.members_can_invite)
  );
$$;

create or replace function public.create_invite_code(
  p_group uuid, p_expires_in_days int default null, p_max_uses int default null
) returns text language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
  if not public.can_invite(p_group) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  insert into public.group_invites (group_id, created_by, status, max_uses, expires_at)
  values (p_group, auth.uid(), 'active', p_max_uses,
          case when p_expires_in_days is null then null else now() + make_interval(days => p_expires_in_days) end)
  returning code into v_code;
  return v_code;
end $$;

create or replace function public.revoke_invite(p_invite uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_inv public.group_invites;
begin
  select * into v_inv from public.group_invites where id = p_invite;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not (public.is_group_admin(v_inv.group_id) or v_inv.created_by = auth.uid()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.group_invites set status = 'revoked' where id = p_invite and status in ('active', 'pending');
end $$;

create or replace function public.invite_user(p_group uuid, p_username text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_name text;
begin
  if not public.can_invite(p_group) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select id into v_user from public.profiles where lower(username) = lower(btrim(p_username, ' @'));
  if v_user is null then raise exception 'USER_NOT_FOUND: no one goes by that username' using errcode = 'P0001'; end if;
  if exists (select 1 from public.group_members where group_id = p_group and user_id = v_user) then
    raise exception 'ALREADY_MEMBER: they are already in' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.group_invites where group_id = p_group and invited_user_id = v_user and status = 'pending') then
    return;
  end if;
  insert into public.group_invites (group_id, created_by, invited_user_id, status)
  values (p_group, auth.uid(), v_user, 'pending');
  select name into v_name from public.groups where id = p_group;
  perform public.notify_user(v_user, 'notify_invites', 'invite',
    public.display_name_of(auth.uid()) || ' invited you to ' || v_name, 'Accept it in Settings → Invitations.', '/settings#invitations');
end $$;

create or replace function public.respond_to_invite(p_invite uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_inv public.group_invites;
begin
  select * into v_inv from public.group_invites
    where id = p_invite and invited_user_id = auth.uid() and status = 'pending' for update;
  if not found then raise exception 'NOT_FOUND: invite not found' using errcode = 'P0001'; end if;
  if p_accept then
    if not exists (select 1 from public.group_members where group_id = v_inv.group_id and user_id = auth.uid()) then
      insert into public.group_members (group_id, user_id, role) values (v_inv.group_id, auth.uid(), 'member');
    end if;
    update public.group_invites set status = 'accepted' where id = p_invite;
  else
    update public.group_invites set status = 'declined' where id = p_invite;
  end if;
  return v_inv.group_id;
end $$;

-- invitations addressed to me, with the squad name (I can't read the squad row yet)
create or replace function public.my_pending_invites()
returns table (invite_id uuid, group_id uuid, group_name text, icon text, color text,
               member_count int, invited_by text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, g.id, g.name, g.icon, g.color, g.member_count, public.display_name_of(i.created_by), i.created_at
  from public.group_invites i join public.groups g on g.id = i.group_id
  where i.invited_user_id = auth.uid() and i.status = 'pending'
  order by i.created_at desc;
$$;

create or replace function public.leave_group(p_group uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.group_members where group_id = p_group and user_id = auth.uid();
end $$;

create or replace function public.remove_member(p_group uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_group_admin(p_group) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'USE_LEAVE: use leave_group to remove yourself' using errcode = 'P0001'; end if;
  delete from public.group_members where group_id = p_group and user_id = p_user;
end $$;

-- account deletion without exposing the service-role key to the app
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  delete from public.group_members where user_id = auth.uid();  -- runs admin succession per squad
  delete from auth.users where id = auth.uid();
end $$;

-- =============================================================================
-- RPCs: progress, leaderboards, awards, challenges
-- All of these are computed from workouts / habit check-ins / goal entries only.
-- =============================================================================

create or replace function public.period_bounds(p_period public.goal_period, p_start date, p_end date, p_today date)
returns table (from_date date, to_date date) language sql immutable as $$
  select
    case p_period when 'week'  then date_trunc('week',  p_today)::date
                  when 'month' then date_trunc('month', p_today)::date
                  else p_start end,
    case p_period when 'week'  then (date_trunc('week',  p_today) + interval '6 days')::date
                  when 'month' then (date_trunc('month', p_today) + interval '1 month - 1 day')::date
                  else p_end end;
$$;

-- core metric calculator used by goals and challenges (owner's own data)
create or replace function public.metric_value(
  p_user uuid, p_tracking text, p_activity public.activity_type, p_habit_key text,
  p_from date, p_to date, p_groups_only boolean
) returns numeric language sql stable security definer set search_path = '' as $$
  select case p_tracking
    when 'workout_count' then (
      select count(*)::numeric from public.workouts w
      where w.user_id = p_user and w.performed_on between p_from and p_to
        and (p_activity is null or w.activity_type = p_activity)
        and (not p_groups_only or w.visibility = 'groups'))
    when 'active_minutes' then (
      select coalesce(sum(w.duration_min), 0)::numeric from public.workouts w
      where w.user_id = p_user and w.performed_on between p_from and p_to
        and (p_activity is null or w.activity_type = p_activity)
        and (not p_groups_only or w.visibility = 'groups'))
    when 'distance_km' then (
      select coalesce(sum(w.distance_km), 0)::numeric from public.workouts w
      where w.user_id = p_user and w.performed_on between p_from and p_to
        and (p_activity is null or w.activity_type = p_activity)
        and (not p_groups_only or w.visibility = 'groups'))
    when 'habit_days' then (
      select count(distinct c.completed_on)::numeric from public.habit_completions c
      join public.daily_habits h on h.id = c.habit_id
      where c.user_id = p_user and h.key = p_habit_key and c.completed_on between p_from and p_to)
    else 0 end;
$$;
revoke all on function public.metric_value(uuid, text, public.activity_type, text, date, date, boolean) from public, anon, authenticated;

create or replace function public.goal_progress_internal(g public.personal_goals, p_today date)
returns numeric language plpgsql stable security definer set search_path = '' as $$
declare v_from date; v_to date; v_auto numeric := 0; v_manual numeric;
begin
  select from_date, to_date into v_from, v_to from public.period_bounds(g.period, g.start_date, g.end_date, p_today);
  if g.tracking <> 'manual' then
    v_auto := public.metric_value(g.user_id, g.tracking::text, g.activity_type, g.habit_key, v_from, v_to, false);
  end if;
  select coalesce(sum(amount), 0) into v_manual from public.goal_progress_entries e
    where e.goal_id = g.id and e.logged_on between v_from and v_to;
  return greatest(v_auto + v_manual, 0);
end $$;
revoke all on function public.goal_progress_internal(public.personal_goals, date) from public, anon, authenticated;

-- my goals (private + shared) with progress
create or replace function public.my_goals(p_today date)
returns table (id uuid, title text, category public.goal_category, tracking public.goal_tracking,
               activity_type public.activity_type, habit_key text, target_value numeric, unit text,
               period public.goal_period, start_date date, end_date date, archived boolean,
               period_from date, period_to date, progress numeric, pct int, shared_group_ids uuid[])
language sql stable security definer set search_path = '' as $$
  select g.id, g.title, g.category, g.tracking, g.activity_type, g.habit_key, g.target_value, g.unit,
         g.period, g.start_date, g.end_date, g.archived, b.from_date, b.to_date,
         p.v, least(100, floor(p.v * 100 / g.target_value))::int,
         coalesce((select array_agg(sg.group_id) from public.shared_goals sg where sg.goal_id = g.id), '{}')
  from public.personal_goals g
  cross join lateral public.period_bounds(g.period, g.start_date, g.end_date, p_today) b
  cross join lateral (select public.goal_progress_internal(g, p_today) as v) p
  where g.user_id = auth.uid()
  order by g.archived, g.created_at desc;
$$;

-- shared goal board for one squad: name, target, progress, percentage. Nothing else.
create or replace function public.group_goal_board(p_group uuid, p_today date)
returns table (goal_id uuid, user_id uuid, username text, display_name text, avatar_url text,
               title text, category public.goal_category, unit text, target_value numeric,
               progress numeric, pct int, period public.goal_period, period_from date, period_to date)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_group_member(p_group) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return query
  select g.id, pr.id, pr.username, pr.display_name, pr.avatar_url, g.title, g.category, g.unit, g.target_value,
         p.v, least(100, floor(p.v * 100 / g.target_value))::int, g.period, b.from_date, b.to_date
  from public.shared_goals sg
  join public.personal_goals g on g.id = sg.goal_id and not g.archived and g.category <> 'weight'
  join public.group_members m on m.group_id = sg.group_id and m.user_id = g.user_id
  join public.profiles pr on pr.id = g.user_id
  cross join lateral public.period_bounds(g.period, g.start_date, g.end_date, p_today) b
  cross join lateral (select public.goal_progress_internal(g, p_today) as v) p
  where sg.group_id = p_group
  order by (p.v / g.target_value) desc, g.title;
end $$;

-- leaderboard: workouts (one session = one workout) and active minutes
create or replace function public.group_leaderboard(p_group uuid, p_period text, p_today date)
returns table (user_id uuid, username text, display_name text, avatar_url text,
               workouts int, active_minutes int, rank int)
language plpgsql stable security definer set search_path = '' as $$
declare v_from date; v_to date := p_today;
begin
  if not public.is_group_member(p_group) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  v_from := case p_period
    when 'today' then p_today
    when 'week'  then date_trunc('week', p_today)::date
    when 'month' then date_trunc('month', p_today)::date
    else '1900-01-01'::date end;
  if p_period not in ('today', 'week', 'month') then v_to := '2999-12-31'::date; end if;
  return query
  with totals as (
    select m.user_id,
           count(w.id)::int as n,
           coalesce(sum(w.duration_min), 0)::int as mins
    from public.group_members m
    left join public.workouts w
      on w.user_id = m.user_id and w.visibility = 'groups' and w.performed_on between v_from and v_to
    where m.group_id = p_group
    group by m.user_id
  )
  select t.user_id, p.username, p.display_name, p.avatar_url, t.n, t.mins,
         (rank() over (order by t.n desc, t.mins desc))::int
  from totals t join public.profiles p on p.id = t.user_id
  order by 7, p.username;
end $$;

-- rotating awards, recalculated on every call from recent activity
create or replace function public.group_awards(p_group uuid, p_today date)
returns table (award text, user_id uuid, username text, display_name text, avatar_url text, detail text)
language plpgsql stable security definer set search_path = '' as $$
declare v_week date := date_trunc('week', p_today)::date;
begin
  if not public.is_group_member(p_group) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return query
  with mem as (
    select m.user_id from public.group_members m where m.group_id = p_group
  ),
  w as (
    select wk.* from public.workouts wk join mem on mem.user_id = wk.user_id
    where wk.visibility = 'groups' and wk.performed_on between p_today - 55 and p_today
  ),
  first_place as (
    select w.user_id, count(*) as v from w where w.performed_on >= v_week group by w.user_id
    order by v desc, sum(w.duration_min) desc limit 1
  ),
  consistent as (
    select w.user_id, count(distinct w.performed_on) as v from w where w.performed_on > p_today - 28
    group by w.user_id order by v desc limit 1
  ),
  comeback as (
    select x.user_id, x.this_week - x.prev_avg as v, x.this_week, x.prev_avg from (
      select mem.user_id,
        (select count(*) from w where w.user_id = mem.user_id and w.performed_on >= v_week)::numeric as this_week,
        (select count(*) from w where w.user_id = mem.user_id
           and w.performed_on between v_week - 21 and v_week - 1)::numeric / 3 as prev_avg
      from mem
    ) x where x.this_week - x.prev_avg >= 1
    order by v desc limit 1
  ),
  weekend as (
    select w.user_id, count(*) as v from w
    where w.performed_on > p_today - 28 and extract(isodow from w.performed_on) in (6, 7)
    group by w.user_id order by v desc limit 1
  ),
  most_active as (
    select w.user_id, sum(w.duration_min) as v from w where w.performed_on >= v_week
    group by w.user_id order by v desc limit 1
  ),
  awards as (
    select 'first_place'::text as a, f.user_id, f.v || ' workouts this week' as d from first_place f
    union all select 'most_consistent', c.user_id, c.v || ' active days in 4 weeks' from consistent c
    union all select 'biggest_comeback', cb.user_id, cb.this_week::int || ' this week vs ~' || round(cb.prev_avg, 1) || '/wk before' from comeback cb
    union all select 'weekend_warrior', ww.user_id, ww.v || ' weekend sessions in 4 weeks' from weekend ww
    union all select 'most_active', ma.user_id, ma.v || ' active minutes this week' from most_active ma
  )
  select a.a, a.user_id, p.username, p.display_name, p.avatar_url, a.d
  from awards a join public.profiles p on p.id = a.user_id;
end $$;

-- today's habit status for each member: names + done flags for VISIBLE habits only
create or replace function public.group_habits_today(p_group uuid, p_today date)
returns table (user_id uuid, username text, display_name text, avatar_url text,
               done int, total int, habits jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_group_member(p_group) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return query
  select p.id, p.username, p.display_name, p.avatar_url,
    coalesce(sum(case when c.id is not null then 1 else 0 end), 0)::int,
    count(h.id)::int,
    coalesce(jsonb_agg(jsonb_build_object('name', h.name, 'icon', h.icon, 'done', c.id is not null)
             order by h.sort_order) filter (where h.id is not null), '[]'::jsonb)
  from public.group_members m
  join public.profiles p on p.id = m.user_id
  join public.user_settings s on s.user_id = m.user_id
  left join public.daily_habits h
    on h.user_id = m.user_id and not h.archived and h.visible_to_groups and s.share_habits
  left join public.habit_completions c on c.habit_id = h.id and c.completed_on = p_today
  where m.group_id = p_group
  group by p.id, p.username, p.display_name, p.avatar_url
  order by 5 desc, p.username;
end $$;

-- challenge progress per participant (squad-visible data only)
create or replace function public.challenge_board(p_challenge uuid)
returns table (user_id uuid, username text, display_name text, avatar_url text, progress numeric, pct int)
language plpgsql stable security definer set search_path = '' as $$
declare c public.group_challenges;
begin
  select * into c from public.group_challenges where id = p_challenge;
  if not found or not public.is_group_member(c.group_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return query
  select p.id, p.username, p.display_name, p.avatar_url, v.val,
         least(100, floor(v.val * 100 / c.target_value))::int
  from public.challenge_participants cp
  join public.profiles p on p.id = cp.user_id
  cross join lateral (
    select case when c.metric = 'manual' then cp.manual_progress
           when c.metric = 'habit_days' then (
             select count(distinct hc.completed_on)::numeric
             from public.habit_completions hc
             join public.daily_habits h on h.id = hc.habit_id
             join public.user_settings s on s.user_id = h.user_id
             where hc.user_id = cp.user_id and h.key = c.habit_key and h.visible_to_groups and s.share_habits
               and hc.completed_on between c.start_date and c.end_date)
           else public.metric_value(cp.user_id, c.metric::text, c.activity_type, c.habit_key,
                                    c.start_date, c.end_date, true)
           end as val
  ) v
  where cp.challenge_id = p_challenge
  order by v.val desc, p.username;
end $$;

-- squad calendar: per-day counts of squad-visible workouts and full habit days
create or replace function public.group_calendar(p_group uuid, p_from date, p_to date)
returns table (day date, user_id uuid, username text, activity_type public.activity_type, duration_min int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_group_member(p_group) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_to - p_from > 62 then raise exception 'RANGE_TOO_LARGE'; end if;
  return query
  select w.performed_on, w.user_id, p.username, w.activity_type, w.duration_min
  from public.workouts w
  join public.group_members m on m.user_id = w.user_id and m.group_id = p_group
  join public.profiles p on p.id = w.user_id
  where w.visibility = 'groups' and w.performed_on between p_from and p_to
  order by w.performed_on;
end $$;

-- ---------------------------------------------------------------- grants -----
do $$
declare f text;
begin
  foreach f in array array[
    'public.create_group(text, text, text, text)',
    'public.preview_invite(text)',
    'public.join_group_with_code(text)',
    'public.can_invite(uuid)',
    'public.create_invite_code(uuid, int, int)',
    'public.revoke_invite(uuid)',
    'public.invite_user(uuid, text)',
    'public.respond_to_invite(uuid, boolean)',
    'public.my_pending_invites()',
    'public.leave_group(uuid)',
    'public.remove_member(uuid, uuid)',
    'public.delete_my_account()',
    'public.my_goals(date)',
    'public.group_goal_board(uuid, date)',
    'public.group_leaderboard(uuid, text, date)',
    'public.group_awards(uuid, date)',
    'public.group_habits_today(uuid, date)',
    'public.challenge_board(uuid)',
    'public.group_calendar(uuid, date, date)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- trigger functions should never be callable directly
revoke all on function public.display_name_of(uuid) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.on_member_change() from public, anon, authenticated;
revoke all on function public.guard_last_admin() from public, anon, authenticated;
revoke all on function public.on_workout_change() from public, anon, authenticated;
revoke all on function public.on_habit_completed() from public, anon, authenticated;
revoke all on function public.on_reaction() from public, anon, authenticated;
revoke all on function public.on_challenge_created() from public, anon, authenticated;
revoke all on function public.on_challenge_joined() from public, anon, authenticated;
revoke all on function public.on_goal_shared() from public, anon, authenticated;
revoke all on function public.guard_weight_goal() from public, anon, authenticated;

-- signup helper: is a username free? (returns only a boolean)
create or replace function public.username_available(p_username text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(btrim(p_username)));
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- ===== supabase/migrations/20261112000004_storage.sql =====
-- =============================================================================
-- LOCK IN — storage: profile avatars
-- Public read (avatars are shown to squad-mates), writes only into your own folder:
--   avatars/<user-id>/<file>
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "avatars: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== supabase/migrations/20261112000005_admin.sql =====
-- =============================================================================
-- LOCK IN — owner-only usage dashboard
-- Admins are listed by email. Access requires a signed-in account whose email
-- matches AND is confirmed. The stats function returns aggregate counts only:
-- it never reads private_health_profiles, weight_entries, body_measurements,
-- health_notes, goal_progress_entries or any free text.
-- =============================================================================

create table public.app_admins (
  email      text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;  -- no direct access at all

insert into public.app_admins (email) values ('shivani.gokh@gmail.com') on conflict do nothing;

create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from auth.users u
    join public.app_admins a on a.email = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

create or replace function public.admin_usage_stats(p_today date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  if not public.is_app_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  with
  activity_days as (
    select user_id, performed_on as d from public.workouts
    union
    select user_id, completed_on from public.habit_completions
  ),
  days as (select generate_series(p_today - 29, p_today, interval '1 day')::date as d)
  select jsonb_build_object(
    'users_total',        (select count(*) from auth.users),
    'users_confirmed',    (select count(*) from auth.users where email_confirmed_at is not null),
    'signups_7d',         (select count(*) from auth.users where created_at::date > p_today - 7),
    'signins_7d',         (select count(*) from auth.users where last_sign_in_at::date > p_today - 7),
    'active_today',       (select count(distinct user_id) from activity_days where d = p_today),
    'active_7d',          (select count(distinct user_id) from activity_days where d > p_today - 7),
    'active_30d',         (select count(distinct user_id) from activity_days where d > p_today - 30),
    'squads_total',       (select count(*) from public.groups),
    'squads_active',      (select count(*) from public.groups where member_count >= 3),
    'squads_full',        (select count(*) from public.groups where member_count >= 10),
    'avg_squad_size',     (select coalesce(round(avg(member_count), 1), 0) from public.groups),
    'users_in_a_squad',   (select count(distinct user_id) from public.group_members),
    'workouts_total',     (select count(*) from public.workouts),
    'workouts_7d',        (select count(*) from public.workouts where performed_on > p_today - 7),
    'minutes_7d',         (select coalesce(sum(duration_min), 0) from public.workouts where performed_on > p_today - 7),
    'habit_checks_7d',    (select count(*) from public.habit_completions where completed_on > p_today - 7),
    'goals_total',        (select count(*) from public.personal_goals),
    'goals_shared',       (select count(distinct goal_id) from public.shared_goals),
    'challenges_total',   (select count(*) from public.group_challenges),
    'challenges_live',    (select count(*) from public.group_challenges where p_today between start_date and end_date),
    'messages_7d',        (select count(*) from public.group_activity where kind = 'message' and created_at::date > p_today - 7),
    'workouts_by_type',   (select coalesce(jsonb_object_agg(activity_type, n), '{}'::jsonb)
                             from (select activity_type, count(*) n from public.workouts group by 1) t),
    'daily', (
      select jsonb_agg(jsonb_build_object(
        'date', days.d,
        'signups', (select count(*) from auth.users u where u.created_at::date = days.d),
        'active',  (select count(distinct a.user_id) from activity_days a where a.d = days.d),
        'workouts', (select count(*) from public.workouts w where w.performed_on = days.d)
      ) order by days.d)
      from days
    )
  ) into v;
  return v;
end $$;
revoke all on function public.admin_usage_stats(date) from public, anon;
grant execute on function public.admin_usage_stats(date) to authenticated;
