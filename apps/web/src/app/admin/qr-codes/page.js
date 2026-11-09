'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { errorMessage } from '@/lib/adminApi'
import {
    Badge, Button, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, Panel, Skeleton, useToast,
} from '@/components/admin/ui'

const BUCKET = 'payment-qr'
const blank = { label: '', note: '', image_path: '', is_active: true }
const safeName = name => (name || 'qr').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-60)

/** Small preview of a stored (private) QR image through a signed link. */
const Thumb = ({ supabase, path, file }) => {
    const [url, setUrl] = useState(null)
    useEffect(() => {
        if (file) {
            const u = URL.createObjectURL(file)
            setUrl(u)
            return () => URL.revokeObjectURL(u)
        }
        setUrl(null)
        if (!path) return
        let alive = true
        supabase.storage.from(BUCKET).createSignedUrl(path, 3600).then(({ data }) => alive && setUrl(data?.signedUrl ?? null))
        return () => {
            alive = false
        }
    }, [supabase, path, file])
    return (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-white">
            {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="h-full w-full object-contain" />
            ) : (
                <span className="text-[10px] text-gray-400">QR</span>
            )}
        </div>
    )
}

const QrCodes = () => {
    const supabase = useMemo(() => createClient(), [])
    const toast = useToast()
    const [codes, setCodes] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [form, setForm] = useState(null)
    const [file, setFile] = useState(null)
    const [saving, setSaving] = useState(false)
    const [confirming, setConfirming] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const input = useRef(null)

    const load = useCallback(async () => {
        setError(null)
        const { data, error: err } = await supabase.from('payment_qr_codes').select('*').order('sort_order').order('id')
        if (err) setError(errorMessage(err, 'Could not load QR codes. This needs the qr-manage permission.'))
        else setCodes(data ?? [])
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        load()
    }, [load])

    const open = row => {
        setFile(null)
        setForm(row)
    }

    const save = async event => {
        event.preventDefault()
        if (!form.label.trim()) return
        if (!form.id && !file) return toast('Choose the QR code picture first.', 'error')
        setSaving(true)
        let image_path = form.image_path
        if (file) {
            const path = `${Date.now()}-${safeName(file.name)}`
            const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })
            if (upErr) {
                setSaving(false)
                return toast(errorMessage(upErr, 'Could not upload the picture.'), 'error')
            }
            image_path = path
        }
        const row = { label: form.label.trim(), note: form.note?.trim() || null, image_path, is_active: form.is_active }
        let err
        if (form.id) {
            ;({ error: err } = await supabase.from('payment_qr_codes').update(row).eq('id', form.id))
            if (!err && file && form.image_path) await supabase.storage.from(BUCKET).remove([form.image_path])
        } else {
            const next = codes.reduce((m, c) => Math.max(m, c.sort_order), 0) + 1
            ;({ error: err } = await supabase.from('payment_qr_codes').insert({ ...row, sort_order: next }))
        }
        setSaving(false)
        if (err) return toast(errorMessage(err, 'Could not save this QR code.'), 'error')
        toast(form.id ? 'QR code updated.' : 'QR code added.')
        setForm(null)
        load()
    }

    const toggle = async c => {
        setCodes(list => list.map(x => (x.id === c.id ? { ...x, is_active: !x.is_active } : x)))
        const { error: err } = await supabase.from('payment_qr_codes').update({ is_active: !c.is_active }).eq('id', c.id)
        if (err) {
            toast(errorMessage(err, 'Could not change this QR code.'), 'error')
            load()
        }
    }

    const move = async (i, dir) => {
        if (!codes[i + dir]) return
        const ids = codes.map(c => c.id)
        ;[ids[i], ids[i + dir]] = [ids[i + dir], ids[i]]
        setCodes(ids.map((id, n) => ({ ...codes.find(c => c.id === id), sort_order: n + 1 })))
        const res = await Promise.all(ids.map((id, n) => supabase.from('payment_qr_codes').update({ sort_order: n + 1 }).eq('id', id)))
        if (res.some(r => r.error)) {
            toast('Could not save the new order.', 'error')
            load()
        }
    }

    const remove = async () => {
        setDeleting(true)
        const { error: err } = await supabase.from('payment_qr_codes').delete().eq('id', confirming.id)
        if (!err) await supabase.storage.from(BUCKET).remove([confirming.image_path])
        setDeleting(false)
        if (err) return toast(errorMessage(err, 'Could not delete this QR code.'), 'error')
        toast('QR code deleted.')
        setConfirming(null)
        load()
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl text-[#EFE9DA]" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>QR codes</h1>
                <p className="mt-1 text-sm text-[#7E938B]">
                    Payment QR codes (Cash App, Venmo, PayPal…). Players see them from the QR button in the chat and can download them. In the admin chat, tap one to send it to the player.
                </p>
            </div>

            <Panel title={`QR codes (${codes.length})`}
                action={<Button variant="primary" onClick={() => open(blank)}><Plus size={14} className="mr-1 inline" />New QR code</Button>}>
                {loading ? <Skeleton /> : error ? <ErrorState message={error} onRetry={load} /> : codes.length === 0 ? (
                    <EmptyState message="No QR codes yet." action={<Button variant="primary" onClick={() => open(blank)}>Add one</Button>} />
                ) : (
                    <ul className="divide-y divide-[#1E322C]/60">
                        {codes.map((c, i) => (
                            <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                <Thumb supabase={supabase} path={c.image_path} />
                                <div className="min-w-0 flex-1 basis-40">
                                    <p className="truncate text-sm text-[#EFE9DA]">{c.label}</p>
                                    {c.note && <p className="truncate text-xs text-[#7E938B]">{c.note}</p>}
                                </div>
                                {!c.is_active && <Badge>Hidden</Badge>}
                                <div className="flex items-center gap-1">
                                    <button onClick={() => toggle(c)} aria-label={c.is_active ? `Hide ${c.label}` : `Show ${c.label}`} className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA]">
                                        {c.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                    <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA] disabled:opacity-30"><ArrowUp size={16} /></button>
                                    <button onClick={() => move(i, 1)} disabled={i === codes.length - 1} aria-label="Move down" className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA] disabled:opacity-30"><ArrowDown size={16} /></button>
                                    <button onClick={() => open(c)} aria-label={`Edit ${c.label}`} className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA]"><Pencil size={16} /></button>
                                    <button onClick={() => setConfirming(c)} aria-label={`Delete ${c.label}`} className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#C25B45]"><Trash2 size={16} /></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            <Modal open={!!form} title={form?.id ? 'Edit QR code' : 'New QR code'} onClose={() => setForm(null)}>
                {form && (
                    <form onSubmit={save} className="space-y-4">
                        <Field label="Payment method" hint="Shown to players, for example Cash App, Venmo or PayPal.">
                            <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} maxLength={40} autoFocus required />
                        </Field>
                        <Field label="Note (optional)" hint="For example your $cashtag or a short instruction.">
                            <Input value={form.note ?? ''} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} maxLength={120} />
                        </Field>
                        <Field label="QR code picture" hint="PNG, JPG or WebP, up to 5 MB.">
                            <div className="flex items-center gap-3">
                                <Thumb supabase={supabase} path={form.image_path} file={file} />
                                <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif"
                                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                                    className="block w-full text-sm text-[#7E938B] file:mr-3 file:rounded file:border-0 file:bg-[#1E322C] file:px-3 file:py-1.5 file:text-[#EFE9DA]" />
                            </div>
                        </Field>
                        <label className="flex items-center gap-2 text-sm text-[#EFE9DA]">
                            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 accent-[#D4AF57]" />
                            Visible to players
                        </label>
                        <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : 'Save QR code'}</Button>
                    </form>
                )}
            </Modal>

            <ConfirmDialog open={!!confirming} title="Delete this QR code?" body={`"${confirming?.label}" and its picture will be removed.`}
                confirmLabel="Delete QR code" busy={deleting} onConfirm={remove} onClose={() => setConfirming(null)} />
        </div>
    )
}

export default QrCodes
