import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role client. Bypasses Row Level Security entirely — this is the
 * "root login" to the database. Only import this file from server-only code
 * (Route Handlers, Server Actions), NEVER from a 'use client' component or
 * anything that ships to the browser. SUPABASE_SERVICE_ROLE_KEY has no
 * NEXT_PUBLIC_ prefix on purpose, so Next.js never bundles it client-side.
 */
export const createAdminClient = () =>
    createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
    )
