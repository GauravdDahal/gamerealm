'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BellRing, Eye, EyeOff, Loader2, RefreshCw, Save, Server } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { errorMessage } from '@/lib/adminApi'
import { useGames } from '@/lib/useGames'
import { Badge, Button, ErrorState, Field, Input, Panel, Skeleton, useToast } from '@/components/admin/ui'

/**
 * Game provider API settings (Juwa, Fire Kirin, …) and the low-balance alert.
 * The secret key is write-only: once saved it never comes back to the browser.
 * Loading/withdrawing and the store balance check run on the server once the
 * provider APIs are connected.
 */
const money = n => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const ProviderCard = ({ supabase, title, saved, onSaved }) => {
    const toast = useToast()
    const [f, setF] = useState({ base_url: saved?.base_url ?? '', agent_id: saved?.agent_id ?? '', secret: '', enabled: saved?.enabled ?? false })
    const [show, setShow] = useState(false)
    const [busy, setBusy] = useState(false)
    const save = async () => {
        setBusy(true)
        const { error } = await supabase.rpc('save_game_provider', {
            p_title: title, p_base_url: f.base_url, p_agent_id: f.agent_id, p_secret: f.secret || null, p_enabled: f.enabled,
        })
        setBusy(false)
        if (error) return toast(errorMessage(error, 'Could not save.'), 'error')
        setF(x => ({ ...x, secret: '' }))
        toast(`${title} saved.`)
        onSaved()
    }
    const configured = saved && saved.base_url && saved.agent_id && saved.has_secret
    return (
        <section className="rounded border border-[#1E322C] bg-[#132320] p-4">
            <header className="flex items-center gap-2">
                <Server size={16} className="text-[#D4AF57]" />
                <h3 className="flex-1 text-sm font-semibold text-[#EFE9DA]">{title}</h3>
                {configured ? <Badge tone="brass">Configured</Badge> : <Badge>Not set up</Badge>}
            </header>
            {saved?.store_balance != null && (
                <p className="mt-2 text-xs text-[#7E938B]">Store balance <b className="text-emerald-400">{money(saved.store_balance)}</b></p>
            )}
            <div className="mt-3 space-y-3">
                <label className="flex items-center gap-2 text-sm text-[#EFE9DA]">
                    <input type="checkbox" checked={f.enabled} onChange={e => setF({ ...f, enabled: e.target.checked })} className="h-4 w-4 accent-[#D4AF57]" />
                    Enabled for loading
                </label>
                <Field label="Base URL"><Input value={f.base_url} onChange={e => setF({ ...f, base_url: e.target.value })} placeholder="https://api.example.com" /></Field>
                <Field label="Agent ID"><Input value={f.agent_id} onChange={e => setF({ ...f, agent_id: e.target.value })} /></Field>
                <Field label="Secret key" hint={saved?.has_secret ? 'A key is already saved. Only fill this in to replace it.' : 'Stored on the server and never shown again.'}>
                    <div className="relative">
                        <Input type={show ? 'text' : 'password'} value={f.secret} onChange={e => setF({ ...f, secret: e.target.value })} autoComplete="new-password"
                            placeholder={saved?.has_secret ? '•••••••• (saved)' : ''} />
                        <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide' : 'Show'}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7E938B] hover:text-[#EFE9DA]">{show ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                    </div>
                </Field>
                <Button variant="primary" onClick={save} disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save</Button>
            </div>
        </section>
    )
}

export default function Providers() {
    const supabase = useMemo(() => createClient(), [])
    const toast = useToast()
    const games = useGames()
    const [rows, setRows] = useState(null)
    const [error, setError] = useState(null)
    const [threshold, setThreshold] = useState('')
    const [savingT, setSavingT] = useState(false)

    const load = useCallback(async () => {
        setError(null)
        const [p, t] = await Promise.all([
            supabase.rpc('list_game_providers'),
            supabase.from('admin_settings').select('value').eq('key', 'low_balance_threshold').maybeSingle(),
        ])
        if (p.error) return setError(errorMessage(p.error, 'Could not load providers. This needs the provider-manage permission and the latest database update (0017).'))
        setRows(p.data ?? [])
        if (t.data) setThreshold(String(t.data.value))
    }, [supabase])

    useEffect(() => {
        load()
    }, [load])

    const titles = useMemo(() => {
        const fromGames = games.filter(g => !String(g.id).startsWith('fallback')).map(g => g.title)
        return [...new Set([...(rows ?? []).map(r => r.game_title), ...fromGames])]
    }, [games, rows])

    const saveThreshold = async () => {
        setSavingT(true)
        const { error: err } = await supabase.rpc('set_low_balance_threshold', { p_amount: Number(threshold) || 0 })
        setSavingT(false)
        if (err) return toast(errorMessage(err, 'Could not save.'), 'error')
        toast('Low balance alert saved.')
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start gap-4">
                <div className="flex-1">
                    <h1 className="text-2xl text-[#EFE9DA]" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>Game providers</h1>
                    <p className="mt-1 max-w-2xl text-sm text-[#7E938B]">
                        Agent credentials the site will use to create player accounts and load or withdraw balances directly. The store balance check reads how much float is left in each game.
                    </p>
                </div>
                <Button onClick={() => toast('Store balance checks start once the provider APIs are connected.', 'error')}>
                    <RefreshCw size={14} /> Check store balances
                </Button>
            </div>

            <Panel title="Low balance alert">
                <div className="flex flex-wrap items-end gap-3 p-4">
                    <Field label="Alert me when a game’s store balance falls under ($)">
                        <Input type="number" min="0" value={threshold} onChange={e => setThreshold(e.target.value)} />
                    </Field>
                    <Button variant="primary" onClick={saveThreshold} disabled={savingT || rows === null}>
                        {savingT ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />} Save
                    </Button>
                    <p className="basis-full text-xs text-[#7E938B]">
                        When a game falls below this, a banner shows across the admin panel. Automatic checks every 15 minutes and push alerts start once the provider APIs are connected.
                    </p>
                </div>
            </Panel>

            {error ? (
                <Panel><ErrorState message={error} onRetry={load} /></Panel>
            ) : rows === null ? (
                <Panel><Skeleton /></Panel>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {titles.map(t => (
                        <ProviderCard key={t} supabase={supabase} title={t} saved={rows.find(r => r.game_title === t)} onSaved={load} />
                    ))}
                </div>
            )}
        </div>
    )
}
