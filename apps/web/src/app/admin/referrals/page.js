'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Eye, EyeOff, Pencil, Plus, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { errorMessage } from '@/lib/adminApi'
import {
    Badge,
    Button,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    Field,
    Input,
    Modal,
    Panel,
    Skeleton,
    useToast,
} from '@/components/admin/ui'

const blank = { name: '', friends_required: 1, reward_amount: 5, deposit_bonus_pct: 0, perk: '', is_active: true }
const money = n => `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const when = iso =>
    new Date(iso).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

const Referrals = () => {
    const supabase = useMemo(() => createClient(), [])
    const toast = useToast()
    const [levels, setLevels] = useState([])
    const [rewards, setRewards] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [form, setForm] = useState(null)
    const [saving, setSaving] = useState(false)
    const [confirming, setConfirming] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [onlyPending, setOnlyPending] = useState(true)
    const [checking, setChecking] = useState(false)

    const load = useCallback(async () => {
        setError(null)
        const [l, r] = await Promise.all([
            supabase.from('referral_levels').select('*').order('level'),
            supabase.rpc('list_referral_rewards', { p_limit: 200 }),
        ])
        if (l.error || r.error) {
            setError(errorMessage(l.error || r.error, 'Could not load referrals. This needs the referral-manage permission.'))
        } else {
            setLevels(l.data ?? [])
            setRewards(r.data ?? [])
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        load()
    }, [load])

    const save = async event => {
        event.preventDefault()
        if (!form.name.trim()) return
        setSaving(true)
        const row = {
            name: form.name.trim(),
            friends_required: Math.max(1, parseInt(form.friends_required, 10) || 1),
            reward_amount: Math.max(0, Number(form.reward_amount) || 0),
            deposit_bonus_pct: Math.min(100, Math.max(0, parseInt(form.deposit_bonus_pct, 10) || 0)),
            perk: form.perk?.trim() || null,
            is_active: form.is_active,
        }
        let err
        if (form.id) {
            ;({ error: err } = await supabase.from('referral_levels').update(row).eq('id', form.id))
        } else {
            const next = levels.reduce((m, l) => Math.max(m, l.level), 0) + 1
            ;({ error: err } = await supabase.from('referral_levels').insert({ ...row, level: next }))
        }
        setSaving(false)
        if (err) return toast(errorMessage(err, 'Could not save this level.'), 'error')
        toast(form.id ? 'Level updated.' : 'Level added.')
        setForm(null)
        load()
    }

    const toggle = async lv => {
        setLevels(list => list.map(l => (l.id === lv.id ? { ...l, is_active: !l.is_active } : l)))
        const { error: err } = await supabase.from('referral_levels').update({ is_active: !lv.is_active }).eq('id', lv.id)
        if (err) {
            toast(errorMessage(err, 'Could not change this level.'), 'error')
            load()
        }
    }

    const remove = async () => {
        setDeleting(true)
        const { error: err } = await supabase.from('referral_levels').delete().eq('id', confirming.id)
        setDeleting(false)
        if (err) return toast(errorMessage(err, 'Could not delete this level.'), 'error')
        toast('Level deleted.')
        setConfirming(null)
        load()
    }

    const credit = async (reward, credited) => {
        const { error: err } = await supabase.rpc('set_referral_credited', { p_reward: reward.id, p_credited: credited })
        if (err) return toast(errorMessage(err, 'Could not update this reward.'), 'error')
        setRewards(list => list.map(r => (r.id === reward.id ? { ...r, status: credited ? 'credited' : 'pending' } : r)))
    }

    const recheck = async () => {
        setChecking(true)
        const { data, error: err } = await supabase.rpc('refresh_referral_rewards')
        setChecking(false)
        if (err) return toast(errorMessage(err, 'Could not re-check rewards.'), 'error')
        toast(data > 0 ? `${data} new reward${data === 1 ? '' : 's'} queued.` : 'Nothing new to queue.')
        load()
    }

    const shown = onlyPending ? rewards.filter(r => r.status === 'pending') : rewards
    const pendingCount = rewards.filter(r => r.status === 'pending').length

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl text-[#EFE9DA]" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                    Referrals
                </h1>
                <p className="mt-1 text-sm text-[#7E938B]">
                    Players share a link. A friend counts once you approve them. Each level a player reaches queues a one-time reward below for you to credit.
                </p>
            </div>

            <Panel
                title={`Rewards to credit (${pendingCount})`}
                action={
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-xs text-[#7E938B]">
                            <input type="checkbox" checked={onlyPending} onChange={e => setOnlyPending(e.target.checked)} className="accent-[#D4AF57]" />
                            Only still to credit
                        </label>
                        <Button onClick={recheck} disabled={checking}>
                            <RefreshCw size={14} className={`mr-1 inline ${checking ? 'animate-spin' : ''}`} />
                            Re-check
                        </Button>
                    </div>
                }>
                {loading ? (
                    <Skeleton />
                ) : error ? (
                    <ErrorState message={error} onRetry={load} />
                ) : shown.length === 0 ? (
                    <EmptyState message={onlyPending ? 'Nothing waiting to be credited.' : 'No rewards yet.'} />
                ) : (
                    <ul className="divide-y divide-[#1E322C]/60">
                        {shown.map(r => (
                            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                <div className="min-w-0 flex-1 basis-56">
                                    <p className="truncate text-sm text-[#EFE9DA]">
                                        <span className="text-[#D4AF57]">{money(r.reward_amount)}</span>
                                        {r.deposit_bonus_pct > 0 && <span className="text-[#D4AF57]"> + {r.deposit_bonus_pct}% deposit bonus</span>} · {r.referrer_name}
                                    </p>
                                    <p className="truncate text-xs text-[#7E938B]">
                                        {r.level_name} ({r.friends_count} friends) · {r.referrer_email}
                                        {r.referrer_phone ? ` · ${r.referrer_phone}` : ''} · {when(r.created_at)}
                                    </p>
                                </div>
                                {r.status === 'credited' ? (
                                    <>
                                        <Badge tone="brass">Credited</Badge>
                                        <button onClick={() => credit(r, false)} aria-label="Undo credited" title="Mark as not credited" className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA]">
                                            <RotateCcw size={15} />
                                        </button>
                                    </>
                                ) : (
                                    <Button onClick={() => credit(r, true)}>
                                        <Check size={14} className="mr-1 inline" />
                                        Mark credited
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            <Panel
                title={`Levels (${levels.length})`}
                action={
                    <Button variant="primary" onClick={() => setForm(blank)}>
                        <Plus size={14} className="mr-1 inline" />
                        New level
                    </Button>
                }>
                {loading || error ? null : levels.length === 0 ? (
                    <EmptyState message="No levels yet." />
                ) : (
                    <ul className="divide-y divide-[#1E322C]/60">
                        {levels.map(l => (
                            <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                <div className="min-w-0 flex-1 basis-48">
                                    <p className="truncate text-sm text-[#EFE9DA]">
                                        Level {l.level} · {l.name}
                                    </p>
                                    <p className="text-xs text-[#7E938B]">
                                        {l.friends_required} approved {l.friends_required === 1 ? 'friend' : 'friends'} · {money(l.reward_amount)}
                                        {l.deposit_bonus_pct > 0 ? ` · +${l.deposit_bonus_pct}% deposit bonus` : ''}
                                    </p>
                                </div>
                                {!l.is_active && <Badge>Hidden</Badge>}
                                <div className="flex items-center gap-1">
                                    <button onClick={() => toggle(l)} aria-label={l.is_active ? `Hide ${l.name}` : `Show ${l.name}`} className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA]">
                                        {l.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                    <button onClick={() => setForm(l)} aria-label={`Edit ${l.name}`} className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA]">
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={() => setConfirming(l)} aria-label={`Delete ${l.name}`} className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#C25B45]">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            <Modal open={!!form} title={form?.id ? 'Edit level' : 'New level'} onClose={() => setForm(null)}>
                {form && (
                    <form onSubmit={save} className="space-y-4">
                        <Field label="Name">
                            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={30} autoFocus required />
                        </Field>
                        <Field label="Approved friends needed">
                            <Input type="number" min="1" value={form.friends_required} onChange={e => setForm(f => ({ ...f, friends_required: e.target.value }))} />
                        </Field>
                        <Field label="Reward ($)" hint="Paid once, when the player reaches this level.">
                            <Input type="number" min="0" step="0.01" value={form.reward_amount} onChange={e => setForm(f => ({ ...f, reward_amount: e.target.value }))} />
                        </Field>
                        <Field label="Deposit bonus (%)" hint="0 = none.">
                            <Input type="number" min="0" max="100" value={form.deposit_bonus_pct} onChange={e => setForm(f => ({ ...f, deposit_bonus_pct: e.target.value }))} />
                        </Field>
                        <Field label="Extra perk (optional)">
                            <Input value={form.perk ?? ''} onChange={e => setForm(f => ({ ...f, perk: e.target.value }))} maxLength={80} />
                        </Field>
                        <label className="flex items-center gap-2 text-sm text-[#EFE9DA]">
                            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 accent-[#D4AF57]" />
                            Shown on the homepage
                        </label>
                        <Button type="submit" variant="primary" disabled={saving}>
                            {saving ? 'Saving…' : 'Save level'}
                        </Button>
                    </form>
                )}
            </Modal>

            <ConfirmDialog
                open={!!confirming}
                title="Delete this level?"
                body={`"${confirming?.name}" will be removed. Rewards already queued keep their level name. Hiding it instead is safer.`}
                confirmLabel="Delete level"
                busy={deleting}
                onConfirm={remove}
                onClose={() => setConfirming(null)}
            />
        </div>
    )
}

export default Referrals
