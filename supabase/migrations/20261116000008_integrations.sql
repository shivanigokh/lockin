-- =============================================================================
-- Integrations: Strava sync, Apple Health (via an iOS Shortcut) and private
-- food / calorie logging.
--
-- * workouts get a `source` + `external_id` so synced activities never import
--   twice.
-- * strava_connections, ingest_tokens and meal_entries are OWNER ONLY, like the
--   rest of the health vault. Calories never reach squads, friends or
--   leaderboards.
-- * Apple Health has no web API, so an iOS Shortcut posts to /api/ingest with a
--   personal token. The route has no user session, so it calls
--   ingest_health_items(), which looks up the owner by the token's SHA-256
--   hash. Still no service-role key anywhere.
-- =============================================================================

-- ---------------------------------------------------------- workout sources --
alter table public.workouts
  add column source text not null default 'manual'
    check (source in ('manual', 'strava', 'apple_health')),
  add column external_id text check (char_length(external_id) <= 200);

-- NULL external_ids are distinct, so manual workouts are unaffected.
create unique index workouts_source_external_idx on public.workouts (user_id, source, external_id);

-- --------------------------------------------------------------- strava -------
create table public.strava_connections (
  user_id         uuid primary key references public.profiles (id) on delete cascade,
  athlete_id      bigint not null,
  athlete_name    text check (char_length(athlete_name) <= 120),
  access_token    text not null,
  refresh_token   text not null,
  expires_at      timestamptz not null,
  scope           text,
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.strava_connections enable row level security;
revoke all on public.strava_connections from anon;
create policy "strava_connections: owner" on public.strava_connections
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------ ingest tokens ---
create table public.ingest_tokens (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  token_hash    text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);

alter table public.ingest_tokens enable row level security;
revoke all on public.ingest_tokens from anon;
create policy "ingest_tokens: owner" on public.ingest_tokens
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- meals -------
create table public.meal_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  eaten_on     date not null,
  meal         text not null default 'snack'
                 check (meal in ('breakfast', 'lunch', 'dinner', 'snack', 'day_total')),
  name         text check (char_length(name) <= 80),
  calories     integer not null check (calories between 0 and 20000),
  protein_g    numeric(6,1) check (protein_g is null or protein_g between 0 and 2000),
  carbs_g      numeric(6,1) check (carbs_g is null or carbs_g between 0 and 2000),
  fat_g        numeric(6,1) check (fat_g is null or fat_g between 0 and 2000),
  source       text not null default 'manual' check (source in ('manual', 'apple_health')),
  external_id  text check (char_length(external_id) <= 200),
  created_at   timestamptz not null default now()
);
create index meal_entries_user_date_idx on public.meal_entries (user_id, eaten_on desc);
create unique index meal_entries_source_external_idx on public.meal_entries (user_id, source, external_id);

alter table public.meal_entries enable row level security;
revoke all on public.meal_entries from anon;
create policy "meal_entries: owner" on public.meal_entries
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- optional private daily calorie target
alter table public.private_health_profiles
  add column calorie_target integer check (calorie_target is null or calorie_target between 500 and 10000);

-- ---------------------------------------------------------- token ingest -----
-- p_items: array (max 100) of already-normalised items, built by /api/ingest:
--   {"kind":"workout","activity_type":"running","date":"2026-11-16",
--    "duration_min":32,"distance_km":5.1,"external_id":"..."}
--   {"kind":"calories","date":"2026-11-16","calories":1850}
-- Workouts use the owner's default visibility. Calories are a per-day total
-- (re-sending a day replaces it).
create or replace function public.ingest_health_items(p_token text, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid;
  v_vis public.workout_visibility;
  it jsonb;
  v_workouts int := 0;
  v_days int := 0;
  v_rows int;
begin
  if p_token is null or char_length(p_token) < 32 or char_length(p_token) > 128 then
    raise exception 'invalid token' using errcode = '28000';
  end if;
  select t.user_id into v_uid from public.ingest_tokens t
  where t.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if v_uid is null then
    raise exception 'invalid token' using errcode = '28000';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 100 then
    raise exception 'items must be an array of at most 100' using errcode = '22023';
  end if;

  update public.ingest_tokens set last_used_at = now() where user_id = v_uid;
  select s.default_workout_visibility into v_vis from public.user_settings s where s.user_id = v_uid;

  for it in select value from jsonb_array_elements(p_items) loop
    if it ->> 'kind' = 'workout' then
      insert into public.workouts (user_id, activity_type, performed_on, duration_min, distance_km, visibility, source, external_id)
      values (
        v_uid,
        (it ->> 'activity_type')::public.activity_type,
        (it ->> 'date')::date,
        (it ->> 'duration_min')::int,
        nullif(it ->> 'distance_km', '')::numeric,
        coalesce(v_vis, 'groups'),
        'apple_health',
        left(it ->> 'external_id', 200)
      )
      on conflict (user_id, source, external_id) do nothing;
      get diagnostics v_rows = row_count;
      v_workouts := v_workouts + v_rows;
    elsif it ->> 'kind' = 'calories' then
      insert into public.meal_entries (user_id, eaten_on, meal, name, calories, source, external_id)
      values (v_uid, (it ->> 'date')::date, 'day_total', 'Apple Health', (it ->> 'calories')::int, 'apple_health', it ->> 'date')
      on conflict (user_id, source, external_id) do update set calories = excluded.calories;
      v_days := v_days + 1;
    else
      raise exception 'unknown item kind' using errcode = '22023';
    end if;
  end loop;

  return jsonb_build_object('workouts_added', v_workouts, 'calorie_days', v_days);
end $$;

revoke all on function public.ingest_health_items(text, jsonb) from public;
grant execute on function public.ingest_health_items(text, jsonb) to anon, authenticated;
