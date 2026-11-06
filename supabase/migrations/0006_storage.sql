-- =============================================================================
-- 0006_storage.sql
-- Storage buckets + policies for banner images, avatars, and chat uploads.
-- Storage security works the same way as every other table here: policies
-- on storage.objects (Supabase's own table), checked on every upload/read.
-- =============================================================================

insert into storage.buckets (id, name, public)
values
  ('banners', 'banners', true),
  ('avatars', 'avatars', true),
  ('chat-attachments', 'chat-attachments', false),
  ('chat-voice', 'chat-voice', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- banners
-- Public bucket: anyone can view (serves the landing page's banner images
-- without needing a signed URL). Only staff with banner permissions can
-- write. Path convention: bannerGroupId/filename — not enforced here, it's
-- just how the admin UI organises uploads.
create policy banners_bucket_select on storage.objects
  for select to public
  using (bucket_id = 'banners');

create policy banners_bucket_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'banners' and public.has_permission('banner-create'));

create policy banners_bucket_update on storage.objects
  for update to authenticated
  using (bucket_id = 'banners' and public.has_permission('banner-update'))
  with check (bucket_id = 'banners' and public.has_permission('banner-update'));

create policy banners_bucket_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'banners' and public.has_permission('banner-delete'));

-- ---------------------------------------------------------------- avatars
-- Public bucket. Everyone can view. A player can only write inside a folder
-- named after their own user id — e.g. avatars/<uid>/photo.jpg — so one
-- player can never overwrite another's avatar. Staff can write into any
-- player's folder (for the admin panel, if that's ever added there).
create policy avatars_bucket_select on storage.objects
  for select to public
  using (bucket_id = 'avatars');

create policy avatars_bucket_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff())
  );

create policy avatars_bucket_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff())
  )
  with check (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff())
  );

create policy avatars_bucket_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff())
  );

-- ---------------------------------------------------- chat attachments/voice
-- Private buckets. Path convention: <chatId>/<filename> — the first folder
-- segment is the chat id, reusing can_access_chat() from 0002_access.sql so
-- the rule is identical to who can read/write the messages table itself.
-- Uploads can't be renamed/replaced once sent (no update policy), only
-- deleted by whoever could delete the message it belongs to.
create policy chat_attachments_bucket_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and public.can_access_chat(nullif((storage.foldername(name))[1], '')::bigint)
  );

create policy chat_attachments_bucket_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and public.can_access_chat(nullif((storage.foldername(name))[1], '')::bigint)
  );

create policy chat_attachments_bucket_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chat-attachments'
    and public.has_permission('message-delete')
  );

create policy chat_voice_bucket_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-voice'
    and public.can_access_chat(nullif((storage.foldername(name))[1], '')::bigint)
  );

create policy chat_voice_bucket_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-voice'
    and public.can_access_chat(nullif((storage.foldername(name))[1], '')::bigint)
  );

create policy chat_voice_bucket_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chat-voice'
    and public.has_permission('message-delete')
  );
