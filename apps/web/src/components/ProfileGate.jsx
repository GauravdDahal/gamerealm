'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth'
import { createClient } from '@/lib/supabase/client'

/**
 * After a Google sign-up: sends the player to finish their profile (date of
 * birth, 18+), and applies a referral code saved from an invite link.
 */
export default function ProfileGate() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (loading || !user || user.is_admin) return
        let code = null
        try {
            code = localStorage.getItem('referral-code')
        } catch {}
        if (code && !user.referred_by) {
            createClient()
                .rpc('claim_referral', { p_code: code })
                .then(() => {
                    try {
                        localStorage.removeItem('referral-code')
                    } catch {}
                })
        }
        if (!user.date_of_birth && pathname !== '/complete-profile' && !pathname.startsWith('/auth')) {
            router.replace('/complete-profile')
        }
    }, [user, loading, pathname, router])

    return null
}
