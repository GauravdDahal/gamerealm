-- =============================================================================
-- 0017: site wallet + deposits/withdrawals, player game accounts, game provider
-- settings (API calls come later), wheel settings, referral info in chat list.
-- =============================================================================

insert into public.permissions (name) values ('money-manage'), ('provider-manage') on conflict (name) do nothing;
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
 where (r.name = 'super-admin' and p.name in ('money-manage', 'provider-manage'))
    or (r.name = 'Admin' and p.name = 'money-manage')
on conflict do nothing;

-- ---------------------------------------------------------- game accounts
create table public.player_game_accounts (
  id                 bigint generated always as identity primary key,
  player_id          uuid not null references public.profiles(id) on delete cascade,
  game_title         text not null check (char_length(game_title) between 1 and 60),
  username           text not null check (char_length(username) between 1 and 80),
  password           text not null check (char_length(password) between 1 and 120),
  verified           boolean not null default true,
  balance            numeric(12,2),
  balance_checked_at timestamptz,
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now()
);
create index player_game_accounts_player_idx on public.player_game_accounts (player_id);
create index player_game_accounts_created_by_idx on public.player_game_accounts (created_by);
alter table public.player_game_accounts enable row level security;
grant select, insert, update, delete on public.player_game_accounts to authenticated;
create policy pga_select on public.player_game_accounts for select to authenticated
  using (player_id = (select auth.uid()) or public.has_permission('money-manage'));
create policy pga_insert on public.player_game_accounts for insert to authenticated
  with check (public.has_permission('money-manage'));
create policy pga_update on public.player_game_accounts for update to authenticated
  using (public.has_permission('money-manage')) with check (public.has_permission('money-manage'));
create policy pga_delete on public.player_game_accounts for delete to authenticated
  using (public.has_permission('money-manage'));

-- ------------------------------------------------------------- money log
create table public.wallet_transactions (
  id              bigint generated always as identity primary key,
  player_id       uuid not null references public.profiles(id) on delete cascade,
  kind            text not null check (kind in ('deposit', 'wallet_add', 'wallet_out', 'bonus_unlock', 'withdraw')),
  amount          numeric(12,2) not null check (amount > 0),
  bonus_pct       numeric(5,2) not null default 0 check (bonus_pct between 0 and 500),
  bonus_amount    numeric(12,2) not null default 0 check (bonus_amount >= 0),
  game_account_id bigint references public.player_game_accounts(id) on delete set null,
  parts           jsonb,
  note            text check (note is null or char_length(note) <= 200),
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index wallet_tx_player_idx on public.wallet_transactions (player_id, created_at desc);
create index wallet_tx_account_idx on public.wallet_transactions (game_account_id);
create index wallet_tx_created_by_idx on public.wallet_transactions (created_by);
alter table public.wallet_transactions enable row level security;
grant select on public.wallet_transactions to authenticated;
create policy wallet_tx_select on public.wallet_transactions for select to authenticated
  using (player_id = (select auth.uid()) or public.has_permission('money-manage'));

-- Balance = money in the site wallet that can be paid out or played.
-- Locked  = bonus money that stays locked until staff unlock it (played through).
create or replace function public.wallet_totals(p_player uuid)
returns table(balance numeric, locked numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(sum(case kind
      when 'wallet_add'   then amount
      when 'wallet_out'   then -amount
      when 'bonus_unlock' then amount
      when 'withdraw'     then coalesce((select sum((x->>'amount')::numeric) from jsonb_array_elements(parts) x where x->>'type' = 'wallet'), 0)
      else 0 end), 0)::numeric(12,2),
    coalesce(sum(case kind
      when 'wallet_add'   then bonus_amount
      when 'bonus_unlock' then -amount
      else 0 end), 0)::numeric(12,2)
  from public.wallet_transactions
  where player_id = p_player;
$$;
revoke execute on function public.wallet_totals(uuid) from public, anon, authenticated;

create or replace function public.player_wallet(p_player uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare t record;
begin
  if p_player is distinct from auth.uid() and not public.has_permission('money-manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into t from public.wallet_totals(p_player);
  return jsonb_build_object('balance', t.balance, 'locked', t.locked);
end;
$$;
revoke execute on function public.player_wallet(uuid) from public, anon;
grant execute on function public.player_wallet(uuid) to authenticated;

-- Deposit: money the player paid, loaded into a game (optional) with a bonus on top.
create or replace function public.record_deposit(p_player uuid, p_amount numeric, p_bonus_pct numeric, p_account bigint, p_note text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare tid bigint;
begin
  if not public.has_permission('money-manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount above 0.' using errcode = 'check_violation';
  end if;
  if p_account is not null and not exists (select 1 from public.player_game_accounts where id = p_account and player_id = p_player) then
    raise exception 'That game account does not belong to this player.' using errcode = 'check_violation';
  end if;
  insert into public.wallet_transactions (player_id, kind, amount, bonus_pct, bonus_amount, game_account_id, note, created_by)
  values (p_player, 'deposit', round(p_amount, 2), coalesce(p_bonus_pct, 0),
          round(p_amount * coalesce(p_bonus_pct, 0) / 100, 2), p_account, nullif(trim(p_note), ''), auth.uid())
  returning id into tid;
  return tid;
end;
$$;
revoke execute on function public.record_deposit(uuid, numeric, numeric, bigint, text) from public, anon;
grant execute on function public.record_deposit(uuid, numeric, numeric, bigint, text) to authenticated;

-- Site wallet: add money (bonus goes in locked), take money out, or unlock bonus.
create or replace function public.wallet_move(p_player uuid, p_dir text, p_amount numeric, p_bonus_pct numeric, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare t record;
begin
  if not public.has_permission('money-manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount above 0.' using errcode = 'check_violation';
  end if;
  perform pg_advisory_xact_lock(hashtext('wallet:' || p_player::text));
  select * into t from public.wallet_totals(p_player);
  if p_dir = 'out' and round(p_amount, 2) > t.balance then
    raise exception 'Only $% can be taken out (locked bonus excluded).', t.balance using errcode = 'check_violation';
  end if;
  if p_dir = 'unlock' and round(p_amount, 2) > t.locked then
    raise exception 'Only $% of bonus is locked.', t.locked using errcode = 'check_violation';
  end if;
  insert into public.wallet_transactions (player_id, kind, amount, bonus_pct, bonus_amount, note, created_by)
  values (
    p_player,
    case p_dir when 'add' then 'wallet_add' when 'out' then 'wallet_out' when 'unlock' then 'bonus_unlock' end,
    round(p_amount, 2),
    case when p_dir = 'add' then coalesce(p_bonus_pct, 0) else 0 end,
    case when p_dir = 'add' then round(p_amount * coalesce(p_bonus_pct, 0) / 100, 2) else 0 end,
    nullif(trim(p_note), ''),
    auth.uid()
  );
  return public.player_wallet(p_player);
end;
$$;
revoke execute on function public.wallet_move(uuid, text, numeric, numeric, text) from public, anon;
grant execute on function public.wallet_move(uuid, text, numeric, numeric, text) to authenticated;

-- Withdraw / cash out, optionally split: parts = [{type:'payout',method,amount} |
-- {type:'game',account_id,amount} | {type:'wallet',amount}], summing to the total.
create or replace function public.record_withdraw(p_player uuid, p_total numeric, p_parts jsonb, p_account bigint, p_note text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  s numeric;
  tid bigint;
begin
  if not public.has_permission('money-manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_total is null or p_total <= 0 then
    raise exception 'Enter an amount above 0.' using errcode = 'check_violation';
  end if;
  if jsonb_typeof(p_parts) <> 'array' or jsonb_array_length(p_parts) = 0 then
    raise exception 'Add where the money goes.' using errcode = 'check_violation';
  end if;
  select sum((x->>'amount')::numeric) into s from jsonb_array_elements(p_parts) x;
  if round(s, 2) <> round(p_total, 2) then
    raise exception 'The parts add up to $%, not $%.', round(s, 2), round(p_total, 2) using errcode = 'check_violation';
  end if;
  if exists (select 1 from jsonb_array_elements(p_parts) x
              where x->>'type' = 'game'
                and not exists (select 1 from public.player_game_accounts a where a.id = (x->>'account_id')::bigint and a.player_id = p_player)) then
    raise exception 'A game account does not belong to this player.' using errcode = 'check_violation';
  end if;
  if p_account is not null and not exists (select 1 from public.player_game_accounts where id = p_account and player_id = p_player) then
    raise exception 'That game account does not belong to this player.' using errcode = 'check_violation';
  end if;
  insert into public.wallet_transactions (player_id, kind, amount, game_account_id, parts, note, created_by)
  values (p_player, 'withdraw', round(p_total, 2), p_account, p_parts, nullif(trim(p_note), ''), auth.uid())
  returning id into tid;
  return tid;
end;
$$;
revoke execute on function public.record_withdraw(uuid, numeric, jsonb, bigint, text) from public, anon;
grant execute on function public.record_withdraw(uuid, numeric, jsonb, bigint, text) to authenticated;

-- ---------------------------------------------------------- game providers
create table public.game_providers (
  id                 bigint generated always as identity primary key,
  game_title         text not null unique check (char_length(game_title) between 1 and 60),
  base_url           text,
  agent_id           text,
  secret_key         text,
  enabled            boolean not null default false,
  store_balance      numeric(14,2),
  balance_checked_at timestamptz,
  updated_at         timestamptz not null default now()
);
alter table public.game_providers enable row level security;
-- The secret key column is never readable from the browser.
grant select (id, game_title, base_url, agent_id, enabled, store_balance, balance_checked_at, updated_at)
  on public.game_providers to authenticated;
create policy game_providers_select on public.game_providers for select to authenticated
  using (public.is_staff());

create table public.admin_settings (
  key   text primary key,
  value jsonb not null
);
alter table public.admin_settings enable row level security;
grant select on public.admin_settings to authenticated;
create policy admin_settings_select on public.admin_settings for select to authenticated using (public.is_staff());
insert into public.admin_settings (key, value) values ('low_balance_threshold', '100') on conflict do nothing;

create or replace function public.list_game_providers()
returns table(id bigint, game_title text, base_url text, agent_id text, enabled boolean, has_secret boolean,
              store_balance numeric, balance_checked_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('provider-manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
    select g.id, g.game_title, g.base_url, g.agent_id, g.enabled, g.secret_key is not null,
           g.store_balance, g.balance_checked_at
      from public.game_providers g order by g.game_title;
end;
$$;
revoke execute on function public.list_game_providers() from public, anon;
grant execute on function public.list_game_providers() to authenticated;

-- A blank secret keeps the saved one.
create or replace function public.save_game_provider(p_title text, p_base_url text, p_agent_id text, p_secret text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('provider-manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  insert into public.game_providers (game_title, base_url, agent_id, secret_key, enabled)
  values (trim(p_title), nullif(trim(p_base_url), ''), nullif(trim(p_agent_id), ''), nullif(p_secret, ''), coalesce(p_enabled, false))
  on conflict (game_title) do update
     set base_url   = excluded.base_url,
         agent_id   = excluded.agent_id,
         secret_key = coalesce(excluded.secret_key, public.game_providers.secret_key),
         enabled    = excluded.enabled,
         updated_at = now();
end;
$$;
revoke execute on function public.save_game_provider(text, text, text, text, boolean) from public, anon;
grant execute on function public.save_game_provider(text, text, text, text, boolean) to authenticated;

create or replace function public.set_low_balance_threshold(p_amount numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('provider-manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  insert into public.admin_settings (key, value) values ('low_balance_threshold', to_jsonb(greatest(coalesce(p_amount, 0), 0)))
  on conflict (key) do update set value = excluded.value;
end;
$$;
revoke execute on function public.set_low_balance_threshold(numeric) from public, anon;
grant execute on function public.set_low_balance_threshold(numeric) to authenticated;

-- ------------------------------------------------------------- wheel rules
create table public.wheel_settings (
  id                   integer primary key default 1 check (id = 1),
  is_open              boolean not null default true,
  cooldown_hours       integer not null default 24 check (cooldown_hours between 0 and 720),
  deposit_within_hours integer not null default 0 check (deposit_within_hours between 0 and 720)
);
insert into public.wheel_settings (id) values (1) on conflict do nothing;
alter table public.wheel_settings enable row level security;
grant select, update on public.wheel_settings to authenticated;
create policy wheel_settings_select on public.wheel_settings for select to authenticated using (public.is_staff());
create policy wheel_settings_update on public.wheel_settings for update to authenticated
  using (public.has_permission('wheel-manage')) with check (public.has_permission('wheel-manage'));

alter table public.wheel_prizes
  add column if not exists kind text check (kind is null or kind in ('freeplay', 'bonus', 'cash', 'none')),
  add column if not exists value numeric(10,2);

create or replace function public.wheel_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid  uuid := auth.uid();
  last timestamptz;
  ws   public.wheel_settings%rowtype;
begin
  select * into ws from public.wheel_settings where id = 1;
  if uid is null then
    return jsonb_build_object('state', 'signed_out');
  end if;
  if public.is_staff() then
    return jsonb_build_object('state', 'staff');
  end if;
  if not exists (select 1 from public.profiles where id = uid and status = 'approved' and is_active) then
    return jsonb_build_object('state', 'not_approved');
  end if;
  if not coalesce(ws.is_open, true) then
    return jsonb_build_object('state', 'closed');
  end if;
  if coalesce(ws.deposit_within_hours, 0) > 0 and not exists (
       select 1 from public.wallet_transactions
        where player_id = uid and kind in ('deposit', 'wallet_add')
          and created_at > now() - make_interval(hours => ws.deposit_within_hours)) then
    return jsonb_build_object('state', 'needs_deposit', 'hours', ws.deposit_within_hours);
  end if;
  select max(created_at) into last from public.wheel_spins where player_id = uid;
  if last is not null and last > now() - make_interval(hours => coalesce(ws.cooldown_hours, 24)) then
    return jsonb_build_object('state', 'wait', 'next_spin_at', last + make_interval(hours => coalesce(ws.cooldown_hours, 24)));
  end if;
  return jsonb_build_object('state', 'ready');
end;
$$;

create or replace function public.spin_wheel()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid     uuid := auth.uid();
  last    timestamptz;
  total   bigint;
  pick    bigint;
  running bigint := 0;
  prize   public.wheel_prizes%rowtype;
  spin_id bigint;
  ws      public.wheel_settings%rowtype;
  wait_h  integer;
begin
  select * into ws from public.wheel_settings where id = 1;
  wait_h := coalesce(ws.cooldown_hours, 24);
  if uid is null then
    raise exception 'Please sign in to spin.' using errcode = '28000';
  end if;
  if public.is_staff() then
    raise exception 'Staff accounts cannot spin.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = uid and status = 'approved' and is_active) then
    raise exception 'Your account must be approved before you can spin.' using errcode = '42501';
  end if;
  if not coalesce(ws.is_open, true) then
    raise exception 'The wheel is closed right now.' using errcode = 'P0001';
  end if;
  if coalesce(ws.deposit_within_hours, 0) > 0 and not exists (
       select 1 from public.wallet_transactions
        where player_id = uid and kind in ('deposit', 'wallet_add')
          and created_at > now() - make_interval(hours => ws.deposit_within_hours)) then
    raise exception 'Make a deposit to unlock your spin.' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('wheel:' || uid::text));

  select max(created_at) into last from public.wheel_spins where player_id = uid;
  if last is not null and last > now() - make_interval(hours => wait_h) then
    raise exception 'You already spun. Next spin: %', (last + make_interval(hours => wait_h))
      using errcode = 'P0001';
  end if;

  select coalesce(sum(weight), 0) into total from public.wheel_prizes where is_active and weight > 0;
  if total = 0 then
    raise exception 'The wheel is not available right now.' using errcode = 'P0001';
  end if;

  pick := floor(random() * total)::bigint;
  for prize in
    select * from public.wheel_prizes where is_active and weight > 0 order by sort_order, id
  loop
    running := running + prize.weight;
    exit when pick < running;
  end loop;

  insert into public.wheel_spins (player_id, prize_id, prize_label)
  values (uid, prize.id, prize.label)
  returning id into spin_id;

  return jsonb_build_object('spin_id', spin_id, 'prize_id', prize.id, 'label', prize.label);
end;
$$;

-- ------------------------------------------------ chat list: referral info
create or replace function public.list_staff_chats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('chat-view') then
    raise exception 'You do not have permission to view chats.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id,
      'client_id', c.client_id,
      'client_name', p.name,
      'client_email', p.email,
      'is_active', c.is_active,
      'last_message_at', c.last_message_at,
      'referrer_name', rp.name,
      'referrer_code', rp.referral_code,
      'last_message', (select left(coalesce(nullif(m.message, ''), '📎 attachment'), 80) from public.messages m
                        where m.chat_id = c.id and m.deleted_at is null order by m.created_at desc limit 1),
      'unread_count', (
        select count(*) from public.messages m
         where m.chat_id = c.id and m.sender_id = c.client_id and m.is_read = false and m.deleted_at is null)
    ) order by c.last_message_at desc nulls last)
    from public.chats c
    join public.profiles p on p.id = c.client_id
    left join public.profiles rp on rp.id = p.referred_by
    where c.deleted_at is null
  ), '[]'::jsonb);
end;
$$;
