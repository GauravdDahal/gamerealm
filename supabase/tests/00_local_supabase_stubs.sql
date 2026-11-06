-- LOCAL TESTING ONLY. Mimics the parts of Supabase the migrations rely on.
-- Do not run against a real Supabase project; it already has these.
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon')          then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'service_role')  then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id                  uuid primary key,
  email               text unique,
  raw_user_meta_data  jsonb not null default '{}'::jsonb,
  raw_app_meta_data   jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

-- Supabase's helper: reads the caller's user id from the JWT claim.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;

-- Supabase projects come with this publication already; 0005_realtime.sql
-- adds tables to it. A plain local Postgres doesn't have one.
do $$ begin
  if not exists (select from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- Minimal stand-in for the Storage schema 0006_storage.sql relies on.
create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id     text primary key,
  name   text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id        uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name      text,
  owner     uuid
);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;

-- Real Supabase's helper: splits an object name into its folder segments.
create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$
  select case when position('/' in name) = 0 then array[]::text[]
              else string_to_array(regexp_replace(name, '/[^/]*$', ''), '/')
         end
$$;
