'use client'

import { useEffect, useState } from 'react'
import { FileText, Download, Info, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react'
import { formatSize, isImage } from '@/lib/chatMedia'

/** Colours for highlighted (staff) messages. */
export const HIGHLIGHT_STYLES = {
    info: { label: 'Info', icon: Info, bar: '#6366f1', tint: 'rgba(99,102,241,0.14)', text: '#c7d2fe' },
    promo: { label: 'Promo', icon: Sparkles, bar: '#ec4899', tint: 'rgba(236,72,153,0.14)', text: '#fbcfe8' },
    success: { label: 'Good news', icon: CheckCircle2, bar: '#10b981', tint: 'rgba(16,185,129,0.14)', text: '#a7f3d0' },
    warning: { label: 'Important', icon: AlertTriangle, bar: '#f59e0b', tint: 'rgba(245,158,11,0.16)', text: '#fde68a' },
}

/**
 * Images, GIFs, documents and the voice player for one message.
 * `urls` is the path -> signed link map from useSignedUrls.
 */
export const MessageMedia = ({ message, urls, mine }) => {
    const files = message.attachments ?? []
    const images = files.filter(f => isImage(f.type))
    const docs = files.filter(f => !isImage(f.type))
    const border = mine ? 'border-white/20' : 'border-white/10'

    return (
        <>
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
