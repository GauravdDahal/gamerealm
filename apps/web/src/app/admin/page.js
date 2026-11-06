'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { adminApi, errorMessage } from '@/lib/adminApi'
import { ErrorState, Panel, Skeleton } from '@/components/admin/ui'

/** A casino chip: dashed outer edge, value in the middle. */
const Chip = ({ value, label, href }) => {
    const body = (
        <div className="flex flex-col items-center gap-3">
            <div className="relative flex h-32 w-32 items-center justify-center">
                <span
                    className="absolute inset-0 rounded-full border-2 border-dashed border-[#D4AF57]/45"
                    aria-hidden="true"
                />
                <span
                    className="absolute inset-[9px] rounded-full border border-[#1E322C] bg-[#132320]"
                    aria-hidden="true"
                />
                <span
                    className="relative text-3xl tabular-nums text-[#EFE9DA]"
                    style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                    {value}
                </span>
            </div>
            <span className="text-sm text-[#7E938B]">{label}</span>
        </div>
    )

    return href ? (
        <Link
            href={href}
            className="rounded transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF57]">
            {body}
        </Link>
    ) : (
        body
    )
}

const Overview = () => {
    const [stats, setStats] = useState(null)
    const [notices, setNotices] = useState([])
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
                    Accounts on the platform right now.
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
                    <div className="flex flex-wrap justify-center gap-10 rounded border border-[#1E322C] bg-[#132320] px-6 py-10 sm:justify-start sm:gap-14 sm:px-10">
                        <Chip
                            value={stats?.adminUsersCount ?? 0}
                            label="Admin users"
                            href="/admin/users"
                        />
                        <Chip
                            value={stats?.clientUsersCount ?? 0}
                            label="Players"
                            href="/admin/clients"
                        />
                    </div>

                    <Panel title="Needs attention">
                        {notices.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-[#7E938B]">
                                Nothing waiting on you.
                            </p>
                        ) : (
                            <ul className="divide-y divide-[#1E322C]/60">
                                {notices.map((n, i) => (
                                    <li
                                        key={i}
                                        className="flex items-center justify-between gap-4 px-4 py-3">
                                        <span className="text-sm text-[#EFE9DA]">
                                            {n.message}
                                        </span>
                                        <span className="rounded-full border border-[#D4AF57]/40 px-2 py-0.5 text-xs tabular-nums text-[#D4AF57]">
                                            {n.count}
                                        </span>
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
