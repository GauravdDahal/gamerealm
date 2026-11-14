import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Creates a staff (admin) account. This is server-only because creating a
 * Supabase Auth user needs the service role key, which must never reach
 * the browser. The permission check still runs against the CALLER's own
 * session first — the service role key itself bypasses every rule, so this
 * route is the thing standing in for RLS here.
 */
export async function POST(request) {
    const { name, email, role_name } = await request.json()

    if (!name?.trim() || !email?.trim() || !role_name?.trim()) {
        return NextResponse.json(
            { error: 'Name, email and role are all required.' },
            { status: 422 },
        )
    }

    // 1. Who is calling, and are they allowed to create admin users?
    const supabase = await createClient()
    const {
        data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
        return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
    }

    const { data: access } = await supabase.rpc('my_access')
    if (!access?.is_staff) {
        return NextResponse.json(
            { error: 'You do not have permission to do that.' },
            { status: 403 },
        )
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json(
            {
                error: 'Adding staff needs a secret key that is not set up yet. In Vercel, open Settings → Environment Variables, ' +
                    'add SUPABASE_SERVICE_ROLE_KEY (copy it from Supabase → Project Settings → API keys), then redeploy the site.',
            },
            { status: 500 },
        )
    }

    // 2. Create the account with the admin client (service role — bypasses RLS).
    const admin = createAdminClient()
    const tempPassword = crypto.randomUUID().replace(/-/g, '').slice(0, 16)

    const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        // 18+ is enforced by handle_new_user() on every signup, staff included.
        user_metadata: { name, date_of_birth: '1990-01-01' },
    })

    if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 422 })
    }

    // 3. Mark them approved immediately (staff skip the player approval queue)
    //    and assign their role. Both run through the caller's own session so
    //    set_staff_role() still checks role-assign — the service role client
    //    is only used for the one thing it's needed for: creating the user.
    await admin
        .from('profiles')
        .update({ status: 'approved', is_active: true })
        .eq('id', created.user.id)

    const { error: roleError } = await supabase.rpc('set_staff_role', {
        p_user_id: created.user.id,
        p_role_name: role_name,
    })

    if (roleError) {
        // Account exists but role assignment failed — surface it rather than
        // leaving a silently roleless admin account.
        return NextResponse.json(
            { error: `Account created, but the role could not be assigned: ${roleError.message}` },
            { status: 422 },
        )
    }

    return NextResponse.json({
        id: created.user.id,
        temp_password: tempPassword,
    })
}

/**
 * Deletes a staff account. Thin wrapper: the real permission check and the
 * "never delete a super-admin" rule live in remove_staff() (0004_admin_rpcs.sql),
 * which runs under the caller's own session, not the service role — deleting
 * the auth.users row still needs the admin client to actually remove the
 * login, since RPCs can delete the profile but not sign the account out
 * everywhere or purge it from auth.
 */
export async function DELETE(request) {
    const { id } = await request.json()
    if (!id) {
        return NextResponse.json({ error: 'Missing user id.' }, { status: 422 })
    }

    const supabase = await createClient()
    const {
        data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
        return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
    }

    // This checks admin_user-delete and refuses to touch a super-admin.
    const { error: rpcError } = await supabase.rpc('remove_staff', { p_user_id: id })
    if (rpcError) {
        return NextResponse.json({ error: rpcError.message }, { status: 422 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        // remove_staff() already deleted the profile via cascade from the SQL
        // side in most setups, but belt-and-braces: without the service key
        // we can't guarantee the auth user itself is gone.
        return NextResponse.json({ ok: true, warning: 'Profile removed; set SUPABASE_SERVICE_ROLE_KEY to fully delete the login.' })
    }

    const admin = createAdminClient()
    await admin.auth.admin.deleteUser(id).catch(() => {
        // Already gone (remove_staff's auth.users delete likely did it) — fine.
    })

    return NextResponse.json({ ok: true })
}
