-- Tests for 0004_admin_rpcs.sql and 0005_realtime.sql's list_staff_chats().
-- Assumes 20_access_tests.sql's test_as()/test_expect_*() helpers and
-- 10_seed_test_data.sql's fixtures already loaded.

-- --------------------------------------------------------- super-admin (full perms)
select public.test_as('00000000-0000-0000-0000-00000000a001');

select public.test_expect_ok($$select public.dashboard_stats()$$, 'super-admin reads dashboard stats');
select public.test_expect_ok($$select public.list_staff()$$, 'super-admin lists staff');
select public.test_expect_ok($$select public.list_players()$$, 'super-admin lists players');
select public.test_expect_ok($$select public.list_roles()$$, 'super-admin lists roles');
select public.test_expect_ok($$select public.list_permissions()$$, 'super-admin lists permissions');
select public.test_expect_ok($$select public.list_activity()$$, 'super-admin lists activity');
select public.test_expect_ok($$select public.list_staff_chats()$$, 'super-admin lists staff chats');

do $$
declare v_role_id bigint;
begin
  select public.create_role('support', array['chat-view']) into v_role_id;
  if v_role_id is null then raise exception 'FAIL: create_role returned no id'; end if;
  raise notice 'PASS [super-admin creates a role]: id %', v_role_id;

  perform public.update_role_permissions(v_role_id, array['chat-view', 'message-view']);
  raise notice 'PASS [super-admin updates role permissions]: ok';

  perform public.delete_role(v_role_id);
  raise notice 'PASS [super-admin deletes an unused role]: ok';
end $$;

select public.test_expect_ok(
  $$select public.rename_staff('00000000-0000-0000-0000-00000000a002', 'Admin Renamed')$$,
  'super-admin can rename a staff member');

select public.test_expect_error(
  $$select public.remove_staff('00000000-0000-0000-0000-00000000a001')$$,
  'cannot be deleted', 'super-admin cannot be removed via remove_staff');

select public.test_reset();

-- --------------------------------------------------- limited admin (no role-*)
select public.test_as('00000000-0000-0000-0000-00000000a002');

select public.test_expect_ok($$select public.list_staff()$$, 'limited admin still lists staff (admin_user-view)');
select public.test_expect_ok($$select public.list_staff_chats()$$, 'limited admin lists staff chats (chat-view)');
select public.test_expect_error(
  $$select public.list_roles()$$, 'do not have permission', 'limited admin lacks role-view');
select public.test_expect_error(
  $$select public.create_role('x', array[]::text[])$$, 'do not have permission', 'limited admin lacks role-create');
select public.test_expect_error(
  $$select public.remove_staff('00000000-0000-0000-0000-00000000a001')$$,
  'do not have permission', 'limited admin lacks admin_user-delete');

select public.test_reset();

-- ------------------------------------------------------------- approved player
select public.test_as('00000000-0000-0000-0000-00000000b002');

select public.test_expect_error(
  $$select public.list_staff()$$, 'do not have permission', 'player cannot list staff');
select public.test_expect_error(
  $$select public.list_players()$$, 'do not have permission', 'player cannot list players');
select public.test_expect_error(
  $$select public.list_roles()$$, 'do not have permission', 'player cannot list roles');
select public.test_expect_error(
  $$select public.list_activity()$$, 'do not have permission', 'player cannot list activity');
select public.test_expect_error(
  $$select public.list_staff_chats()$$, 'do not have permission', 'player cannot list staff chats');
select public.test_expect_error(
  $$select public.create_role('x', array[]::text[])$$, 'do not have permission', 'player cannot create a role');
select public.test_expect_error(
  $$select public.set_staff_role('00000000-0000-0000-0000-00000000b002', 'admin')$$,
  'do not have permission', 'player cannot self-promote to staff');

select public.test_reset();

-- -------------------------------------------------------------------- anon
select public.test_as_anon();
select public.test_expect_error(
  $$select public.list_staff()$$, null, 'anon blocked from list_staff');
select public.test_expect_error(
  $$select public.my_access()$$, null, 'anon blocked from my_access');
select public.test_reset();

select 'ALL ADMIN RPC TESTS PASSED' as result;
