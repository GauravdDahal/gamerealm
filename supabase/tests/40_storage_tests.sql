-- Tests for 0006_storage.sql. Assumes 20_access_tests.sql's helpers and
-- 10_seed_test_data.sql's fixtures already loaded. Alice = b002 has a chat
-- (id picked up below); Bob = b003 has a separate chat with no overlap.

do $$
declare v_alice_chat bigint; v_bob_chat bigint;
begin
  select id into v_alice_chat from public.chats where client_id = '00000000-0000-0000-0000-00000000b002';
  select id into v_bob_chat from public.chats where client_id = '00000000-0000-0000-0000-00000000b003';
  perform set_config('test.alice_chat', v_alice_chat::text, false);
  perform set_config('test.bob_chat', v_bob_chat::text, false);
end $$;

-- ------------------------------------------------------------- avatars
select public.test_as('00000000-0000-0000-0000-00000000b002'); -- alice

select public.test_expect_ok(
  $$insert into storage.objects (bucket_id, name, owner)
    values ('avatars', '00000000-0000-0000-0000-00000000b002/me.jpg', auth.uid())$$,
  'alice uploads to her own avatar folder');

select public.test_expect_error(
  $$insert into storage.objects (bucket_id, name, owner)
    values ('avatars', '00000000-0000-0000-0000-00000000b003/me.jpg', auth.uid())$$,
  'row-level security', 'alice cannot upload into bobs avatar folder');

select public.test_reset();

-- -------------------------------------------------------------- banners
select public.test_as('00000000-0000-0000-0000-00000000b002'); -- alice, a player

select public.test_expect_error(
  $$insert into storage.objects (bucket_id, name) values ('banners', '1/slide.jpg')$$,
  'row-level security', 'player cannot upload a banner image');

select public.test_reset();
select public.test_as('00000000-0000-0000-0000-00000000a002'); -- admin, has banner-update not banner-create

select public.test_expect_error(
  $$insert into storage.objects (bucket_id, name) values ('banners', '1/slide.jpg')$$,
  'row-level security', 'admin without banner-create cannot upload a banner image');

select public.test_reset();
select public.test_as('00000000-0000-0000-0000-00000000a001'); -- super-admin, every permission

select public.test_expect_ok(
  $$insert into storage.objects (bucket_id, name) values ('banners', '1/slide.jpg')$$,
  'super-admin uploads a banner image');

select public.test_reset();

-- -------------------------------------------------------------- chat uploads
select public.test_as('00000000-0000-0000-0000-00000000b002'); -- alice

select public.test_expect_ok(
  format($$insert into storage.objects (bucket_id, name) values ('chat-attachments', %L)$$,
    current_setting('test.alice_chat') || '/photo.jpg'),
  'alice uploads an attachment to her own chat');

select public.test_expect_error(
  format($$insert into storage.objects (bucket_id, name) values ('chat-attachments', %L)$$,
    current_setting('test.bob_chat') || '/photo.jpg'),
  'row-level security', 'alice cannot upload into bobs chat');

select public.test_expect_ok(
  format($$select 1 from storage.objects where bucket_id = 'chat-attachments' and name = %L$$,
    current_setting('test.alice_chat') || '/photo.jpg'),
  'alice can read back her own chat attachment');

select public.test_reset();

-- Staff with chat-view can read and upload into any chat.
select public.test_as('00000000-0000-0000-0000-00000000a002');

select public.test_expect_ok(
  format($$select 1 from storage.objects where bucket_id = 'chat-attachments' and name = %L$$,
    current_setting('test.alice_chat') || '/photo.jpg'),
  'staff with chat-view can read a players attachment');

select public.test_expect_ok(
  format($$insert into storage.objects (bucket_id, name) values ('chat-voice', %L)$$,
    current_setting('test.alice_chat') || '/reply.webm'),
  'staff with chat-view can reply with a voice message');

select public.test_reset();

-- ------------------------------------------------------------------- anon
select public.test_as_anon();

select public.test_expect_ok($$select 1 from storage.objects where bucket_id = 'banners'$$,
  'anon can view banner images (public bucket)');
select public.test_expect_count(
  format($$select 1 from storage.objects where bucket_id = 'chat-attachments' and name = %L$$,
    current_setting('test.alice_chat') || '/photo.jpg'),
  0, 'anon cannot see a chat attachment (RLS filters the row, not an error)');

select public.test_reset();

select 'ALL STORAGE TESTS PASSED' as result;
