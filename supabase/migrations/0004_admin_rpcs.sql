-- =============================================================================
-- 0004_admin_rpcs.sql
-- Functions behind the admin panel's data pages (dashboard, admin users,
-- players, roles, activity log). Each checks its own permission and runs as
-- security definer, the same pattern as set_player_status() and my_access()
-- in 0002/0003 — this avoids a trap where a staff member can see their own
-- user_roles row but gets an empty join against `roles` because they lack
-- role-view, which would make their own role name vanish from the UI.
-- =============================================================================

-- ------------------------------------------------------------- dashboard
create or replace function public.dashboard_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'adminUsersCount', (
      select count(distinct ur.user_id) from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where r.name in ('super-admin', 'admin')
    ),
    'clientUsersCount', (
      select count(*) from public.profiles p
      where not exists (
        select 1 from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.user_id = p.id and r.name in ('super-admin', 'admin')
      )
    ),
    'pendingCount', (select count(*) from public.profiles where status = 'pending')
  );
$$;
revoke all on function public.dashboard_stats() from public, anon;
grant execute on function public.dashboard_stats() to authenticated;

-- ---------------------------------------------------------------- staff
create or replace function public.list_staff()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('admin_user-view') then
    raise exception 'You do not have permission to view admin users.'
      using errcode = 'insufficient_privilege';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'name', p.name, 'email', p.email, 'created_at', p.created_at,
      'is_superadmin', r.name = 'super-admin',
      'roles', jsonb_build_array(jsonb_build_object('id', r.id, 'name', r.name))
    ) order by p.created_at)
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id
    join public.roles r on r.id = ur.role_id
    where r.name in ('super-admin', 'admin')
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.list_staff() from public, anon;
grant execute on function public.list_staff() to authenticated;

-- -------------------------------------------------------------- players
create or replace function public.list_players()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('admin_user-view') then
    raise exception 'You do not have permission to view players.'
      using errcode = 'insufficient_privilege';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'name', p.name, 'email', p.email, 'avatar', p.avatar_url,
      'status', p.status, 'created_at', p.created_at
    ) order by p.created_at desc)
    from public.profiles p
    where not exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = p.id and r.name in ('super-admin', 'admin')
    )
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.list_players() from public, anon;
grant execute on function public.list_players() to authenticated;

-- --------------------------------------------------- staff role changes
-- One role per staff member, matching the admin-users screen. Also used
-- right after create_staff_user() (route handler, service role) assigns
-- the new account's first role.
create or replace function public.set_staff_role(p_user_id uuid, p_role_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_id bigint;
begin
  if not public.has_permission('role-assign') then
    raise exception 'You do not have permission to assign roles.'
      using errcode = 'insufficient_privilege';
  end if;

  select id into v_role_id from public.roles where name = p_role_name;
  if v_role_id is null then
    raise exception 'Unknown role: %', p_role_name using errcode = 'invalid_parameter_value';
  end if;

  delete from public.user_roles where user_id = p_user_id;
  insert into public.user_roles (user_id, role_id) values (p_user_id, v_role_id);
end;
$$;
revoke all on function public.set_staff_role(uuid, text) from public, anon;
grant execute on function public.set_staff_role(uuid, text) to authenticated;

-- Removing a staff account entirely (not just their role). Deleting from
-- auth.users cascades to profiles and user_roles. This function is owned
-- by the migration role (effectively postgres on Supabase), which can
-- write to auth.users even though the authenticated caller can't directly.
create or replace function public.remove_staff(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('admin_user-delete') then
    raise exception 'You do not have permission to delete admin users.'
      using errcode = 'insufficient_privilege';
  end if;

  if exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = p_user_id and r.name = 'super-admin'
  ) then
    raise exception 'Super admins cannot be deleted.' using errcode = 'insufficient_privilege';
  end if;

  delete from auth.users where id = p_user_id;
end;
$$;
revoke all on function public.remove_staff(uuid) from public, anon;
grant execute on function public.remove_staff(uuid) to authenticated;

-- An admin renaming another staff member. Players rename themselves through
-- the ordinary column-level grant in 0002; this covers editing someone else.
create or replace function public.rename_staff(p_user_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('admin_user-update') then
    raise exception 'You do not have permission to edit admin users.'
      using errcode = 'insufficient_privilege';
  end if;

  update public.profiles set name = p_name where id = p_user_id;
end;
$$;
revoke all on function public.rename_staff(uuid, text) from public, anon;
grant execute on function public.rename_staff(uuid, text) to authenticated;

-- ------------------------------------------------------------------ roles
create or replace function public.list_roles()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('role-view') then
    raise exception 'You do not have permission to view roles.'
      using errcode = 'insufficient_privilege';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'name', r.name,
      'permissions', coalesce((
        select jsonb_agg(jsonb_build_object('id', pe.id, 'name', pe.name) order by pe.name)
        from public.role_permissions rp
        join public.permissions pe on pe.id = rp.permission_id
        where rp.role_id = r.id
      ), '[]'::jsonb)
    ) order by r.name)
    from public.roles r
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.list_roles() from public, anon;
grant execute on function public.list_roles() to authenticated;

create or replace function public.list_permissions()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('role-view') then
    raise exception 'You do not have permission to view roles.'
      using errcode = 'insufficient_privilege';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'name', name) order by name)
    from public.permissions
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.list_permissions() from public, anon;
grant execute on function public.list_permissions() to authenticated;

create or replace function public.create_role(p_name text, p_permissions text[])
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_id bigint;
begin
  if not public.has_permission('role-create') then
    raise exception 'You do not have permission to create roles.'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.roles (name) values (p_name) returning id into v_role_id;

  insert into public.role_permissions (role_id, permission_id)
  select v_role_id, pe.id from public.permissions pe where pe.name = any(p_permissions);

  return v_role_id;
end;
$$;
revoke all on function public.create_role(text, text[]) from public, anon;
grant execute on function public.create_role(text, text[]) to authenticated;

create or replace function public.update_role_permissions(p_role_id bigint, p_permissions text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('role-update') then
    raise exception 'You do not have permission to update roles.'
      using errcode = 'insufficient_privilege';
  end if;

  delete from public.role_permissions where role_id = p_role_id;
  insert into public.role_permissions (role_id, permission_id)
  select p_role_id, pe.id from public.permissions pe where pe.name = any(p_permissions);
end;
$$;
revoke all on function public.update_role_permissions(bigint, text[]) from public, anon;
grant execute on function public.update_role_permissions(bigint, text[]) to authenticated;

create or replace function public.delete_role(p_role_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('role-delete') then
    raise exception 'You do not have permission to delete roles.'
      using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.user_roles where role_id = p_role_id) then
    raise exception 'This role is still assigned to someone.' using errcode = 'check_violation';
  end if;

  delete from public.roles where id = p_role_id;
end;
$$;
revoke all on function public.delete_role(bigint) from public, anon;
grant execute on function public.delete_role(bigint) to authenticated;

-- ------------------------------------------------------------ activity log
create or replace function public.list_activity(
  p_page int default 1,
  p_per_page int default 25,
  p_from date default null,
  p_to date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total int;
  v_offset int := greatest(p_page - 1, 0) * p_per_page;
begin
  if not public.has_permission('activity_log-view') then
    raise exception 'You do not have permission to view the activity log.'
      using errcode = 'insufficient_privilege';
  end if;

  select count(*) into v_total
  from public.audit_log a
  where (p_from is null or a.created_at >= p_from)
    and (p_to is null or a.created_at < p_to + interval '1 day');

  return jsonb_build_object(
    'total', v_total,
    'current_page', p_page,
    'last_page', greatest(ceil(v_total::numeric / p_per_page)::int, 1),
    'data', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'created_at', a.created_at, 'description', a.description,
        'log_name', a.log_name,
        'causer', case when c.id is null then null
                       else jsonb_build_object('id', c.id, 'name', c.name) end
      ) order by a.created_at desc)
      from (
        select * from public.audit_log a
        where (p_from is null or a.created_at >= p_from)
          and (p_to is null or a.created_at < p_to + interval '1 day')
        order by a.created_at desc
        limit p_per_page offset v_offset
      ) a
      left join public.profiles c on c.id = a.causer_id
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.list_activity(int, int, date, date) from public, anon;
grant execute on function public.list_activity(int, int, date, date) to authenticated;

create or replace function public.clear_activity()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('activity_log-clear') then
    raise exception 'You do not have permission to clear the activity log.'
      using errcode = 'insufficient_privilege';
  end if;

  delete from public.audit_log;
end;
$$;
revoke all on function public.clear_activity() from public, anon;
grant execute on function public.clear_activity() to authenticated;
