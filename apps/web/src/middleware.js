import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

/**
 * Runs on every request. Supabase sessions are short-lived JWTs behind the
 * scenes, refreshed automatically — but only if something calls
 * supabase.auth.getUser() on each request. This is that something. Without
 * it, a signed-in visitor would get silently logged out when their token
 * expires, often mid-session.
 */
export async function middleware(request) {
    let response = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value),
                    )
                    response = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options),
                    )
                },
            },
        },
    )

    // This call is what actually refreshes the token; don't remove it even
    // though the result isn't used here directly.
    await supabase.auth.getUser()

    return response
}

export const config = {
    matcher: [
        /*
         * Run on everything except static assets and image optimisation,
         * so the session cookie stays fresh on normal page navigations.
         */
        '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
