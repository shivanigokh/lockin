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
