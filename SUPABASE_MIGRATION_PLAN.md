# Supabase migration plan

**Status: done, except Storage and mobile.** The Laravel backend that used to
live in `apps/api` has been removed. Phases 0–4 below are complete and live
in `apps/web` and `supabase/`; what's left is Storage (image/voice uploads)
and the mobile app, which was never wired to a backend at all. Kept here as
a record of the plan and for anyone picking up what's left — the mapping
and schema sections below describe what was actually built, not a draft.

## 1. Table-by-table mapping

| Laravel table | Supabase equivalent | Notes |
|---|---|---|
| `users` | `auth.users` (managed) + `public.profiles` | Passwords and sessions move to Supabase Auth. Profile data stays in `profiles`, keyed by the auth user id. |
| `social_login_accounts` | drop | Social login was disabled in the approval work. |
| `password_reset_tokens` | drop | Supabase Auth handles password reset. |
| `sessions`, `cache`, `cache_locks` | drop | Supabase Auth and Vercel replace these. |
| `jobs`, `job_batches`, `failed_jobs` | drop | Replaced by Edge Functions, Supabase `pg_cron`, or Vercel cron. |
| `personal_access_tokens` | drop | Replaced by Supabase Auth JWTs. Mobile uses the same tokens. |
| `banner_groups` | `banner_groups` | Direct copy. |
| `banners` | `banners` | Direct copy. Images move to Supabase Storage. |
| `cta_banners` | `cta_banners` | Direct copy. |
| `chats` | `chats` | `client_id` now references `profiles`. |
| `messages` | `messages` | `voice_message_url` becomes `voice_path`, a Storage path. |
| `chat_attachments` | `chat_attachments` | Files move to Storage. |
| `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions` | `roles`, `permissions`, `user_roles`, `role_permissions` | Spatie's `guard_name` and `team` columns are dropped. Teams were not used. |
| `activity_log` | `audit_log` | `properties` becomes `jsonb`. Written by triggers or server actions. |

## 2. Column changes in `users` to `profiles`

Kept as-is: `name`, `email`, `phone`, `date_of_birth`, `country`, `address`, `avatar`
(renamed `avatar_url`), `status`, `status_reason`, `reviewed_at`, `reviewed_by`,
`is_active`, `online_status`, `last_seen_at`, `created_at`, `updated_at`.

Removed: `password`, `remember_token`, `email_verified_at` (Supabase Auth owns these).

Moved out of the row: `is_admin` and `is_superadmin` become role assignments in
`user_roles`. Keeping them as columns on a table players can update is a privilege
escalation risk. See section 4.

## 3. Draft Postgres schema

```sql
-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text not null,
  email           text not null unique,
  phone           text,
  date_of_birth   date,
  country         text,
  address         text,
  avatar_url      text,
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected','suspended')),
  status_reason   text,
  reviewed_at     timestamptz,
  reviewed_by     uuid references public.profiles(id) on delete set null,
  is_active       boolean not null default false,
  online_status   boolean not null default false,
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ------------------------------------------------------- roles & permissions
create table public.roles (
  id   bigint generated always as identity primary key,
  name text not null unique
);
create table public.permissions (
  id   bigint generated always as identity primary key,
  name text not null unique            -- e.g. 'banner-view', 'chat-view'
);
create table public.role_permissions (
  role_id       bigint not null references public.roles(id) on delete cascade,
  permission_id bigint not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);
create table public.user_roles (
  user_id uuid   not null references public.profiles(id) on delete cascade,
  role_id bigint not null references public.roles(id) on delete cascade,
  primary key (user_id, role_id)
);

-- ------------------------------------------------------------------ banners
create table public.banner_groups (
  id         bigint generated always as identity primary key,
  name       text not null,
  is_active  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.banners (
  id              bigint generated always as identity primary key,
  banner_group_id bigint not null references public.banner_groups(id) on delete cascade,
  title           text not null,
  image_url       text not null,
  description     text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create table public.cta_banners (
  id         bigint generated always as identity primary key,
  heading    text not null,
  body       text not null,               -- was `text`; renamed because TEXT is a SQL keyword
  is_active  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------- chat
create table public.chats (
  id              bigint generated always as identity primary key,
  client_id       uuid not null references public.profiles(id),
  is_active       boolean not null default false,
  last_message_at timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create table public.messages (
  id          bigint generated always as identity primary key,
  chat_id     bigint not null references public.chats(id) on delete cascade,
  sender_id   uuid   not null references public.profiles(id),
  message     text   not null,
  voice_path  text,                       -- Storage path, not a URL
  is_read     boolean not null default false,
  read_at     timestamptz,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create table public.chat_attachments (
  id           bigint generated always as identity primary key,
  message_id   bigint not null references public.messages(id) on delete cascade,
  file_name    text,
  storage_path text not null,
  file_type    text,
  file_size    integer,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------------- audit log
create table public.audit_log (
  id          bigint generated always as identity primary key,
  log_name    text,
  description text not null,
  subject_type text,
  subject_id   text,
  causer_id    uuid references public.profiles(id) on delete set null,
  properties   jsonb,
  batch_uuid   uuid,
  created_at   timestamptz not null default now()
);
create index on public.audit_log (log_name);
```

## 4. Access rules (Row Level Security)

RLS is the security boundary. The browser talks to Supabase directly, so these
policies replace most of the Laravel controllers' checks.

**Helper functions** (all `security definer`, with `set search_path = public`):

- `has_permission(p text) -> boolean`: true if the current user holds the permission through any of their roles.
- `is_staff() -> boolean`: true if the current user has a role named `super-admin` or `admin`.
- `is_approved() -> boolean`: true for staff, or for a profile with `status = 'approved'`.

**Policies:**

| Table | Rule |
|---|---|
| `profiles` | Read: own row, or staff. Update: own row, but only the editable columns (see below). |
| `profiles` status columns | Not updatable by players. Staff change them through `has_permission('user-manage')`, server-side. |
| `chats` | Insert/select: owner (`client_id = auth.uid()`) and `is_approved()`, or staff with `chat-view`. |
| `messages` | Insert: sender is `auth.uid()`, the chat belongs to them, and `is_approved()`. Select: same, or staff with `chat-view`. |
| `banner_groups`, `banners`, `cta_banners` | Public read of active rows. Write: `has_permission('banner-update')`. |
| `roles`, `permissions`, `user_roles`, `role_permissions` | Read: staff. Write: `has_permission('role-manage')`. |
| `audit_log` | Read: `has_permission('activity_log-view')`. Insert only from triggers. |

**Editable columns for players.** Use column-level grants rather than trusting the
policy alone:

```sql
revoke update on public.profiles from authenticated;
grant update (name, phone, country, address, avatar_url) on public.profiles to authenticated;
```

**Admin writes** that cross users (approve, suspend, assign roles) go through a Next.js
route handler or an Edge Function using the service role key. That key bypasses RLS,
so the handler must check `has_permission` itself before writing. It must never reach
the browser.

## 5. Realtime

- Chat messages: subscribe to `postgres_changes` on `messages`. RLS applies, so a player only receives their own chat's rows and staff receive rows they can read.
- Replaces the Reverb channels `chat.messages.{id}` and `chat.messagesent.global`. The global channel becomes a staff-scoped subscription.
- `ChatCreated` and `MessageSent` events become database triggers or direct inserts. No separate broadcast server is needed.

## 6. Storage

Three buckets:

- `chat-attachments` (private): signed URLs, path scoped to chat id.
- `chat-voice` (private): same scoping.
- `banners` (public): read-only for visitors, written by staff.

## 7. Auth

- Email and password signup through `supabase.auth.signUp`. Store the extra fields (phone, date of birth, country, address) in `raw_user_meta_data`, then copy them into `profiles` with a trigger on `auth.users` insert. The trigger sets `status = 'pending'`.
- The 18+ check runs in a database check or trigger on `profiles`, and again in the sign-up form, so it can't be skipped.
- Existing passwords: Laravel stores bcrypt hashes, and Supabase Auth also uses bcrypt. Carrying the hashes over may work, but test it on a copy first. If it doesn't, force a password reset for migrated users.
- Login is `supabase.auth.signInWithPassword`. The `is_approved()` check decides where the user lands, as it does today.

## 8. Phases

**Phase 0: Prepare — done**
- No prior production data existed to export, so there was nothing to migrate
  off of; this became a clean build rather than a data migration.

**Phase 1: Schema and seed data — done**
- `supabase/migrations/0001_schema.sql` (tables + sign-up trigger) and
  `0002_access.sql` (RLS, column grants, `set_player_status()`).
- `supabase/seed_production.sql`: starting permissions + the super-admin
  role, matching `RolePermissionSeeder`'s naming.
- `supabase/tests/`: a local-Postgres test suite (not run against your real
  project) impersonating a pending player, an approved player, a staff
  member with a narrow permission set, and an anonymous visitor. All passing.

**Phase 2: Auth and approval gate — done**
- `apps/web/src/hooks/auth.js`, `src/middleware.js`,
  `src/lib/supabase/{client,server}.js`: sign up, sign in, session refresh.
- `src/app/account-pending/page.js`, `supabase/migrations/0003_my_access.sql`
  (the `my_access()` RPC the frontend calls to learn role + approval status
  in one round trip).

**Phase 3: Chat — done**
- `supabase/migrations/0005_realtime.sql`: turns on Realtime for
  `chats`/`messages`, adds `list_staff_chats()`.
- `apps/web/src/components/landingPage/ChatPopup.jsx` (player widget) and
  `apps/web/src/app/admin/chats/page.js` (staff inbox — this didn't exist
  before). **Not done:** attachments and voice messages need a Storage
  bucket and policies that don't exist yet, so chat is text-only for now.

**Phase 4: Admin panel — done**
- `supabase/migrations/0004_admin_rpcs.sql`: dashboard stats, staff/player
  listing, role management, activity log — each RPC checks its own
  permission.
- `apps/web/src/lib/adminApi.js` calls these directly; the old
  `unwrap()` workaround for inconsistent Laravel response shapes is gone.
- `apps/web/src/app/api/admin/staff/route.js`: the one piece that still
  needs a server route rather than a direct browser call — creating or
  deleting a Supabase Auth login needs the service-role key, which can't
  go through RLS.

**Phase 5: Mobile — not started**
- Still an unwired skeleton. Out of scope for now by request.

**Phase 6: Cutover — done**
- `apps/api` (the Laravel app) has been deleted from the repo. It's still
  recoverable from git history (the commit that removed it) if ever needed.

## What's actually left

- **Storage buckets** (`banner-images`, `avatars`, `chat-attachments`,
  `chat-voice`) and their policies — section 6 below is still just a plan.
  Until this exists, banner/avatar images are entered as full external URLs
  by hand, and chat has no attachments or voice.
- **Mobile app** — not started, by request.
- **Vercel deployment** — the app has been run and tested locally only so
  far; deploying needs the same env vars set in Vercel's project settings.

## 9. Decisions made

1. **Staff roles:** kept the existing `super-admin`, `admin` and permission names.
2. **Passwords:** no prior accounts existed to carry over, so this didn't come up.
3. **Realtime for staff inbox:** every staff member with `chat-view` sees every
   chat — no per-agent assignment. `list_staff_chats()` could add an
   `assigned_to` filter later if that's ever wanted.
4. **Data retention:** no prior data existed, so nothing to decide.
5. **Vercel plan:** not yet deployed to Vercel; revisit once voice/attachments
   (which would run through an Edge Function or route handler) are built.

## 10. Risks

- **RLS mistakes expose data.** A missing policy shows rows to everyone. Phase 1's impersonation tests are not optional.
- **Service role key leaks** if it's referenced from a client component. Keep it out of any file that a `"use client"` component imports.
- **Free tier pauses** after inactivity. Use a paid project for anything live.
- **Supabase-specific features** (RLS, Realtime, Storage) are the lock-in. Postgres itself is portable.
