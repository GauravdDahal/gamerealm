'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ChevronRight, Gamepad2, X } from 'lucide-react'

/**
 * Sits just above the message box in the player chat.
 * Each time the chat is opened it shows as a small card ("Want to play?").
 * If the player ignores it, it shrinks to a controller button on the right.
 * Either way, it opens a list of every game; picking one sends the request.
 */
export default function GameQuickBar({ games, onPick, openKey }) {
    const [phase, setPhase] = useState('card') // card | button | tray

    // A fresh card every time the chat is opened.
    useEffect(() => {
        setPhase('card')
    }, [openKey])

    useEffect(() => {
        if (phase !== 'card') return
        const t = setTimeout(() => setPhase('button'), 7000)
        return () => clearTimeout(t)
    }, [phase])

    if (games.length === 0) return null

    if (phase === 'tray') {
        return (
            <div className="mb-2 overflow-hidden rounded-2xl border border-accent/30 bg-surface/80">
                <div className="flex items-center justify-between px-3 py-2">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
                        <Gamepad2 className="h-4 w-4" /> Pick a game
                    </p>
                    <button onClick={() => setPhase('button')} aria-label="Close game list" className="rounded-full p-1 text-muted hover:text-ink">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <ul className="casino-scroll grid max-h-[34dvh] grid-cols-3 gap-2 overflow-y-auto px-3 pb-3">
                    {games.map(g => (
                        <li key={g.id}>
                            <button
                                onClick={() => {
                                    onPick(g)
                                    setPhase('button')
                                }}
                                className="group w-full text-left">
                                <span className="relative block aspect-[4/5] overflow-hidden rounded-lg border border-line/60 transition group-hover:border-accent">
                                    <Image src={g.image} alt="" fill sizes="110px" className="object-cover transition group-hover:scale-105" />
                                </span>
                                <span className="mt-1 block truncate text-[11px] text-ink">{g.title}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        )
    }

    if (phase === 'card') {
        return (
            <button
                onClick={() => setPhase('tray')}
                className="mb-2 flex w-full animate-fade-scale-up items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-3 py-2.5 text-left transition hover:bg-accent/15">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink">
                    <Gamepad2 className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink">Want to play?</span>
                    <span className="block text-xs text-muted">Pick a game and we’ll get you started.</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-accent" />
            </button>
        )
    }

    return (
        <div className="mb-2 flex justify-end">
            <button
                onClick={() => setPhase('tray')}
                aria-label="Choose a game to play"
                title="Choose a game"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/50 bg-accent/10 text-accent transition hover:scale-105 hover:bg-accent/20">
                <Gamepad2 className="h-5 w-5" />
            </button>
        </div>
    )
}
