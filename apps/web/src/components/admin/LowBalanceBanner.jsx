'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/** Strip across the admin panel when a game's store balance is under the alert threshold. */
export default function LowBalanceBanner() {
    const [low, setLow] = useState(null)
    const [hidden, setHidden] = useState(false)

    useEffect(() => {
        const supabase = createClient()
        const check = async () => {
            const [p, t] = await Promise.all([
                supabase.from('game_providers').select('game_title, store_balance').eq('enabled', true).not('store_balance', 'is', null),
                supabase.from('admin_settings').select('value').eq('key', 'low_balance_threshold').maybeSingle(),
            ])
            if (p.error || t.error) return
            const limit = Number(t.data?.value ?? 100)
            const list = (p.data ?? []).filter(g => Number(g.store_balance) < limit)
            setLow(list.length ? { limit, list } : null)
            setHidden(false)
        }
        check()
        const id = setInterval(check, 15 * 60 * 1000)
        return () => clearInterval(id)
    }, [])

    if (!low || hidden) return null
    const fmt = n => `$${Number(n).toFixed(2)}`
    return (
        <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-red-500/40 bg-red-500/15 px-4 py-2 text-sm text-red-200">
            <AlertTriangle size={16} className="shrink-0 text-red-400" />
            <span className="flex-1">
                <b>Low game balance (under {fmt(low.limit)}):</b> {low.list.map(g => `${g.game_title} ${fmt(g.store_balance)}`).join(', ')}
            </span>
            <Link href="/admin/providers" className="rounded border border-red-400/50 px-2 py-0.5 text-xs font-bold uppercase hover:bg-red-500/20">View</Link>
            <button onClick={() => setHidden(true)} aria-label="Dismiss" className="rounded p-1 hover:bg-red-500/20"><X size={14} /></button>
        </div>
    )
}
