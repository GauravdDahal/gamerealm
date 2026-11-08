'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, Flame, Pencil, Plus, Trash2 } from 'lucide-react'
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

const BUCKET = 'game-images'
const blank = { title: '', players: '', is_hot: false, is_active: true, image_url: '', logo_url: '' }

const safeName = name => (name || 'image').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-60)

/** Picks an image, shows what is currently set, and reports the chosen file. */
const ImagePicker = ({ label, hint, current, file, onFile, optional, onClear }) => {
    const [preview, setPreview] = useState(null)
    const input = useRef(null)

    useEffect(() => {
        if (!file) return setPreview(null)
        const url = URL.createObjectURL(file)
        setPreview(url)
        return () => URL.revokeObjectURL(url)
    }, [file])

    const shown = preview || current
    return (
        <Field label={label} hint={hint}>
            <div className="flex items-center gap-3">
                <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded border border-[#1E322C] bg-[#0C1714]">
                    {shown ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={shown} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <span className="text-xs text-[#7E938B]">No image</span>
                    )}
                </div>
                <div className="space-y-2">
                    <input
                        ref={input}
                        type="file"
                        accept="image/*"
                        onChange={e => onFile(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-[#7E938B] file:mr-3 file:rounded file:border-0 file:bg-[#1E322C] file:px-3 file:py-1.5 file:text-[#EFE9DA]"
                    />
                    {optional && (current || file) && (
                        <button
                            type="button"
                            onClick={() => {
                                onFile(null)
                                if (input.current) input.current.value = ''
                                onClear()
                            }}
                            className="text-xs text-[#C25B45] hover:underline">
                            Remove
                        </button>
                    )}
                </div>
            </div>
        </Field>
    )
}

const Games = () => {
    const supabase = useMemo(() => createClient(), [])
    const toast = useToast()
    const [games, setGames] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [form, setForm] = useState(null) // null = closed
    const [cardFile, setCardFile] = useState(null)
    const [logoFile, setLogoFile] = useState(null)
    const [saving, setSaving] = useState(false)
    const [confirming, setConfirming] = useState(null)
    const [deleting, setDeleting] = useState(false)

    const load = useCallback(async () => {
        setError(null)
        const { data, error: err } = await supabase
            .from('games')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('id', { ascending: true })
        if (err) setError(errorMessage(err, 'Could not load games. This needs the game-manage permission.'))
        else setGames(data ?? [])
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        load()
    }, [load])

    const openForm = game => {
        setCardFile(null)
        setLogoFile(null)
        setForm(game ? { ...game, logo_url: game.logo_url ?? '' } : blank)
    }

    const upload = async file => {
        const path = `${Date.now()}-${safeName(file.name)}`
        const { error: err } = await supabase.storage.from(BUCKET).upload(path, file, {
            contentType: file.type,
            cacheControl: '31536000',
        })
        if (err) throw err
        return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    }

    const save = async event => {
        event.preventDefault()
        if (!form.title.trim()) return
        if (!form.id && !cardFile) return toast('Please choose a card image.', 'error')
        setSaving(true)
        try {
            const row = {
                title: form.title.trim(),
                players: form.players.trim(),
                is_hot: form.is_hot,
                is_active: form.is_active,
                image_url: cardFile ? await upload(cardFile) : form.image_url,
                logo_url: logoFile ? await upload(logoFile) : form.logo_url || null,
            }
            if (form.id) {
                const { error: err } = await supabase.from('games').update(row).eq('id', form.id)
                if (err) throw err
            } else {
                const next = games.reduce((m, g) => Math.max(m, g.sort_order), 0) + 1
                const { error: err } = await supabase.from('games').insert({ ...row, sort_order: next })
                if (err) throw err
            }
            toast(form.id ? 'Game updated.' : 'Game added.')
            setForm(null)
            load()
        } catch (e) {
            toast(errorMessage(e, 'Could not save this game.'), 'error')
        } finally {
            setSaving(false)
        }
    }

    // Quick switches straight from the list.
    const patch = async (game, changes, message) => {
        setGames(list => list.map(g => (g.id === game.id ? { ...g, ...changes } : g)))
        const { error: err } = await supabase.from('games').update(changes).eq('id', game.id)
        if (err) {
            toast(errorMessage(err, 'Could not change this game.'), 'error')
            load()
        } else if (message) toast(message)
    }

    const move = async (index, dir) => {
        const a = games[index]
        const b = games[index + dir]
        if (!b) return
        // Give every game a clean 1..n order, then swap the two.
        const ordered = games.map(g => g.id)
        ;[ordered[index], ordered[index + dir]] = [ordered[index + dir], ordered[index]]
        setGames(ordered.map((id, i) => ({ ...games.find(g => g.id === id), sort_order: i + 1 })))
        const results = await Promise.all(
            ordered.map((id, i) => supabase.from('games').update({ sort_order: i + 1 }).eq('id', id)),
        )
        if (results.some(r => r.error)) {
            toast('Could not save the new order.', 'error')
            load()
        }
    }

    const remove = async () => {
        setDeleting(true)
        const { error: err } = await supabase.from('games').delete().eq('id', confirming.id)
        setDeleting(false)
        if (err) return toast(errorMessage(err, 'Could not delete this game.'), 'error')
        toast('Game deleted.')
        setConfirming(null)
        load()
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl text-[#EFE9DA]" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                    Games
                </h1>
                <p className="mt-1 text-sm text-[#7E938B]">
                    The games on the homepage: the cards, the moving logo strip, and which ones carry the Hot flame.
                </p>
            </div>

            <Panel
                title={`${games.length} game${games.length === 1 ? '' : 's'}`}
                action={
                    <Button variant="primary" onClick={() => openForm(null)}>
                        <Plus size={14} className="mr-1 inline" />
                        New game
                    </Button>
                }>
                {loading ? (
                    <Skeleton />
                ) : error ? (
                    <ErrorState message={error} onRetry={load} />
                ) : games.length === 0 ? (
                    <EmptyState
                        message="No games yet."
                        action={<Button variant="primary" onClick={() => openForm(null)}>Add one</Button>}
                    />
                ) : (
                    <ul className="divide-y divide-[#1E322C]/60">
                        {games.map((g, i) => (
                            <li key={g.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={g.logo_url || g.image_url} alt="" className="h-14 w-20 shrink-0 rounded object-cover" />
                                <div className="min-w-0 flex-1 basis-40">
                                    <p className="truncate text-sm text-[#EFE9DA]">{g.title}</p>
                                    <p className="text-xs text-[#7E938B]">{g.players ? `${g.players} players` : 'No player count'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {g.is_hot && <Badge tone="brass">Hot</Badge>}
                                    {!g.is_active && <Badge>Hidden</Badge>}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => patch(g, { is_hot: !g.is_hot })}
                                        aria-label={g.is_hot ? `Remove hot flag from ${g.title}` : `Mark ${g.title} as hot`}
                                        title={g.is_hot ? 'Hot (click to remove)' : 'Mark as hot'}
                                        className={`rounded p-1.5 hover:bg-[#1E322C] ${g.is_hot ? 'text-[#D4AF57]' : 'text-[#7E938B] hover:text-[#EFE9DA]'}`}>
                                        <Flame size={16} />
                                    </button>
                                    <button
                                        onClick={() => patch(g, { is_active: !g.is_active })}
                                        aria-label={g.is_active ? `Hide ${g.title}` : `Show ${g.title}`}
                                        title={g.is_active ? 'Visible (click to hide)' : 'Hidden (click to show)'}
                                        className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA]">
                                        {g.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                    <button
                                        onClick={() => move(i, -1)}
                                        disabled={i === 0}
                                        aria-label="Move up"
                                        className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA] disabled:opacity-30">
                                        <ArrowUp size={16} />
                                    </button>
                                    <button
                                        onClick={() => move(i, 1)}
                                        disabled={i === games.length - 1}
                                        aria-label="Move down"
                                        className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA] disabled:opacity-30">
                                        <ArrowDown size={16} />
                                    </button>
                                    <button
                                        onClick={() => openForm(g)}
                                        aria-label={`Edit ${g.title}`}
                                        className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA]">
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => setConfirming(g)}
                                        aria-label={`Delete ${g.title}`}
                                        className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#C25B45]">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            <Modal open={!!form} title={form?.id ? 'Edit game' : 'New game'} onClose={() => setForm(null)}>
                {form && (
                    <form onSubmit={save} className="space-y-4">
                        <Field label="Name">
                            <Input
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="e.g. Teen Patti"
                                autoFocus
                                required
                            />
                        </Field>
                        <Field label="Players label" hint="Shown on the card, like 50K+. Leave empty to hide.">
                            <Input
                                value={form.players}
                                onChange={e => setForm(f => ({ ...f, players: e.target.value }))}
                                placeholder="50K+"
                            />
                        </Field>
                        <ImagePicker
                            label="Card image"
                            hint="The big picture on the game card."
                            current={form.image_url}
                            file={cardFile}
                            onFile={setCardFile}
                        />
                        <ImagePicker
                            label="Logo (optional)"
                            hint="Used in the moving strip. If empty, the card image is used."
                            current={form.logo_url}
                            file={logoFile}
                            onFile={setLogoFile}
                            optional
                            onClear={() => setForm(f => ({ ...f, logo_url: '' }))}
                        />
                        <label className="flex items-center gap-2 text-sm text-[#EFE9DA]">
                            <input
                                type="checkbox"
                                checked={form.is_hot}
                                onChange={e => setForm(f => ({ ...f, is_hot: e.target.checked }))}
                                className="h-4 w-4 accent-[#D4AF57]"
                            />
                            Hot game (shows the flame)
                        </label>
                        <label className="flex items-center gap-2 text-sm text-[#EFE9DA]">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                className="h-4 w-4 accent-[#D4AF57]"
                            />
                            Visible on the site
                        </label>
                        <Button type="submit" variant="primary" disabled={saving}>
                            {saving ? 'Saving…' : 'Save game'}
                        </Button>
                    </form>
                )}
            </Modal>

            <ConfirmDialog
                open={!!confirming}
                title="Delete this game?"
                body={`"${confirming?.title}" will be removed from the homepage.`}
                confirmLabel="Delete game"
                busy={deleting}
                onConfirm={remove}
                onClose={() => setConfirming(null)}
            />
        </div>
    )
}

export default Games
