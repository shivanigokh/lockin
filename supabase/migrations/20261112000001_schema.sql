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
