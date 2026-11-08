-- Tests for 0008_chat_media.sql. Needs the helpers from 20 and fixtures from 10.
-- test_expect_ok / ok / count come from 20_access_tests.sql.

do $$ begin
  perform set_config('test.alice_chat',
    (select id::text from public.chats where client_id = '00000000-0000-0000-0000-00000000b002' and deleted_at is null order by id limit 1), false);
end $$;

-- A player sending a file: attachments saved with the message.
select public.test_as('00000000-0000-0000-0000-00000000b002');
select public.test_expect_ok(
  format($$insert into public.messages (chat_id, sender_id, message, attachments)
           values (%s, auth.uid(), '', '[{"path":"x/a.png","name":"a.png","type":"image/png","size":10}]')$$,
         current_setting('test.alice_chat')),
  'player sends an attachment-only message');

-- A player cannot fake a highlighted notice.
select public.test_expect_ok(
  format($$insert into public.messages (chat_id, sender_id, message, style, title)
           values (%s, auth.uid(), 'sneaky', 'warning', 'OFFICIAL')$$,
         current_setting('test.alice_chat')),
  'player message inserted');
select public.test_reset();
do $$ begin
  if (select style from public.messages where message = 'sneaky') is not null
     or (select title from public.messages where message = 'sneaky') is not null then
    raise exception 'FAIL: player highlight was not stripped';
  end if;
  raise notice 'PASS [player cannot set style or title]';
end $$;

-- Staff can send a highlighted message.
select public.test_as('00000000-0000-0000-0000-00000000a002');
select public.test_expect_ok(
  format($$insert into public.messages (chat_id, sender_id, message, style, title)
           values (%s, auth.uid(), 'Bonus is live', 'promo', 'Weekend offer')$$,
         current_setting('test.alice_chat')),
  'staff sends a highlighted message');
select public.test_reset();
do $$ begin
  if (select style from public.messages where message = 'Bonus is live') <> 'promo' then
    raise exception 'FAIL: staff highlight was stripped';
  end if;
  raise notice 'PASS [staff highlight kept]';
end $$;

select public.test_as('00000000-0000-0000-0000-00000000a002');
select public.test_expect_error(
  format($$insert into public.messages (chat_id, sender_id, message, style)
           values (%s, '00000000-0000-0000-0000-00000000a002', 'x', 'rainbow')$$,
         current_setting('test.alice_chat')),
  'messages_style_check', 'unknown style is rejected');
select public.test_reset();

-- Quick replies: staff yes, players no.
select public.test_as('00000000-0000-0000-0000-00000000a002');
select public.test_expect_ok(
  $$insert into public.quick_replies (title, body, style) values ('Welcome', 'Hi there', 'info')$$,
  'staff saves a quick reply');
do $$ begin
  if (select count(*) from public.quick_replies) <> 1 then raise exception 'FAIL: staff cannot read quick replies'; end if;
  raise notice 'PASS [staff reads quick replies]';
end $$;
select public.test_reset();

select public.test_as('00000000-0000-0000-0000-00000000b002');
do $$ begin
  if (select count(*) from public.quick_replies) <> 0 then raise exception 'FAIL: player can see quick replies'; end if;
  raise notice 'PASS [player sees no quick replies]';
end $$;
select public.test_expect_error(
  $$insert into public.quick_replies (title, body) values ('x', 'y')$$,
  'row-level security', 'player cannot save a quick reply');
select public.test_reset();
