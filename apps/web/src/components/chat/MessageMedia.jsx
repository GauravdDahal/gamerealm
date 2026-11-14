'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FileText, Download, Info, Sparkles, CheckCircle2, AlertTriangle, X, Loader2 } from 'lucide-react'
import { formatSize, isImage } from '@/lib/chatMedia'

const isOwnGameImage = url => {
    if (typeof url !== 'string') return false
    if (url.startsWith('/assets/') && !url.startsWith('//')) return true
    try {
        const own = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
        const u = new URL(url)
        return (
            u.protocol === 'https:' &&
            u.host === own.host &&
            u.pathname.startsWith('/storage/v1/object/public/game-images/')
        )
    } catch {
        return false
    }
}

/** Colours for highlighted (staff) messages. */
export const HIGHLIGHT_STYLES = {
    info: { label: 'Info', icon: Info, bar: 'rgb(var(--c-accent))', tint: 'rgb(var(--c-accent) / 0.12)', text: 'rgb(var(--c-accent2))' },
    promo: { label: 'Promo', icon: Sparkles, bar: '#e5484d', tint: 'rgba(229,72,77,0.14)', text: '#fbcfe8' },
    success: { label: 'Good news', icon: CheckCircle2, bar: '#10b981', tint: 'rgba(16,185,129,0.14)', text: '#a7f3d0' },
    warning: { label: 'Important', icon: AlertTriangle, bar: '#f97316', tint: 'rgba(249,115,22,0.15)', text: '#fed7aa' },
}

/** Saves a file through a temporary link, so the browser keeps the user on the page. */
const saveFile = async (url, name) => {
    try {
        const blob = await (await fetch(url)).blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = name || 'image'
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    } catch {
        window.open(url, '_blank', 'noopener')
    }
}

/** Full-screen photo viewer, closed with X, Esc or a click outside the picture. */
export const ImageViewer = ({ src, name, onClose }) => {
    const [saving, setSaving] = useState(false)
    useEffect(() => {
        const onKey = e => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = prev
        }
    }, [onClose])
    if (typeof document === 'undefined') return null
    return createPortal(
        <div role="dialog" aria-label={name || 'Photo'} onClick={onClose}
            className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm">
            <div className="flex items-center gap-3 px-4 py-3 text-white" onClick={e => e.stopPropagation()}>
                <p className="min-w-0 flex-1 truncate text-sm opacity-80">{name}</p>
                <button
                    onClick={async () => {
                        setSaving(true)
                        await saveFile(src, name)
                        setSaving(false)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download
                </button>
                <button onClick={onClose} aria-label="Close" className="rounded-lg bg-white/10 p-2 hover:bg-white/20">
                    <X className="h-5 w-5" />
                </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={name || ''} onClick={e => e.stopPropagation()}
                    className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
            </div>
        </div>,
        document.body,
    )
}

/**
 * Images, GIFs, documents and the voice player for one message.
 * `urls` is the path -> signed link map from useSignedUrls.
 */
export const MessageMedia = ({ message, urls, mine }) => {
    const files = message.attachments ?? []
    // Game request cards use banners from the site itself (its own /assets or
    // our own game-images bucket). Anything else is not drawn, so nobody can
    // point a message at an outside address.
    const games = files.filter(f => f.kind === 'game' && isOwnGameImage(f.url))
    const uploads = files.filter(f => f.kind !== 'game')
    const images = uploads.filter(f => isImage(f.type))
    const docs = uploads.filter(f => !isImage(f.type))
    const border = mine ? 'border-white/20' : 'border-white/10'
    const [viewing, setViewing] = useState(null)

    return (
        <>
            {games.map(g => (
                <div key={g.path} className="overflow-hidden rounded-xl border border-white/15">
                    <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.url} alt={g.name} className="h-32 w-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2 pt-8">
                            <span className="block text-[10px] font-bold uppercase tracking-[2px] text-accent2">
                                Game request
                            </span>
                            <span className="block text-base font-semibold text-white">{g.name}</span>
                        </div>
                    </div>
                </div>
            ))}

            {message.voice_path &&
                (urls[message.voice_path] ? (
                    <audio
                        controls
                        preload="metadata"
                        src={urls[message.voice_path]}
                        className="h-10 w-[230px] max-w-full"
                    />
                ) : (
                    <p className="text-xs opacity-70">Loading voice message…</p>
                ))}

            {images.length > 0 && (
                <div className={`grid gap-1.5 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {images.map(f =>
                        urls[f.path] ? (
                            <button
                                type="button"
                                key={f.path}
                                onClick={() => setViewing({ src: urls[f.path], name: f.name })}
                                aria-label={`View ${f.name}`}
                                className="block w-full cursor-zoom-in overflow-hidden rounded-xl">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={urls[f.path]}
                                    alt={f.name}
                                    loading="lazy"
                                    className="max-h-64 w-full object-cover"
                                />
                            </button>
                        ) : (
                            <div key={f.path} className="h-24 animate-pulse rounded-xl bg-white/10" />
                        ),
                    )}
                </div>
            )}

            {viewing && <ImageViewer src={viewing.src} name={viewing.name} onClose={() => setViewing(null)} />}

            {docs.map(f => (
                <button
                    type="button"
                    key={f.path}
                    onClick={() => urls[f.path] && saveFile(urls[f.path], f.name)}
                    className={`flex w-full items-center text-left gap-3 rounded-xl border ${border} bg-black/20 px-3 py-2 ${
                        urls[f.path] ? 'hover:bg-black/30' : 'pointer-events-none opacity-60'
                    }`}>
                    <FileText className="h-6 w-6 shrink-0" />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{f.name}</span>
                        <span className="block text-[11px] opacity-70">{formatSize(f.size)}</span>
                    </span>
                    <Download className="h-4 w-4 shrink-0 opacity-70" />
                </button>
            ))}
        </>
    )
}

/** Whether a message has anything besides text. */
export const hasMedia = m => !!m.voice_path || (m.attachments?.length ?? 0) > 0

/** Small preview of a file that is picked but not sent yet. */
export const FileThumb = ({ file, className = '' }) => {
    const [src, setSrc] = useState(null)
    useEffect(() => {
        if (!isImage(file.type)) return
        const url = URL.createObjectURL(file)
        setSrc(url)
        return () => URL.revokeObjectURL(url)
    }, [file])
    if (!src) return <FileText className={`p-1.5 text-gray-400 ${className}`} />
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`rounded-lg object-cover ${className}`} />
}
