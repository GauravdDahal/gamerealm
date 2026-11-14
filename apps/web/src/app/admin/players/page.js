'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowUpDown, Ban, ChevronLeft, ChevronRight, KeyRound, Loader2, MessageCircle, Pencil, RotateCcw, Search, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { errorMessage } from '@/lib/adminApi'
import { Badge, Button, EmptyState, ErrorState, Field, Input, Modal, Panel, Skeleton, useToast } from '@/components/admin/ui'
import PlayerMoney from '@/components/admin/PlayerMoney'

const PAGE = 25
const money = n => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const initials = n => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
const ago = iso => {
    if (!iso) return '—'
    const s = (Date.now() - new Date(iso).getTime()) / 1000
    if (s < 60) return 'just now'
    if (s < 3600) return `${Math.floor(s / 60)} min ago`
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`
    if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`
    return new Date(iso).toLocaleDateString()
}
const day = iso => (iso ? new Date(iso).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
const STATUS = {
    approved: ['Active', 'bg-emerald-500/15 text-emerald-300'],
    suspended: ['Suspended', 'bg-red-500/15 text-red-300'],
    pending: ['Needs DOB', 'bg-amber-500/15 text-amber-300'],
    rejected: ['Rejected', 'bg-red-500/15 text-red-300'],
}
const StatusPill = ({ s }) => {
    const [l, c] = STATUS[s] ?? [s, 'bg-[#1E322C] text-[#7E938B]']
    return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c}`}>{l}</span>
}
const Avatar = ({ p, size = 'h-9 w-9' }) => (
    <span className={`relative flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#1E322C] bg-[#0C1714] text-xs text-[#7E938B]`}>
        {p.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : initials(p.name)}
        {p.online_status && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#132320] bg-emerald-400" title="Online" />}
    </span>
)
const TX = { deposit: 'Deposit', wallet_add: 'Wallet add', wallet_out: 'Wallet take-out', bonus_unlock: 'Bonus unlocked', withdraw: 'Withdrawal' }

/* ----------------------------------------------------------- detail panel */
const Detail = ({ supabase, player, perms, onClose, onChanged }) => {
    const toast = useToast()
    const router = useRouter()
    const [d, setD] = useState(null)
    const [error, setError] = useState(null)
    const [tab, setTab] = useState('profile')
    const [edit, setEdit] = useState(null)
    const [suspend, setSuspend] = useState(null)
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        const { data, error: err } = await supabase.rpc('player_detail', { p_player: player.id })
        if (err) setError(errorMessage(err, 'Could not load this player.'))
        else setD(data)
    }, [supabase, player.id])
    useEffect(() => {
        load()
    }, [load])

    const p = d?.profile
    const saveEdit = async e => {
        e.preventDefault()
        setBusy(true)
        const { error: err } = await supabase.rpc('staff_update_player', {
            p_player: player.id, p_name: edit.name, p_phone: edit.phone, p_country: edit.country, p_address: edit.address, p_dob: edit.date_of_birth || null,
        })
        setBusy(false)
        if (err) return toast(errorMessage(err, 'Could not save.'), 'error')
        toast('Profile saved.')
        setEdit(null)
        load()
        onChanged()
    }
    const setStatus = async (status, reason) => {
        setBusy(true)
        const { error: err } = await supabase.rpc('staff_set_player_status', { p_player: player.id, p_status: status, p_reason: reason ?? null })
        setBusy(false)
        if (err) return toast(errorMessage(err, 'Could not change the status.'), 'error')
        toast(status === 'suspended' ? 'Player suspended.' : 'Player reactivated.')
        setSuspend(null)
        load()
        onChanged()
    }
    const resetPassword = async () => {
        if (!window.confirm(`Send a password reset email to ${p.email}?`)) return
        const { error: err } = await supabase.auth.resetPasswordForEmail(p.email, { redirectTo: `${window.location.origin}/password-reset` })
        if (err) return toast(errorMessage(err, 'Could not send the email.'), 'error')
        await supabase.rpc('log_player_action', { p_player: player.id, p_description: `Password reset email sent to ${p.name}` })
        toast('Password reset email sent.')
        load()
    }
    const openChat = async () => {
        const { data, error: err } = await supabase.rpc('staff_open_chat', { p_player: player.id })
        if (err) return toast(errorMessage(err, 'Could not open the chat.'), 'error')
        router.push(`/admin/chats?open=${data}`)
    }

    const tabs = [['profile', 'Profile'], ['wallet', 'Wallet'], ['spins', 'Spins & referrals'], ['activity', 'Activity']]
    const row = (k, v) => (
        <div className="flex gap-3 py-1.5 text-sm"><dt className="w-28 shrink-0 text-[#7E938B]">{k}</dt><dd className="min-w-0 break-words text-[#EFE9DA]">{v || '—'}</dd></div>
    )

    return (
        <div className="fixed inset-0 z-40 flex justify-end">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
            <aside role="dialog" aria-label={player.name} className="relative flex h-full w-full max-w-xl flex-col border-l border-[#1E322C] bg-[#132320] shadow-2xl">
                <header className="flex items-start gap-3 border-b border-[#1E322C] p-4">
                    <Avatar p={player} size="h-12 w-12" />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-lg text-[#EFE9DA]">{player.name}</p>
                        <p className="truncate text-xs text-[#7E938B]">{player.email}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2"><StatusPill s={p?.status ?? player.status} />
                            <span className="text-[11px] text-[#7E938B]">{player.online_status ? 'Online now' : `Last seen ${ago(player.last_seen_at)}`}</span></div>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="rounded p-1 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA]"><X size={18} /></button>
                </header>
                <div className="flex flex-wrap gap-2 border-b border-[#1E322C] px-4 py-2">
                    {perms.has('chat-view') && <Button onClick={openChat}><MessageCircle size={14} /> Open chat</Button>}
                    {perms.has('player-update') && p && <Button onClick={() => setEdit({ name: p.name ?? '', phone: p.phone ?? '', country: p.country ?? '', address: p.address ?? '', date_of_birth: p.date_of_birth ?? '' })}><Pencil size={14} /> Edit</Button>}
                    <Button onClick={resetPassword} disabled={!p}><KeyRound size={14} /> Reset password</Button>
                    {perms.has('player-suspend') && p && (p.status === 'suspended'
                        ? <Button onClick={() => setStatus('approved')} disabled={busy}><RotateCcw size={14} /> Reactivate</Button>
                        : <Button variant="danger" onClick={() => setSuspend('')}><Ban size={14} /> Suspend</Button>)}
                </div>
                {perms.has('money-manage') && <PlayerMoney supabase={supabase} chat={{ client_id: player.id, client_name: player.name, referrer_name: p?.referrer_name }} onChange={load} />}
                <nav className="flex gap-1 border-b border-[#1E322C] px-2">
                    {tabs.map(([k, l]) => (
                        <button key={k} onClick={() => setTab(k)} className={`border-b-2 px-3 py-2 text-xs ${tab === k ? 'border-[#D4AF57] text-[#EFE9DA]' : 'border-transparent text-[#7E938B] hover:text-[#EFE9DA]'}`}>{l}</button>
                    ))}
                </nav>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {error ? <ErrorState message={error} onRetry={load} /> : !d ? <Skeleton rows={6} /> : tab === 'profile' ? (
                        <dl className="divide-y divide-[#1E322C]/60">
                            {row('Name', p.name)}{row('Email', p.email)}{row('Phone', p.phone)}{row('Date of birth', p.date_of_birth)}
                            {row('Country', p.country)}{row('Address', p.address)}{row('Joined', day(p.created_at))}
                            {row('Referral code', p.referral_code)}{row('Referred by', p.referrer_name)}
                            {p.status_reason && row('Status reason', p.status_reason)}
                            {p.reviewed_at && row('Last change', `${day(p.reviewed_at)}${p.reviewed_by_name ? ` by ${p.reviewed_by_name}` : ''}`)}
                        </dl>
                    ) : tab === 'wallet' ? (
                        <div className="space-y-3">
                            <p className="text-sm text-[#EFE9DA]">Balance <b className="text-emerald-400">{money(d.wallet.balance)}</b> · locked bonus {money(d.wallet.locked)}</p>
                            {d.transactions.length === 0 ? <EmptyState message="No money activity yet." /> : (
                                <ul className="divide-y divide-[#1E322C]/60 text-sm">
                                    {d.transactions.map(t => (
                                        <li key={t.id} className="flex flex-wrap items-center gap-2 py-2">
                                            <span className="flex-1 text-[#EFE9DA]">{TX[t.kind] ?? t.kind}{t.game_title ? ` · ${t.game_title}` : ''}
                                                {t.parts && t.parts.length > 1 && <span className="block text-[11px] text-[#7E938B]">{t.parts.map(x => `${money(x.amount)} ${x.type === 'payout' ? x.method : x.type}`).join(' + ')}</span>}
                                                {t.note && <span className="block text-[11px] text-[#7E938B]">{t.note}</span>}</span>
                                            <span className={['wallet_out', 'withdraw'].includes(t.kind) ? 'text-red-300' : 'text-emerald-300'}>{money(t.amount)}{Number(t.bonus_amount) > 0 && ` +${money(t.bonus_amount)}`}</span>
                                            <span className="w-full text-[11px] text-[#7E938B]">{day(t.created_at)}{t.staff_name ? ` · ${t.staff_name}` : ''}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ) : tab === 'spins' ? (
                        <div className="space-y-5">
                            <section><h3 className="mb-2 text-xs uppercase tracking-wide text-[#7E938B]">Wheel spins</h3>
                                {d.spins.length === 0 ? <p className="text-sm text-[#7E938B]">No spins yet.</p> : (
                                    <ul className="space-y-1 text-sm">{d.spins.map(s => <li key={s.id} className="flex justify-between gap-2"><span className="text-[#D4AF57]">{s.prize_label}</span><span className="text-[#7E938B]">{s.status} · {day(s.created_at)}</span></li>)}</ul>)}</section>
                            <section><h3 className="mb-2 text-xs uppercase tracking-wide text-[#7E938B]">Friends referred ({d.friends.length})</h3>
                                {d.friends.length === 0 ? <p className="text-sm text-[#7E938B]">Nobody yet.</p> : (
                                    <ul className="space-y-1 text-sm">{d.friends.map(f => <li key={f.id} className="flex justify-between gap-2"><span className="text-[#EFE9DA]">{f.name}</span><StatusPill s={f.status} /></li>)}</ul>)}</section>
                            <section><h3 className="mb-2 text-xs uppercase tracking-wide text-[#7E938B]">Referral rewards</h3>
                                {d.rewards.length === 0 ? <p className="text-sm text-[#7E938B]">None yet.</p> : (
                                    <ul className="space-y-1 text-sm">{d.rewards.map(r => <li key={r.id} className="flex justify-between gap-2"><span className="text-[#EFE9DA]">{r.level_name} · {money(r.reward_amount)}{r.deposit_bonus_pct > 0 ? ` + ${r.deposit_bonus_pct}%` : ''}</span><span className="text-[#7E938B]">{r.status}</span></li>)}</ul>)}</section>
                        </div>
                    ) : (
                        d.activity.length === 0 ? <EmptyState message="No account actions recorded yet." /> : (
                            <ul className="space-y-3 text-sm">{d.activity.map(a => (
                                <li key={a.id}><p className="text-[#EFE9DA]">{a.description}</p>
                                    <p className="text-[11px] text-[#7E938B]">{new Date(a.created_at).toLocaleString()}{a.causer_name ? ` · ${a.causer_name}` : ''}{a.properties?.reason ? ` · “${a.properties.reason}”` : ''}</p></li>
                            ))}</ul>
                        )
                    )}
                </div>
            </aside>

            <Modal open={!!edit} title={`Edit ${player.name}`} onClose={() => !busy && setEdit(null)}>
                {edit && (
                    <form onSubmit={saveEdit} className="space-y-3">
                        <Field label="Name"><Input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} required maxLength={80} /></Field>
                        <Field label="Phone"><Input type="tel" value={edit.phone} onChange={e => setEdit({ ...edit, phone: e.target.value })} maxLength={30} /></Field>
                        <Field label="Date of birth" hint="Must be 18 or older."><Input type="date" value={edit.date_of_birth} onChange={e => setEdit({ ...edit, date_of_birth: e.target.value })} /></Field>
                        <Field label="Country"><Input value={edit.country} onChange={e => setEdit({ ...edit, country: e.target.value })} maxLength={60} /></Field>
                        <Field label="Address"><Input value={edit.address} onChange={e => setEdit({ ...edit, address: e.target.value })} maxLength={200} /></Field>
                        <p className="text-[11px] text-[#7E938B]">Email is the login and can only be changed by the player.</p>
                        <Button type="submit" variant="primary" disabled={busy}>{busy && <Loader2 size={14} className="animate-spin" />} Save</Button>
                    </form>
                )}
            </Modal>
            <Modal open={suspend !== null} title={`Suspend ${player.name}?`} onClose={() => !busy && setSuspend(null)}
                footer={<><Button onClick={() => setSuspend(null)} disabled={busy}>Cancel</Button>
                    <Button variant="danger" onClick={() => setStatus('suspended', suspend)} disabled={busy || !suspend?.trim()}>{busy && <Loader2 size={14} className="animate-spin" />} Suspend</Button></>}>
                <p className="mb-3 text-sm text-[#7E938B]">They won’t be able to chat, spin or use their account until reactivated. Their money history is kept.</p>
                <Field label="Reason (shown to the player)"><Input value={suspend ?? ''} onChange={e => setSuspend(e.target.value)} maxLength={200} autoFocus /></Field>
            </Modal>
        </div>
    )
}

/* -------------------------------------------------------------- the list */
export default function Players() {
    const supabase = useMemo(() => createClient(), [])
    const [rows, setRows] = useState(null)
    const [error, setError] = useState(null)
    const [perms, setPerms] = useState(new Set())
    const [q, setQ] = useState('')
    const [status, setStatus] = useState('all')
    const [onlineOnly, setOnlineOnly] = useState(false)
    const [referred, setReferred] = useState('any')
    const [hasAccounts, setHasAccounts] = useState(false)
    const [sort, setSort] = useState(['created_at', 'desc'])
    const [page, setPage] = useState(0)
    const [open, setOpen] = useState(null)

    const load = useCallback(async () => {
        setError(null)
        const [list, access] = await Promise.all([supabase.rpc('list_player_overview'), supabase.rpc('my_access')])
        if (list.error) setError(errorMessage(list.error, 'Could not load players. This needs the player-view permission and the latest database update (0018).'))
        else setRows(list.data ?? [])
        const a = access.data
        setPerms(new Set((a?.roles ?? []).includes('super-admin') ? ['chat-view', 'player-update', 'player-suspend', 'money-manage'] : a?.permissions ?? []))
    }, [supabase])
    useEffect(() => {
        load()
    }, [load])

    const shown = useMemo(() => {
        const n = q.trim().toLowerCase()
        const [key, dir] = sort
        return (rows ?? [])
            .filter(r => !n || `${r.name} ${r.email} ${r.phone ?? ''}`.toLowerCase().includes(n))
            .filter(r => status === 'all' || r.status === status)
            .filter(r => !onlineOnly || r.online_status)
            .filter(r => referred === 'any' || (referred === 'yes' ? !!r.referrer_name : !r.referrer_name))
            .filter(r => !hasAccounts || r.game_account_count > 0)
            .sort((a, b) => {
                const av = key === 'wallet_balance' ? Number(a[key]) : new Date(a[key] ?? 0).getTime()
                const bv = key === 'wallet_balance' ? Number(b[key]) : new Date(b[key] ?? 0).getTime()
                return dir === 'asc' ? av - bv : bv - av
            })
    }, [rows, q, status, onlineOnly, referred, hasAccounts, sort])
    useEffect(() => setPage(0), [q, status, onlineOnly, referred, hasAccounts, sort])

    const pages = Math.max(1, Math.ceil(shown.length / PAGE))
    const slice = shown.slice(page * PAGE, page * PAGE + PAGE)
    const sortBtn = (key, label) => (
        <button onClick={() => setSort(([k, d]) => [key, k === key && d === 'desc' ? 'asc' : 'desc'])}
            className={`inline-flex items-center gap-1 ${sort[0] === key ? 'text-[#EFE9DA]' : ''}`}>{label}<ArrowUpDown size={11} /></button>
    )
    const select = 'rounded border border-[#1E322C] bg-[#0C1714] px-2 py-1.5 text-sm text-[#EFE9DA]'

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl text-[#EFE9DA]" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>Players</h1>
                <p className="mt-1 text-sm text-[#7E938B]">Everyone who has signed up. New players are approved automatically; open a player to see their wallet, spins and history.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1 basis-60">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7E938B]" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email or phone…"
                        className="w-full rounded border border-[#1E322C] bg-[#132320] py-2 pl-9 pr-3 text-sm text-[#EFE9DA] placeholder:text-[#7E938B] focus:border-[#D4AF57] focus:outline-none" />
                </div>
                <select value={status} onChange={e => setStatus(e.target.value)} className={select} aria-label="Status">
                    <option value="all">All statuses</option><option value="approved">Active</option><option value="suspended">Suspended</option><option value="pending">Needs DOB</option>
                </select>
                <select value={referred} onChange={e => setReferred(e.target.value)} className={select} aria-label="Referred">
                    <option value="any">Referred or not</option><option value="yes">Referred</option><option value="no">Not referred</option>
                </select>
                <select value={sort.join(':')} onChange={e => setSort(e.target.value.split(':'))} className={`${select} md:hidden`} aria-label="Sort">
                    <option value="created_at:desc">Newest first</option><option value="created_at:asc">Oldest first</option>
                    <option value="last_seen_at:desc">Recently seen</option><option value="wallet_balance:desc">Highest wallet</option>
                </select>
                <label className="flex items-center gap-1.5 text-sm text-[#7E938B]"><input type="checkbox" checked={onlineOnly} onChange={e => setOnlineOnly(e.target.checked)} className="accent-[#D4AF57]" /> Online now</label>
                <label className="flex items-center gap-1.5 text-sm text-[#7E938B]"><input type="checkbox" checked={hasAccounts} onChange={e => setHasAccounts(e.target.checked)} className="accent-[#D4AF57]" /> Has game accounts</label>
            </div>

            <Panel title={rows ? `${shown.length} player${shown.length === 1 ? '' : 's'}` : 'Players'}>
                {error ? <ErrorState message={error} onRetry={load} /> : !rows ? <Skeleton /> : shown.length === 0 ? <EmptyState message="No players match." /> : (
                    <>
                        {/* Phones: one card per player */}
                        <ul className="divide-y divide-[#1E322C]/60 md:hidden">
                            {slice.map(r => (
                                <li key={r.id}>
                                    <button onClick={() => setOpen(r)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[#0C1714]/60">
                                        <Avatar p={r} />
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="truncate text-[#EFE9DA]">{r.name}</span>
                                                <span className="shrink-0 text-sm text-emerald-300">{money(r.wallet_balance)}</span>
                                            </span>
                                            <span className="block truncate text-xs text-[#7E938B]">{r.email}</span>
                                            <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#7E938B]">
                                                <StatusPill s={r.status} />
                                                {r.online_status ? <span className="text-emerald-400">Online</span> : <span>Seen {ago(r.last_seen_at)}</span>}
                                                {r.referrer_name && <span className="text-[#D4AF57]">Ref: {r.referrer_name}</span>}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead className="text-left text-[11px] uppercase tracking-wide text-[#7E938B]">
                                    <tr className="border-b border-[#1E322C]">
                                        <th className="px-4 py-2 font-normal">Player</th><th className="px-2 py-2 font-normal">Status</th>
                                        <th className="px-2 py-2 font-normal">{sortBtn('wallet_balance', 'Wallet')}</th><th className="px-2 py-2 font-normal">Referred by</th>
                                        <th className="px-2 py-2 font-normal">{sortBtn('last_seen_at', 'Last seen')}</th><th className="px-2 py-2 font-normal">{sortBtn('created_at', 'Joined')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1E322C]/60">
                                    {slice.map(r => (
                                        <tr key={r.id} onClick={() => setOpen(r)} className="cursor-pointer hover:bg-[#0C1714]/60">
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-3"><Avatar p={r} />
                                                    <div className="min-w-0"><p className="truncate text-[#EFE9DA]">{r.name}</p><p className="truncate text-xs text-[#7E938B]">{r.email}</p></div></div>
                                            </td>
                                            <td className="px-2"><StatusPill s={r.status} /></td>
                                            <td className="px-2 text-emerald-300">{money(r.wallet_balance)}{Number(r.locked_bonus) > 0 && <span className="block text-[11px] text-[#7E938B]">+{money(r.locked_bonus)} locked</span>}</td>
                                            <td className="px-2 text-[#7E938B]">{r.referrer_name ?? '—'}</td>
                                            <td className="px-2 text-[#7E938B]">{r.online_status ? <span className="text-emerald-400">Online</span> : ago(r.last_seen_at)}</td>
                                            <td className="px-2 text-[#7E938B]">{day(r.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {pages > 1 && (
                            <div className="flex items-center justify-end gap-2 border-t border-[#1E322C] px-4 py-2 text-xs text-[#7E938B]">
                                Page {page + 1} of {pages}
                                <Button onClick={() => setPage(p => p - 1)} disabled={page === 0} aria-label="Previous page"><ChevronLeft size={14} /></Button>
                                <Button onClick={() => setPage(p => p + 1)} disabled={page >= pages - 1} aria-label="Next page"><ChevronRight size={14} /></Button>
                            </div>
                        )}
                    </>
                )}
            </Panel>

            {open && <Detail supabase={supabase} player={open} perms={perms} onClose={() => setOpen(null)} onChanged={load} />}
        </div>
    )
}
