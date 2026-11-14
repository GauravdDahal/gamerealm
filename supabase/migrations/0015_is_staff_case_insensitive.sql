-- The "Admin" role (capital A) was not recognised as staff because is_staff()
-- compared role names case-sensitively. Compare them in lower case instead.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
     where ur.user_id = auth.uid()
       and lower(r.name) in ('super-admin', 'admin')
  );
$$;
