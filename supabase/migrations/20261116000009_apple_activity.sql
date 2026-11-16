-- Apple Watch "Exercise Minutes" and "Active Energy" from the iOS Shortcut.
--
-- Shortcuts on iPhone can't read individual workouts, but it can read the
-- day's Exercise Minutes. Each day becomes ONE workout ("Active day") with
-- source 'apple_health' and external_id 'exercise:<date>'. Re-sending the day
-- updates its minutes instead of adding a second session.
--
-- Active Energy (calories burned) is stored per day in activity_days. By the
-- owner's choice it is social, like shared workouts: the owner, squad-mates and
-- friends can read each day's value (can_follow), and squads get a "most
-- calories burned" leaderboard through group_burn_board(). Calories EATEN stay
-- in owner-only meal_entries.

create table public.activity_days (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  day          date not null,
  active_kcal  integer not null check (active_kcal between 0 and 20000),
  updated_at   timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.activity_days enable row level security;
revoke all on public.activity_days from anon;
create policy "activity_days: owner" on public.activity_days
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "activity_days: squad-mates and friends read" on public.activity_days
  for select to authenticated
  using (public.can_follow(user_id));

create or replace function public.group_burn_board(p_group uuid, p_period text, p_today date)
returns table (user_id uuid, active_kcal int)
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
  select m.user_id, coalesce(sum(a.active_kcal), 0)::int
  from public.group_members m
  left join public.activity_days a on a.user_id = m.user_id and a.day between v_from and v_to
  where m.group_id = p_group
  group by m.user_id;
end $$;
revoke all on function public.group_burn_board(uuid, text, date) from public, anon;
grant execute on function public.group_burn_board(uuid, text, date) to authenticated;
create or replace function public.ingest_health_items(p_token text, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid;
  v_vis public.workout_visibility;
  it jsonb;
  v_workouts int := 0;
  v_days int := 0;
  v_exercise int := 0;
  v_active int := 0;
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
    elsif it ->> 'kind' = 'exercise' then
      insert into public.workouts (user_id, activity_type, performed_on, duration_min, note, visibility, source, external_id)
      values (
        v_uid, 'other', (it ->> 'date')::date, (it ->> 'minutes')::int,
        'Active day (Apple Watch exercise minutes)', coalesce(v_vis, 'groups'),
        'apple_health', 'exercise:' || (it ->> 'date')::date
      )
      on conflict (user_id, source, external_id) do update
        set duration_min = excluded.duration_min
        where public.workouts.duration_min is distinct from excluded.duration_min;
      v_exercise := v_exercise + 1;
    elsif it ->> 'kind' = 'active_energy' then
      insert into public.activity_days (user_id, day, active_kcal)
      values (v_uid, (it ->> 'date')::date, (it ->> 'kcal')::int)
      on conflict (user_id, day) do update set active_kcal = excluded.active_kcal, updated_at = now();
      v_active := v_active + 1;
    elsif it ->> 'kind' = 'calories' then
      insert into public.meal_entries (user_id, eaten_on, meal, name, calories, source, external_id)
      values (v_uid, (it ->> 'date')::date, 'day_total', 'Apple Health', (it ->> 'calories')::int, 'apple_health', it ->> 'date')
      on conflict (user_id, source, external_id) do update set calories = excluded.calories;
      v_days := v_days + 1;
    else
      raise exception 'unknown item kind' using errcode = '22023';
    end if;
  end loop;

  return jsonb_build_object('workouts_added', v_workouts, 'exercise_days', v_exercise, 'active_days', v_active, 'calorie_days', v_days);
end $$;

revoke all on function public.ingest_health_items(text, jsonb) from public;
grant execute on function public.ingest_health_items(text, jsonb) to anon, authenticated;
