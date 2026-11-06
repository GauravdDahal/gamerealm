-- =============================================================================
-- 0001_schema.sql
-- Tables, triggers and the sign-up hook. Access rules are in 0002_access.sql.
-- Ported from apps/api/database/migrations (15 migrations) on 2026-11-03.
-- =============================================================================

-- ---------------------------------------------------------------- helpers
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- profiles
-- One row per auth user. Replaces Laravel's `users` table minus the password,
-- session and remember-token columns, which Supabase Auth owns.
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  name           text        not null,
  email          text        not null unique,
  phone          text,
  date_of_birth  date,
  country        text,
  address        text,
  avatar_url     text,
  status         text        not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected', 'suspended')),
  status_reason  text,
  reviewed_at    timestamptz,
  reviewed_by    uuid        references public.profiles (id) on delete set null,
  is_active      boolean     not null default false,
  online_status  boolean     not null default false,
  last_seen_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index profiles_status_idx on public.profiles (status);

create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------ roles & permissions
create table public.roles (
  id          bigint generated always as identity primary key,
  name        text        not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.permissions (
  id          bigint generated always as identity primary key,
  name        text        not null unique,   -- e.g. 'banner-view', 'chat-view'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.role_permissions (
  role_id        bigint not null references public.roles (id) on delete cascade,
  permission_id  bigint not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.user_roles (
  user_id  uuid   not null references public.profiles (id) on delete cascade,
  role_id  bigint not null references public.roles (id) on delete cascade,
  primary key (user_id, role_id)
);

create trigger roles_touch
  before update on public.roles
  for each row execute function public.touch_updated_at();

create trigger permissions_touch
  before update on public.permissions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- banners
create table public.banner_groups (
  id          bigint generated always as identity primary key,
  name        text        not null,
  is_active   boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.banners (
  id               bigint generated always as identity primary key,
  banner_group_id  bigint not null references public.banner_groups (id) on delete cascade,
  title            text        not null,
  image_url        text        not null,
  description      text        not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Singleton row, same as the Laravel CtaBanner::settings() pattern.
create table public.cta_banners (
  id          bigint generated always as identity primary key,
  heading     text        not null,
  body        text        not null,   -- Laravel column was `text`; renamed (SQL keyword)
  is_active   boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger banner_groups_touch before update on public.banner_groups
  for each row execute function public.touch_updated_at();
create trigger banners_touch before update on public.banners
  for each row execute function public.touch_updated_at();
create trigger cta_banners_touch before update on public.cta_banners
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------- chat
create table public.chats (
  id               bigint generated always as identity primary key,
  client_id        uuid        not null references public.profiles (id),
  is_active        boolean     not null default false,
  last_message_at  timestamptz,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index chats_client_idx on public.chats (client_id);

create table public.messages (
  id           bigint generated always as identity primary key,
  chat_id      bigint      not null references public.chats (id) on delete cascade,
  sender_id    uuid        not null references public.profiles (id),
  message      text        not null,
  voice_path   text,                    -- Storage path, not a URL
  is_read      boolean     not null default false,
  read_at      timestamptz,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index messages_chat_idx on public.messages (chat_id, created_at);

create table public.chat_attachments (
  id            bigint generated always as identity primary key,
  message_id    bigint      not null references public.messages (id) on delete cascade,
  file_name     text,
  storage_path  text        not null,
  file_type     text,
  file_size     integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger chats_touch before update on public.chats
  for each row execute function public.touch_updated_at();
create trigger messages_touch before update on public.messages
  for each row execute function public.touch_updated_at();
create trigger chat_attachments_touch before update on public.chat_attachments
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------- audit log
-- Replaces Spatie activitylog. Rows are written by triggers or server code only.
create table public.audit_log (
  id            bigint generated always as identity primary key,
  log_name      text,
  description   text        not null,
  subject_type  text,
  subject_id    text,
  causer_id     uuid        references public.profiles (id) on delete set null,
  properties    jsonb,
  batch_uuid    uuid,
  created_at    timestamptz not null default now()
);

create index audit_log_name_idx on public.audit_log (log_name);

-- ---------------------------------------------------------- sign-up hook
-- Runs whenever Supabase Auth creates a user. Creates the matching profile as
-- 'pending' and enforces the 18+ rule. Status is always set here, never read
-- from the sign-up metadata, because the browser controls that metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dob date := nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date;
begin
  if dob is null or dob > (current_date - interval '18 years')::date then
    raise exception 'You must be at least 18 years old to register.'
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (
    id, name, email, phone, date_of_birth, country, address, status, is_active
  ) values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    dob,
    new.raw_user_meta_data ->> 'country',
    new.raw_user_meta_data ->> 'address',
    'pending',
    false
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
