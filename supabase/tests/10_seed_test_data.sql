-- Test fixtures. Runs as the superuser so it can create auth users.
-- Creates: 1 super-admin, 1 admin, 3 players (pending, approved, approved).
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000a001', 'super@test.dev',   '{"name":"Super","date_of_birth":"1980-01-01","country":"NP","address":"x"}'),
  ('00000000-0000-0000-0000-00000000a002', 'admin@test.dev',   '{"name":"Admin","date_of_birth":"1985-01-01","country":"NP","address":"x"}'),
  ('00000000-0000-0000-0000-00000000b001', 'pending@test.dev', '{"name":"Pending","date_of_birth":"1995-04-10","phone":"+977981","country":"NP","address":"x"}'),
  ('00000000-0000-0000-0000-00000000b002', 'alice@test.dev',   '{"name":"Alice","date_of_birth":"1995-04-10","country":"NP","address":"x"}'),
  ('00000000-0000-0000-0000-00000000b003', 'bob@test.dev',     '{"name":"Bob","date_of_birth":"1995-04-10","country":"NP","address":"x"}');

-- Approve Alice and Bob the way the admin queue would.
update public.profiles set status = 'approved', is_active = true
 where email in ('alice@test.dev', 'bob@test.dev');

insert into public.roles (name) values ('super-admin'), ('admin');

insert into public.permissions (name) values
  ('banner-view'),('banner-create'),('banner-update'),('banner-delete'),
  ('role-view'),('role-create'),('role-update'),('role-delete'),('role-assign'),
  ('admin_user-view'),('admin_user-create'),('admin_user-update'),('admin_user-delete'),
  ('activity_log-view'),('activity_log-clear'),
  ('chat-view'),('message-view'),('message-delete');

-- super-admin gets everything, as RolePermissionSeeder does.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p where r.name = 'super-admin';

-- admin gets the subset used by the panel and chat inbox.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
 where r.name = 'admin' and p.name in
   ('admin_user-view','admin_user-update','chat-view','banner-view','banner-update','activity_log-view');

insert into public.user_roles (user_id, role_id)
select '00000000-0000-0000-0000-00000000a001'::uuid, id from public.roles where name = 'super-admin'
union all
select '00000000-0000-0000-0000-00000000a002'::uuid, id from public.roles where name = 'admin';

-- A chat for Alice and one active banner set, so visibility tests have data.
insert into public.chats (client_id, is_active) values ('00000000-0000-0000-0000-00000000b002', true);
insert into public.banner_groups (name, is_active) values ('Live set', true), ('Hidden set', false);
