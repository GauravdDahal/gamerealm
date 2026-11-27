'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { adminApi, errorMessage } from '@/lib/adminApi'
import { ErrorState, Panel, Skeleton } from '@/components/admin/ui'

/** One figure in the stats strip: label above, number below. */
const Stat = ({ value, label, href }) => (
    <Link
        href={href}
        className="flex flex-col gap-1 bg-[#132320] px-6 py-5 transition-colors hover:bg-[#0C1714] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D4AF57]">
        <span className="text-sm text-[#7E938B]">{label}</span>
        <span className="text-3xl tabular-nums text-[#EFE9DA]" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
            {value}
        </span>
    </Link>
)

const Overview = () => {
    const [stats, setStats] = useState(null)
    const [notices, setNotices] = useState([])
    const [extra, setExtra] = useState({})
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            // Notifications are non-critical, so a failure there shouldn't blank the page.
            const [dash, notif] = await Promise.allSettled([
                adminApi.dashboard(),
                adminApi.notifications(),
            ])

            if (dash.status === 'rejected') throw dash.reason
            setStats(dash.value?.statCardData ?? {})
            setNotices(
                notif.status === 'fulfilled' ? (notif.value?.notifications ?? []) : [],
            )
            setExtra(notif.status === 'fulfilled' ? notif.value : {})
        } catch (e) {
            setError(errorMessage(e, 'Could not load the dashboard.'))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    return (
        <div className="space-y-8">
            <div>
                <h1
                    className="text-2xl text-[#EFE9DA]"
                    style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                    Overview
                </h1>
                <p className="mt-1 text-sm text-[#7E938B]">
                    Your site at a glance, and what is waiting on you.
                </p>
            </div>

            {error ? (
                <Panel>
                    <ErrorState message={error} onRetry={load} />
                </Panel>
            ) : loading ? (
                <Panel>
                    <Skeleton rows={4} />
                </Panel>
            ) : (
                <>
                    {/* One strip of figures with hairline dividers, not four identical cards. */}
                    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#1E322C] bg-[#1E322C] sm:grid-cols-4">
                        <Stat value={extra.unread ?? 0} label="Unread messages" href="/admin/chats" />
                        <Stat value={extra.toCredit ?? 0} label="Prizes to credit" href="/admin/wheel" />
                        <Stat value={stats?.clientUsersCount ?? 0} label="Players" href="/admin/players" />
                        <Stat value={stats?.adminUsersCount ?? 0} label="Staff" href="/admin/users" />
                    </div>

                    <Panel title="Needs attention">
                        {notices.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-[#7E938B]">
                                Nothing waiting on you.
                            </p>
                        ) : (
                            <ul className="divide-y divide-[#1E322C]/60">
                                {notices.map((n, i) => (
                                    <li key={i}>
                                        <Link
                                            href={n.href ?? '/admin'}
                                            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-[#0C1714]/50">
                                            <span className="text-sm text-[#EFE9DA]">{n.message}</span>
                                            <span className="text-sm font-semibold tabular-nums text-[#D4AF57]">{n.count}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </>
            )}
        </div>
    )
}

export default Overview
