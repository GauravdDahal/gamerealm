'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase client for use in the browser ('use client' components).
 * Uses the public anon key — safe to expose, since every table is protected
 * by Row Level Security on the database side.
 */
export const createClient = () =>
    createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )
