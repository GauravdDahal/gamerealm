-- Access tests. Each block runs as a specific caller and checks what they can do.
-- Any failure raises an exception and stops the run (ON_ERROR_STOP).

create or replace function public.test_as(uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false);
  execute 'set role authenticated';
end $$;

create or replace function public.test_as_anon() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', false);
  execute 'set role anon';
end $$;

create or replace function public.test_reset() returns void
language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', false);
end $$;

create or replace function public.test_expect_error(stmt text, want text, label text)
returns void language plpgsql as $$
declare msg text;
begin
  begin
    execute stmt;
  exception when others then
    msg := sqlerrm;
    if want is not null and position(lower(want) in lower(msg)) = 0 then
      raise exception 'FAIL [%]: wrong error. wanted "%", got "%"', label, want, msg;
    end if;
    raise notice 'PASS [%]: blocked (%)', label, msg;
    return;
  end;
  raise exception 'FAIL [%]: expected a block but the statement succeeded', label;
end $$;

create or replace function public.test_expect_ok(stmt text, label text)
returns void language plpgsql as $$
begin
  execute stmt;
  raise notice 'PASS [%]: allowed', label;
exception when others then
  raise exception 'FAIL [%]: expected success but got: %', label, sqlerrm;
end $$;

create or replace function public.test_expect_count(q text, want int, label text)
returns void language plpgsql as $$
declare n int;
begin
  execute 'select count(*) from (' || q || ') s' into n;
  if n <> want then
    raise exception 'FAIL [%]: expected % row(s), saw %', label, want, n;
  end if;
  raise notice 'PASS [%]: % row(s)', label, n;
end $$;

-- ------------------------------------------------ setup as superuser
select public.test_reset();

-- Sign-up hook: under-18s are refused and no profile is created.
select public.test_expect_error(
  $$insert into auth.users (id, email, raw_user_meta_data)
    values ('00000000-0000-0000-0000-00000000c001', 'kid@test.dev',
            '{"name":"Kid","date_of_birth":"2015-01-01"}')$$,
  'at least 18', 'under-18 sign-up refused');

select public.test_expect_count(
  $$select * from public.profiles where email = 'kid@test.dev'$$, 0, 'no profile for refused sign-up');

-- New adult sign-up creates a pending profile whatever metadata says.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000c002', 'sneaky@test.dev',
   '{"name":"Sneaky","date_of_birth":"1990-01-01","status":"approved","is_admin":true}');
select public.test_expect_count(
  $$select * from public.profiles where email = 'sneaky@test.dev' and status = 'pending'$$,
  1, 'sign-up ignores client-sent status');

-- Bob has a chat with a message, an admin reply sits in Alice's chat.
insert into public.chats (client_id, is_active) values ('00000000-0000-0000-0000-00000000b003', true);
insert into public.messages (chat_id, sender_id, message)
  select id, '00000000-0000-0000-0000-00000000b003', 'bob private' from public.chats
   where client_id = '00000000-0000-0000-0000-00000000b003';
insert into public.messages (chat_id, sender_id, message)
  select id, '00000000-0000-0000-0000-00000000a002', 'admin reply to alice' from public.chats
   where client_id = '00000000-0000-0000-0000-00000000b002'
  returning id \gset admin_reply_
insert into public.cta_banners (heading, body, is_active) values ('Join', 'Now', true);

-- ------------------------------------------------ pending player
select public.test_as('00000000-0000-0000-0000-00000000b001');
select public.test_expect_count($$select * from public.profiles$$, 1, 'pending sees only own profile');
select public.test_expect_count($$select * from public.chats$$, 0, 'pending sees no chats');
select public.test_expect_error(
  $$insert into public.chats (client_id) values ('00000000-0000-0000-0000-00000000b001')$$,
  'row-level security', 'pending cannot open a chat');
select public.test_expect_ok(
  $$update public.profiles set name = 'Pending Renamed' where id = auth.uid()$$,
  'pending can edit own name');
select public.test_expect_error(
  $$update public.profiles set status = 'approved' where id = auth.uid()$$,
  'permission denied', 'player cannot self-approve');
select public.test_expect_error(
  $$select public.set_player_status('00000000-0000-0000-0000-00000000b001', 'approved', null)$$,
  'do not have permission', 'player cannot call approval function');
select public.test_reset();

-- ------------------------------------------------ approved player (Alice)
select public.test_as('00000000-0000-0000-0000-00000000b002');
select public.test_expect_count($$select * from public.chats$$, 1, 'alice sees only her chat');
select public.test_expect_count($$select * from public.messages$$, 1, 'alice sees only her chat messages');
select public.test_expect_error(
  $$insert into public.chats (client_id) values ('00000000-0000-0000-0000-00000000b003')$$,
  'row-level security', 'alice cannot open a chat for bob');
select public.test_expect_ok(
  $$insert into public.messages (chat_id, sender_id, message)
    select id, auth.uid(), 'hello' from public.chats where client_id = auth.uid()$$,
  'alice can send in her own chat');
select public.test_expect_error(
  $$insert into public.messages (chat_id, sender_id, message)
    select id, '00000000-0000-0000-0000-00000000b003', 'spoof' from public.chats
     where client_id = '00000000-0000-0000-0000-00000000b002'$$,
  'row-level security', 'cannot send as another user');
select public.test_expect_error(
  $$update public.messages set message = 'edited' where sender_id = auth.uid()$$,
  'permission denied', 'message text is immutable');
select public.test_expect_ok(
  $$update public.messages set is_read = true, read_at = now()
     where chat_id in (select id from public.chats where client_id = auth.uid())$$,
  'alice can mark her messages read');
select public.test_expect_error(
  format($$update public.messages set deleted_at = now() where id = %s$$, :'admin_reply_id'),
  'only delete your own', 'alice cannot delete an admin reply');
select public.test_expect_count($$select * from public.audit_log$$, 0, 'alice cannot read audit log');
select public.test_reset();

-- ------------------------------------------------ admin (chat-view, no role-create)
select public.test_as('00000000-0000-0000-0000-00000000a002');
select public.test_expect_count($$select * from public.chats$$, 2, 'admin sees every chat');
select public.test_expect_ok(
  $$select public.set_player_status('00000000-0000-0000-0000-00000000b001', 'approved', null)$$,
  'admin approves a pending player');
select public.test_expect_error(
  $$select public.set_player_status('00000000-0000-0000-0000-00000000b003', 'rejected', '  ')$$,
  'reason is required', 'reject needs a reason');
select public.test_expect_error(
  $$select public.set_player_status('00000000-0000-0000-0000-00000000a001', 'suspended', 'x')$$,
  'staff accounts', 'staff cannot be suspended from the queue');
select public.test_expect_error(
  $$insert into public.roles (name) values ('intruder')$$,
  'row-level security', 'admin without role-create cannot create roles');
select public.test_expect_count($$select * from public.audit_log where log_name = 'registrations'$$, 1,
  'approval is written to the audit log');
select public.test_reset();

-- ------------------------------------------------ anonymous visitor
select public.test_as_anon();
select public.test_expect_count($$select * from public.banner_groups$$, 1, 'visitor sees only active banner sets');
select public.test_expect_count($$select * from public.cta_banners$$, 1, 'visitor sees the CTA banner');
select public.test_expect_error($$select * from public.profiles$$, 'permission denied', 'visitor has no grant on profiles');
select public.test_expect_error($$select * from public.chats$$, 'permission denied', 'visitor has no grant on chats');
select public.test_expect_error(
  $$insert into public.banner_groups (name) values ('x')$$,
  'permission denied', 'visitor cannot write banners');
select public.test_reset();

select 'ALL ACCESS TESTS PASSED' as result;
