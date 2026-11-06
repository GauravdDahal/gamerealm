# GameRealm

One repository for the whole platform.

```
apps/
  web/      Next.js 15 — public site, player chat, /admin back office
  mobile/   Expo / React Native — early skeleton, not yet wired up
supabase/
  migrations/  SQL run once in order against your Supabase project (schema, access rules, RPCs)
  tests/       Local-only Postgres test suite for the above (not for your real project)
  seed_production.sql  Starting permissions + the super-admin role
```

The backend is [Supabase](https://supabase.com) — Postgres with Row Level
Security, Auth, and Realtime for chat. There is no separate API server to
run; the Next.js app talks to Supabase directly from the browser, with a
couple of server-only routes (`apps/web/src/app/api/`) for the few actions
that need the service-role key (creating/removing staff logins).

Setup instructions are in [SETUP.md](SETUP.md). Feature notes:
[APPROVAL_FLOW.md](APPROVAL_FLOW.md) (registration + approval),
[ADMIN_PANEL.md](ADMIN_PANEL.md) (back office), and
[SUPABASE_MIGRATION_PLAN.md](SUPABASE_MIGRATION_PLAN.md) (how the backend
got here, and what's still left).

## Quick start

1. Create a Supabase project, then run the files under `supabase/migrations/`
   and `supabase/seed_production.sql`, in order, in its SQL Editor.
2. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in your
   Supabase project URL and keys (Project Settings → API).
3. `pnpm install` at the root
4. `pnpm web:dev`

## Secrets

`.env.local` is git-ignored. Only `.env.example` is tracked.
`SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser — it has
no `NEXT_PUBLIC_` prefix so Next.js won't bundle it client-side, and it
belongs only in server-only code under `apps/web/src/app/api/`.
