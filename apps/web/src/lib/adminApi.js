import { createClient } from '@/lib/supabase/client'

/**
 * Supabase-backed replacement for the old Laravel adminApi.js. Every admin
 * page still imports { adminApi, errorMessage } from this file and calls the
 * same method names with the same shapes back — only what happens inside
 * each method changed, from an axios call to the Laravel API to a Supabase
 * query or RPC call. See supabase/migrations/0004_admin_rpcs.sql for the
 * database functions most of these call through.
 */

const supabase = createClient()

/** Throws a plain Error carrying a human-readable message, for both
 *  supabase-js errors (query/RPC) and our own route handlers' { error }. */
const check = ({ data, error }) => {
    if (error) throw new Error(error.message || 'Something went wrong.')
    return data
}

/** Pulls a message out of whatever was thrown. Kept for pages that still
 *  call errorMessage(e, fallback) the same way they always did. */
export const errorMessage = (error, fallback = 'Something went wrong.') => {
    if (error?.message && error.message !== 'Something went wrong.') return error.message
    return fallback
}

const fetchJson = async (url, options) => {
    const res = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Something went wrong.')
    return body
}

export const adminApi = {
    // --- Overview -------------------------------------------------------
    dashboard: async () => ({
        statCardData: check(await supabase.rpc('dashboard_stats')),
    }),
    notifications: async () => {
        const stats = check(await supabase.rpc('dashboard_stats'))
        const pending = stats?.pendingCount ?? 0
        return {
            notifications: pending
                ? [{ message: `${pending} account${pending === 1 ? '' : 's'} waiting for approval`, count: pending }]
                : [],
        }
    },

    // --- Admin / staff users ---------------------------------------------
    admins: async () => ({ adminUsers: check(await supabase.rpc('list_staff')) }),
    clients: async () => ({ clientUsers: check(await supabase.rpc('list_players')) }),
    createUser: payload => fetchJson('/api/admin/staff', { method: 'POST', body: JSON.stringify(payload) }),
    updateUser: async (id, payload) => {
        if (payload.name) check(await supabase.rpc('rename_staff', { p_user_id: id, p_name: payload.name }))
        if (payload.role_name) check(await supabase.rpc('set_staff_role', { p_user_id: id, p_role_name: payload.role_name }))
    },
    deleteUser: id => fetchJson('/api/admin/staff', { method: 'DELETE', body: JSON.stringify({ id }) }),
    myPermissions: async () => {
        const access = check(await supabase.rpc('my_access'))
        return { permissions: access?.roles ?? [] }
    },

    // --- Registrations (approval queue) -----------------------------------
    registrations: async ({ status = 'all', search = '' } = {}) => {
        let query = supabase
            .from('profiles')
            .select('*, reviewer:reviewed_by(name)')
            .order('created_at', { ascending: false })

        if (status !== 'all') query = query.eq('status', status)
        if (search) {
            const q = search.replace(/[%,]/g, '')
            query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
        }

        const { data, error } = await query
        if (error) throw new Error(error.message)

        const counts = {}
        for (const key of ['pending', 'approved', 'rejected', 'suspended']) {
            const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('status', key)
            counts[key] = count ?? 0
        }
        counts.all = Object.values(counts).reduce((a, b) => a + b, 0)

        return { registrations: { data: data ?? [] }, counts }
    },
    registration: async id => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*, reviewer:reviewed_by(name)')
            .eq('id', id)
            .single()
        if (error) throw new Error(error.message)
        return { registration: data }
    },
    approveRegistration: id =>
        supabase.rpc('set_player_status', { target: id, new_status: 'approved' }).then(check),
    rejectRegistration: (id, reason) =>
        supabase.rpc('set_player_status', { target: id, new_status: 'rejected', reason }).then(check),
    suspendRegistration: (id, reason) =>
        supabase.rpc('set_player_status', { target: id, new_status: 'suspended', reason }).then(check),
    reinstateRegistration: id =>
        supabase.rpc('set_player_status', { target: id, new_status: 'pending' }).then(check),

    // --- Roles & permissions ----------------------------------------------
    roles: async () => ({ roles: check(await supabase.rpc('list_roles')) }),
    permissions: async () => ({ permissions: check(await supabase.rpc('list_permissions')) }),
    roleOptions: async () => {
        const roles = check(await supabase.rpc('list_roles'))
        return (roles ?? []).map(r => ({ id: r.id, name: r.name }))
    },
    createRole: ({ name, permissions }) =>
        supabase.rpc('create_role', { p_name: name, p_permissions: permissions }).then(check),
    updateRole: ({ role_id, permissions }) =>
        supabase.rpc('update_role_permissions', { p_role_id: role_id, p_permissions: permissions }).then(check),
    deleteRole: roleId => supabase.rpc('delete_role', { p_role_id: roleId }).then(check),
    assignRole: ({ user_id, role_name }) =>
        supabase.rpc('set_staff_role', { p_user_id: user_id, p_role_name: role_name }).then(check),

    // --- Activity log -------------------------------------------------------
    activity: async ({ page = 1, from_date = null, to_date = null } = {}) => ({
        activities: check(
            await supabase.rpc('list_activity', {
                p_page: page,
                p_per_page: 25,
                p_from: from_date,
                p_to: to_date,
            }),
        ),
    }),
    clearActivity: () => supabase.rpc('clear_activity').then(check),

    // --- Banner groups ------------------------------------------------------
    bannerGroups: async () => {
        const { data, error } = await supabase
            .from('banner_groups')
            .select('*')
            .order('created_at', { ascending: false })
        if (error) throw new Error(error.message)
        return { banner_groups: data ?? [] }
    },
    bannerGroup: async id => {
        const { data, error } = await supabase
            .from('banner_groups')
            .select('*, banners(*)')
            .eq('id', id)
            .single()
        if (error) throw new Error(error.message)
        return { banner_group: data }
    },
    toggleBannerGroup: async id => {
        const { data: current, error: readError } = await supabase
            .from('banner_groups')
            .select('is_active')
            .eq('id', id)
            .single()
        if (readError) throw new Error(readError.message)

        const { error } = await supabase
            .from('banner_groups')
            .update({ is_active: !current.is_active })
            .eq('id', id)
        if (error) throw new Error(error.message)
    },
    deleteBannerGroup: async id => {
        const { error } = await supabase.from('banner_groups').delete().eq('id', id)
        if (error) throw new Error(error.message)
    },
    createBannerGroup: async name => {
        const { data, error } = await supabase
            .from('banner_groups')
            .insert({ name, is_active: false })
            .select()
            .single()
        if (error) throw new Error(error.message)
        return data
    },
    // Uploads the image to the `banners` Storage bucket, then creates the
    // row pointing at its public URL. file is a browser File object.
    addBanner: async ({ banner_group_id, title, description, file }) => {
        const path = `${banner_group_id}/${Date.now()}-${file.name}`
        const { error: uploadError } = await supabase.storage
            .from('banners')
            .upload(path, file)
        if (uploadError) throw new Error(uploadError.message)

        const { data: pub } = supabase.storage.from('banners').getPublicUrl(path)

        const { error } = await supabase.from('banners').insert({
            banner_group_id,
            title,
            description,
            image_url: pub.publicUrl,
        })
        if (error) throw new Error(error.message)
    },
    deleteBanner: async id => {
        const { data: row } = await supabase
            .from('banners')
            .select('image_url')
            .eq('id', id)
            .single()

        const { error } = await supabase.from('banners').delete().eq('id', id)
        if (error) throw new Error(error.message)

        // Best-effort: clean up the uploaded file. A banner row deleted
        // without going through this path (e.g. the Supabase dashboard)
        // just leaves an orphaned file, which isn't harmful.
        const marker = '/storage/v1/object/public/banners/'
        const i = row?.image_url?.indexOf(marker)
        if (i >= 0) {
            const path = row.image_url.slice(i + marker.length)
            await supabase.storage.from('banners').remove([path]).catch(() => {})
        }
    },
}

export default adminApi
