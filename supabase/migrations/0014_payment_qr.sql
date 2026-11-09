-- =============================================================================
-- 0014_payment_qr.sql
-- Payment QR codes shown in the chat (Cash App, Venmo, PayPal ...).
-- Staff with `qr-manage` add them in Admin > QR codes. Approved players and
-- staff can see active ones. Images live in a PRIVATE bucket (signed links).
-- =============================================================================
create table if not exists public.payment_qr_codes (
  id         bigint generated always as identity primary key,
  label      text not null check (char_length(label) between 1 and 40),
  note       text check (note is null or char_length(note) <= 120),
  image_path text not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.payment_qr_codes enable row level security;
grant select, insert, update, delete on public.payment_qr_codes to authenticated;

create policy payment_qr_select on public.payment_qr_codes
  for select to authenticated
  using ((is_active and public.is_approved()) or public.has_permission('qr-manage'));
create policy payment_qr_insert on public.payment_qr_codes
  for insert to authenticated with check (public.has_permission('qr-manage'));
create policy payment_qr_update on public.payment_qr_codes
  for update to authenticated
  using (public.has_permission('qr-manage')) with check (public.has_permission('qr-manage'));
create policy payment_qr_delete on public.payment_qr_codes
  for delete to authenticated using (public.has_permission('qr-manage'));

insert into public.permissions (name) values ('qr-manage') on conflict (name) do nothing;
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.name = 'super-admin' and p.name = 'qr-manage'
on conflict do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-qr', 'payment-qr', false, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;

create policy payment_qr_files_select on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-qr' and (public.is_approved() or public.has_permission('qr-manage')));
create policy payment_qr_files_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-qr' and public.has_permission('qr-manage'));
create policy payment_qr_files_update on storage.objects
  for update to authenticated
  using (bucket_id = 'payment-qr' and public.has_permission('qr-manage'))
  with check (bucket_id = 'payment-qr' and public.has_permission('qr-manage'));
create policy payment_qr_files_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'payment-qr' and public.has_permission('qr-manage'));
