-- =============================================================================
-- 0016: Google sign-in + admin chat search and broadcast
-- =============================================================================

-- 1. New accounts. Email sign-ups must still give a date of birth (18+).
--    Google sign-ups don't send one, so the account is created without it and
--    the player is asked for it (and checked for 18+) right after signing in.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  dob date := nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date;
  ref_code text := upper(nullif(trim(new.raw_user_meta_data ->> 'referral_code'), ''));
  referrer uuid;
begin
  if provider = 'email' and (dob is null or dob > (current_date - interval '18 years')::date) then
    raise exception 'You must be at least 18 years old to register.'
      using errcode = 'check_violation';
  end if;
  if dob is not null and dob > (current_date - interval '18 years')::date then
    dob := null; -- never store an under-18 date; they will be asked again
  end if;

  if ref_code is not null then
    select id into referrer from public.profiles where referral_code = ref_code;
  end if;

  insert into public.profiles (
    id, name, email, phone, date_of_birth, country, address, avatar_url, status, is_active, referred_by
  ) values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    dob,
    new.raw_user_meta_data ->> 'country',
    new.raw_user_meta_data ->> 'address',
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    'pending',
    false,
    referrer
  );
  return new;
end;
$$;

-- 2. Finish a Google sign-up: date of birth (18+), phone, country.
create or replace function public.complete_profile(p_dob date, p_phone text, p_country text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;
  if p_dob is null or p_dob > (current_date - interval '18 years')::date then
    raise exception 'You must be at least 18 years old to play.' using errcode = 'check_violation';
  end if;
  update public.profiles
     set date_of_birth = coalesce(date_of_birth, p_dob),
         phone   = coalesce(nullif(trim(p_phone), ''), phone),
         country = coalesce(nullif(trim(p_country), ''), country)
   where id = auth.uid();
end;
$$;
revoke execute on function public.complete_profile(date, text, text) from public, anon;
grant execute on function public.complete_profile(date, text, text) to authenticated;

-- 3. Referral code for Google sign-ups (it can't travel with the Google login).
--    Only within a day of creating the account, only once, never yourself.
create or replace function public.claim_referral(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  referrer uuid;
begin
  if auth.uid() is null then return false; end if;
  select id into referrer from public.profiles where referral_code = upper(trim(p_code));
  if referrer is null or referrer = auth.uid() then return false; end if;
  update public.profiles
     set referred_by = referrer
   where id = auth.uid()
     and referred_by is null
     and created_at > now() - interval '1 day';
  return found;
end;
$$;
revoke execute on function public.claim_referral(text) from public, anon;
grant execute on function public.claim_referral(text) to authenticated;

-- 4. Broadcast messages get their own look.
alter table public.messages drop constraint if exists messages_style_check;
alter table public.messages add constraint messages_style_check
  check (style is null or style in ('info', 'promo', 'success', 'warning', 'broadcast'));

-- 5. Admin chat: list approved players (for search / new chat / broadcast).
create or replace function public.chat_player_directory()
returns table(id uuid, name text, email text, avatar_url text, chat_id bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('chat-view') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
    select p.id, p.name, p.email, p.avatar_url,
           (select c.id from public.chats c where c.client_id = p.id and c.deleted_at is null order by c.id limit 1)
      from public.profiles p
     where p.status = 'approved'
       and not exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
                        where ur.user_id = p.id and lower(r.name) in ('super-admin', 'admin'))
     order by lower(p.name);
end;
$$;
revoke execute on function public.chat_player_directory() from public, anon;
grant execute on function public.chat_player_directory() to authenticated;

-- Open (or create) the conversation with a player.
create or replace function public.staff_open_chat(p_player uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  cid bigint;
begin
  if not public.has_permission('chat-view') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select c.id into cid from public.chats c where c.client_id = p_player and c.deleted_at is null order by c.id limit 1;
  if cid is null then
    if not exists (select 1 from public.profiles where id = p_player and status = 'approved') then
      raise exception 'Only approved players can be messaged.' using errcode = 'check_violation';
    end if;
    insert into public.chats (client_id) values (p_player) returning id into cid;
  end if;
  return cid;
end;
$$;
revoke execute on function public.staff_open_chat(uuid) from public, anon;
grant execute on function public.staff_open_chat(uuid) to authenticated;

-- Send one announcement to many players (all approved players when p_players is null).
create or replace function public.broadcast_message(p_players uuid[], p_text text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid;
  cid bigint;
  n integer := 0;
begin
  if not public.has_permission('chat-view') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if nullif(trim(p_text), '') is null then
    raise exception 'Write a message first.' using errcode = 'check_violation';
  end if;
  for pid in
    select p.id from public.profiles p
     where p.status = 'approved'
       and (p_players is null or p.id = any(p_players))
       and not exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
                        where ur.user_id = p.id and lower(r.name) in ('super-admin', 'admin'))
  loop
    cid := public.staff_open_chat(pid);
    insert into public.messages (chat_id, sender_id, message, style, title)
    values (cid, auth.uid(), trim(p_text), 'broadcast', 'Announcement');
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function public.broadcast_message(uuid[], text) from public, anon;
grant execute on function public.broadcast_message(uuid[], text) to authenticated;
