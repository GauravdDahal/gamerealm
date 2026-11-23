'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, XCircle, Ban } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const views = {
    pending: {
        icon: Clock,
        tone: 'text-amber-400',
        title: 'Your account is being reviewed',
        body: "Someone on our team is checking your details. You'll be able to sign in and play as soon as it's approved. This usually takes a day or so.",
    },
    rejected: {
        icon: XCircle,
        tone: 'text-red-400',
        title: 'Your application was declined',
        body: 'We were not able to approve this account.',
    },
    suspended: {
        icon: Ban,
        tone: 'text-red-400',
        title: 'Your account is suspended',
        body: 'Access has been paused. Contact support if you think this is a mistake.',
    },
}

const AccountPending = () => {
    const router = useRouter()
    const supabase = createClient()
    const [state, setState] = useState({ loading: true, user: null })

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession()

            if (!session) {
                if (!cancelled) router.replace('/users')
                return
            }

            const { data } = await supabase.rpc('my_access')
            if (cancelled) return

            // Staff and approved players have no business on this screen.
            if (data?.is_staff || data?.profile?.status === 'approved') {
                router.replace('/')
                return
            }

            setState({
                loading: false,
                user: { ...data?.profile, email: session.user.email },
            })
        }

        load()
        return () => {
            cancelled = true
        }
    }, [router, supabase])

    const signOut = async () => {
        await supabase.auth.signOut()
        window.location.href = '/users'
    }

    const shell = children => (
        <main className="auth">
            <header className="auth-bar">
                <a href="/" className="auth-brand" aria-label="Thunder Sweeps home">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/images/brand/thunder-sweeps-mark.svg" alt="" width="44" height="44" />
                    <span className="ts-wordmark" aria-hidden="true">
                        <span className="ts-word-1">THUNDER</span>
                        <span className="ts-word-2"> SWEEPS</span>
                    </span>
                </a>
            </header>
            <div className="auth-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
                <div className="auth-card">
                    <div className="auth-card-edge" aria-hidden="true" />
                    <div className="auth-card-body">{children}</div>
                </div>
            </div>
        </main>
    )

    if (state.loading) {
        return shell(<p className="auth-hint">Loading…</p>)
    }

    const view = views[state.user?.status] ?? views.pending
    const Icon = view.icon

    return shell(
        <div className="auth-content">
            <div className="auth-heading">
                <Icon className={`mb-4 h-10 w-10 ${view.tone}`} strokeWidth={1.75} aria-hidden="true" />
                <h1>{view.title}</h1>
                <p>{view.body}</p>
            </div>

            {state.user?.status_reason && (
                <div className="mb-5 rounded-xl border border-line bg-night px-4 py-3">
                    <p className="text-sm font-bold text-muted">Reason given</p>
                    <p className="mt-1 text-base text-ink">{state.user.status_reason}</p>
                </div>
            )}

            <p className="auth-hint">Signed in as {state.user?.email}</p>
            <button type="button" onClick={signOut} className="auth-submit mt-4">
                Sign out
            </button>
            <p className="auth-switch">
                Need help? <a href="/support">Contact support</a>
            </p>
        </div>,
    )
}

export default AccountPending
