# Manual registration + admin approval

Social login is gone. Players register with a form, and every account stays
locked until an admin approves it from the back office. Runs on Supabase
Auth + Postgres now (see [SUPABASE_MIGRATION_PLAN.md](SUPABASE_MIGRATION_PLAN.md)
for how it got there).

## What a player experiences

1. Registers at `/register` with name, email, phone, date of birth, country,
   address and password.
2. Lands on `/account-pending` — a locked screen explaining the account is
   under review. They're signed in, but Row Level Security blocks chat and
   every other gated table until they're approved.
3. Once approved, they sign in at `/users` and use the site normally.
4. If rejected or suspended, the same screen shows the reason the admin gave.

## What an admin does

**Admin → Registrations.** Tabs for Pending, Approved, Rejected, Suspended and
All, each with a live count, plus search across name, email and phone.

- **Approve** — account goes live immediately.
- **Reject** — requires a reason, shown to the player.
- **Suspend** — for accounts already approved; also requires a reason.
- **Reinstate** — puts a rejected or suspended account back into Pending.

Clicking a name opens the full submitted profile, including calculated age.

## Age check

Sign-up rejects anyone under 18. This is a gambling platform, so this is a
legal requirement rather than a preference. It's enforced in the database
itself, in `handle_new_user()` (`supabase/migrations/0001_schema.sql`) — a
trigger that runs on every new Supabase Auth user, staff included, and
can't be bypassed from the browser. The sign-up form also sets a `max` on
the date input as a first line of defense.

## How it's built

| Piece | What it does |
|---|---|
| `supabase/migrations/0001_schema.sql` — `profiles` table | `status` column (`pending`/`approved`/`rejected`/`suspended`), plus `status_reason`, `reviewed_at`, `reviewed_by` |
| `supabase/migrations/0001_schema.sql` — `handle_new_user()` | Runs on every sign-up. Enforces 18+, always creates the profile as `pending` (ignores any status the browser might send) |
| `supabase/migrations/0002_access.sql` — `is_approved()` | True for staff, or a profile with `status = 'approved'`. Used by every RLS policy that should block pending/rejected/suspended players (chat, for now) |
| `supabase/migrations/0002_access.sql` — `set_player_status()` | The only way to approve/reject/suspend/reinstate. Checks the caller has `admin_user-update`, refuses to touch staff accounts, requires a reason for reject/suspend, and logs to `audit_log` |
| `apps/web/src/hooks/auth.js` | `register()`/`login()` call Supabase Auth directly |
| `apps/web/src/app/account-pending/page.js` | The locked screen |
| `apps/web/src/app/admin/registrations/page.js` | The review queue |
| `apps/web/src/lib/adminApi.js` | Calls `set_player_status()` for approve/reject/suspend/reinstate |

`status` is the single source of truth — there's no separate `is_active`
flag to keep in sync (it's still a column, kept `true` only when approved,
in case anything else reads it).

**Staff are never gated.** `is_approved()` returns true for anyone with the
`super-admin` or `admin` role, and `set_player_status()` refuses to act on
a staff account at all — they're managed under Admin users instead.

## Tests

```bash
cd supabase
# against a local Postgres — see tests/00_local_supabase_stubs.sql
psql -d gr_test -f tests/20_access_tests.sql
```

Covers: under-18 sign-up refused, pending-by-default regardless of what the
sign-up request claims, the RLS block on chat for pending/rejected players,
staff bypass, approve/reject/suspend transitions, reason enforcement, and
non-staff being refused `set_player_status()` entirely.

## Loose ends

- **No email notifications.** Players aren't told when they're approved or
  rejected — they find out on next sign-in. A Supabase Edge Function
  triggered on `profiles` status changes would add that.
- **Only chat is gated so far.** If you add more player-facing tables
  later, gate them with `is_approved()` in their RLS policies too.
- **Rejected users can re-register** with a different email. Nothing
  blocks that.
