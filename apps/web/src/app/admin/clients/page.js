'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { adminApi, errorMessage } from '@/lib/adminApi'
import {
    Cell,
    EmptyState,
    ErrorState,
    Panel,
    Row,
    Skeleton,
    Table,
    inputClass,
} from '@/components/admin/ui'

const initials = name =>
    (name || '?')
        .split(' ')
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase()

const Players = () => {
    const [players, setPlayers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [query, setQuery] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await adminApi.clients()
            setPlayers(res?.clientUsers ?? [])
        } catch (e) {
            setError(errorMessage(e, 'Could not load players.'))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return players
        return players.filter(
            p =>
                p.name?.toLowerCase().includes(q) ||
                p.email?.toLowerCase().includes(q),
        )
    }, [players, query])

    return (
        <div className="space-y-6">
            <div>
                <h1
                    className="text-2xl text-[#EFE9DA]"
                    style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                    Players
                </h1>
                <p className="mt-1 text-sm text-[#7E938B]">
                    Everyone signed up who isn&rsquo;t staff.
                </p>
            </div>

            <Panel
                title={`${filtered.length} ${filtered.length === 1 ? 'player' : 'players'}`}
                action={
                    <div className="relative">
                        <Search
                            size={14}
                            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7E938B]"
                        />
                        <input
                            className={`${inputClass} w-56 pl-8`}
                            placeholder="Search name or email"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            aria-label="Search players"
                        />
                    </div>
                }>
                {loading ? (
                    <Skeleton />
                ) : error ? (
                    <ErrorState message={error} onRetry={load} />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        message={
                            query
                                ? `Nothing matches “${query}”.`
                                : 'No players have signed up yet.'
                        }
                    />
                ) : (
                    <Table head={['', 'Name', 'Email']}>
                        {filtered.map(p => (
                            <Row key={p.id}>
                                <Cell className="w-12">
                                    {p.avatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={p.avatar}
                                            alt=""
                                            className="h-8 w-8 rounded-full object-cover"
                                        />
                                    ) : (
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#1E322C] bg-[#0C1714] text-xs text-[#7E938B]">
                                            {initials(p.name)}
                                        </span>
                                    )}
                                </Cell>
                                <Cell>{p.name}</Cell>
                                <Cell className="text-[#7E938B]">{p.email}</Cell>
                            </Row>
                        ))}
                    </Table>
                )}
            </Panel>
        </div>
    )
}

export default Players
