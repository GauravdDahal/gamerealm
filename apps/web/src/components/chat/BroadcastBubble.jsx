'use client'

import { useEffect, useState } from 'react'
import { Megaphone } from 'lucide-react'

/**
 * An announcement sent to many players at once: a red-and-gold card wrapped
 * in moving flames, with twinkling sparkles and a confetti burst when it first
 * appears. Animations are switched off for people who ask for reduced motion.
 */
const SPARKS = [
    [6, 10, 0], [92, 14, 0.6], [14, 86, 1.1], [88, 80, 0.3], [50, 4, 0.9], [70, 94, 1.4], [30, 96, 0.2], [96, 48, 1.7],
]
const CONFETTI = ['#ff3b30', '#ffcc00', '#ff9500', '#fff3b0', '#ff2d55', '#ffd60a']

export default function BroadcastBubble({ title, text, time, compact = false }) {
    const [burst, setBurst] = useState(true)
    useEffect(() => {
        const t = setTimeout(() => setBurst(false), 1600)
        return () => clearTimeout(t)
    }, [])

    return (
        <div className={`bc-wrap ${compact ? 'max-w-[92%]' : 'max-w-[94%]'}`}>
            <div className="bc-flames" aria-hidden />
            <div className="bc-glow" aria-hidden />
            <div className="bc-card">
                {SPARKS.map(([x, y, d], i) => (
                    <span key={i} className="bc-spark" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} aria-hidden />
                ))}
                <p className="bc-title">
                    <Megaphone className="h-4 w-4" /> {title || 'Announcement'}
                </p>
                <p className="relative whitespace-pre-wrap break-words text-[15px] font-semibold leading-relaxed text-white">{text}</p>
                {time && <p className="relative mt-1 text-[10px] text-amber-100/70">{time}</p>}
            </div>
            {burst && (
                <div className="bc-confetti" aria-hidden>
                    {Array.from({ length: 18 }).map((_, i) => (
                        <i
                            key={i}
                            style={{
                                background: CONFETTI[i % CONFETTI.length],
                                '--dx': `${Math.cos((i / 18) * Math.PI * 2) * (60 + (i % 3) * 25)}px`,
                                '--dy': `${Math.sin((i / 18) * Math.PI * 2) * (40 + (i % 4) * 15)}px`,
                                animationDelay: `${(i % 5) * 0.03}s`,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
