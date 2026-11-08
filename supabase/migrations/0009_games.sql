-- =============================================================================
-- 0009_games.sql
-- Games shown on the homepage, managed from the admin panel:
-- card image, optional logo for the moving strip, "hot" flag, order, show/hide.
-- =============================================================================

create table public.games (
  id          bigint generated always as identity primary key,
  title       text        not null,
  image_url   text        not null,            -- card picture
  logo_url    text,                            -- moving strip logo (falls back to image_url)
  players     text        not null default '', -- e.g. '50K+'
  is_hot      boolean     not null default false,
  is_active   boolean     not null default true,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger games_touch before update on public.games
  for each row execute function public.touch_updated_at();

grant select on public.games to anon, authenticated;
grant insert, update, delete on public.games to authenticated;
alter table public.games enable row level security;

-- Visitors see games that are switched on. Staff who manage games see all.
create policy games_select on public.games for select to anon, authenticated
  using (is_active or public.has_permission('game-manage'));
create policy games_insert on public.games for insert to authenticated
  with check (public.has_permission('game-manage'));
create policy games_update on public.games for update to authenticated
  using (public.has_permission('game-manage'))
  with check (public.has_permission('game-manage'));
create policy games_delete on public.games for delete to authenticated
  using (public.has_permission('game-manage'));

-- New permission, given to the super-admin role.
insert into public.permissions (name) values ('game-manage') on conflict (name) do nothing;
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.name = 'super-admin' and p.name = 'game-manage'
on conflict do nothing;

-- ------------------------------------------------------------------ images
insert into storage.buckets (id, name, public) values ('game-images', 'game-images', true)
on conflict (id) do nothing;

update storage.buckets
   set file_size_limit = 8 * 1024 * 1024,
       allowed_mime_types = array['image/*']
 where id = 'game-images';

create policy game_images_select on storage.objects for select to public
  using (bucket_id = 'game-images');
create policy game_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'game-images' and public.has_permission('game-manage'));
create policy game_images_update on storage.objects for update to authenticated
  using (bucket_id = 'game-images' and public.has_permission('game-manage'))
  with check (bucket_id = 'game-images' and public.has_permission('game-manage'));
create policy game_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'game-images' and public.has_permission('game-manage'));

-- ------------------------------------------------- the games already on the site
insert into public.games (title, image_url, players, is_hot, sort_order) values
  ('Apex Legends',      '/assets/images/gameSectionImg/img1.jpg',  '50K+', true,  1),
  ('Valorant',          '/assets/images/gameSectionImg/img2.jpg',  '45K+', true,  2),
  ('League of Legends', '/assets/images/gameSectionImg/img3.jpg',  '10K+', false, 3),
  ('Hot Deco',          '/assets/images/gameSectionImg/img4.jpg',  '80K+', true,  4),
  ('Game Time',         '/assets/images/gameSectionImg/img5.jpg',  '80K+', false, 5),
  ('Poker',             '/assets/images/gameSectionImg/img6.jpg',  '80K+', false, 6),
  ('Casino Night',      '/assets/images/gameSectionImg/img7.jpg',  '80K+', true,  7),
  ('Hot Deco 2',        '/assets/images/gameSectionImg/img8.jpg',  '80K+', true,  8),
  ('Hot Deco 3',        '/assets/images/gameSectionImg/img9.jpeg', '80K+', false, 9),
  ('Hot Deco 4',        '/assets/images/gameSectionImg/img10.jpg', '80K+', true,  10),
  ('Hot Deco 5',        '/assets/images/gameSectionImg/img11.jpeg','80K+', false, 11),
  ('Hot Deco 6',        '/assets/images/gameSectionImg/img12.jpeg','80K+', false, 12);
