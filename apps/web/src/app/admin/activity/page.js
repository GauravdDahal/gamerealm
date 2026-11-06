'use client'

import { useCallback, useEffect, useState } from 'react'
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminApi, errorMessage } from '@/lib/adminApi'
import {
    Badge,
    Button,
    Cell,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    Panel,
    Row,
    Skeleton,
    Table,
    inputClass,
    useToast,
} from '@/components/admin/ui'

const formatWhen = iso => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    })
}

const ActivityLog = () => {
    const toast = useToast()
    const [page, setPage] = useState(1)
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const [paginator, setPaginator] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [confirming, setConfirming] = useState(false)
    const [clearing, setClearing] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params = { page }
            if (from) params.from_date = from
            if (to) params.to_date = to
            const res = await adminApi.activity(params)
            setPaginator(res?.activities ?? null)
        } catch (e) {
            setError(
                errorMessage(
                    e,
                    'Could not load the activity log. This needs the activity_log-view permission.',
                ),
            )
        } finally {
            setLoading(false)
        }
    }, [page, from, to])

    useEffect(() => {
        load()
    }, [load])

    const clear = async () => {
        setClearing(true)
        try {
            await adminApi.clearActivity()
            toast('Activity log cleared.')
            setConfirming(false)
            setPage(1)
            load()
        } catch (e) {
            toast(errorMessage(e, 'Could not clear the log.'), 'error')
        } finally {
            setClearing(false)
        }
    }

    const rows = paginator?.data ?? []
    const lastPage = paginator?.last_page ?? 1

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1
                        className="text-2xl text-[#EFE9DA]"
                        style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                        Activity
                    </h1>
                    <p className="mt-1 text-sm text-[#7E938B]">
                        A record of what changed and who changed it.
                    </p>
                </div>
                <Button variant="danger" onClick={() => setConfirming(true)}>
                    <Trash2 size={15} />
                    Clear log
                </Button>
            </div>

            <Panel
                title={
                    paginator
                        ? `${paginator.total ?? rows.length} entries`
                        : 'Entries'
                }
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="date"
                            value={from}
                            max={to || undefined}
                            onChange={e => {
                                setPage(1)
                                setFrom(e.target.value)
                            }}
                            aria-label="From date"
                            className={`${inputClass} w-auto py-1.5`}
                        />
                        <span className="text-xs text-[#7E938B]">to</span>
                        <input
                            type="date"
                            value={to}
                            min={from || undefined}
                            onChange={e => {
                                setPage(1)
                                setTo(e.target.value)
                            }}
                            aria-label="To date"
                            className={`${inputClass} w-auto py-1.5`}
                        />
                        {(from || to) && (
                            <button
                                onClick={() => {
                                    setFrom('')
                                    setTo('')
                                    setPage(1)
                                }}
                                className="text-xs text-[#7E938B] underline-offset-2 hover:text-[#D4AF57] hover:underline">
                                Reset
                            </button>
                        )}
                    </div>
                }>
                {loading ? (
                    <Skeleton rows={8} />
                ) : error ? (
                    <ErrorState message={error} onRetry={load} />
                ) : rows.length === 0 ? (
                    <EmptyState
                        message={
                            from || to
                                ? 'No activity in that date range.'
                                : 'Nothing has been logged yet. Activity appears here as admins make changes.'
                        }
                    />
                ) : (
                    <>
                        <Table head={['When', 'Description', 'By', 'Type']}>
                            {rows.map(a => (
                                <Row key={a.id}>
                                    <Cell className="whitespace-nowrap text-[#7E938B]">
                                        {formatWhen(a.created_at)}
                                    </Cell>
                                    <Cell>{a.description}</Cell>
                                    <Cell className="text-[#7E938B]">
                                        {a.causer?.name ?? 'System'}
                                    </Cell>
                                    <Cell>
                                        <Badge>{a.log_name ?? 'default'}</Badge>
                                    </Cell>
                                </Row>
                            ))}
                        </Table>

                        {lastPage > 1 && (
                            <div className="flex items-center justify-between border-t border-[#1E322C] px-4 py-3">
                                <span className="text-xs text-[#7E938B]">
                                    Page {paginator.current_page} of {lastPage}
                                </span>
                                <span className="flex gap-2">
                                    <Button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={paginator.current_page <= 1}>
                                        <ChevronLeft size={15} />
                                        Previous
                                    </Button>
                                    <Button
                                        onClick={() =>
                                            setPage(p => Math.min(lastPage, p + 1))
                                        }
                                        disabled={paginator.current_page >= lastPage}>
                                        Next
                                        <ChevronRight size={15} />
                                    </Button>
                                </span>
                            </div>
                        )}
                    </>
                )}
            </Panel>

            <ConfirmDialog
                open={confirming}
                title="Clear the whole activity log?"
                body="Every entry is deleted permanently. There's no undo and no export."
                confirmLabel="Clear everything"
                busy={clearing}
                onConfirm={clear}
                onClose={() => setConfirming(false)}
            />
        </div>
    )
}

export default ActivityLog
