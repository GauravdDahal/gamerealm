'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, XCircle, Ban } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const views = {
    pending: {
        icon: Clock,
        tone: 'text-amber-500',
        title: 'Your account is being reviewed',
        body: "Someone on our team is checking your details. You'll be able to sign in and play as soon as it's approved. This usually takes a day or so.",
    },
    rejected: {
        icon: XCircle,
        tone: 'text-red-500',
        title: 'Your application was declined',
        body: 'We were not able to approve this account.',
    },
    suspended: {
        icon: Ban,
        tone: 'text-red-500',
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

    if (state.loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-50">
                <p className="text-sm text-gray-500">Loading…</p>
            </main>
        )
    }

    const view = views[state.user?.status] ?? views.pending
    const Icon = view.icon

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-sm">
                <Icon className={`mx-auto h-10 w-10 ${view.tone}`} strokeWidth={1.5} />

                <h1 className="mt-4 text-xl font-semibold text-gray-900">
                    {view.title}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{view.body}</p>

                {state.user?.status_reason && (
                    <div className="mt-4 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-left">
                        <p className="text-xs text-gray-500">Reason given</p>
                        <p className="mt-0.5 text-sm text-gray-800">
                            {state.user.status_reason}
                        </p>
                    </div>
                )}

                <p className="mt-6 text-xs text-gray-500">
                    Signed in as {state.user?.email}
                </p>

                <button
                    onClick={signOut}
                    className="mt-3 w-full rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Sign out
                </button>
            </div>
        </main>
    )
}

export default AccountPending
