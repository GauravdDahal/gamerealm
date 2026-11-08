'use client'

import { useEffect, useState } from 'react'
import { FileText, Download, Info, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react'
import { formatSize, isImage } from '@/lib/chatMedia'

/** Colours for highlighted (staff) messages. */
export const HIGHLIGHT_STYLES = {
    info: { label: 'Info', icon: Info, bar: '#d8c47b', tint: 'rgba(216,196,123,0.12)', text: '#f4e5a5' },
    promo: { label: 'Promo', icon: Sparkles, bar: '#e5484d', tint: 'rgba(229,72,77,0.14)', text: '#fbcfe8' },
    success: { label: 'Good news', icon: CheckCircle2, bar: '#10b981', tint: 'rgba(16,185,129,0.14)', text: '#a7f3d0' },
    warning: { label: 'Important', icon: AlertTriangle, bar: '#f97316', tint: 'rgba(249,115,22,0.15)', text: '#fed7aa' },
}

/**
 * Images, GIFs, documents and the voice player for one message.
 * `urls` is the path -> signed link map from useSignedUrls.
 */
export const MessageMedia = ({ message, urls, mine }) => {
    const files = message.attachments ?? []
    // Game request cards use banners that ship with the site. Only our own
    // /assets images are drawn, so nobody can point one at an outside address.
    const games = files.filter(f => f.kind === 'game' && f.url?.startsWith('/assets/'))
    const uploads = files.filter(f => f.kind !== 'game')
    const images = uploads.filter(f => isImage(f.type))
    const docs = uploads.filter(f => !isImage(f.type))
    const border = mine ? 'border-white/20' : 'border-white/10'

    return (
        <>
            {games.map(g => (
                <div key={g.path} className="overflow-hidden rounded-xl border border-white/15">
                    <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.url} alt={g.name} className="h-32 w-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2 pt-8">
                            <span className="block text-[10px] font-bold uppercase tracking-[2px] text-[#e2ce86]">
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
                            <a
                                key={f.path}
                                href={urls[f.path]}
                                target="_blank"
                                rel="noreferrer"
                                className="block overflow-hidden rounded-xl">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={urls[f.path]}
                                    alt={f.name}
                                    loading="lazy"
                                    className="max-h-64 w-full object-cover"
                                />
                            </a>
                        ) : (
                            <div key={f.path} className="h-24 animate-pulse rounded-xl bg-white/10" />
                        ),
                    )}
                </div>
            )}

            {docs.map(f => (
                <a
                    key={f.path}
                    href={urls[f.path]}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-3 rounded-xl border ${border} bg-black/20 px-3 py-2 ${
                        urls[f.path] ? 'hover:bg-black/30' : 'pointer-events-none opacity-60'
                    }`}>
                    <FileText className="h-6 w-6 shrink-0" />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{f.name}</span>
                        <span className="block text-[11px] opacity-70">{formatSize(f.size)}</span>
                    </span>
                    <Download className="h-4 w-4 shrink-0 opacity-70" />
                </a>
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
