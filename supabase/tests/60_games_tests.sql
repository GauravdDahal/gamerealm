-- Tests for 0009_games.sql (needs helpers from 20 and fixtures from 10).
-- The fixtures create roles after the migration ran, so grant the new permission here.
insert into public.permissions (name) values ('game-manage') on conflict (name) do nothing;
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.name = 'super-admin' and p.name = 'game-manage' on conflict do nothing;

insert into public.games (title, image_url, is_active) values ('Hidden one', '/x.jpg', false);

-- Visitors see only active games.
select public.test_as_anon();
do $$ begin
  if (select count(*) from public.games where title = 'Hidden one') <> 0 then raise exception 'FAIL: anon sees hidden game'; end if;
  if (select count(*) from public.games) < 12 then raise exception 'FAIL: anon cannot see live games'; end if;
  raise notice 'PASS [anon sees only active games]';
end $$;
select public.test_reset();

-- A player cannot add games.
select public.test_as('00000000-0000-0000-0000-00000000b002');
select public.test_expect_error($$insert into public.games (title, image_url) values ('x','/y.jpg')$$,
  'row-level security', 'player cannot add a game');
select public.test_reset();

-- Plain admin (no game-manage) cannot either.
select public.test_as('00000000-0000-0000-0000-00000000a002');
select public.test_expect_error($$insert into public.games (title, image_url) values ('x','/y.jpg')$$,
  'row-level security', 'admin without game-manage cannot add a game');
select public.test_reset();

-- Super-admin can add, edit, see hidden, delete.
select public.test_as('00000000-0000-0000-0000-00000000a001');
select public.test_expect_ok($$insert into public.games (title, image_url, is_hot) values ('New game','/n.jpg', true)$$, 'super-admin adds a game');
select public.test_expect_ok($$update public.games set is_hot = false where title = 'New game'$$, 'super-admin edits a game');
do $$ begin
  if (select count(*) from public.games where title = 'Hidden one') <> 1 then raise exception 'FAIL: manager cannot see hidden game'; end if;
  raise notice 'PASS [manager sees hidden games]';
end $$;
select public.test_expect_ok($$delete from public.games where title = 'New game'$$, 'super-admin deletes a game');
select public.test_reset();
