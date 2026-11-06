-- =============================================================================
-- seed_production.sql
-- Run this on your REAL Supabase project, once, after 0001_schema.sql and
-- 0002_access.sql. Creates the starting permissions and the super-admin role,
-- matching apps/api/database/seeders/RolePermissionSeeder.php.
--
-- This does NOT create any user accounts. Sign up through the app first,
-- then run the "promote yourself" query at the bottom with your own email.
-- =============================================================================

insert into public.permissions (name) values
  ('banner-view'), ('banner-create'), ('banner-update'), ('banner-delete'),
  ('role-view'), ('role-create'), ('role-update'), ('role-delete'), ('role-assign'),
  ('admin_user-view'), ('admin_user-create'), ('admin_user-update'), ('admin_user-delete'),
  ('activity_log-view'), ('activity_log-clear'),
  ('chat-view'),
  ('message-view'), ('message-delete')
on conflict (name) do nothing;

insert into public.roles (name) values ('super-admin')
on conflict (name) do nothing;

-- Give super-admin every permission that exists.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'super-admin'
on conflict do nothing;

-- -----------------------------------------------------------------------
-- After this, go sign up for an account through the app (so a row appears
-- in public.profiles). THEN come back here, replace the email below with
-- yours, and run just this block to make yourself super-admin:
--
-- insert into public.user_roles (user_id, role_id)
-- select pr.id, r.id
-- from public.profiles pr, public.roles r
-- where pr.email = 'you@example.com' and r.name = 'super-admin'
-- on conflict do nothing;
--
-- update public.profiles set status = 'approved', is_active = true
-- where email = 'you@example.com';
-- -----------------------------------------------------------------------
