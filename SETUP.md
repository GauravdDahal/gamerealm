# Setup Guide

```
apps/
  web/      Next.js 15, React 19, Tailwind 4 — the site and /admin back office
  mobile/   Expo / React Native — early skeleton, not wired up yet
supabase/   SQL that sets up your Supabase project
```

The backend is [Supabase](https://supabase.com) (Postgres + Auth + Realtime).
There's no separate server to start — the web app talks to Supabase directly.

---

## 1. Install prerequisites

- **Node.js 20 or newer**
- **pnpm** — the repo has `node-linker` settings in `.npmrc`, so use pnpm, not
  npm. Install it with `npm install -g pnpm`

Check everything is there:

```bash
node -v && pnpm -v
```

---

## 2. Set up your Supabase project

If you don't have one yet, create a free project at
[supabase.com](https://supabase.com/dashboard).

Open your project → **SQL Editor** → **New query**, and run each file under
`supabase/migrations/` **in order** (`0001_schema.sql`, `0002_access.sql`,
`0003_my_access.sql`, `0004_admin_rpcs.sql`, `0005_realtime.sql`), then run
`supabase/seed_production.sql`. Paste one file's contents, click Run, confirm
it succeeds, then move to the next. (Don't run anything under `supabase/tests/`
— those are only for local testing, not a real project.)

---

## 3. Open in VS Code

Open the file **`Game.code-workspace`** (File → Open Workspace from File).
VS Code will prompt you to install the recommended extensions — say yes.

---

## 4. Configure the web app

```bash
cp apps/web/.env.example apps/web/.env.local
```

Fill in, from your Supabase project's **Settings → API** page:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the public "anon" key)
- `SUPABASE_SERVICE_ROLE_KEY` (the secret "service_role" key — only needed
  for creating/removing staff logins in the admin panel; keep it secret)

---

## 5. Install and run

```bash
pnpm install
pnpm web:dev
```

Then open **http://localhost:3000**.

## 6. Make yourself a super-admin

Sign up through `/register` on the site, then in the Supabase SQL Editor run
(with your own email):

```sql
insert into public.user_roles (user_id, role_id)
select pr.id, r.id from public.profiles pr, public.roles r
where pr.email = 'you@example.com' and r.name = 'super-admin';

update public.profiles set status = 'approved', is_active = true
where email = 'you@example.com';
```

Sign out and back in — you should land in `/admin`.

---

## 7. Mobile app (optional, not wired up)

```bash
cd apps/mobile
npx expo start
```

Scan the QR code with the Expo Go app. This project is a skeleton — it has
screens but no backend wiring yet.

---

## Troubleshooting

**Build fails on pnpm install** — run `pnpm approve-builds`, select `sharp`
and `unrs-resolver`, then `pnpm install` again.

**Signed in but stuck on "awaiting approval"** — you haven't run the
"make yourself a super-admin" SQL above yet, or ran it with the wrong email.

**Admin panel says "permission denied" on a page** — your account's role is
missing a permission that page needs. Check `supabase/seed_production.sql`
for the full permission list, and assign roles from `/admin/roles` once
you're in.

**Images don't show on banners** — image uploads aren't wired up yet (needs
a Supabase Storage bucket). For now, `image_url` on a banner needs to be a
full `https://...` URL you've hosted somewhere, added directly in the
Supabase table editor.
