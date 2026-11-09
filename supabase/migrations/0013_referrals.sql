-- =============================================================================
-- 0013_referrals.sql
-- Referral levels. Every player gets a personal code. When a friend who signed
-- up with that code is APPROVED by staff, it counts toward the referrer's
-- levels. Reaching a level queues a one-time reward that staff credit by hand.
--
--  * profiles.referral_code / referred_by      (not readable or writable by
--                                               players directly: see RPCs)
--  * referral_levels                           (public to read, staff edit)
--  * referral_rewards                          (queued rewards, staff credit)
--  * my_referral(), referral_code_valid(), list_referral_rewards(),
--    set_referral_credited(), refresh_referral_rewards()
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Codes on profiles
-- ---------------------------------------------------------------------------
create or replace function public.gen_referral_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- no 0/O/1/I/L
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end;
$$;
revoke execute on function public.gen_referral_code() from public, anon, authenticated;

alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null;

update public.profiles set referral_code = public.gen_referral_code() where referral_code is null;

alter table public.profiles
  alter column referral_code set default public.gen_referral_code(),
  alter column referral_code set not null;

-- profiles uses column-level grants, so `select *` needs these listed. Row-level
-- security still limits who sees which row (own profile, or staff).
grant select (referral_code, referred_by) on public.profiles to authenticated;

create unique index if not exists profiles_referral_code_key on public.profiles (referral_code);
create index if not exists profiles_referred_by_idx on public.profiles (referred_by);

-- ---------------------------------------------------------------------------
-- 2. Signup remembers who referred the new player
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dob date := nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date;
  ref_code text := upper(nullif(trim(new.raw_user_meta_data ->> 'referral_code'), ''));
  referrer uuid;
begin
  if dob is null or dob > (current_date - interval '18 years')::date then
    raise exception 'You must be at least 18 years old to register.'
      using errcode = 'check_violation';
  end if;

  -- An unknown or empty code is ignored, never an error: signup must not fail over it.
  if ref_code is not null then
    select id into referrer from public.profiles where referral_code = ref_code;
  end if;

  insert into public.profiles (
    id, name, email, phone, date_of_birth, country, address, status, is_active, referred_by
  ) values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    dob,
    new.raw_user_meta_data ->> 'country',
    new.raw_user_meta_data ->> 'address',
    'pending',
    false,
    referrer
  );

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Levels (public to read, staff with referral-manage edit)
-- ---------------------------------------------------------------------------
create table if not exists public.referral_levels (
  id               bigint generated always as identity primary key,
  level            integer not null unique check (level > 0),
  name             text not null,
  friends_required integer not null check (friends_required > 0),
  reward_amount    numeric(10,2) not null default 0 check (reward_amount >= 0),
  deposit_bonus_pct integer not null default 0 check (deposit_bonus_pct between 0 and 100),
  perk             text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

alter table public.referral_levels enable row level security;
grant select on public.referral_levels to anon, authenticated;
grant insert, update, delete on public.referral_levels to authenticated;

create policy referral_levels_select on public.referral_levels
  for select to anon, authenticated using (true);
create policy referral_levels_insert on public.referral_levels
  for insert to authenticated with check (public.has_permission('referral-manage'));
create policy referral_levels_update on public.referral_levels
  for update to authenticated
  using (public.has_permission('referral-manage'))
  with check (public.has_permission('referral-manage'));
create policy referral_levels_delete on public.referral_levels
  for delete to authenticated using (public.has_permission('referral-manage'));

-- ---------------------------------------------------------------------------
-- 4. Queued rewards (players read their own, staff read all; only functions write)
-- ---------------------------------------------------------------------------
create table if not exists public.referral_rewards (
  id                bigint generated always as identity primary key,
  referrer_id       uuid not null references public.profiles(id) on delete cascade,
  level_id          bigint references public.referral_levels(id) on delete set null,
  level_name        text not null,
  friends_count     integer not null,
  reward_amount     numeric(10,2) not null,
  deposit_bonus_pct integer not null default 0,
  status            text not null default 'pending' check (status in ('pending', 'credited')),
  created_at        timestamptz not null default now(),
  credited_at       timestamptz,
  credited_by       uuid references public.profiles(id) on delete set null,
  unique (referrer_id, level_id)
);
create index if not exists referral_rewards_referrer_idx on public.referral_rewards (referrer_id);
create index if not exists referral_rewards_credited_by_idx on public.referral_rewards (credited_by);
create index if not exists referral_rewards_status_idx on public.referral_rewards (status);

alter table public.referral_rewards enable row level security;
grant select on public.referral_rewards to authenticated;
create policy referral_rewards_select on public.referral_rewards
  for select to authenticated
  using (referrer_id = (select auth.uid()) or public.has_permission('referral-manage'));

-- ---------------------------------------------------------------------------
-- 5. Permission
-- ---------------------------------------------------------------------------
insert into public.permissions (name) values ('referral-manage') on conflict (name) do nothing;
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.name = 'super-admin' and p.name = 'referral-manage'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 6. Award levels
-- ---------------------------------------------------------------------------
create or replace function public.award_referral_levels(p_referrer uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if not exists (select 1 from public.profiles where id = p_referrer and status = 'approved') then
    return;
  end if;

  select count(*) into n from public.profiles
   where referred_by = p_referrer and status = 'approved' and id <> p_referrer;

  insert into public.referral_rewards (referrer_id, level_id, level_name, friends_count, reward_amount, deposit_bonus_pct)
  select p_referrer, l.id, l.name, n, l.reward_amount, l.deposit_bonus_pct
    from public.referral_levels l
   where l.is_active and l.friends_required <= n
  on conflict (referrer_id, level_id) do nothing;
end;
$$;
revoke execute on function public.award_referral_levels(uuid) from public, anon, authenticated;

create or replace function public.profiles_referral_on_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' and new.referred_by is not null then
    perform public.award_referral_levels(new.referred_by);
  end if;
  return new;
end;
$$;
revoke execute on function public.profiles_referral_on_approval() from public, anon, authenticated;

drop trigger if exists profiles_referral_on_approval on public.profiles;
create trigger profiles_referral_on_approval
  after update of status on public.profiles
  for each row execute function public.profiles_referral_on_approval();

-- ---------------------------------------------------------------------------
-- 7. Functions the website calls
-- ---------------------------------------------------------------------------

-- Register page: is this code real? (true/false only, reveals nothing else)
create or replace function public.referral_code_valid(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where referral_code = upper(trim(p_code)));
$$;
grant execute on function public.referral_code_valid(text) to anon, authenticated;
revoke execute on function public.referral_code_valid(text) from public;

-- The signed-in player's own referral picture. Counts only, never other people's details.
create or replace function public.my_referral()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  code text;
  approved_n integer;
  waiting_n integer;
  result jsonb;
begin
  if me is null then
    return null;
  end if;
  select referral_code into code from public.profiles where id = me;
  if code is null then
    return null;
  end if;

  select count(*) filter (where status = 'approved'),
         count(*) filter (where status <> 'approved' and status <> 'rejected')
    into approved_n, waiting_n
    from public.profiles where referred_by = me and id <> me;

  select jsonb_build_object(
    'code', code,
    'approved', approved_n,
    'waiting', waiting_n,
    'levels', coalesce((
      select jsonb_agg(jsonb_build_object(
        'level', l.level, 'name', l.name, 'friends_required', l.friends_required,
        'reward_amount', l.reward_amount, 'deposit_bonus_pct', l.deposit_bonus_pct,
        'perk', l.perk,
        'reached', approved_n >= l.friends_required,
        'reward_status', (select r.status from public.referral_rewards r where r.referrer_id = me and r.level_id = l.id)
      ) order by l.level)
      from public.referral_levels l where l.is_active
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;
revoke execute on function public.my_referral() from public, anon;
grant execute on function public.my_referral() to authenticated;

-- Staff: rewards waiting to be paid, and history.
create or replace function public.list_referral_rewards(p_limit integer default 200)
returns table(
  id bigint, created_at timestamptz, level_name text, friends_count integer,
  reward_amount numeric, deposit_bonus_pct integer, status text,
  referrer_name text, referrer_email text, referrer_phone text, credited_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('referral-manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
    select r.id, r.created_at, r.level_name, r.friends_count, r.reward_amount, r.deposit_bonus_pct,
           r.status, p.name, p.email, p.phone, r.credited_at
      from public.referral_rewards r
      join public.profiles p on p.id = r.referrer_id
     order by (r.status = 'pending') desc, r.created_at desc
     limit least(greatest(p_limit, 1), 500);
end;
$$;
revoke execute on function public.list_referral_rewards(integer) from public, anon;
grant execute on function public.list_referral_rewards(integer) to authenticated;

create or replace function public.set_referral_credited(p_reward bigint, p_credited boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('referral-manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update public.referral_rewards
     set status      = case when p_credited then 'credited' else 'pending' end,
         credited_at = case when p_credited then now() else null end,
         credited_by = case when p_credited then auth.uid() else null end
   where id = p_reward;
end;
$$;
revoke execute on function public.set_referral_credited(bigint, boolean) from public, anon;
grant execute on function public.set_referral_credited(bigint, boolean) to authenticated;

-- Staff: after editing levels, queue anything players have already earned.
create or replace function public.refresh_referral_rewards()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_n integer;
  after_n integer;
  r record;
begin
  if not public.has_permission('referral-manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select count(*) into before_n from public.referral_rewards;
  for r in select distinct referred_by from public.profiles where referred_by is not null loop
    perform public.award_referral_levels(r.referred_by);
  end loop;
  select count(*) into after_n from public.referral_rewards;
  return after_n - before_n;
end;
$$;
revoke execute on function public.refresh_referral_rewards() from public, anon;
grant execute on function public.refresh_referral_rewards() to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Starting levels (all editable in Admin > Referrals)
-- ---------------------------------------------------------------------------
insert into public.referral_levels (level, name, friends_required, reward_amount, deposit_bonus_pct, perk) values
  (1, 'Rookie',      1,  5, 0,  'Rookie badge'),
  (2, 'Player',      3, 10, 0,  'Player badge'),
  (3, 'Pro',         5, 15, 0,  'Pro badge'),
  (4, 'High Roller', 10, 20, 0, 'High Roller badge'),
  (5, 'VIP',         20, 30, 0, 'VIP badge'),
  (6, 'Legend',      50, 50, 20, 'Legend badge and a 20% deposit bonus')
on conflict (level) do nothing;
