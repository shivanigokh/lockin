-- =============================================================================
-- LOCK IN — owner-only squad directory for the usage dashboard
-- Squad names + member usernames/roles and squad-visible workout counts.
-- No emails, health data, goals or messages.
-- =============================================================================
create or replace function public.admin_squads(p_today date)
returns table (
  group_id uuid, name text, icon text, color text, member_count int, created_at timestamptz,
  workouts_7d int, members jsonb
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_app_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return query
  select g.id, g.name, g.icon, g.color, g.member_count, g.created_at,
    (select count(*)::int from public.workouts w
       join public.group_members m on m.user_id = w.user_id and m.group_id = g.id
       where w.visibility = 'groups' and w.performed_on > p_today - 7),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url,
        'role', m.role, 'joined_at', m.joined_at
      ) order by m.joined_at)
      from public.group_members m join public.profiles p on p.id = m.user_id
      where m.group_id = g.id
    ), '[]'::jsonb)
  from public.groups g
  order by g.created_at desc;
end $$;
revoke all on function public.admin_squads(date) from public, anon;
grant execute on function public.admin_squads(date) to authenticated;
