-- =============================================================================
-- 0008_chat_media.sql
-- Chat attachments (images, GIFs, documents), voice messages, highlighted
-- messages and saved quick replies.
--
--  * messages.attachments  - list of files sent with a message, stored on the
--    message itself so the text and its files always arrive together.
--  * messages.style/title  - a highlighted message. Only staff can set these.
--  * quick_replies         - messages staff save once and send in one click.
--  * bucket limits         - size caps, and the attachment bucket refuses
--    anything that isn't an image, a document or a plain archive.
-- =============================================================================

alter table public.messages
  add column attachments jsonb not null default '[]'::jsonb,
  add column style text,
  add column title text;

alter table public.messages
  add constraint messages_style_check
  check (style is null or style in ('info', 'promo', 'success', 'warning'));

-- A player cannot dress their own message up as an official notice.
create or replace function public.messages_strip_staff_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    new.style := null;
    new.title := null;
  end if;
  return new;
end;
$$;

create trigger messages_strip_staff_fields
  before insert on public.messages
  for each row execute function public.messages_strip_staff_fields();

-- ------------------------------------------------------------ quick replies
create table public.quick_replies (
  id          bigint generated always as identity primary key,
  title       text        not null,
  body        text        not null,
  style       text        not null default 'info'
              check (style in ('info', 'promo', 'success', 'warning')),
  created_by  uuid        references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger quick_replies_touch before update on public.quick_replies
  for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.quick_replies to authenticated;
alter table public.quick_replies enable row level security;

-- Anyone who can answer chats can use and manage the saved replies.
create policy quick_replies_all on public.quick_replies for all to authenticated
  using (public.has_permission('chat-view'))
  with check (public.has_permission('chat-view'));

-- ------------------------------------------------------------ bucket limits
update storage.buckets
   set file_size_limit = 15 * 1024 * 1024,
       allowed_mime_types = array[
         'image/*',
         'application/pdf',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.*',
         'application/vnd.ms-excel',
         'application/vnd.ms-powerpoint',
         'text/plain',
         'text/csv',
         'application/zip'
       ]
 where id = 'chat-attachments';

update storage.buckets
   set file_size_limit = 10 * 1024 * 1024,
       allowed_mime_types = array['audio/*', 'video/webm', 'video/mp4']
 where id = 'chat-voice';
