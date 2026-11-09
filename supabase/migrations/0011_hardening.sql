-- =============================================================================
-- 0011_hardening.sql
-- Tightens what the Supabase security and performance advisors flagged.
--
--  1. Internal functions are no longer callable through the public API.
--  2. RLS policies call auth.uid() once per query, not once per row.
--  3. Indexes on foreign keys that had none.
--  4. Overlapping "for all" policies split so each action has one policy.
--
-- Nothing here changes who can do what. It removes access nobody used.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Function permissions
-- ---------------------------------------------------------------------------

-- Trigger and event-trigger functions run on their own; nobody needs to call
-- them through /rest/v1/rpc.
revoke execute on function public.guard_message_delete()         from public, anon, authenticated;
revoke execute on function public.handle_new_user()              from public, anon, authenticated;
revoke execute on function public.messages_strip_staff_fields()  from public, anon, authenticated;
revoke execute on function public.touch_chat_last_message()      from public, anon, authenticated;
revoke execute on function public.rls_auto_enable()              from public, anon, authenticated;

-- Staff-only wheel helpers: signed-in users only (they check permission inside).
revoke execute on function public.list_wheel_spins(integer)      from public, anon;
revoke execute on function public.set_spin_credited(bigint, boolean) from public, anon;
grant  execute on function public.list_wheel_spins(integer)      to authenticated;
grant  execute on function public.set_spin_credited(bigint, boolean) to authenticated;

-- Deliberately NOT revoked for anon: has_permission(), is_staff(),
-- is_approved(), can_access_chat(). Row-level-security policies on tables and
-- storage that visitors can read call them, and Postgres needs the role that
-- runs the query to be allowed to execute them. They only answer about the
-- caller's own session, so a visitor learns nothing.

-- ---------------------------------------------------------------------------
-- 2. auth.uid() evaluated once per query
-- ---------------------------------------------------------------------------

drop policy if exists profiles_select_own_or_staff on public.profiles;
create policy profiles_select_own_or_staff on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.has_permission('admin_user-view'));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or public.has_permission('admin_user-view'));

drop policy if exists chats_insert on public.chats;
create policy chats_insert on public.chats
  for insert to authenticated
  with check (client_id = (select auth.uid()) and public.is_approved());

drop policy if exists chats_select on public.chats;
create policy chats_select on public.chats
  for select to authenticated
  using (
    deleted_at is null
    and ((client_id = (select auth.uid()) and public.is_approved())
         or public.has_permission('chat-view'))
  );

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.can_access_chat(chat_id));

drop policy if exists chat_attachments_insert on public.chat_attachments;
create policy chat_attachments_insert on public.chat_attachments
  for insert to authenticated
  with check (exists (
    select 1 from public.messages m
     where m.id = chat_attachments.message_id
       and m.sender_id = (select auth.uid())
  ));

drop policy if exists wheel_spins_select on public.wheel_spins;
create policy wheel_spins_select on public.wheel_spins
  for select to authenticated
  using (player_id = (select auth.uid()) or public.has_permission('wheel-manage'));

-- ---------------------------------------------------------------------------
-- 3. Indexes on foreign keys
-- ---------------------------------------------------------------------------

create index if not exists audit_log_causer_idx        on public.audit_log (causer_id);
create index if not exists banners_group_idx           on public.banners (banner_group_id);
create index if not exists chat_attachments_message_idx on public.chat_attachments (message_id);
create index if not exists messages_sender_idx         on public.messages (sender_id);
create index if not exists profiles_reviewed_by_idx    on public.profiles (reviewed_by);
create index if not exists quick_replies_created_by_idx on public.quick_replies (created_by);
create index if not exists role_permissions_perm_idx   on public.role_permissions (permission_id);
create index if not exists user_roles_role_idx         on public.user_roles (role_id);
create index if not exists wheel_spins_credited_by_idx on public.wheel_spins (credited_by);
create index if not exists wheel_spins_prize_idx       on public.wheel_spins (prize_id);

-- ---------------------------------------------------------------------------
-- 4. One policy per action
--    cta_banners can be inserted and updated; role_permissions inserted and
--    deleted (those are the only table grants). Same rules as before.
-- ---------------------------------------------------------------------------

drop policy if exists cta_banners_write on public.cta_banners;
create policy cta_banners_insert on public.cta_banners
  for insert to authenticated
  with check (public.has_permission('banner-update'));
create policy cta_banners_update on public.cta_banners
  for update to authenticated
  using (public.has_permission('banner-update'))
  with check (public.has_permission('banner-update'));

drop policy if exists role_permissions_write on public.role_permissions;
create policy role_permissions_insert on public.role_permissions
  for insert to authenticated
  with check (public.has_permission('role-update'));
create policy role_permissions_delete on public.role_permissions
  for delete to authenticated
  using (public.has_permission('role-update'));
