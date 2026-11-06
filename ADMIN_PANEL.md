# Admin panel

The back office, at **http://localhost:3000/admin**. Backed by Supabase —
see [SUPABASE_MIGRATION_PLAN.md](SUPABASE_MIGRATION_PLAN.md).

## Signing in

There are no seeded accounts. Sign up through `/register` on the site, then
run this in your Supabase project's SQL Editor (with your own email) to
make yourself a super-admin:

```sql
insert into public.user_roles (user_id, role_id)
select pr.id, r.id from public.profiles pr, public.roles r
where pr.email = 'you@example.com' and r.name = 'super-admin';

update public.profiles set status = 'approved', is_active = true
where email = 'you@example.com';
```

Super-admin holds every permission (see `supabase/seed_production.sql`), so
every screen below works immediately. If you create an `admin` role with a
narrower permission set later, whoever holds it will see "permission
denied" on screens that need a permission they weren't given — that's the
database's Row Level Security behaving as written, not a bug in the panel.

## What's here

| Screen | Backed by | Notes |
|---|---|---|
| Overview | `dashboard_stats()` | Account counts, pending-approval count |
| Admin users | `list_staff()`, `set_staff_role()`, `/api/admin/staff` | Create, change role, delete. Creating/deleting a login needs the service-role key (set in `.env.local`) since that can't go through RLS |
| Players | `list_players()` | Read-only, with client-side search |
| Chats | `list_staff_chats()` + Realtime | The staff support inbox — open a conversation, reply live |
| Roles | `list_roles()`, `create_role()`, `update_role_permissions()`, `delete_role()` | Permission matrix grouped by resource |
| Activity | `list_activity()`, `clear_activity()` | Date filters, pagination, clear |
| Banners | `banner_groups` table | Toggle live/hidden, view slides, delete |

Every one of those functions lives in `supabase/migrations/0004_admin_rpcs.sql`
(and `0005_realtime.sql` for chat), and each checks its own permission before
doing anything — so even though the browser calls them directly with the
anon key, a player or an under-permissioned staff member gets refused by the
database itself, not just hidden by the UI.

## Files

```
apps/web/src/lib/adminApi.js             Calls into Supabase (RPCs + table queries)
apps/web/src/app/api/admin/staff/route.js  Server-only: create/delete staff logins
apps/web/src/components/admin/ui.jsx     Shared UI primitives
apps/web/src/app/admin/layout.js         Shell: sidebar, session guard
apps/web/src/app/admin/page.js           Overview
apps/web/src/app/admin/users/page.js     Admin users
apps/web/src/app/admin/clients/page.js   Players
apps/web/src/app/admin/chats/page.js     Staff chat inbox
apps/web/src/app/admin/roles/page.js     Roles & permissions
apps/web/src/app/admin/activity/page.js  Activity log
apps/web/src/app/admin/banners/page.js   Banner groups
```

## Known limits

- **Creating banner sets isn't supported from the UI.** That needs image
  uploads, which need a Supabase Storage bucket that doesn't exist yet. For
  now, add a banner directly in the Supabase table editor with a full
  `https://...` URL in `image_url`. Toggle, view and delete work fine.
- **Role names can't be renamed**, only their permissions — `updateRole`
  only accepts a permission list.
- **Deleting a role fails if anyone still holds it.** The database refuses
  (`delete_role()`); the panel surfaces that message.
- **The activity log starts empty.** Entries appear once something writes
  to `audit_log` — currently that's `set_player_status()` only.
- **No email notifications** anywhere yet (new staff account, approval,
  etc.) — would need a Supabase Edge Function.

## Design

Dark felt green (`#0C1714`) with a single brass accent (`#D4AF57`), Fraunces
for headings and Inter for UI. The stat figures on Overview are drawn as
casino chips — that's the one decorative move; everything else is
deliberately plain so dense tables stay readable.

Colours are inline Tailwind arbitrary values, so `tailwind.config.js` is
untouched.
