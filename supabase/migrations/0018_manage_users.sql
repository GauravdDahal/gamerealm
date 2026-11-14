-- =============================================================================
-- 0018: Manage Users
--   * permissions player-view / player-update / player-suspend + Moderator role
--   * sign-ups are approved automatically (Google sign-ups once they add DOB)
--   * staff RPCs: player overview list, player detail, status, profile edit
--   * game account passwords encrypted at rest (key in Supabase Vault)
--   * my_access() also returns the caller's permissions (to hide admin menus)
-- profiles.status is the source of truth; is_active is kept in step with it.
-- =============================================================================

-- ------------------------------------------------------------ permissions
insert into public.permissions (name) values ('player-view'), ('player-update'), ('player-suspend')
on conflict (name) do nothing;
insert into public.roles (name) values ('Moderator') on conflict (name) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
 where (r.name in ('super-admin', 'Admin') and p.name in ('player-view', 'player-update', 'player-suspend'))
    or (r.name = 'Moderator' and p.name in ('player-view', 'player-suspend', 'chat-view', 'message-view', 'money-manage'))
on conflict do nothing;

-- Moderators are staff too.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
     where ur.user_id = auth.uid() and lower(r.name) in ('super-admin', 'admin', 'moderator')
  );
$$;

create or replace function public.is_staff_user(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
     where ur.user_id = p_user and lower(r.name) in ('super-admin', 'admin', 'moderator')
  );
$$;
revoke execute on function public.is_staff_user(uuid) from public, anon, authenticated;

create or replace function public.my_access()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'profile', to_jsonb(p.*),
    'is_staff', public.is_staff(),
    'is_approved', public.is_approved(),
    'roles', coalesce((select jsonb_agg(r.name) from public.user_roles ur join public.roles r on r.id = ur.role_id
                        where ur.user_id = auth.uid()), '[]'::jsonb),
    'permissions', coalesce((select jsonb_agg(distinct pe.name) from public.user_roles ur
                              join public.role_permissions rp on rp.role_id = ur.role_id
                              join public.permissions pe on pe.id = rp.permission_id
                             where ur.user_id = auth.uid()), '[]'::jsonb)
  )
  from public.profiles p
  where p.id = auth.uid();
$$;

drop policy if exists profiles_select_own_or_staff on public.profiles;
create policy profiles_select_own_or_staff on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.has_permission('admin_user-view') or public.has_permission('player-view'));

create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists profiles_created_idx on public.profiles (created_at desc);

-- -------------------------------------------------------- auto-approval
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
    dob := null;
  end if;
  if ref_code is not null then
    select id into referrer from public.profiles where referral_code = ref_code;
  end if;

  -- Approved straight away once we know they are 18+; Google sign-ups wait
  -- (status pending) until they add their date of birth.
  insert into public.profiles (
    id, name, email, phone, date_of_birth, country, address, avatar_url, status, is_active, referred_by
  ) values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), nullif(new.raw_user_meta_data ->> 'full_name', ''),
             split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    dob,
    new.raw_user_meta_data ->> 'country',
    new.raw_user_meta_data ->> 'address',
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    case when dob is not null then 'approved' else 'pending' end,
    dob is not null,
    referrer
  );
  return new;
end;
$$;

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
         country = coalesce(nullif(trim(p_country), ''), country),
         status    = case when status = 'pending' then 'approved' else status end,
         is_active = case when status = 'pending' then true else is_active end
   where id = auth.uid();
end;
$$;

-- Referral rewards also count players who are approved on sign-up.
create or replace function public.profiles_referral_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and new.referred_by is not null then
    perform public.award_referral_levels(new.referred_by);
  end if;
  return new;
end;
$$;
revoke execute on function public.profiles_referral_on_insert() from public, anon, authenticated;
drop trigger if exists profiles_referral_on_insert on public.profiles;
create trigger profiles_referral_on_insert after insert on public.profiles
  for each row execute function public.profiles_referral_on_insert();

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
   where id = auth.uid() and referred_by is null and created_at > now() - interval '1 day';
  if not found then return false; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and status = 'approved') then
    perform public.award_referral_levels(referrer);
  end if;
  return true;
end;
$$;

-- ---------------------------------------------------- staff player tools
create or replace function public.list_player_overview()
returns table(
  id uuid, name text, email text, phone text, avatar_url text, status text, status_reason text,
  online_status boolean, last_seen_at timestamptz, created_at timestamptz,
  referral_code text, referrer_name text, wallet_balance numeric, locked_bonus numeric,
  total_deposits numeric, referral_count bigint, game_account_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('player-view') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
    select p.id, p.name, p.email, p.phone, p.avatar_url, p.status, p.status_reason,
           p.online_status, p.last_seen_at, p.created_at, p.referral_code, rp.name,
           w.balance, w.locked,
           coalesce((select sum(t.amount) from public.wallet_transactions t
                      where t.player_id = p.id and t.kind in ('deposit', 'wallet_add')), 0)::numeric,
           (select count(*) from public.profiles f where f.referred_by = p.id),
           (select count(*) from public.player_game_accounts a where a.player_id = p.id)
      from public.profiles p
      left join public.profiles rp on rp.id = p.referred_by
      cross join lateral public.wallet_totals(p.id) w
     where not public.is_staff_user(p.id)
     order by p.created_at desc;
end;
$$;
revoke execute on function public.list_player_overview() from public, anon;
grant execute on function public.list_player_overview() to authenticated;

create or replace function public.player_detail(p_player uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  w record;
begin
  if not public.has_permission('player-view') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into w from public.wallet_totals(p_player);
  return jsonb_build_object(
    'profile', (select to_jsonb(p) - 'referred_by' || jsonb_build_object(
                  'referrer_name', (select r.name from public.profiles r where r.id = p.referred_by),
                  'reviewed_by_name', (select r.name from public.profiles r where r.id = p.reviewed_by))
                  from public.profiles p where p.id = p_player),
    'wallet', jsonb_build_object('balance', w.balance, 'locked', w.locked),
    'transactions', coalesce((select jsonb_agg(x order by x.created_at desc) from (
        select t.id, t.kind, t.amount, t.bonus_amount, t.parts, t.note, t.created_at,
               a.game_title, s.name as staff_name
          from public.wallet_transactions t
          left join public.player_game_accounts a on a.id = t.game_account_id
          left join public.profiles s on s.id = t.created_by
         where t.player_id = p_player order by t.created_at desc limit 20) x), '[]'::jsonb),
    'spins', coalesce((select jsonb_agg(x order by x.created_at desc) from (
        select s.id, s.prize_label, s.status, s.created_at from public.wheel_spins s
         where s.player_id = p_player order by s.created_at desc limit 20) x), '[]'::jsonb),
    'friends', coalesce((select jsonb_agg(x order by x.created_at desc) from (
        select f.id, f.name, f.status, f.created_at from public.profiles f
         where f.referred_by = p_player order by f.created_at desc limit 50) x), '[]'::jsonb),
    'rewards', coalesce((select jsonb_agg(x order by x.created_at desc) from (
        select r.id, r.level_name, r.reward_amount, r.deposit_bonus_pct, r.status, r.created_at
          from public.referral_rewards r where r.referrer_id = p_player) x), '[]'::jsonb),
    'activity', coalesce((select jsonb_agg(x order by x.created_at desc) from (
        select l.id, l.description, l.properties, l.created_at, c.name as causer_name
          from public.audit_log l left join public.profiles c on c.id = l.causer_id
         where l.subject_type = 'profiles' and l.subject_id = p_player::text
         order by l.created_at desc limit 30) x), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.player_detail(uuid) from public, anon;
grant execute on function public.player_detail(uuid) to authenticated;

-- Suspend (reason required) or reactivate. Suspended players can't chat, spin or use the site.
create or replace function public.staff_set_player_status(p_player uuid, p_status text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pname text;
begin
  if not public.has_permission('player-suspend') then
    raise exception 'You do not have permission to change account status.' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'suspended') then
    raise exception 'Unknown status.' using errcode = 'invalid_parameter_value';
  end if;
  if public.is_staff_user(p_player) then
    raise exception 'Staff accounts are managed under Admin users.' using errcode = '42501';
  end if;
  if p_status = 'suspended' and nullif(btrim(p_reason), '') is null then
    raise exception 'A reason is required to suspend a player.' using errcode = 'check_violation';
  end if;
  update public.profiles
     set status = p_status,
         status_reason = case when p_status = 'suspended' then btrim(p_reason) end,
         is_active = (p_status = 'approved'),
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = p_player
  returning name into pname;
  if pname is null then
    raise exception 'Player not found.' using errcode = 'no_data_found';
  end if;
  insert into public.audit_log (log_name, description, subject_type, subject_id, causer_id, properties)
  values ('players',
          format('%s %s', pname, case when p_status = 'suspended' then 'suspended' else 'reactivated' end),
          'profiles', p_player::text, auth.uid(),
          jsonb_build_object('status', p_status, 'reason', nullif(btrim(p_reason), '')));
end;
$$;
revoke execute on function public.staff_set_player_status(uuid, text, text) from public, anon;
grant execute on function public.staff_set_player_status(uuid, text, text) to authenticated;

create or replace function public.staff_update_player(p_player uuid, p_name text, p_phone text, p_country text, p_address text, p_dob date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  before jsonb;
  after jsonb;
begin
  if not public.has_permission('player-update') then
    raise exception 'You do not have permission to edit players.' using errcode = '42501';
  end if;
  if public.is_staff_user(p_player) then
    raise exception 'Staff accounts are managed under Admin users.' using errcode = '42501';
  end if;
  if nullif(btrim(p_name), '') is null then
    raise exception 'Name is required.' using errcode = 'check_violation';
  end if;
  if p_dob is not null and p_dob > (current_date - interval '18 years')::date then
    raise exception 'Players must be at least 18.' using errcode = 'check_violation';
  end if;
  select jsonb_build_object('name', name, 'phone', phone, 'country', country, 'address', address, 'date_of_birth', date_of_birth)
    into before from public.profiles where id = p_player;
  if before is null then
    raise exception 'Player not found.' using errcode = 'no_data_found';
  end if;
  update public.profiles
     set name = btrim(p_name),
         phone = nullif(btrim(p_phone), ''),
         country = nullif(btrim(p_country), ''),
         address = nullif(btrim(p_address), ''),
         date_of_birth = coalesce(p_dob, date_of_birth)
   where id = p_player;
  select jsonb_build_object('name', name, 'phone', phone, 'country', country, 'address', address, 'date_of_birth', date_of_birth)
    into after from public.profiles where id = p_player;
  insert into public.audit_log (log_name, description, subject_type, subject_id, causer_id, properties)
  values ('players', format('Profile of %s edited', btrim(p_name)), 'profiles', p_player::text, auth.uid(),
          jsonb_build_object('before', before, 'after', after));
end;
$$;
revoke execute on function public.staff_update_player(uuid, text, text, text, text, date) from public, anon;
grant execute on function public.staff_update_player(uuid, text, text, text, text, date) to authenticated;

-- Record that staff sent a password reset email (the email itself is sent by Supabase Auth).
create or replace function public.log_player_action(p_player uuid, p_description text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('player-view') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  insert into public.audit_log (log_name, description, subject_type, subject_id, causer_id, properties)
  values ('players', left(p_description, 200), 'profiles', p_player::text, auth.uid(), '{}'::jsonb);
end;
$$;
revoke execute on function public.log_player_action(uuid, text) from public, anon;
grant execute on function public.log_player_action(uuid, text) to authenticated;

-- ------------------------------------------ encrypted game account passwords
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'game_account_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'game_account_key',
                                'Encrypts player game account passwords');
  end if;
end $$;

alter table public.player_game_accounts add column if not exists password_enc bytea;
update public.player_game_accounts
   set password_enc = extensions.pgp_sym_encrypt(password,
         (select decrypted_secret from vault.decrypted_secrets where name = 'game_account_key'))
 where password is not null and password_enc is null;
alter table public.player_game_accounts drop column if exists password;
alter table public.player_game_accounts alter column password_enc set not null;

-- Writes only through save_game_account(); reads of the password only through list_game_accounts().
revoke insert, update on public.player_game_accounts from authenticated;

create or replace function public.list_game_accounts(p_player uuid)
returns table(id bigint, game_title text, username text, password text, verified boolean,
              balance numeric, balance_checked_at timestamptz, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare k text;
begin
  if p_player is distinct from auth.uid() and not public.has_permission('money-manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select decrypted_secret into k from vault.decrypted_secrets where name = 'game_account_key';
  return query
    select a.id, a.game_title, a.username, extensions.pgp_sym_decrypt(a.password_enc, k), a.verified,
           a.balance, a.balance_checked_at, a.created_at
      from public.player_game_accounts a where a.player_id = p_player order by a.created_at;
end;
$$;
revoke execute on function public.list_game_accounts(uuid) from public, anon;
grant execute on function public.list_game_accounts(uuid) to authenticated;

-- p_id null = link a new account. A blank password keeps the saved one.
create or replace function public.save_game_account(p_id bigint, p_player uuid, p_title text, p_username text, p_password text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  k text;
  rid bigint;
begin
  if not public.has_permission('money-manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if nullif(btrim(p_title), '') is null or nullif(btrim(p_username), '') is null then
    raise exception 'Game and username are required.' using errcode = 'check_violation';
  end if;
  select decrypted_secret into k from vault.decrypted_secrets where name = 'game_account_key';
  if p_id is null then
    if nullif(p_password, '') is null then
      raise exception 'Password is required.' using errcode = 'check_violation';
    end if;
    insert into public.player_game_accounts (player_id, game_title, username, password_enc, created_by)
    values (p_player, btrim(p_title), btrim(p_username), extensions.pgp_sym_encrypt(p_password, k), auth.uid())
    returning id into rid;
  else
    update public.player_game_accounts
       set game_title = btrim(p_title),
           username = btrim(p_username),
           password_enc = case when nullif(p_password, '') is null then password_enc
                               else extensions.pgp_sym_encrypt(p_password, k) end
     where id = p_id and player_id = p_player
    returning id into rid;
    if rid is null then
      raise exception 'Account not found.' using errcode = 'no_data_found';
    end if;
  end if;
  return rid;
end;
$$;
revoke execute on function public.save_game_account(bigint, uuid, text, text, text) from public, anon;
grant execute on function public.save_game_account(bigint, uuid, text, text, text) to authenticated;
