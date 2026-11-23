-- Security hardening from the November audit.

-- 1. Admin dashboard counts were readable by any signed-in player.
create or replace function public.dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'adminUsersCount', (
      select count(distinct ur.user_id) from public.user_roles ur
        join public.roles r on r.id = ur.role_id
       where lower(r.name) in ('super-admin', 'admin')),
    'clientUsersCount', (
      select count(*) from public.profiles p
       where not exists (
         select 1 from public.user_roles ur
           join public.roles r on r.id = ur.role_id
          where ur.user_id = p.id and lower(r.name) in ('super-admin', 'admin'))),
    'pendingCount', (select count(*) from public.profiles where status = 'pending')
  );
end;
$$;
revoke all on function public.dashboard_stats() from public, anon;
grant execute on function public.dashboard_stats() to authenticated;

-- 2. Nobody outside the site needs to test referral codes one by one.
revoke execute on function public.referral_code_valid(text) from anon;

-- 3. Uploads: size caps and raster images only. SVG can carry scripts, and
--    avatars / banners previously accepted any file of any size.
update storage.buckets set file_size_limit = 5242880,
       allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif']
 where id in ('avatars', 'banners');
update storage.buckets set
       allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif','image/avif']
 where id in ('game-images', 'site-images');
update storage.buckets set
       allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif','image/heic','image/heif',
                                  'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.*',
                                  'application/vnd.ms-excel','application/vnd.ms-powerpoint','text/plain','text/csv','application/zip']
 where id = 'chat-attachments';

-- 4. Chat rate limit: players can send at most 20 messages a minute.
create or replace function public.messages_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_staff() then
    return new;
  end if;
  if (select count(*) from public.messages
       where sender_id = new.sender_id
         and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'You are sending messages too quickly. Please wait a moment.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.messages_rate_limit() from public, anon, authenticated;

drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit
  before insert on public.messages
  for each row execute function public.messages_rate_limit();

create index if not exists messages_sender_created_idx on public.messages (sender_id, created_at desc);
