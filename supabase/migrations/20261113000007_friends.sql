-- Friends: two people can follow each other's activity without being in a squad.
--
-- Friends see exactly what squad-mates see about each other: profile, workouts
-- marked "share", habit check-ins (when habit sharing is on). Never health
-- data, never private goals, never squad feeds or messages.

create table public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles (id) on delete cascade,
  addressee_id  uuid not null references public.profiles (id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  check (requester_id <> addressee_id)
);
-- one row per pair, whichever direction it was sent in
create unique index friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id, status);

alter table public.friendships enable row level security;
revoke all on public.friendships from anon;
-- all writes go through the RPCs below; people can read and delete their own rows
revoke insert, update on public.friendships from authenticated;

create policy "friendships: either side reads" on public.friendships
  for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));
create policy "friendships: either side deletes" on public.friendships
  for delete to authenticated
  using (auth.uid() in (requester_id, addressee_id));

create or replace function public.is_friend(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.addressee_id = p_user)
        or (f.addressee_id = auth.uid() and f.requester_id = p_user))
  );
$$;

-- squad-mate OR accepted friend
create or replace function public.can_follow(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.shares_group_with(p_user) or public.is_friend(p_user);
$$;

revoke all on function public.is_friend(uuid) from public, anon;
revoke all on function public.can_follow(uuid) from public, anon;
grant execute on function public.is_friend(uuid) to authenticated;
grant execute on function public.can_follow(uuid) to authenticated;

-- widen the "who can see my shared activity" checks from squad-mates to squad-mates + friends
drop policy "profiles: read self and squad-mates" on public.profiles;
create policy "profiles: read self, squad-mates and friends" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.can_follow(id));

drop policy "workouts: squad-mates read squad-visible" on public.workouts;
create policy "workouts: squad-mates and friends read shared" on public.workouts
  for select to authenticated
  using (visibility = 'groups' and public.can_follow(user_id));

create or replace function public.habit_visible_to_caller(p_habit uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.daily_habits h
    join public.user_settings s on s.user_id = h.user_id
    where h.id = p_habit
      and (
        h.user_id = auth.uid()
        or (h.visible_to_groups and s.share_habits and public.can_follow(h.user_id))
      )
  );
$$;

-- ------------------------------------------------------------------ RPCs ----
create or replace function public.send_friend_request(p_username text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_them uuid;
  f public.friendships;
begin
  if v_me is null then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select id into v_them from public.profiles where username = lower(btrim(p_username));
  if v_them is null then raise exception 'NO_SUCH_USER: nobody has that username' using errcode = 'P0001'; end if;
  if v_them = v_me then raise exception 'SELF: you are already your own biggest fan' using errcode = 'P0001'; end if;

  select * into f from public.friendships
  where least(requester_id, addressee_id) = least(v_me, v_them)
    and greatest(requester_id, addressee_id) = greatest(v_me, v_them);

  if found then
    if f.status = 'accepted' then return jsonb_build_object('status', 'already_friends'); end if;
    if f.requester_id = v_me then return jsonb_build_object('status', 'already_sent'); end if;
    -- they already asked us: adding them back accepts
    update public.friendships set status = 'accepted', responded_at = now() where id = f.id;
    perform public.notify_user(v_them, 'notify_invites', 'friend_accept',
      public.display_name_of(v_me) || ' is now your friend', null, '/friends');
    return jsonb_build_object('status', 'accepted');
  end if;

  insert into public.friendships (requester_id, addressee_id) values (v_me, v_them);
  perform public.notify_user(v_them, 'notify_invites', 'friend_request',
    public.display_name_of(v_me) || ' wants to be friends', 'Accept to see each other''s workouts and habits.', '/friends');
  return jsonb_build_object('status', 'sent');
end $$;

create or replace function public.respond_friend_request(p_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare f public.friendships;
begin
  select * into f from public.friendships where id = p_id;
  if not found or f.addressee_id <> auth.uid() or f.status <> 'pending' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_accept then
    update public.friendships set status = 'accepted', responded_at = now() where id = p_id;
    perform public.notify_user(f.requester_id, 'notify_invites', 'friend_accept',
      public.display_name_of(f.addressee_id) || ' accepted your friend request', null, '/friends');
  else
    delete from public.friendships where id = p_id;
  end if;
end $$;

create or replace function public.remove_friend(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.friendships
  where (requester_id = auth.uid() and addressee_id = p_user)
     or (addressee_id = auth.uid() and requester_id = p_user);
$$;

-- pending requests in both directions, with just enough profile to show a name
create or replace function public.my_friend_requests()
returns table (id uuid, direction text, user_id uuid, username text, display_name text, avatar_url text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.id,
         case when f.addressee_id = auth.uid() then 'incoming' else 'outgoing' end,
         p.id, p.username, p.display_name, p.avatar_url, f.created_at
  from public.friendships f
  join public.profiles p on p.id = case when f.addressee_id = auth.uid() then f.requester_id else f.addressee_id end
  where f.status = 'pending' and auth.uid() in (f.requester_id, f.addressee_id)
  order by f.created_at desc;
$$;

-- accepted friends with shared-only stats (same rules as squads: no private workouts,
-- no hidden habits, nothing from the health tables)
create or replace function public.my_friends(p_today date)
returns table (user_id uuid, username text, display_name text, avatar_url text, since timestamptz,
               workouts_7d int, minutes_7d int, last_workout date, habits_done int, habits_total int)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name, p.avatar_url, f.responded_at,
    (select count(*)::int from public.workouts w
       where w.user_id = p.id and w.visibility = 'groups' and w.performed_on > p_today - 7 and w.performed_on <= p_today),
    (select coalesce(sum(w.duration_min), 0)::int from public.workouts w
       where w.user_id = p.id and w.visibility = 'groups' and w.performed_on > p_today - 7 and w.performed_on <= p_today),
    (select max(w.performed_on) from public.workouts w where w.user_id = p.id and w.visibility = 'groups'),
    (select count(*)::int from public.daily_habits h
       join public.habit_completions c on c.habit_id = h.id and c.completed_on = p_today
       where h.user_id = p.id and not h.archived and h.visible_to_groups and s.share_habits),
    (select count(*)::int from public.daily_habits h
       where h.user_id = p.id and not h.archived and h.visible_to_groups and s.share_habits)
  from public.friendships f
  join public.profiles p on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  join public.user_settings s on s.user_id = p.id
  where f.status = 'accepted' and auth.uid() in (f.requester_id, f.addressee_id)
  order by 6 desc, p.username;
$$;

revoke all on function public.send_friend_request(text) from public, anon;
revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
revoke all on function public.my_friend_requests() from public, anon;
revoke all on function public.my_friends(date) from public, anon;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.my_friend_requests() to authenticated;
grant execute on function public.my_friends(date) to authenticated;
