-- =============================================================================
-- 0003_my_access.sql
-- One RPC the frontend calls right after sign-in to learn who the caller is:
-- their profile, whether they're staff, approved, and which roles they hold.
-- Runs as security definer so it isn't blocked by the roles table's own RLS
-- (a non-staff caller has no rows there anyway; a staff caller might lack
-- role-view, which would otherwise hide their own role name from them).
-- =============================================================================

create or replace function public.my_access()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'profile', to_jsonb(p.*),
    'is_staff', public.is_staff(),
    'is_approved', public.is_approved(),
    'roles', coalesce(
      (select jsonb_agg(r.name) from public.user_roles ur
       join public.roles r on r.id = ur.role_id
       where ur.user_id = auth.uid()),
      '[]'::jsonb
    )
  )
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.my_access() from public, anon;
grant execute on function public.my_access() to authenticated;
