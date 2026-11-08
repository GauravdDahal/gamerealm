'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { errorMessage } from '@/lib/adminApi'
import { HIGHLIGHT_STYLES } from '@/components/chat/MessageMedia'
import {
    Button,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    Field,
    Input,
    inputClass,
    Modal,
    Panel,
    Skeleton,
    useToast,
} from '@/components/admin/ui'

const blank = { title: '', body: '', style: 'info' }

/** How the message will look to the player. */
const Preview = ({ title, body, style }) => {
    const hl = HIGHLIGHT_STYLES[style] ?? HIGHLIGHT_STYLES.info
    const Icon = hl.icon
    return (
        <div
            style={{ background: hl.tint, borderLeft: `3px solid ${hl.bar}` }}
            className="space-y-2 rounded-lg border border-[#1E322C] px-3 py-2 text-sm text-[#EFE9DA]">
            <p
                style={{ color: hl.bar }}
                className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
                <Icon size={14} />
                {title || hl.label}
            </p>
            <p className="whitespace-pre-wrap break-words">{body || 'Your message appears here.'}</p>
        </div>
    )
}

const QuickReplies = () => {
    const supabase = useMemo(() => createClient(), [])
    const toast = useToast()
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [form, setForm] = useState(null) // null = closed, else { id?, title, body, style }
    const [saving, setSaving] = useState(false)
    const [confirming, setConfirming] = useState(null)
    const [deleting, setDeleting] = useState(false)

    const load = useCallback(async () => {
        setError(null)
        const { data, error: err } = await supabase
            .from('quick_replies')
            .select('*')
            .order('created_at', { ascending: true })
        if (err) setError(errorMessage(err, 'Could not load saved replies. This needs the chat-view permission.'))
        else setItems(data ?? [])
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        load()
    }, [load])

    const save = async event => {
        event.preventDefault()
        if (!form.title.trim() || !form.body.trim()) return
        setSaving(true)
        const row = { title: form.title.trim(), body: form.body.trim(), style: form.style }
        let err
        if (form.id) {
            ;({ error: err } = await supabase.from('quick_replies').update(row).eq('id', form.id))
        } else {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            ;({ error: err } = await supabase
                .from('quick_replies')
                .insert({ ...row, created_by: session?.user?.id }))
        }
        setSaving(false)
        if (err) return toast(errorMessage(err, 'Could not save this reply.'), 'error')
        toast(form.id ? 'Reply updated.' : 'Reply saved.')
        setForm(null)
        load()
    }

    const remove = async () => {
        setDeleting(true)
        const { error: err } = await supabase.from('quick_replies').delete().eq('id', confirming.id)
        setDeleting(false)
        if (err) return toast(errorMessage(err, 'Could not delete this reply.'), 'error')
        toast('Reply deleted.')
        setConfirming(null)
        load()
    }

    return (
        <div className="space-y-6">
            <div>
                <h1
                    className="text-2xl text-[#EFE9DA]"
                    style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                    Saved replies
                </h1>
                <p className="mt-1 text-sm text-[#7E938B]">
                    Highlighted messages you write once and send from any chat with one click (the
                    lightning button next to the message box).
                </p>
            </div>

            <Panel
                title={`${items.length} saved repl${items.length === 1 ? 'y' : 'ies'}`}
                action={
                    <Button variant="primary" onClick={() => setForm(blank)}>
                        <Plus size={14} className="mr-1 inline" />
                        New reply
                    </Button>
                }>
                {loading ? (
                    <Skeleton />
                ) : error ? (
                    <ErrorState message={error} onRetry={load} />
                ) : items.length === 0 ? (
                    <EmptyState
                        message="No saved replies yet."
                        action={
                            <Button variant="primary" onClick={() => setForm(blank)}>
                                Create one
                            </Button>
                        }
                    />
                ) : (
                    <ul className="grid gap-4 p-4 sm:grid-cols-2">
                        {items.map(q => (
                            <li key={q.id} className="space-y-2">
                                <Preview title={q.title} body={q.body} style={q.style} />
                                <div className="flex justify-end gap-1">
                                    <button
                                        onClick={() => setForm(q)}
                                        aria-label={`Edit ${q.title}`}
                                        className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA]">
                                        <Pencil size={15} />
                                    </button>
                                    <button
                                        onClick={() => setConfirming(q)}
                                        aria-label={`Delete ${q.title}`}
                                        className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#C25B45]">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            <Modal
                open={!!form}
                title={form?.id ? 'Edit saved reply' : 'New saved reply'}
                onClose={() => setForm(null)}>
                {form && (
                    <form onSubmit={save} className="space-y-4">
                        <Field label="Title" hint="Shown in bold at the top, and in your list of replies.">
                            <Input
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="e.g. Weekend bonus"
                                maxLength={60}
                                autoFocus
                                required
                            />
                        </Field>
                        <Field label="Message">
                            <textarea
                                className={`${inputClass} min-h-[110px]`}
                                value={form.body}
                                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                                placeholder="What the player will read"
                                required
                            />
                        </Field>
                        <div>
                            <span className="mb-1.5 block text-sm text-[#EFE9DA]">Highlight colour</span>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(HIGHLIGHT_STYLES).map(([key, v]) => (
                                    <button
                                        type="button"
                                        key={key}
                                        onClick={() => setForm(f => ({ ...f, style: key }))}
                                        style={form.style === key ? { borderColor: v.bar, color: v.bar } : undefined}
                                        className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm ${
                                            form.style === key
                                                ? 'bg-[#0C1714]'
                                                : 'border-[#1E322C] text-[#7E938B] hover:text-[#EFE9DA]'
                                        }`}>
                                        <v.icon size={14} /> {v.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <span className="mb-1.5 block text-xs text-[#7E938B]">Preview</span>
                            <Preview title={form.title} body={form.body} style={form.style} />
                        </div>
                        <Button type="submit" variant="primary" disabled={saving}>
                            {saving ? 'Saving…' : 'Save reply'}
                        </Button>
                    </form>
                )}
            </Modal>

            <ConfirmDialog
                open={!!confirming}
                title="Delete this saved reply?"
                body={`"${confirming?.title}" will be removed. Messages already sent are not affected.`}
                confirmLabel="Delete"
                busy={deleting}
                onConfirm={remove}
                onClose={() => setConfirming(null)}
            />
        </div>
    )
}

export default QuickReplies
