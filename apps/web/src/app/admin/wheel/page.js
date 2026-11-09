'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
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

const PALETTE = ['#4f46e5', '#7c3aed', '#db2777', '#e11d48', '#f59e0b', '#10b981', '#0ea5e9', '#334155']
const blank = { label: '', color: PALETTE[0], weight: 10, is_active: true }

const when = iso =>
    new Date(iso).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

const Wheel = () => {
    const supabase = useMemo(() => createClient(), [])
    const toast = useToast()
    const [prizes, setPrizes] = useState([])
    const [spins, setSpins] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [form, setForm] = useState(null)
    const [saving, setSaving] = useState(false)
    const [confirming, setConfirming] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [onlyPending, setOnlyPending] = useState(true)

    const load = useCallback(async () => {
        setError(null)
        const [p, s] = await Promise.all([
            supabase.from('wheel_prizes').select('*').order('sort_order').order('id'),
            supabase.rpc('list_wheel_spins', { p_limit: 200 }),
        ])
        if (p.error || s.error) {
            setError(errorMessage(p.error || s.error, 'Could not load the wheel. This needs the wheel-manage permission.'))
        } else {
            setPrizes(p.data ?? [])
            setSpins(s.data ?? [])
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        load()
    }, [load])

    const totalWeight = prizes.filter(p => p.is_active).reduce((n, p) => n + p.weight, 0)
    const activeCount = prizes.filter(p => p.is_active && p.weight > 0).length
    const chance = p => (p.is_active && totalWeight > 0 ? `${((p.weight / totalWeight) * 100).toFixed(1)}%` : '—')

    const save = async event => {
        event.preventDefault()
        if (!form.label.trim()) return
        setSaving(true)
        const row = {
            label: form.label.trim(),
            color: form.color,
            weight: Math.max(0, parseInt(form.weight, 10) || 0),
            is_active: form.is_active,
        }
        let err
        if (form.id) {
            ;({ error: err } = await supabase.from('wheel_prizes').update(row).eq('id', form.id))
        } else {
            const next = prizes.reduce((m, p) => Math.max(m, p.sort_order), 0) + 1
            ;({ error: err } = await supabase.from('wheel_prizes').insert({ ...row, sort_order: next }))
        }
        setSaving(false)
        if (err) return toast(errorMessage(err, 'Could not save this prize.'), 'error')
        toast(form.id ? 'Prize updated.' : 'Prize added.')
        setForm(null)
        load()
    }

    const patch = async (prize, changes) => {
        setPrizes(list => list.map(p => (p.id === prize.id ? { ...p, ...changes } : p)))
        const { error: err } = await supabase.from('wheel_prizes').update(changes).eq('id', prize.id)
        if (err) {
            toast(errorMessage(err, 'Could not change this prize.'), 'error')
            load()
        }
    }

    const move = async (index, dir) => {
        if (!prizes[index + dir]) return
        const ids = prizes.map(p => p.id)
        ;[ids[index], ids[index + dir]] = [ids[index + dir], ids[index]]
        setPrizes(ids.map((id, i) => ({ ...prizes.find(p => p.id === id), sort_order: i + 1 })))
        const res = await Promise.all(ids.map((id, i) => supabase.from('wheel_prizes').update({ sort_order: i + 1 }).eq('id', id)))
        if (res.some(r => r.error)) {
            toast('Could not save the new order.', 'error')
            load()
        }
    }

    const remove = async () => {
        setDeleting(true)
        const { error: err } = await supabase.from('wheel_prizes').delete().eq('id', confirming.id)
        setDeleting(false)
        if (err) return toast(errorMessage(err, 'Could not delete this prize.'), 'error')
        toast('Prize deleted.')
        setConfirming(null)
        load()
    }

    const credit = async (spin, credited) => {
        const { error: err } = await supabase.rpc('set_spin_credited', { p_spin: spin.id, p_credited: credited })
        if (err) return toast(errorMessage(err, 'Could not update this spin.'), 'error')
        setSpins(list => list.map(s => (s.id === spin.id ? { ...s, status: credited ? 'credited' : 'pending' } : s)))
    }

    const shownSpins = onlyPending ? spins.filter(s => s.status === 'pending' && !/try again|better luck/i.test(s.prize_label)) : spins
    const pendingCount = spins.filter(s => s.status === 'pending' && !/try again|better luck/i.test(s.prize_label)).length

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl text-[#EFE9DA]" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                    Lucky wheel
                </h1>
                <p className="mt-1 text-sm text-[#7E938B]">
                    The wheel on the homepage. Each approved player gets one spin every 24 hours; the result is decided on the server.
                </p>
            </div>

            {(activeCount < 2 && !loading && !error) && (
                <p className="rounded border border-[#C25B45]/40 bg-[#C25B45]/10 px-4 py-3 text-sm text-[#e8a090]">
                    The homepage needs at least 2 active prizes with a chance above 0 to show the wheel properly.
                </p>
            )}

            {/* ------------------------------------------------ prizes */}
            <Panel
                title={`Prizes (${prizes.length})`}
                action={
                    <Button variant="primary" onClick={() => setForm(blank)}>
                        <Plus size={14} className="mr-1 inline" />
                        New prize
                    </Button>
                }>
                {loading ? (
                    <Skeleton />
                ) : error ? (
                    <ErrorState message={error} onRetry={load} />
                ) : prizes.length === 0 ? (
                    <EmptyState message="No prizes yet." action={<Button variant="primary" onClick={() => setForm(blank)}>Add one</Button>} />
                ) : (
                    <ul className="divide-y divide-[#1E322C]/60">
                        {prizes.map((p, i) => (
                            <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                <span className="h-6 w-6 shrink-0 rounded-full border border-white/20" style={{ background: p.color }} />
                                <div className="min-w-0 flex-1 basis-40">
                                    <p className="truncate text-sm text-[#EFE9DA]">{p.label}</p>
                                    <p className="text-xs text-[#7E938B]">
                                        Weight {p.weight} · chance {chance(p)}
                                    </p>
                                </div>
                                {!p.is_active && <Badge>Hidden</Badge>}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => patch(p, { is_active: !p.is_active })}
                                        aria-label={p.is_active ? `Hide ${p.label}` : `Show ${p.label}`}
                                        className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA]">
                                        {p.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                    <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA] disabled:opacity-30">
                                        <ArrowUp size={16} />
                                    </button>
                                    <button onClick={() => move(i, 1)} disabled={i === prizes.length - 1} aria-label="Move down" className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA] disabled:opacity-30">
                                        <ArrowDown size={16} />
                                    </button>
                                    <button onClick={() => setForm(p)} aria-label={`Edit ${p.label}`} className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA]">
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={() => setConfirming(p)} aria-label={`Delete ${p.label}`} className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#C25B45]">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            {/* ------------------------------------------------- spins */}
            <Panel
                title={`Wins to credit (${pendingCount})`}
                action={
                    <label className="flex items-center gap-2 text-xs text-[#7E938B]">
                        <input type="checkbox" checked={onlyPending} onChange={e => setOnlyPending(e.target.checked)} className="accent-[#D4AF57]" />
                        Only prizes still to credit
                    </label>
                }>
                {loading || error ? null : shownSpins.length === 0 ? (
                    <EmptyState message={onlyPending ? 'Nothing waiting to be credited.' : 'No spins yet.'} />
                ) : (
                    <ul className="divide-y divide-[#1E322C]/60">
                        {shownSpins.map(s => (
                            <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                <div className="min-w-0 flex-1 basis-48">
                                    <p className="truncate text-sm text-[#EFE9DA]">
                                        <span className="text-[#D4AF57]">{s.prize_label}</span> · {s.player_name}
                                    </p>
                                    <p className="truncate text-xs text-[#7E938B]">
                                        {s.player_email} · {when(s.created_at)}
                                    </p>
                                </div>
                                {s.status === 'credited' ? (
                                    <>
                                        <Badge tone="brass">Credited</Badge>
                                        <button onClick={() => credit(s, false)} aria-label="Undo credited" title="Mark as not credited" className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA]">
                                            <RotateCcw size={15} />
                                        </button>
                                    </>
                                ) : (
                                    <Button onClick={() => credit(s, true)}>
                                        <Check size={14} className="mr-1 inline" />
                                        Mark credited
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            <Modal open={!!form} title={form?.id ? 'Edit prize' : 'New prize'} onClose={() => setForm(null)}>
                {form && (
                    <form onSubmit={save} className="space-y-4">
                        <Field label="Label" hint="Printed on the wheel, so keep it short, like $5 Freeplay or 10% Bonus.">
                            <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} maxLength={18} autoFocus required />
                        </Field>
                        <Field label="Weight" hint="Higher = wins more often. Chance = this weight ÷ the total of all active prizes. 0 = never wins.">
                            <Input type="number" min="0" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
                        </Field>
                        <div>
                            <span className="mb-1.5 block text-sm text-[#EFE9DA]">Colour</span>
                            <div className="flex flex-wrap items-center gap-2">
                                {PALETTE.map(c => (
                                    <button
                                        type="button"
                                        key={c}
                                        onClick={() => setForm(f => ({ ...f, color: c }))}
                                        aria-label={`Colour ${c}`}
                                        style={{ background: c }}
                                        className={`h-8 w-8 rounded-full border-2 ${form.color === c ? 'border-white' : 'border-transparent'}`}
                                    />
                                ))}
                                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-8 w-10 cursor-pointer rounded border border-[#1E322C] bg-transparent" aria-label="Custom colour" />
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-[#EFE9DA]">
                            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 accent-[#D4AF57]" />
                            On the wheel
                        </label>
                        <Button type="submit" variant="primary" disabled={saving}>
                            {saving ? 'Saving…' : 'Save prize'}
                        </Button>
                    </form>
                )}
            </Modal>

            <ConfirmDialog
                open={!!confirming}
                title="Delete this prize?"
                body={`"${confirming?.label}" will be removed from the wheel. Past wins keep their prize name.`}
                confirmLabel="Delete prize"
                busy={deleting}
                onConfirm={remove}
                onClose={() => setConfirming(null)}
            />
        </div>
    )
}

export default Wheel
