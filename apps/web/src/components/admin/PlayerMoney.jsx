'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    ArrowDownToLine, ArrowUpFromLine, Check, Copy, Eye, EyeOff, Gamepad2, Link2, Loader2, Pencil, Plus,
    RefreshCw, Trash2, Wallet, X,
} from 'lucide-react'
import { Button, Field, Input, Modal, Select, useToast } from '@/components/admin/ui'
import { errorMessage } from '@/lib/adminApi'
import { useGames } from '@/lib/useGames'

/**
 * Money tools for one player, shown in the admin chat header:
 * wallet balance, Deposit / Wallet / Withdraw dialogs and the Game Accounts panel.
 * Anything that needs a game provider's API (create account, check balance,
 * push to game) is marked "not connected yet" until the backend is built.
 */
const money = n => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const BONUSES = [0, 10, 15, 20, 30, 50]
const QUICK = [10, 20, 50, 100]
const NOT_CONNECTED = 'This needs the game provider API, which is not connected yet.'

const Chips = ({ value, onChange, options, render }) => (
    <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
            <button key={o} type="button" onClick={() => onChange(o)}
                className={`rounded-full border px-3 py-1 text-xs ${value === o ? 'border-[#D4AF57] bg-[#D4AF57] font-bold text-[#0C1714]' : 'border-[#1E322C] text-[#7E938B] hover:text-[#EFE9DA]'}`}>
                {render(o)}
            </button>
        ))}
    </div>
)

const BigAmount = ({ value, onChange, autoFocus }) => (
    <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-[#7E938B]">$</span>
        <input type="number" inputMode="decimal" min="0" step="0.01" value={value} autoFocus={autoFocus}
            onChange={e => onChange(e.target.value)}
            className="w-full rounded border border-[#1E322C] bg-[#0C1714] py-3 pl-8 pr-3 text-2xl text-[#EFE9DA] focus:border-[#D4AF57] focus:outline-none" />
    </div>
)

/* ----------------------------------------------------------------- deposit */
const DepositDialog = ({ supabase, player, accounts, open, onClose, onDone }) => {
    const toast = useToast()
    const [amount, setAmount] = useState('')
    const [account, setAccount] = useState('')
    const [bonus, setBonus] = useState(0)
    const [custom, setCustom] = useState('')
    const [busy, setBusy] = useState(false)
    useEffect(() => {
        if (open) { setAmount(''); setAccount(''); setBonus(0); setCustom('') }
    }, [open])
    const pct = bonus === 'custom' ? Math.min(500, Math.max(0, Number(custom) || 0)) : bonus
    const amt = Number(amount) || 0
    const save = async () => {
        if (amt <= 0) return
        setBusy(true)
        const { error } = await supabase.rpc('record_deposit', {
            p_player: player.id, p_amount: amt, p_bonus_pct: pct, p_account: account ? Number(account) : null, p_note: null,
        })
        setBusy(false)
        if (error) return toast(errorMessage(error, 'Could not record the deposit.'), 'error')
        toast(`Deposit of ${money(amt)} recorded${pct ? ` with ${money((amt * pct) / 100)} bonus` : ''}.${account ? ' Loading into the game happens once the provider API is connected.' : ''}`)
        onDone()
        onClose()
    }
    return (
        <Modal open={open} title={`Deposit · ${player.name}`} onClose={() => !busy && onClose()}
            footer={<>
                <Button onClick={onClose} disabled={busy}>Cancel</Button>
                <Button variant="primary" onClick={save} disabled={busy || amt <= 0} className="!border-emerald-500 !bg-emerald-600 !text-white">
                    {busy && <Loader2 size={14} className="animate-spin" />} Confirm
                </Button>
            </>}>
            <div className="space-y-4">
                <p className="text-xs text-[#7E938B]">Record a deposit for {player.name}.</p>
                <Field label="Amount ($)"><BigAmount value={amount} onChange={setAmount} autoFocus /></Field>
                <Field label="Push to game (optional)" hint="To put money in their site wallet instead, use the Wallet button.">
                    <Select value={account} onChange={e => setAccount(e.target.value)}>
                        <option value="">Don’t push to a game</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.game_title} · {a.username}</option>)}
                    </Select>
                </Field>
                <Field label="Load bonus %">
                    <Chips value={bonus} onChange={setBonus} options={[...BONUSES, 'custom']} render={o => (o === 0 ? 'No bonus' : o === 'custom' ? 'Custom' : `${o}%`)} />
                    {bonus === 'custom' && <div className="mt-2 w-32"><Input type="number" min="0" max="500" placeholder="%" value={custom} onChange={e => setCustom(e.target.value)} /></div>}
                    <p className="mt-2 text-xs text-[#D4AF57]">Bonus: {money((amt * pct) / 100)} · Total loaded: {money(amt + (amt * pct) / 100)}</p>
                </Field>
            </div>
        </Modal>
    )
}

/* ------------------------------------------------------------------ wallet */
const WalletDialog = ({ supabase, player, wallet, open, onClose, onDone }) => {
    const toast = useToast()
    const [tab, setTab] = useState('add')
    const [amount, setAmount] = useState('')
    const [bonus, setBonus] = useState(0)
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState(false)
    useEffect(() => {
        if (open) { setTab('add'); setAmount(''); setBonus(0); setNote('') }
    }, [open])
    const amt = Number(amount) || 0
    const save = async () => {
        if (amt <= 0) return
        setBusy(true)
        const { error } = await supabase.rpc('wallet_move', {
            p_player: player.id, p_dir: tab, p_amount: amt, p_bonus_pct: tab === 'add' ? bonus : 0, p_note: note,
        })
        setBusy(false)
        if (error) return toast(errorMessage(error, 'Could not update the wallet.'), 'error')
        toast(tab === 'add' ? `${money(amt)} added to the wallet.` : tab === 'out' ? `${money(amt)} taken out.` : `${money(amt)} bonus unlocked.`)
        onDone()
        onClose()
    }
    const tabs = [['add', 'Add money', 'emerald'], ['out', 'Take out', 'red'], ['unlock', 'Unlock bonus', 'amber']]
    const colour = { add: '!border-emerald-500 !bg-emerald-600', out: '!border-red-500 !bg-red-600', unlock: '!border-amber-500 !bg-amber-600' }[tab]
    return (
        <Modal open={open} title={`Site wallet · ${player.name}`} onClose={() => !busy && onClose()}
            footer={<>
                <Button onClick={onClose} disabled={busy}>Cancel</Button>
                <Button variant="primary" onClick={save} disabled={busy || amt <= 0} className={`${colour} !text-white`}>
                    {busy && <Loader2 size={14} className="animate-spin" />}
                    {tab === 'add' ? 'Add to wallet' : tab === 'out' ? 'Take out' : 'Unlock bonus'}
                </Button>
            </>}>
            <div className="space-y-4">
                <p className="text-sm text-[#EFE9DA]">
                    Holds <b className="text-emerald-400">{money(wallet?.balance)}</b>
                    {Number(wallet?.locked) > 0 && <span className="text-[#7E938B]"> · {money(wallet.locked)} locked bonus</span>}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                    {tabs.map(([k, l]) => (
                        <button key={k} type="button" onClick={() => setTab(k)}
                            className={`rounded border px-2 py-2 text-xs font-semibold ${tab === k ? 'border-[#D4AF57] bg-[#D4AF57]/15 text-[#EFE9DA]' : 'border-[#1E322C] text-[#7E938B]'}`}>{l}</button>
                    ))}
                </div>
                <Field label="Amount ($)">
                    <BigAmount value={amount} onChange={setAmount} autoFocus />
                    <div className="mt-2"><Chips value={amt} onChange={v => setAmount(String(v))} options={QUICK} render={o => `$${o}`} /></div>
                </Field>
                {tab === 'add' && (
                    <Field label="Bonus %" hint="Bonus money stays locked until it’s played through. Unlock it later with “Unlock bonus”.">
                        <Chips value={bonus} onChange={setBonus} options={BONUSES} render={o => (o === 0 ? 'No bonus' : `${o}%`)} />
                    </Field>
                )}
                <Field label="Note (optional)">
                    <Input value={note} onChange={e => setNote(e.target.value)} maxLength={200}
                        placeholder={tab === 'add' ? 'Cash App payment' : tab === 'out' ? 'Paid out by Cash App' : 'Played through'} />
                </Field>
            </div>
        </Modal>
    )
}

/* ---------------------------------------------------------------- withdraw */
const WithdrawDialog = ({ supabase, player, accounts, open, onClose, onDone }) => {
    const toast = useToast()
    const [from, setFrom] = useState('')
    const [total, setTotal] = useState('')
    const [parts, setParts] = useState([{ type: 'payout', method: 'Cash App', amount: '' }])
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState(false)
    useEffect(() => {
        if (open) { setFrom(''); setTotal(''); setParts([{ type: 'payout', method: 'Cash App', amount: '' }]); setNote('') }
    }, [open])
    const t = Number(total) || 0
    const sum = parts.reduce((n, p) => n + (Number(p.amount) || 0), 0)
    const left = Math.round((t - sum) * 100) / 100
    // A single part follows the total automatically.
    useEffect(() => {
        setParts(ps => (ps.length === 1 ? [{ ...ps[0], amount: total }] : ps))
    }, [total])
    const set = (i, patch) => setParts(ps => ps.map((p, n) => (n === i ? { ...p, ...patch } : p)))
    const ok = t > 0 && left === 0 && parts.every(p => Number(p.amount) > 0 && (p.type !== 'game' || p.account_id))
    const save = async () => {
        if (!ok) return
        setBusy(true)
        const clean = parts.map(p =>
            p.type === 'game' ? { type: 'game', account_id: Number(p.account_id), amount: Number(p.amount) }
                : p.type === 'wallet' ? { type: 'wallet', amount: Number(p.amount) }
                    : { type: 'payout', method: p.method || 'Cash App', amount: Number(p.amount) },
        )
        const { error } = await supabase.rpc('record_withdraw', {
            p_player: player.id, p_total: t, p_parts: clean, p_account: from ? Number(from) : null, p_note: note,
        })
        setBusy(false)
        if (error) return toast(errorMessage(error, 'Could not record the withdrawal.'), 'error')
        toast(`Withdrawal of ${money(t)} recorded.`)
        onDone()
        onClose()
    }
    return (
        <Modal open={open} title={`Withdraw · ${player.name}`} onClose={() => !busy && onClose()}
            footer={<>
                <Button onClick={onClose} disabled={busy}>Cancel</Button>
                <Button variant="primary" onClick={save} disabled={busy || !ok} className="!border-red-500 !bg-red-600 !text-white">
                    {busy && <Loader2 size={14} className="animate-spin" />} Confirm withdrawal
                </Button>
            </>}>
            <div className="space-y-4">
                <Field label="Cash out from (optional)">
                    <Select value={from} onChange={e => setFrom(e.target.value)}>
                        <option value="">Not from a specific game</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.game_title} · {a.username}</option>)}
                    </Select>
                </Field>
                <Field label="Total ($)"><BigAmount value={total} onChange={setTotal} autoFocus /></Field>
                <div>
                    <p className="mb-2 text-xs uppercase tracking-wide text-[#7E938B]">Where it goes</p>
                    <ul className="space-y-2">
                        {parts.map((p, i) => (
                            <li key={i} className="flex flex-wrap items-center gap-2 rounded border border-[#1E322C] bg-[#0C1714] p-2">
                                <select value={p.type} onChange={e => set(i, { type: e.target.value })}
                                    className="rounded border border-[#1E322C] bg-[#132320] px-2 py-1.5 text-sm text-[#EFE9DA]">
                                    <option value="payout">Pay out</option>
                                    <option value="game">Load a game</option>
                                    <option value="wallet">Site wallet</option>
                                </select>
                                {p.type === 'payout' && (
                                    <input value={p.method} onChange={e => set(i, { method: e.target.value })} placeholder="Cash App"
                                        className="min-w-0 flex-1 rounded border border-[#1E322C] bg-[#132320] px-2 py-1.5 text-sm text-[#EFE9DA]" />
                                )}
                                {p.type === 'game' && (
                                    <select value={p.account_id || ''} onChange={e => set(i, { account_id: e.target.value })}
                                        className="min-w-0 flex-1 rounded border border-[#1E322C] bg-[#132320] px-2 py-1.5 text-sm text-[#EFE9DA]">
                                        <option value="">Choose game account</option>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.game_title} · {a.username}</option>)}
                                    </select>
                                )}
                                {p.type === 'wallet' && <span className="flex-1 text-sm text-[#7E938B]">Adds to their site wallet</span>}
                                <input type="number" min="0" step="0.01" value={p.amount} onChange={e => set(i, { amount: e.target.value })} placeholder="$"
                                    className="w-24 rounded border border-[#1E322C] bg-[#132320] px-2 py-1.5 text-sm text-[#EFE9DA]" />
                                {parts.length > 1 && (
                                    <button type="button" onClick={() => setParts(ps => ps.filter((_, n) => n !== i))} aria-label="Remove"
                                        className="rounded p-1 text-[#7E938B] hover:text-[#C25B45]"><X size={15} /></button>
                                )}
                            </li>
                        ))}
                    </ul>
                    <div className="mt-2 flex items-center justify-between text-xs">
                        <button type="button" onClick={() => setParts(ps => [...ps, { type: 'payout', method: 'Cash App', amount: left > 0 ? String(left) : '' }])}
                            className="inline-flex items-center gap-1 text-[#D4AF57] hover:underline"><Plus size={13} /> Split into another part</button>
                        <span className={left === 0 ? 'text-emerald-400' : 'text-[#C25B45]'}>
                            {t > 0 ? (left === 0 ? 'Parts add up ✓' : `${money(Math.abs(left))} ${left > 0 ? 'left to assign' : 'too much'}`) : ''}
                        </span>
                    </div>
                </div>
                <Field label="Note (optional)"><Input value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder="Paid by Cash App" /></Field>
                <p className="text-[11px] text-[#7E938B]">Taking the money out of the game and loading other games happens automatically once the provider API is connected. For now this records it.</p>
            </div>
        </Modal>
    )
}

/* ------------------------------------------------------------ game accounts */
const AccountCard = ({ a, onEdit, onDelete }) => {
    const toast = useToast()
    const [show, setShow] = useState(false)
    const copy = async (v, what) => {
        try { await navigator.clipboard.writeText(v); toast(`${what} copied.`) } catch { toast('Could not copy.', 'error') }
    }
    return (
        <li className="rounded border border-[#1E322C] bg-[#0C1714] p-3">
            <div className="flex items-center gap-2">
                <p className="flex-1 font-semibold text-[#EFE9DA]">{a.game_title}</p>
                {a.verified && <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">Verified</span>}
                <button onClick={() => onEdit(a)} aria-label="Edit" className="rounded p-1 text-[#7E938B] hover:text-[#EFE9DA]"><Pencil size={14} /></button>
                <button onClick={() => onDelete(a)} aria-label="Delete" className="rounded p-1 text-[#7E938B] hover:text-[#C25B45]"><Trash2 size={14} /></button>
            </div>
            <dl className="mt-2 space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                    <dt className="w-20 text-[10px] uppercase tracking-wide text-[#7E938B]">Username</dt>
                    <dd className="flex-1 truncate font-mono text-[#EFE9DA]">{a.username}</dd>
                    <button onClick={() => copy(a.username, 'Username')} aria-label="Copy username" className="text-[#7E938B] hover:text-[#D4AF57]"><Copy size={14} /></button>
                </div>
                <div className="flex items-center gap-2">
                    <dt className="w-20 text-[10px] uppercase tracking-wide text-[#7E938B]">Password</dt>
                    <dd className="flex-1 truncate font-mono text-[#EFE9DA]">{show ? a.password : '••••••••'}</dd>
                    <button onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="text-[#7E938B] hover:text-[#EFE9DA]">{show ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                    <button onClick={() => copy(a.password, 'Password')} aria-label="Copy password" className="text-[#7E938B] hover:text-[#D4AF57]"><Copy size={14} /></button>
                </div>
                <div className="flex items-center gap-2">
                    <dt className="w-20 text-[10px] uppercase tracking-wide text-[#7E938B]">Balance</dt>
                    <dd className="flex-1 text-[#7E938B]">{a.balance != null ? <span className="text-emerald-400">{money(a.balance)}</span> : 'Balance not checked yet'}</dd>
                    <button onClick={() => toast(NOT_CONNECTED, 'error')} className="inline-flex items-center gap-1 rounded border border-[#1E322C] px-2 py-0.5 text-[11px] text-[#EFE9DA] hover:border-[#D4AF57]">
                        <RefreshCw size={11} /> Check
                    </button>
                </div>
            </dl>
        </li>
    )
}

const GameAccountsDialog = ({ supabase, player, accounts, open, onClose, onDone }) => {
    const toast = useToast()
    const games = useGames()
    const [form, setForm] = useState(null)
    const [busy, setBusy] = useState(false)
    const titles = useMemo(() => [...new Set(games.filter(g => !String(g.id).startsWith('fallback')).map(g => g.title))], [games])

    const save = async e => {
        e.preventDefault()
        if (!form.game_title.trim() || !form.username.trim() || !form.password) return
        setBusy(true)
        const row = { game_title: form.game_title.trim(), username: form.username.trim(), password: form.password }
        const { error } = form.id
            ? await supabase.from('player_game_accounts').update(row).eq('id', form.id)
            : await supabase.from('player_game_accounts').insert({ ...row, player_id: player.id })
        setBusy(false)
        if (error) return toast(errorMessage(error, 'Could not save this account.'), 'error')
        toast(form.id ? 'Account updated.' : 'Account linked.')
        setForm(null)
        onDone()
    }
    const remove = async a => {
        if (!window.confirm(`Remove the ${a.game_title} account “${a.username}” from this player?`)) return
        const { error } = await supabase.from('player_game_accounts').delete().eq('id', a.id)
        if (error) return toast(errorMessage(error, 'Could not remove this account.'), 'error')
        onDone()
    }

    return (
        <Modal open={open} title={`Game accounts · ${player.name}`} onClose={onClose}>
            {form ? (
                <form onSubmit={save} className="space-y-3">
                    <Field label="Game">
                        <Input list="game-titles" value={form.game_title} onChange={e => setForm(f => ({ ...f, game_title: e.target.value }))} required autoFocus />
                        <datalist id="game-titles">{titles.map(t => <option key={t} value={t} />)}</datalist>
                    </Field>
                    <Field label="Username"><Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required maxLength={80} /></Field>
                    <Field label="Password"><Input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required maxLength={120} /></Field>
                    <div className="flex gap-2">
                        <Button type="button" onClick={() => setForm(null)}>Back</Button>
                        <Button type="submit" variant="primary" disabled={busy}>{busy && <Loader2 size={14} className="animate-spin" />}<Check size={14} /> Save account</Button>
                    </div>
                </form>
            ) : (
                <div className="space-y-3">
                    {accounts.length === 0 ? (
                        <p className="rounded border border-dashed border-[#1E322C] p-5 text-center text-sm text-[#7E938B]">No game accounts linked yet.</p>
                    ) : (
                        <ul className="space-y-2">{accounts.map(a => <AccountCard key={a.id} a={a} onEdit={x => setForm({ ...x })} onDelete={remove} />)}</ul>
                    )}
                    <div className="grid gap-2 sm:grid-cols-2">
                        {['Juwa', 'Fire Kirin'].map(g => (
                            <button key={g} type="button" onClick={() => toast(NOT_CONNECTED, 'error')}
                                className="inline-flex items-center justify-center gap-1.5 rounded border border-[#D4AF57]/50 bg-[#D4AF57]/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#D4AF57] hover:bg-[#D4AF57]/20">
                                <Plus size={13} /> Create {g} account
                            </button>
                        ))}
                    </div>
                    <button type="button" onClick={() => setForm({ game_title: '', username: '', password: '' })}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-[#1E322C] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#EFE9DA] hover:border-[#D4AF57]">
                        <Link2 size={13} /> Link existing account
                    </button>
                </div>
            )}
        </Modal>
    )
}

/* ------------------------------------------------------------------ header */
export default function PlayerMoney({ supabase, chat }) {
    const player = useMemo(() => ({ id: chat.client_id, name: chat.client_name }), [chat.client_id, chat.client_name])
    const [wallet, setWallet] = useState(null)
    const [accounts, setAccounts] = useState([])
    const [ready, setReady] = useState(true)
    const [dialog, setDialog] = useState(null)

    const load = useCallback(async () => {
        const [w, a] = await Promise.all([
            supabase.rpc('player_wallet', { p_player: player.id }),
            supabase.from('player_game_accounts').select('*').eq('player_id', player.id).order('created_at'),
        ])
        setReady(!w.error)
        setWallet(w.data ?? null)
        setAccounts(a.data ?? [])
    }, [supabase, player.id])

    useEffect(() => {
        setWallet(null)
        setAccounts([])
        load()
    }, [load])

    const btn = 'inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white disabled:opacity-40'
    return (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#1E322C] bg-[#0C1714]/60 px-4 py-2">
            <span className="mr-auto flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="text-[#7E938B]">wallet <b className="text-emerald-400">{ready ? money(wallet?.balance) : '—'}</b>
                    {Number(wallet?.locked) > 0 && <span> · {money(wallet.locked)} locked</span>}</span>
                {chat.referrer_name && (
                    <span className="rounded-full border border-[#D4AF57]/40 bg-[#D4AF57]/10 px-2 py-0.5 text-[#D4AF57]">
                        Referred by {chat.referrer_name}{chat.referrer_code ? ` · code ${chat.referrer_code}` : ''}
                    </span>
                )}
            </span>
            <button disabled={!ready} onClick={() => setDialog('deposit')} className={`${btn} bg-emerald-600 hover:bg-emerald-500`}><ArrowDownToLine size={12} /> Deposit</button>
            <button disabled={!ready} onClick={() => setDialog('wallet')} className={`${btn} bg-[#B8922F] hover:bg-[#D4AF57]`}><Wallet size={12} /> Wallet</button>
            <button disabled={!ready} onClick={() => setDialog('withdraw')} className={`${btn} bg-red-600 hover:bg-red-500`}><ArrowUpFromLine size={12} /> Withdraw</button>
            <button disabled={!ready} onClick={() => setDialog('accounts')} title="Game accounts" aria-label="Game accounts"
                className="rounded border border-[#1E322C] p-1.5 text-[#7E938B] hover:border-[#D4AF57] hover:text-[#D4AF57] disabled:opacity-40"><Gamepad2 size={15} /></button>
            {!ready && <span className="w-full text-[11px] text-[#C25B45]">Money tools need the latest database update (0017).</span>}

            <DepositDialog supabase={supabase} player={player} accounts={accounts} open={dialog === 'deposit'} onClose={() => setDialog(null)} onDone={load} />
            <WalletDialog supabase={supabase} player={player} wallet={wallet} open={dialog === 'wallet'} onClose={() => setDialog(null)} onDone={load} />
            <WithdrawDialog supabase={supabase} player={player} accounts={accounts} open={dialog === 'withdraw'} onClose={() => setDialog(null)} onDone={load} />
            <GameAccountsDialog supabase={supabase} player={player} accounts={accounts} open={dialog === 'accounts'} onClose={() => setDialog(null)} onDone={load} />
        </div>
    )
}
