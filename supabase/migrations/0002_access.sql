-- =============================================================================
-- 0002_access.sql
-- Row Level Security, column grants, and the helper functions the policies use.
-- Permission names match apps/api/database/seeders/RolePermissionSeeder.php
-- so the existing admin screens keep working.
-- =============================================================================

-- ------------------------------------------------------------ helpers
-- All helpers read auth.uid(), which is the caller's user id from their JWT.

create or replace function public.has_permission(p text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions pe      on pe.id = rp.permission_id
    where ur.user_id = auth.uid()
      and pe.name = p
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name in ('super-admin', 'admin')
  );
$$;

-- Staff are never gated by the player approval queue (see User::isApproved).
create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_staff()
      or exists (
           select 1 from public.profiles p
           where p.id = auth.uid() and p.status = 'approved'
         );
$$;

-- Helper used by policies on chat tables: may the caller see this chat?
create or replace function public.can_access_chat(cid bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chats c
    where c.id = cid
      and c.deleted_at is null
      and (
        (c.client_id = auth.uid() and public.is_approved())
        or public.has_permission('chat-view')
      )
  );
$$;

-- --------------------------------------------------- grants on profiles
-- Players may edit their own profile details only. Status, approval fields
-- and avatar-free identity fields stay out of reach of the browser entirely.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, phone, country, address, avatar_url)
  on public.profiles to authenticated;

-- ------------------------------------------------------------ profiles RLS
alter table public.profiles enable row level security;

create policy profiles_select_own_or_staff on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.has_permission('admin_user-view'));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No insert/delete policies: rows are created by handle_new_user() and removed
-- by cascading from auth.users.

-- ----------------------------------------------------- status changes (RPC)
-- The only way to approve, reject, suspend or reinstate a player. Runs as the
-- table owner, but checks the caller's permission itself.
create or replace function public.set_player_status(
  target      uuid,
  new_status  text,
  reason      text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.profiles;
begin
  if not public.has_permission('admin_user-update') then
    raise exception 'You do not have permission to change account status.'
      using errcode = 'insufficient_privilege';
  end if;

  if new_status not in ('pending', 'approved', 'rejected', 'suspended') then
    raise exception 'Unknown status: %', new_status using errcode = 'invalid_parameter_value';
  end if;

  if exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = target and r.name in ('super-admin', 'admin')
  ) then
    raise exception 'Staff accounts are managed under Admin users, not the registration queue.'
      using errcode = 'insufficient_privilege';
  end if;

  if new_status in ('rejected', 'suspended') and nullif(btrim(reason), '') is null then
    raise exception 'A reason is required for this action.' using errcode = 'check_violation';
  end if;

  update public.profiles
     set status        = new_status,
         status_reason = case when new_status in ('rejected', 'suspended') then reason end,
         is_active     = (new_status = 'approved'),
         reviewed_at   = now(),
         reviewed_by   = auth.uid()
   where id = target
  returning * into result;

  if result.id is null then
    raise exception 'Registration not found.' using errcode = 'no_data_found';
  end if;

  insert into public.audit_log (log_name, description, subject_type, subject_id, causer_id, properties)
  values (
    'registrations',
    format('Account %s set to %s', result.name, new_status),
    'profiles', result.id::text, auth.uid(),
    jsonb_build_object('status', new_status, 'reason', reason)
  );

  return result;
end;
$$;

revoke all on function public.set_player_status(uuid, text, text) from public, anon;
grant execute on function public.set_player_status(uuid, text, text) to authenticated;

-- ------------------------------------------------ roles & permissions RLS
grant select, insert, update, delete on public.roles            to authenticated;
grant select, insert, delete          on public.role_permissions to authenticated;
grant select                          on public.permissions      to authenticated;
grant select, insert, delete          on public.user_roles       to authenticated;

alter table public.roles            enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles       enable row level security;

create policy roles_select on public.roles for select to authenticated
  using (public.has_permission('role-view'));
create policy roles_insert on public.roles for insert to authenticated
  with check (public.has_permission('role-create'));
create policy roles_update on public.roles for update to authenticated
  using (public.has_permission('role-update'))
  with check (public.has_permission('role-update'));
create policy roles_delete on public.roles for delete to authenticated
  using (public.has_permission('role-delete')
         and not exists (select 1 from public.user_roles ur where ur.role_id = roles.id));

create policy permissions_select on public.permissions for select to authenticated
  using (public.has_permission('role-view'));

create policy role_permissions_select on public.role_permissions for select to authenticated
  using (public.has_permission('role-view'));
create policy role_permissions_write on public.role_permissions for all to authenticated
  using (public.has_permission('role-update'))
  with check (public.has_permission('role-update'));

create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_permission('admin_user-view'));
create policy user_roles_insert on public.user_roles for insert to authenticated
  with check (public.has_permission('role-assign'));
create policy user_roles_delete on public.user_roles for delete to authenticated
  using (public.has_permission('role-assign'));

-- ----------------------------------------------------------- banners RLS
grant select on public.banner_groups, public.banners, public.cta_banners to anon, authenticated;
grant insert, update, delete on public.banner_groups, public.banners to authenticated;
grant insert, update on public.cta_banners to authenticated;

alter table public.banner_groups enable row level security;
alter table public.banners       enable row level security;
alter table public.cta_banners   enable row level security;

-- Visitors see active sets. Staff with banner-view also see hidden ones.
create policy banner_groups_select on public.banner_groups for select to anon, authenticated
  using (is_active or public.has_permission('banner-view'));
create policy banner_groups_insert on public.banner_groups for insert to authenticated
  with check (public.has_permission('banner-create'));
create policy banner_groups_update on public.banner_groups for update to authenticated
  using (public.has_permission('banner-update'))
  with check (public.has_permission('banner-update'));
create policy banner_groups_delete on public.banner_groups for delete to authenticated
  using (public.has_permission('banner-delete'));

create policy banners_select on public.banners for select to anon, authenticated
  using (
    exists (select 1 from public.banner_groups g
            where g.id = banners.banner_group_id and g.is_active)
    or public.has_permission('banner-view')
  );
create policy banners_insert on public.banners for insert to authenticated
  with check (public.has_permission('banner-create'));
create policy banners_update on public.banners for update to authenticated
  using (public.has_permission('banner-update'))
  with check (public.has_permission('banner-update'));
create policy banners_delete on public.banners for delete to authenticated
  using (public.has_permission('banner-delete'));

-- The CTA banner is public content on the landing page, so it's readable by
-- everyone, matching the public route fixed earlier.
create policy cta_banners_select on public.cta_banners for select to anon, authenticated
  using (true);
create policy cta_banners_write on public.cta_banners for all to authenticated
  using (public.has_permission('banner-update'))
  with check (public.has_permission('banner-update'));

-- ------------------------------------------------------------- chat RLS
grant select, insert, update on public.chats to authenticated;
grant select, insert, update on public.messages to authenticated;
grant select, insert, update on public.chat_attachments to authenticated;

-- Players may only mark messages read and soft-delete them. Message text is
-- immutable once sent.
revoke update on public.messages from authenticated;
grant update (is_read, read_at, deleted_at) on public.messages to authenticated;

alter table public.chats            enable row level security;
alter table public.messages         enable row level security;
alter table public.chat_attachments enable row level security;

create policy chats_select on public.chats for select to authenticated
  using (public.can_access_chat(id));

create policy chats_insert on public.chats for insert to authenticated
  with check (client_id = auth.uid() and public.is_approved());

create policy chats_update_staff on public.chats for update to authenticated
  using (public.has_permission('chat-view'))
  with check (public.has_permission('chat-view'));

create policy messages_select on public.messages for select to authenticated
  using (public.can_access_chat(chat_id));

-- Players write to their own approved chat. Staff with chat-view may reply in
-- any chat. Either way the sender must be the caller.
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.can_access_chat(chat_id)
  );

-- Participants may mark messages read. Soft delete is limited by the trigger below.
create policy messages_update on public.messages for update to authenticated
  using (public.can_access_chat(chat_id))
  with check (public.can_access_chat(chat_id));

create policy chat_attachments_select on public.chat_attachments for select to authenticated
  using (exists (select 1 from public.messages m
                 where m.id = chat_attachments.message_id
                   and public.can_access_chat(m.chat_id)));

create policy chat_attachments_insert on public.chat_attachments for insert to authenticated
  with check (exists (select 1 from public.messages m
                      where m.id = chat_attachments.message_id
                        and m.sender_id = auth.uid()));

-- Only the sender, or someone with message-delete, may soft-delete a message.
create or replace function public.guard_message_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.deleted_at is distinct from old.deleted_at then
    if not (old.sender_id = auth.uid() or public.has_permission('message-delete')) then
      raise exception 'You can only delete your own messages.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

create trigger messages_guard_delete
  before update on public.messages
  for each row execute function public.guard_message_delete();

-- ------------------------------------------------------------ audit RLS
grant select on public.audit_log to authenticated;
alter table public.audit_log enable row level security;

create policy audit_log_select on public.audit_log for select to authenticated
  using (public.has_permission('activity_log-view'));
-- No write policies: audit rows come from triggers and set_player_status().
