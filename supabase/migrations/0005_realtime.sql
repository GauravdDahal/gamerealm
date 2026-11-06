-- =============================================================================
-- 0005_realtime.sql
-- Keeps chats.last_message_at current, and turns on Supabase Realtime for the
-- chat tables (new tables aren't included in the realtime publication by
-- default, even once RLS allows reading them).
-- =============================================================================

create or replace function public.touch_chat_last_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chats set last_message_at = new.created_at where id = new.chat_id;
  return new;
end;
$$;

create trigger messages_touch_chat
  after insert on public.messages
  for each row execute function public.touch_chat_last_message();

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chats;

-- ---------------------------------------------------------------- staff inbox
create or replace function public.list_staff_chats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('chat-view') then
    raise exception 'You do not have permission to view chats.'
      using errcode = 'insufficient_privilege';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id,
      'client_id', c.client_id,
      'client_name', p.name,
      'client_email', p.email,
      'is_active', c.is_active,
      'last_message_at', c.last_message_at,
      'unread_count', (
        select count(*) from public.messages m
        where m.chat_id = c.id and m.sender_id = c.client_id
          and m.is_read = false and m.deleted_at is null
      )
    ) order by c.last_message_at desc nulls last)
    from public.chats c
    join public.profiles p on p.id = c.client_id
    where c.deleted_at is null
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.list_staff_chats() from public, anon;
grant execute on function public.list_staff_chats() to authenticated;
