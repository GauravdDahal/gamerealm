-- =============================================================================
-- 0012_site_content.sql
-- Everything written on the public homepage, editable from the admin panel.
--
--   site_content   one row per homepage section (about, faq, footer, ...).
--                  `content` holds that section's text, lists and image links.
--                  The website falls back to its built-in wording for any
--                  section or field that has no row yet.
--   site-images    public bucket for pictures uploaded from the admin panel.
--   site-manage    permission needed to change any of it.
-- Anyone can READ content (it is the public website). Only staff with
-- site-manage can write.
-- =============================================================================

create table public.site_content (
  key         text primary key,
  content     jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid        references public.profiles (id) on delete set null
);

create index site_content_updated_by_idx on public.site_content (updated_by);

create or replace function public.site_content_stamp()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

create trigger site_content_stamp
  before insert or update on public.site_content
  for each row execute function public.site_content_stamp();

grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;
alter table public.site_content enable row level security;

create policy site_content_select on public.site_content
  for select to anon, authenticated using (true);
create policy site_content_insert on public.site_content
  for insert to authenticated with check (public.has_permission('site-manage'));
create policy site_content_update on public.site_content
  for update to authenticated
  using (public.has_permission('site-manage'))
  with check (public.has_permission('site-manage'));
create policy site_content_delete on public.site_content
  for delete to authenticated using (public.has_permission('site-manage'));

insert into public.permissions (name) values ('site-manage') on conflict (name) do nothing;
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.name = 'super-admin' and p.name = 'site-manage'
on conflict do nothing;

-- ------------------------------------------------------------ image bucket
insert into storage.buckets (id, name, public) values ('site-images', 'site-images', true)
on conflict (id) do nothing;

update storage.buckets
   set file_size_limit = 8 * 1024 * 1024,
       allowed_mime_types = array['image/*']
 where id = 'site-images';

create policy site_images_select on storage.objects for select to public
  using (bucket_id = 'site-images');
create policy site_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'site-images' and public.has_permission('site-manage'));
create policy site_images_update on storage.objects for update to authenticated
  using (bucket_id = 'site-images' and public.has_permission('site-manage'))
  with check (bucket_id = 'site-images' and public.has_permission('site-manage'));
create policy site_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'site-images' and public.has_permission('site-manage'));
