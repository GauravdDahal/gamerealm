'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Trash2, Eye, Plus } from 'lucide-react'
import { adminApi, errorMessage } from '@/lib/adminApi'
import {
    Badge,
    Button,
    Cell,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    Field,
    Input,
    inputClass,
    Modal,
    Panel,
    Row,
    Skeleton,
    Table,
    useToast,
} from '@/components/admin/ui'

const BannerGroups = () => {
    const toast = useToast()
    const [groups, setGroups] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [busyId, setBusyId] = useState(null)

    const [detail, setDetail] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)

    const [confirming, setConfirming] = useState(null)
    const [deleting, setDeleting] = useState(false)

    const [creatingSet, setCreatingSet] = useState(false)
    const [newSetName, setNewSetName] = useState('')
    const [savingSet, setSavingSet] = useState(false)

    const [slideForm, setSlideForm] = useState({ title: '', description: '', file: null })
    const [savingSlide, setSavingSlide] = useState(false)
    const [confirmingSlide, setConfirmingSlide] = useState(null)
    const [deletingSlide, setDeletingSlide] = useState(false)
    const fileInputRef = useRef(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await adminApi.bannerGroups()
            setGroups(res?.banner_groups ?? [])
        } catch (e) {
            setError(
                errorMessage(
                    e,
                    'Could not load banners. This needs the banner-view permission.',
                ),
            )
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const toggle = async group => {
        setBusyId(group.id)
        // Optimistic flip, rolled back if the request fails.
        setGroups(list =>
            list.map(g => (g.id === group.id ? { ...g, is_active: !g.is_active } : g)),
        )
        try {
            await adminApi.toggleBannerGroup(group.id)
            toast(group.is_active ? 'Banner set hidden.' : 'Banner set is now live.')
        } catch (e) {
            setGroups(list =>
                list.map(g =>
                    g.id === group.id ? { ...g, is_active: group.is_active } : g,
                ),
            )
            toast(errorMessage(e, 'Could not change this banner set.'), 'error')
        } finally {
            setBusyId(null)
        }
    }

    const openDetail = async group => {
        setDetail({ ...group, banners: null })
        setDetailLoading(true)
        try {
            const res = await adminApi.bannerGroup(group.id)
            setDetail(res?.banner_group ?? { ...group, banners: [] })
        } catch (e) {
            toast(errorMessage(e, 'Could not load that banner set.'), 'error')
            setDetail(null)
        } finally {
            setDetailLoading(false)
        }
    }

    const createSet = async event => {
        event.preventDefault()
        if (!newSetName.trim()) return
        setSavingSet(true)
        try {
            await adminApi.createBannerGroup(newSetName.trim())
            toast('Banner set created.')
            setCreatingSet(false)
            setNewSetName('')
            load()
        } catch (e) {
            toast(errorMessage(e, 'Could not create this banner set.'), 'error')
        } finally {
            setSavingSet(false)
        }
    }

    const addSlide = async event => {
        event.preventDefault()
        if (!slideForm.title.trim() || !slideForm.file) return
        setSavingSlide(true)
        try {
            await adminApi.addBanner({
                banner_group_id: detail.id,
                title: slideForm.title.trim(),
                description: slideForm.description.trim(),
                file: slideForm.file,
            })
            toast('Slide added.')
            setSlideForm({ title: '', description: '', file: null })
            if (fileInputRef.current) fileInputRef.current.value = ''
            openDetail(detail)
        } catch (e) {
            toast(errorMessage(e, 'Could not add this slide.'), 'error')
        } finally {
            setSavingSlide(false)
        }
    }

    const removeSlide = async () => {
        setDeletingSlide(true)
        try {
            await adminApi.deleteBanner(confirmingSlide.id)
            toast('Slide removed.')
            setConfirmingSlide(null)
            openDetail(detail)
        } catch (e) {
            toast(errorMessage(e, 'Could not remove this slide.'), 'error')
        } finally {
            setDeletingSlide(false)
        }
    }

    const remove = async () => {
        setDeleting(true)
        try {
            await adminApi.deleteBannerGroup(confirming.id)
            toast('Banner set deleted.')
            setConfirming(null)
            load()
        } catch (e) {
            toast(errorMessage(e, 'Could not delete this banner set.'), 'error')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1
                    className="text-2xl text-[#EFE9DA]"
                    style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                    Banners
                </h1>
                <p className="mt-1 text-sm text-[#7E938B]">
                    Sets of promotional slides shown on the public site.
                </p>
            </div>

            <Panel
                title={`${groups.length} banner set${groups.length === 1 ? '' : 's'}`}
                action={
                    <Button variant="primary" onClick={() => setCreatingSet(true)}>
                        <Plus size={14} className="mr-1 inline" />
                        New set
                    </Button>
                }>
                {loading ? (
                    <Skeleton />
                ) : error ? (
                    <ErrorState message={error} onRetry={load} />
                ) : groups.length === 0 ? (
                    <EmptyState
                        message="No banner sets yet."
                        action={
                            <Button variant="primary" onClick={() => setCreatingSet(true)}>
                                Create one
                            </Button>
                        }
                    />
                ) : (
                    <Table head={['Name', 'Status', '']}>
                        {groups.map(g => (
                            <Row key={g.id}>
                                <Cell>{g.name}</Cell>
                                <Cell>
                                    {g.is_active ? (
                                        <Badge tone="brass">Live</Badge>
                                    ) : (
                                        <Badge>Hidden</Badge>
                                    )}
                                </Cell>
                                <Cell className="text-right whitespace-nowrap">
                                    <span className="inline-flex items-center gap-2">
                                        <Button
                                            onClick={() => toggle(g)}
                                            disabled={busyId === g.id}>
                                            {g.is_active ? 'Hide' : 'Set live'}
                                        </Button>
                                        <button
                                            onClick={() => openDetail(g)}
                                            aria-label={`View ${g.name}`}
                                            className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA]">
                                            <Eye size={15} />
                                        </button>
                                        <button
                                            onClick={() => setConfirming(g)}
                                            aria-label={`Delete ${g.name}`}
                                            className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#C25B45]">
                                            <Trash2 size={15} />
                                        </button>
                                    </span>
                                </Cell>
                            </Row>
                        ))}
                    </Table>
                )}
            </Panel>

            <Modal
                open={!!detail}
                title={detail?.name ?? ''}
                onClose={() => setDetail(null)}>
                {detailLoading || detail?.banners === null ? (
                    <Skeleton rows={3} />
                ) : (
                    <div className="space-y-4">
                        {detail?.banners?.length ? (
                            <ul className="space-y-3">
                                {detail.banners.map(b => (
                                    <li
                                        key={b.id}
                                        className="flex gap-3 rounded border border-[#1E322C] p-3">
                                        {b.image_url && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={b.image_url}
                                                alt=""
                                                className="h-16 w-24 flex-shrink-0 rounded object-cover"
                                            />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-[#EFE9DA]">{b.title}</p>
                                            <p className="mt-1 text-xs leading-relaxed text-[#7E938B]">
                                                {b.description}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setConfirmingSlide(b)}
                                            aria-label={`Remove ${b.title}`}
                                            className="h-fit rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#C25B45]">
                                            <Trash2 size={15} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-sm text-[#7E938B]">
                                This set has no slides yet.
                            </p>
                        )}

                        <form
                            onSubmit={addSlide}
                            className="space-y-3 border-t border-[#1E322C] pt-4">
                            <p className="text-xs text-[#7E938B]">Add a slide</p>
                            <Field label="Title">
                                <input
                                    className={inputClass}
                                    value={slideForm.title}
                                    onChange={e =>
                                        setSlideForm(f => ({ ...f, title: e.target.value }))
                                    }
                                    required
                                />
                            </Field>
                            <Field label="Description">
                                <input
                                    className={inputClass}
                                    value={slideForm.description}
                                    onChange={e =>
                                        setSlideForm(f => ({
                                            ...f,
                                            description: e.target.value,
                                        }))
                                    }
                                />
                            </Field>
                            <Field label="Image">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    required
                                    onChange={e =>
                                        setSlideForm(f => ({
                                            ...f,
                                            file: e.target.files?.[0] ?? null,
                                        }))
                                    }
                                    className="block w-full text-sm text-[#7E938B] file:mr-3 file:rounded file:border-0 file:bg-[#1E322C] file:px-3 file:py-1.5 file:text-[#EFE9DA]"
                                />
                            </Field>
                            <Button type="submit" variant="primary" disabled={savingSlide}>
                                {savingSlide ? 'Uploading…' : 'Add slide'}
                            </Button>
                        </form>
                    </div>
                )}
            </Modal>

            <Modal
                open={creatingSet}
                title="New banner set"
                onClose={() => setCreatingSet(false)}>
                <form onSubmit={createSet} className="space-y-4">
                    <Field label="Name">
                        <Input
                            value={newSetName}
                            onChange={e => setNewSetName(e.target.value)}
                            placeholder="e.g. Homepage carousel"
                            autoFocus
                            required
                        />
                    </Field>
                    <Button type="submit" variant="primary" disabled={savingSet}>
                        {savingSet ? 'Creating…' : 'Create set'}
                    </Button>
                </form>
            </Modal>

            <ConfirmDialog
                open={!!confirming}
                title="Delete this banner set?"
                body={`${confirming?.name} and all its slides will be removed permanently.`}
                confirmLabel="Delete set"
                busy={deleting}
                onConfirm={remove}
                onClose={() => setConfirming(null)}
            />

            <ConfirmDialog
                open={!!confirmingSlide}
                title="Remove this slide?"
                body={`"${confirmingSlide?.title}" will be removed from this set.`}
                confirmLabel="Remove slide"
                busy={deletingSlide}
                onConfirm={removeSlide}
                onClose={() => setConfirmingSlide(null)}
            />
        </div>
    )
}

export default BannerGroups
