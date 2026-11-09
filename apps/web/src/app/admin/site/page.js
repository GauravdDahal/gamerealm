'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { mutate as globalMutate } from 'swr'
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { siteDefaults, withDefaults } from '@/lib/siteDefaults'
import { siteSchema } from '@/lib/siteSchema'
import { SITE_CONTENT_KEY } from '@/lib/useSiteContent'
import {
    Button,
    ErrorState,
    Field,
    Input,
    Panel,
    Select,
    Skeleton,
    inputClass,
    useToast,
} from '@/components/admin/ui'

const BUCKET = 'site-images'
const clone = v => JSON.parse(JSON.stringify(v))

const blankItem = fields =>
    Object.fromEntries(
        fields.map(f => [
            f.name,
            f.type === 'list' ? [] : f.type === 'number' ? (f.min ?? 0) : f.type === 'select' ? f.options[0].value : '',
        ]),
    )

/* ------------------------------------------------------------ one picture */
const ImageField = ({ field, value, onChange, upload }) => {
    const input = useRef(null)
    const [busy, setBusy] = useState(false)

    const pick = async event => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        setBusy(true)
        try {
            onChange(await upload(file))
        } finally {
            setBusy(false)
        }
    }

    return (
        <div>
            <span className="mb-1.5 block text-sm text-[#EFE9DA]">{field.label}</span>
            <div className="flex items-center gap-3">
                {value ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={value} alt="" className="h-16 w-24 rounded border border-[#1E322C] object-cover" />
                ) : (
                    <div className="flex h-16 w-24 items-center justify-center rounded border border-dashed border-[#1E322C] text-xs text-[#7E938B]">
                        No picture
                    </div>
                )}
                <input ref={input} type="file" accept="image/*" className="hidden" onChange={pick} />
                <Button type="button" onClick={() => input.current?.click()} disabled={busy}>
                    <ImagePlus size={14} /> {busy ? 'Uploading…' : value ? 'Change' : 'Choose picture'}
                </Button>
                {value && (
                    <Button type="button" variant="danger" onClick={() => onChange('')}>
                        <X size={14} /> Remove
                    </Button>
                )}
            </div>
            {field.hint && <span className="mt-1 block text-xs text-[#7E938B]">{field.hint}</span>}
        </div>
    )
}

/* ---------------------------------------------------- any field, any depth */
const FieldEditor = ({ field, value, onChange, upload }) => {
    if (field.type === 'image') {
        return <ImageField field={field} value={value} onChange={onChange} upload={upload} />
    }
    if (field.type === 'list') {
        return <ListEditor field={field} value={value ?? []} onChange={onChange} upload={upload} />
    }
    return (
        <Field label={field.label} hint={field.hint}>
            {field.type === 'textarea' ? (
                <textarea
                    className={inputClass}
                    rows={field.rows ?? 3}
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value)}
                />
            ) : field.type === 'select' ? (
                <Select value={value ?? ''} onChange={e => onChange(e.target.value)}>
                    {field.options.map(o => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </Select>
            ) : field.type === 'number' ? (
                <Input
                    type="number"
                    min={field.min}
                    max={field.max}
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
                />
            ) : (
                <Input value={value ?? ''} onChange={e => onChange(e.target.value)} />
            )}
        </Field>
    )
}

const ListEditor = ({ field, value, onChange, upload }) => {
    const setItem = (i, patch) => onChange(value.map((it, n) => (n === i ? { ...it, ...patch } : it)))
    const move = (i, d) => {
        const j = i + d
        if (j < 0 || j >= value.length) return
        const next = [...value]
        ;[next[i], next[j]] = [next[j], next[i]]
        onChange(next)
    }

    return (
        <div>
            <span className="mb-2 block text-sm text-[#EFE9DA]">{field.label}</span>
            <div className="space-y-3">
                {value.length === 0 && (
                    <p className="rounded border border-dashed border-[#1E322C] px-3 py-4 text-center text-xs text-[#7E938B]">
                        Nothing here yet.
                    </p>
                )}
                {value.map((item, i) => (
                    <div key={i} className="rounded border border-[#1E322C] bg-[#0C1714] p-3">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <span className="truncate text-xs uppercase tracking-wide text-[#D4AF57]">
                                {i + 1}. {(item[field.itemLabel] || '').toString().slice(0, 40) || 'New'}
                            </span>
                            <div className="flex shrink-0 gap-1">
                                <Button type="button" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                                    <ArrowUp size={14} />
                                </Button>
                                <Button
                                    type="button"
                                    aria-label="Move down"
                                    onClick={() => move(i, 1)}
                                    disabled={i === value.length - 1}>
                                    <ArrowDown size={14} />
                                </Button>
                                <Button
                                    type="button"
                                    variant="danger"
                                    aria-label="Delete"
                                    onClick={() => onChange(value.filter((_, n) => n !== i))}>
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {field.fields.map(f => (
                                <FieldEditor
                                    key={f.name}
                                    field={f}
                                    value={item[f.name]}
                                    onChange={v => setItem(i, { [f.name]: v })}
                                    upload={upload}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <Button type="button" className="mt-3" onClick={() => onChange([...value, blankItem(field.fields)])}>
                <Plus size={14} /> {field.addLabel ?? 'Add'}
            </Button>
        </div>
    )
}

/* ------------------------------------------------------------------ page */
const SiteContent = () => {
    const toast = useToast()
    const supabase = createClient()
    const [saved, setSaved] = useState(null)
    const [error, setError] = useState(null)
    const [active, setActive] = useState(siteSchema[0].key)
    const [drafts, setDrafts] = useState({})
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        setError(null)
        const { data, error: e } = await supabase.from('site_content').select('key, content')
        if (e) return setError(e.message)
        setSaved(Object.fromEntries((data ?? []).map(r => [r.key, r.content])))
    }, [supabase])

    useEffect(() => {
        load()
    }, [load])

    const section = siteSchema.find(s => s.key === active)
    const current = drafts[active] ?? (saved ? withDefaults(saved[active], clone(siteDefaults[active])) : null)
    const dirty = Object.keys(drafts)

    const setField = (name, value) => setDrafts(d => ({ ...d, [active]: { ...current, [name]: value } }))

    const upload = async file => {
        const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
        const path = `${active}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: e } = await supabase.storage.from(BUCKET).upload(path, file, {
            cacheControl: '3600',
            contentType: file.type,
        })
        if (e) {
            toast(e.message, 'error')
            throw e
        }
        return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    }

    const finish = async message => {
        await globalMutate(SITE_CONTENT_KEY)
        await load()
        setDrafts(d => {
            const { [active]: _gone, ...rest } = d
            return rest
        })
        toast(message)
    }

    const save = async () => {
        setBusy(true)
        const { error: e } = await supabase.from('site_content').upsert({ key: active, content: current })
        setBusy(false)
        if (e) {
            toast(/row-level security|permission/i.test(e.message) ? 'You do not have permission to edit the site.' : e.message, 'error')
            return
        }
        await finish('Saved. The website is updated.')
    }

    const reset = async () => {
        if (!window.confirm('Put this section back to its original wording? Your changes to it will be lost.')) return
        setBusy(true)
        const { error: e } = await supabase.from('site_content').delete().eq('key', active)
        setBusy(false)
        if (e) return toast(e.message, 'error')
        await finish('Back to the original wording.')
    }

    if (error) return <ErrorState message={error} onRetry={load} />
    if (!saved) return <Skeleton rows={6} />

    return (
        <div className="space-y-4">
            <div>
                <h1 className="font-[family-name:var(--font-display)] text-2xl text-[#EFE9DA]">Site content</h1>
                <p className="mt-1 text-sm text-[#7E938B]">
                    Change any text or picture on the public website. Pick a part on the left, edit it, then press Save.
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
                    {siteSchema.map(s => (
                        <button
                            key={s.key}
                            onClick={() => setActive(s.key)}
                            className={`shrink-0 rounded border px-3 py-2 text-left text-sm transition-colors ${
                                active === s.key
                                    ? 'border-[#D4AF57] bg-[#132320] text-[#D4AF57]'
                                    : 'border-[#1E322C] text-[#EFE9DA] hover:bg-[#132320]'
                            }`}>
                            {s.label}
                            {dirty.includes(s.key) && <span className="ml-2 text-xs text-[#C25B45]">• unsaved</span>}
                            {!dirty.includes(s.key) && saved[s.key] && (
                                <span className="ml-2 text-xs text-[#7E938B]">edited</span>
                            )}
                        </button>
                    ))}
                </nav>

                <Panel
                    title={section.label}
                    action={
                        <div className="flex gap-2">
                            {saved[active] && (
                                <Button type="button" onClick={reset} disabled={busy}>
                                    Use original
                                </Button>
                            )}
                            <Button type="button" variant="primary" onClick={save} disabled={busy || !dirty.includes(active)}>
                                {busy ? 'Saving…' : 'Save'}
                            </Button>
                        </div>
                    }>
                    <div className="space-y-4 p-4">
                        {section.help && <p className="text-sm text-[#7E938B]">{section.help}</p>}
                        {section.fields.map(f => (
                            <FieldEditor
                                key={`${active}-${f.name}`}
                                field={f}
                                value={current[f.name]}
                                onChange={v => setField(f.name, v)}
                                upload={upload}
                            />
                        ))}
                    </div>
                </Panel>
            </div>
        </div>
    )
}

export default SiteContent
