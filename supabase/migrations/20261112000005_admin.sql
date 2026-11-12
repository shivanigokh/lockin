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
