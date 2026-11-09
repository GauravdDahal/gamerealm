'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Download, Loader2, QrCode, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * Payment QR codes. Lists the available methods (Cash App, Venmo, PayPal …);
 * tapping one shows its QR code with a download button. Used inside the
 * player chat and the admin chat. The images are private: each one is shown
 * through a short-lived signed link.
 *
 * `tone` picks the look: 'player' uses the site theme, 'admin' the admin colours.
 */
const BUCKET = 'payment-qr'

const ext = path => (path.split('.').pop() || 'png').toLowerCase()

export default function QrPanel({ onClose, tone = 'player', onSend }) {
    const supabase = useMemo(() => createClient(), [])
    const [codes, setCodes] = useState(null)
    const [error, setError] = useState(false)
    const [picked, setPicked] = useState(null)
    const [url, setUrl] = useState(null)
    const [busy, setBusy] = useState(false)
    const [sendingId, setSendingId] = useState(null)

    const admin = tone === 'admin'
    const c = admin
        ? { bg: 'bg-[#0C1714]', card: 'border-[#1E322C] bg-[#132320] hover:border-[#D4AF57]/60', text: 'text-[#EFE9DA]', muted: 'text-[#7E938B]', accent: 'text-[#D4AF57]', btn: 'bg-[#D4AF57] text-[#0C1714]' }
        : { bg: 'bg-transparent', card: 'border-line/60 bg-surface/70 hover:border-accent/60', text: 'text-ink', muted: 'text-muted', accent: 'text-accent', btn: 'bg-accent text-accent-ink hover:bg-accent2' }

    const load = useCallback(async () => {
        setError(false)
        const { data, error: err } = await supabase
            .from('payment_qr_codes')
            .select('id,label,note,image_path')
            .eq('is_active', true)
            .order('sort_order')
            .order('id')
        if (err) return setError(true)
        setCodes(data ?? [])
    }, [supabase])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        setUrl(null)
        if (!picked) return
        let alive = true
        supabase.storage
            .from(BUCKET)
            .createSignedUrl(picked.image_path, 60 * 60)
            .then(({ data }) => alive && setUrl(data?.signedUrl ?? null))
        return () => {
            alive = false
        }
    }, [picked, supabase])

    // Staff: tapping a QR code sends its image straight into the chat.
    const sendCode = async q => {
        if (sendingId) return
        setSendingId(q.id)
        try {
            const { data } = await supabase.storage.from(BUCKET).createSignedUrl(q.image_path, 120)
            const blob = await (await fetch(data.signedUrl)).blob()
            const file = new File([blob], `${q.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-qr.${ext(q.image_path)}`, { type: blob.type || 'image/png' })
            await onSend(q, file)
        } catch {
            setError(true)
        }
        setSendingId(null)
    }

    const download = async () => {
        if (!url) return
        setBusy(true)
        try {
            const blob = await (await fetch(url)).blob()
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = `${picked.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-qr.${ext(picked.image_path)}`
            document.body.appendChild(a)
            a.click()
            a.remove()
            setTimeout(() => URL.revokeObjectURL(a.href), 1000)
        } catch {
            window.open(url, '_blank', 'noopener')
        }
        setBusy(false)
    }

    return (
        <div className={`flex min-h-0 flex-1 flex-col ${c.bg}`}>
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                {picked ? (
                    <button onClick={() => setPicked(null)} aria-label="Back to the list" className={`rounded-full p-1.5 ${c.muted} hover:text-white`}>
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                ) : (
                    <QrCode className={`h-5 w-5 ${c.accent}`} />
                )}
                <p className={`flex-1 text-sm font-bold ${c.text}`}>{picked ? picked.label : onSend ? 'Tap a QR code to send it to the player' : 'Pay with a QR code'}</p>
                <button onClick={onClose} aria-label="Close QR codes" className={`rounded-full p-1.5 ${c.muted} hover:text-white`}>
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {error ? (
                    <p className={`text-sm ${c.muted}`}>
                        Could not load the QR codes.{' '}
                        <button onClick={load} className={`underline ${c.accent}`}>Try again</button>
                    </p>
                ) : codes === null ? (
                    <div className={`flex justify-center py-10 ${c.muted}`}><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : picked ? (
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="flex aspect-square w-full max-w-[260px] items-center justify-center rounded-2xl bg-white p-3">
                            {url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={url} alt={`${picked.label} QR code`} className="h-full w-full object-contain" />
                            ) : (
                                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                            )}
                        </div>
                        {picked.note && <p className={`text-sm ${c.muted}`}>{picked.note}</p>}
                        <button onClick={download} disabled={!url || busy}
                            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-50 ${c.btn}`}>
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download QR code
                        </button>
                    </div>
                ) : codes.length === 0 ? (
                    <p className={`py-10 text-center text-sm ${c.muted}`}>No QR codes are available yet.</p>
                ) : (
                    <ul className="grid grid-cols-2 gap-3">
                        {codes.map(q => (
                            <li key={q.id}>
                                <button onClick={() => (onSend ? sendCode(q) : setPicked(q))} disabled={!!sendingId}
                                    className={`flex h-full w-full flex-col items-center gap-2 rounded-xl border p-4 text-center transition ${c.card}`}>
                                    {sendingId === q.id ? <Loader2 className={`h-8 w-8 animate-spin ${c.accent}`} /> : <QrCode className={`h-8 w-8 ${c.accent}`} />}
                                    <span className={`text-sm font-semibold ${c.text}`}>{q.label}</span>
                                    {q.note && <span className={`line-clamp-2 text-[11px] ${c.muted}`}>{q.note}</span>}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
