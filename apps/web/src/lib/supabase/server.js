import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 * Reads/writes the session cookie through Next's cookies() API. Still uses
 * the anon key and is still subject to RLS — this is NOT the admin client.
 */
export const createClient = async () => {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options),
                        )
                    } catch {
                        // Called from a Server Component that can't set cookies.
                        // Middleware refreshes the session on every request, so
                        // this is safe to ignore.
                    }
                },
            },
        },
    )
}
