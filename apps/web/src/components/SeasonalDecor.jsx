'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useThemeSetting } from '@/lib/useSiteContent'
import { THEMES } from '@/lib/themes.mjs'

// A few slow, soft shapes drifting down the page for the seasonal themes.
// Pointer-events off, transform-only animation, switched off for visitors who
// ask their device for reduced motion, and never shown in the admin panel.
const SeasonalDecor = () => {
    const { active, decor, loaded } = useThemeSetting()
    const pathname = usePathname()
    const [ready, setReady] = useState(false)
    const [reduced, setReduced] = useState(false)

    useEffect(() => {
        setReady(true)
        setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    }, [])

    const theme = THEMES.find(t => t.id === active)
    const spec = theme?.decor
    const pieces = useMemo(() => {
        if (!spec) return []
        // fixed pseudo-random layout so server and client agree
        return Array.from({ length: spec.count }, (_, i) => ({
            glyph: spec.glyphs[i % spec.glyphs.length],
            left: (i * 37 + 11) % 100,
            size: 14 + ((i * 7) % 16),
            delay: -((i * 3.1) % 18),
            duration: 16 + ((i * 5) % 14),
            drift: ((i % 5) - 2) * 18,
        }))
    }, [spec])

    if (!ready || !loaded || reduced || !spec || decor === false || pathname?.startsWith('/admin')) return null

    return (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
            <style>{`
                @keyframes decor-fall {
                    from { transform: translate3d(0, -10vh, 0) rotate(0deg); }
                    to { transform: translate3d(var(--drift), 110vh, 0) rotate(360deg); }
                }
            `}</style>
            {pieces.map((p, i) => (
                <span
                    key={i}
                    className="absolute top-0 select-none opacity-60"
                    style={{
                        left: `${p.left}%`,
                        fontSize: p.size,
                        '--drift': `${p.drift}px`,
                        animation: `decor-fall ${p.duration}s linear ${p.delay}s infinite`,
                        willChange: 'transform',
                    }}>
                    {p.glyph}
                </span>
            ))}
        </div>
    )
}

export default SeasonalDecor
