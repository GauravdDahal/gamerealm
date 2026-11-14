'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { Button, useToast } from '@/components/admin/ui'
import { errorMessage } from '@/lib/adminApi'

/** Collapsible "Wheel settings" bar: open/closed, cooldown, deposit rule. */
export default function WheelSettings({ supabase, slices }) {
    const toast = useToast()
    const [open, setOpen] = useState(false)
    const [s, setS] = useState(null)
    const [missing, setMissing] = useState(false)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        supabase.from('wheel_settings').select('*').eq('id', 1).maybeSingle().then(({ data, error }) => {
            if (error || !data) setMissing(true)
            else setS(data)
        })
    }, [supabase])

    const save = async () => {
        setBusy(true)
        const { error } = await supabase.from('wheel_settings').update({
            is_open: s.is_open,
            cooldown_hours: Math.min(720, Math.max(0, parseInt(s.cooldown_hours, 10) || 0)),
            deposit_within_hours: Math.min(720, Math.max(0, parseInt(s.deposit_within_hours, 10) || 0)),
        }).eq('id', 1)
        setBusy(false)
        if (error) return toast(errorMessage(error, 'Could not save the wheel settings.'), 'error')
        toast('Wheel settings saved. They apply to the next spin.')
    }

    const num = 'w-24 rounded border border-[#1E322C] bg-[#0C1714] px-2 py-1.5 text-sm text-[#EFE9DA] focus:border-[#D4AF57] focus:outline-none'
    return (
        <section className="rounded border border-[#1E322C] bg-[#132320]">
            <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF57]">Wheel settings</span>
                <span className="text-xs text-[#7E938B]">
                    · {slices} slices · {s ? (s.is_open ? 'live' : 'closed') : missing ? 'needs database update' : '…'}
                </span>
                <span className="ml-auto flex items-center gap-1 text-xs text-[#7E938B]">
                    {open ? 'hide' : 'edit'} <ChevronDown size={14} className={open ? 'rotate-180' : ''} />
                </span>
            </button>
            {open && (
                <div className="border-t border-[#1E322C] p-4">
                    {missing ? (
                        <p className="text-sm text-[#7E938B]">These settings need the latest database update (0017).</p>
                    ) : !s ? (
                        <Loader2 size={16} className="animate-spin text-[#7E938B]" />
                    ) : (
                        <div className="space-y-4 text-sm text-[#EFE9DA]">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={s.is_open} onChange={e => setS({ ...s, is_open: e.target.checked })} className="h-4 w-4 accent-[#D4AF57]" />
                                Wheel is open (players can spin)
                            </label>
                            <label className="flex flex-wrap items-center gap-3">
                                <span className="w-64">Cooldown between spins (hours)</span>
                                <input type="number" min="0" max="720" value={s.cooldown_hours} onChange={e => setS({ ...s, cooldown_hours: e.target.value })} className={num} />
                            </label>
                            <label className="flex flex-wrap items-center gap-3">
                                <span className="w-64">Needs a deposit within (hours, 0 = no)</span>
                                <input type="number" min="0" max="720" value={s.deposit_within_hours} onChange={e => setS({ ...s, deposit_within_hours: e.target.value })} className={num} />
                            </label>
                            <p className="text-xs text-[#7E938B]">A deposit counts when staff record it with the Deposit or Wallet button in the chat.</p>
                            <Button variant="primary" onClick={save} disabled={busy}>{busy && <Loader2 size={14} className="animate-spin" />} Save settings</Button>
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}
