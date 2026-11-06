'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, X, Ban, RotateCcw, Search } from 'lucide-react'
import { adminApi, errorMessage } from '@/lib/adminApi'
import {
    Badge,
    Button,
    Cell,
    EmptyState,
    ErrorState,
    Field,
    Modal,
    Panel,
    Row,
    Skeleton,
    Table,
    inputClass,
    useToast,
} from '@/components/admin/ui'

const tabs = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'suspended', label: 'Suspended' },
    { key: 'all', label: 'All' },
]

const statusTone = { approved: 'brass', rejected: 'clay', suspended: 'clay' }

const formatDate = value => {
    if (!value) return '—'
    const d = new Date(value)
    return Number.isNaN(d.getTime())
        ? value
        : d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

const age = dob => {
    if (!dob) return null
    const b = new Date(dob)
    if (Number.isNaN(b.getTime())) return null
    const now = new Date()
    let a = now.getFullYear() - b.getFullYear()
    const m = now.getMonth() - b.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--
    return a
}

const Registrations = () => {
    const toast = useToast()
    const [tab, setTab] = useState('pending')
    const [search, setSearch] = useState('')
    const [rows, setRows] = useState([])
    const [counts, setCounts] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [detail, setDetail] = useState(null)
    const [action, setAction] = useState(null) // { user, type }
    const [reason, setReason] = useState('')
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params = { status: tab }
            if (search.trim()) params.search = search.trim()
            const res = await adminApi.registrations(params)
            setRows(res?.registrations?.data ?? [])
            setCounts(res?.counts ?? {})
        } catch (e) {
            setError(errorMessage(e, 'Could not load registrations.'))
        } finally {
            setLoading(false)
        }
    }, [tab, search])

    useEffect(() => {
        const t = setTimeout(load, search ? 350 : 0)
        return () => clearTimeout(t)
    }, [load, search])

    const approve = async user => {
        setBusy(true)
        try {
            await adminApi.approveRegistration(user.id)
            toast(`${user.name} approved.`)
            setDetail(null)
            load()
        } catch (e) {
            toast(errorMessage(e, 'Could not approve.'), 'error')
        } finally {
            setBusy(false)
        }
    }

    const runAction = async () => {
        const { user, type } = action
        setBusy(true)
        try {
            if (type === 'reject') await adminApi.rejectRegistration(user.id, reason)
            if (type === 'suspend') await adminApi.suspendRegistration(user.id, reason)
            toast(type === 'reject' ? 'Registration rejected.' : 'Account suspended.')
            setAction(null)
            setReason('')
            setDetail(null)
            load()
        } catch (e) {
            toast(errorMessage(e, 'Could not complete that.'), 'error')
        } finally {
            setBusy(false)
        }
    }

    const reinstate = async user => {
        setBusy(true)
        try {
            await adminApi.reinstateRegistration(user.id)
            toast(`${user.name} moved back to pending.`)
            setDetail(null)
            load()
        } catch (e) {
            toast(errorMessage(e, 'Could not reinstate.'), 'error')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1
                    className="text-2xl text-[#EFE9DA]"
                    style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                    Registrations
                </h1>
                <p className="mt-1 text-sm text-[#7E938B]">
                    New players can&rsquo;t use the site until you approve them.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`rounded border px-3 py-1.5 text-sm transition-colors
                            ${
                                tab === t.key
                                    ? 'border-[#D4AF57] text-[#D4AF57]'
                                    : 'border-[#1E322C] text-[#7E938B] hover:text-[#EFE9DA]'
                            }`}>
                        {t.label}
                        {counts[t.key] !== undefined && (
                            <span className="ml-2 tabular-nums opacity-70">
                                {counts[t.key]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <Panel
                title={`${rows.length} shown`}
                action={
                    <div className="relative">
                        <Search
                            size={14}
                            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7E938B]"
                        />
                        <input
                            className={`${inputClass} w-56 pl-8`}
                            placeholder="Name, email or phone"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            aria-label="Search registrations"
                        />
                    </div>
                }>
                {loading ? (
                    <Skeleton rows={6} />
                ) : error ? (
                    <ErrorState message={error} onRetry={load} />
                ) : rows.length === 0 ? (
                    <EmptyState
                        message={
                            tab === 'pending'
                                ? 'Nothing waiting for review.'
                                : 'No accounts with that status.'
                        }
                    />
                ) : (
                    <Table head={['Name', 'Contact', 'Country', 'Signed up', 'Status', '']}>
                        {rows.map(u => (
                            <Row key={u.id}>
                                <Cell>
                                    <button
                                        onClick={() => setDetail(u)}
                                        className="text-left hover:text-[#D4AF57]">
                                        {u.name}
                                    </button>
                                </Cell>
                                <Cell className="text-[#7E938B]">
                                    <span className="block">{u.email}</span>
                                    <span className="block text-xs">{u.phone}</span>
                                </Cell>
                                <Cell className="text-[#7E938B]">{u.country ?? '—'}</Cell>
                                <Cell className="whitespace-nowrap text-[#7E938B]">
                                    {formatDate(u.created_at)}
                                </Cell>
                                <Cell>
                                    <Badge tone={statusTone[u.status]}>{u.status}</Badge>
                                </Cell>
                                <Cell className="text-right whitespace-nowrap">
                                    <span className="inline-flex gap-1">
                                        {u.status !== 'approved' && (
                                            <button
                                                onClick={() => approve(u)}
                                                disabled={busy}
                                                title="Approve"
                                                aria-label={`Approve ${u.name}`}
                                                className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#D4AF57] disabled:opacity-30">
                                                <Check size={15} />
                                            </button>
                                        )}
                                        {u.status === 'pending' && (
                                            <button
                                                onClick={() => {
                                                    setAction({ user: u, type: 'reject' })
                                                    setReason('')
                                                }}
                                                title="Reject"
                                                aria-label={`Reject ${u.name}`}
                                                className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#C25B45]">
                                                <X size={15} />
                                            </button>
                                        )}
                                        {u.status === 'approved' && (
                                            <button
                                                onClick={() => {
                                                    setAction({ user: u, type: 'suspend' })
                                                    setReason('')
                                                }}
                                                title="Suspend"
                                                aria-label={`Suspend ${u.name}`}
                                                className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#C25B45]">
                                                <Ban size={15} />
                                            </button>
                                        )}
                                        {(u.status === 'rejected' ||
                                            u.status === 'suspended') && (
                                            <button
                                                onClick={() => reinstate(u)}
                                                disabled={busy}
                                                title="Move back to pending"
                                                aria-label={`Reinstate ${u.name}`}
                                                className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA] disabled:opacity-30">
                                                <RotateCcw size={15} />
                                            </button>
                                        )}
                                    </span>
                                </Cell>
                            </Row>
                        ))}
                    </Table>
                )}
            </Panel>

            {/* ------------------------------------------------------- detail */}
            <Modal
                open={!!detail}
                title={detail?.name ?? ''}
                onClose={() => setDetail(null)}
                footer={
                    detail?.status !== 'approved' ? (
                        <Button
                            variant="primary"
                            onClick={() => approve(detail)}
                            disabled={busy}>
                            Approve account
                        </Button>
                    ) : null
                }>
                {detail && (
                    <dl className="space-y-3 text-sm">
                        {[
                            ['Email', detail.email],
                            ['Phone', detail.phone],
                            [
                                'Date of birth',
                                detail.date_of_birth
                                    ? `${formatDate(detail.date_of_birth)} (${age(detail.date_of_birth)} years old)`
                                    : '—',
                            ],
                            ['Country', detail.country],
                            ['Address', detail.address],
                            ['Signed up', formatDate(detail.created_at)],
                            ['Status', detail.status],
                            ['Reviewed by', detail.reviewer?.name ?? '—'],
                            ['Reviewed at', formatDate(detail.reviewed_at)],
                        ].map(([label, value]) => (
                            <div key={label} className="flex gap-4">
                                <dt className="w-32 flex-shrink-0 text-[#7E938B]">
                                    {label}
                                </dt>
                                <dd className="text-[#EFE9DA]">{value || '—'}</dd>
                            </div>
                        ))}
                        {detail.status_reason && (
                            <div className="flex gap-4">
                                <dt className="w-32 flex-shrink-0 text-[#7E938B]">
                                    Reason
                                </dt>
                                <dd className="text-[#EFE9DA]">{detail.status_reason}</dd>
                            </div>
                        )}
                    </dl>
                )}
            </Modal>

            {/* ------------------------------------------------ reason prompt */}
            <Modal
                open={!!action}
                title={
                    action?.type === 'reject'
                        ? `Reject ${action?.user?.name}`
                        : `Suspend ${action?.user?.name}`
                }
                onClose={() => setAction(null)}
                footer={
                    <>
                        <Button onClick={() => setAction(null)} disabled={busy}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={runAction}
                            disabled={busy || !reason.trim()}>
                            {busy
                                ? 'Working…'
                                : action?.type === 'reject'
                                  ? 'Reject'
                                  : 'Suspend'}
                        </Button>
                    </>
                }>
                <Field
                    label="Reason"
                    hint="Shown to the player on their account screen.">
                    <textarea
                        rows={3}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        className={inputClass}
                        placeholder="Details could not be verified"
                    />
                </Field>
            </Modal>
        </div>
    )
}

export default Registrations
