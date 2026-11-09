-- Tests for 0010_wheel.sql (needs helpers from 20 and fixtures from 10).
insert into public.permissions (name) values ('wheel-manage') on conflict (name) do nothing;
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.name = 'super-admin' and p.name = 'wheel-manage' on conflict do nothing;

-- Anyone can see the segments, but not the odds table.
select public.test_as_anon();
do $$ begin
  if (select count(*) from public.wheel_segments()) <> 8 then raise exception 'FAIL: anon cannot read segments'; end if;
  if (select public.wheel_status()->>'state') <> 'signed_out' then raise exception 'FAIL: anon status'; end if;
  raise notice 'PASS [anon sees segments and signed_out status]';
end $$;
select public.test_expect_error($$select public.spin_wheel()$$, 'permission denied', 'anon cannot spin');
select public.test_expect_error($$select * from public.wheel_prizes$$, 'permission denied', 'anon cannot read odds');
select public.test_reset();

-- Pending player cannot spin (earlier tests may have approved them, so reset).
update public.profiles set status = 'pending', is_active = false where id = '00000000-0000-0000-0000-00000000b001';
select public.test_as('00000000-0000-0000-0000-00000000b001');
select public.test_expect_error($$select public.spin_wheel()$$, 'approved', 'pending player cannot spin');
do $$ begin
  if (select public.wheel_status()->>'state') <> 'not_approved' then raise exception 'FAIL: pending status'; end if;
  raise notice 'PASS [pending status]';
end $$;
select public.test_reset();

-- Staff cannot spin.
select public.test_as('00000000-0000-0000-0000-00000000a002');
select public.test_expect_error($$select public.spin_wheel()$$, 'Staff', 'staff cannot spin');
select public.test_reset();

-- Approved player: one spin, second is refused.
select public.test_as('00000000-0000-0000-0000-00000000b002');
do $$ begin
  if (select public.wheel_status()->>'state') <> 'ready' then raise exception 'FAIL: ready status'; end if;
  raise notice 'PASS [ready before spinning]';
end $$;
select public.test_expect_ok($$select public.spin_wheel()$$, 'approved player spins');
select public.test_expect_error($$select public.spin_wheel()$$, 'already spun', 'second spin is refused');
do $$ begin
  if (select public.wheel_status()->>'state') <> 'wait' then raise exception 'FAIL: wait status'; end if;
  if (select count(*) from public.wheel_spins) <> 1 then raise exception 'FAIL: player should see only own spin'; end if;
  raise notice 'PASS [wait status, own spins visible]';
end $$;
select public.test_expect_error($$insert into public.wheel_spins (player_id, prize_label) values (auth.uid(), 'cheat')$$,
  'permission denied', 'player cannot write a spin directly');
-- RLS makes a player's update touch zero rows rather than raise an error.
update public.wheel_prizes set weight = 100000;
do $$ begin
  if (select count(*) from public.wheel_prizes where weight = 100000) <> 0 then raise exception 'FAIL: player changed odds'; end if;
  raise notice 'PASS [player cannot change odds]';
end $$;
select public.test_reset();

-- Another player does not see Alice's spin; after 24h Alice can spin again.
select public.test_as('00000000-0000-0000-0000-00000000b003');
do $$ begin
  if (select count(*) from public.wheel_spins) <> 0 then raise exception 'FAIL: Bob sees Alice spin'; end if;
  raise notice 'PASS [spins are private]';
end $$;
select public.test_reset();
update public.wheel_spins set created_at = now() - interval '25 hours';
select public.test_as('00000000-0000-0000-0000-00000000b002');
select public.test_expect_ok($$select public.spin_wheel()$$, 'spin allowed again after 24 hours');
select public.test_reset();

-- (as superuser) the player's attempt above really changed nothing
do $$ begin
  if exists (select 1 from public.wheel_prizes where weight = 100000) then raise exception 'FAIL: odds were changed by a player'; end if;
  raise notice 'PASS [odds untouched after player attempt]';
end $$;

-- Odds: only the active, weighted prize can ever win.
update public.wheel_prizes set is_active = false;
update public.wheel_prizes set is_active = true, weight = 1 where label = '$50 Freeplay';
update public.wheel_spins set created_at = now() - interval '25 hours';
select public.test_as('00000000-0000-0000-0000-00000000b003');
do $$ declare r jsonb; begin
  r := public.spin_wheel();
  if r->>'label' <> '$50 Freeplay' then raise exception 'FAIL: wrong prize %', r; end if;
  raise notice 'PASS [weighted pick respects active prizes]';
end $$;
select public.test_reset();

-- Admin side.
select public.test_as('00000000-0000-0000-0000-00000000a002');
select public.test_expect_error($$select * from public.list_wheel_spins()$$, 'Not allowed', 'admin without wheel-manage is refused');
select public.test_reset();
select public.test_as('00000000-0000-0000-0000-00000000a001');
do $$ begin
  if (select count(*) from public.list_wheel_spins()) <> 3 then raise exception 'FAIL: manager list'; end if;
  perform public.set_spin_credited((select min(id) from public.wheel_spins), true);
  if (select status from public.wheel_spins where id = (select min(id) from public.wheel_spins)) <> 'credited' then raise exception 'FAIL: credit'; end if;
  raise notice 'PASS [manager lists and credits spins]';
end $$;
select public.test_expect_ok($$update public.wheel_prizes set weight = 7 where label = '$50 Freeplay'$$, 'manager edits odds');
select public.test_reset();
