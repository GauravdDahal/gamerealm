-- =============================================================================
-- 0010_wheel.sql
-- Lucky wheel on the homepage.
--   wheel_prizes  - the segments, their colour and their odds (staff only).
--   wheel_spins   - every spin ever made.
--   spin_wheel()  - the ONLY way to spin. The prize is chosen here, on the
--                   server, so the browser cannot pick or change the result.
-- One spin per approved player every 24 hours.
-- =============================================================================

create table public.wheel_prizes (
  id          bigint generated always as identity primary key,
  label       text    not null,
  color       text    not null default '#4f46e5',
  weight      integer not null default 10 check (weight >= 0),  -- relative chance
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger wheel_prizes_touch before update on public.wheel_prizes
  for each row execute function public.touch_updated_at();

create table public.wheel_spins (
  id           bigint generated always as identity primary key,
  player_id    uuid   not null references public.profiles (id) on delete cascade,
  prize_id     bigint references public.wheel_prizes (id) on delete set null,
  prize_label  text   not null,                 -- kept even if the prize is later renamed
  status       text   not null default 'pending' check (status in ('pending', 'credited')),
  credited_by  uuid   references public.profiles (id) on delete set null,
  credited_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index wheel_spins_player_idx on public.wheel_spins (player_id, created_at desc);
create index wheel_spins_created_idx on public.wheel_spins (created_at desc);

alter table public.wheel_prizes enable row level security;
alter table public.wheel_spins  enable row level security;

grant select, insert, update, delete on public.wheel_prizes to authenticated;
grant select on public.wheel_spins to authenticated;

-- Staff who manage the wheel can see and edit everything. Nobody else reads
-- the odds. Spins can only be CREATED by spin_wheel().
create policy wheel_prizes_manage on public.wheel_prizes for all to authenticated
  using (public.has_permission('wheel-manage'))
  with check (public.has_permission('wheel-manage'));

create policy wheel_spins_select on public.wheel_spins for select to authenticated
  using (player_id = auth.uid() or public.has_permission('wheel-manage'));

insert into public.permissions (name) values ('wheel-manage') on conflict (name) do nothing;
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.name = 'super-admin' and p.name = 'wheel-manage'
on conflict do nothing;

-- --------------------------------------------------------------- public reads
-- What the homepage draws: segments in order, without the odds.
create or replace function public.wheel_segments()
returns table (id bigint, label text, color text)
language sql
stable
security definer
set search_path = ''
as $$
  select id, label, color
    from public.wheel_prizes
   where is_active and weight >= 0
   order by sort_order, id;
$$;
grant execute on function public.wheel_segments() to anon, authenticated;

-- Can this person spin right now? Never raises, so the page can always ask.
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
begin
  if uid is null then
    return jsonb_build_object('state', 'signed_out');
  end if;
  if public.is_staff() then
    return jsonb_build_object('state', 'staff');
  end if;
  if not exists (select 1 from public.profiles where id = uid and status = 'approved' and is_active) then
    return jsonb_build_object('state', 'not_approved');
  end if;
  select max(created_at) into last from public.wheel_spins where player_id = uid;
  if last is not null and last > now() - interval '24 hours' then
    return jsonb_build_object('state', 'wait', 'next_spin_at', last + interval '24 hours');
  end if;
  return jsonb_build_object('state', 'ready');
end;
$$;
grant execute on function public.wheel_status() to anon, authenticated;

-- ----------------------------------------------------------------- the spin
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
begin
  if uid is null then
    raise exception 'Please sign in to spin.' using errcode = '28000';
  end if;
  if public.is_staff() then
    raise exception 'Staff accounts cannot spin.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = uid and status = 'approved' and is_active) then
    raise exception 'Your account must be approved before you can spin.' using errcode = '42501';
  end if;

  -- One spin at a time per player, so two taps can't both pass the check.
  perform pg_advisory_xact_lock(hashtext('wheel:' || uid::text));

  select max(created_at) into last from public.wheel_spins where player_id = uid;
  if last is not null and last > now() - interval '24 hours' then
    raise exception 'You already spun today. Next spin: %', (last + interval '24 hours')
      using errcode = 'P0001';
  end if;

  select coalesce(sum(weight), 0) into total from public.wheel_prizes where is_active and weight > 0;
  if total = 0 then
    raise exception 'The wheel is not available right now.' using errcode = 'P0001';
  end if;

  pick := floor(random() * total)::bigint;   -- 0 .. total-1
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
grant execute on function public.spin_wheel() to authenticated;
revoke execute on function public.spin_wheel() from public, anon;

-- ------------------------------------------------------------- admin helpers
create or replace function public.list_wheel_spins(p_limit integer default 100)
returns table (
  id bigint, created_at timestamptz, prize_label text, status text,
  player_name text, player_email text, credited_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('wheel-manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
    select s.id, s.created_at, s.prize_label, s.status, p.name, p.email, s.credited_at
      from public.wheel_spins s
      join public.profiles p on p.id = s.player_id
     order by s.created_at desc
     limit least(greatest(p_limit, 1), 500);
end;
$$;
grant execute on function public.list_wheel_spins(integer) to authenticated;

create or replace function public.set_spin_credited(p_spin bigint, p_credited boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('wheel-manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update public.wheel_spins
     set status = case when p_credited then 'credited' else 'pending' end,
         credited_by = case when p_credited then auth.uid() end,
         credited_at = case when p_credited then now() end
   where id = p_spin;
end;
$$;
grant execute on function public.set_spin_credited(bigint, boolean) to authenticated;

-- ------------------------------------------------------------ starter prizes
insert into public.wheel_prizes (label, color, weight, sort_order) values
  ('$2 Freeplay',  '#4f46e5', 30, 1),
  ('10% Bonus',    '#7c3aed', 22, 2),
  ('$5 Freeplay',  '#db2777', 14, 3),
  ('Try Again',    '#334155', 12, 4),
  ('15% Bonus',    '#0ea5e9', 10, 5),
  ('$10 Freeplay', '#f59e0b',  6, 6),
  ('20% Bonus',    '#10b981',  5, 7),
  ('$50 Freeplay', '#e11d48',  1, 8);
