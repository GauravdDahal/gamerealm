import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Google (and other OAuth) sign-ins land here with a one-time code. */
export async function GET(request) {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const next = url.searchParams.get('next')
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) return NextResponse.redirect(new URL(safeNext, url.origin))
    }
    return NextResponse.redirect(new URL('/users?oauth=failed', url.origin))
}
