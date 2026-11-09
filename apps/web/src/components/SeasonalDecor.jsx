'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useThemeSetting } from '@/lib/useSiteContent'
import { THEMES } from '@/lib/themes.mjs'
import Art from '@/components/decorArt'

// Seasonal decorations. Three layers, all pointer-events:none so nothing
// blocks a click, transform-only animation, and none of it in the admin panel:
//   fixed  - stays on screen while you scroll (big characters in the corners)
//   page   - sits at a point down the page, so you meet it as you scroll
//   strip  - a garland / bunting / lights row hanging under the top bar
// Visitors who ask their device for reduced motion get still decorations.

// 1 = the speeds written in themes.mjs; lower is faster
export const SPEED = 0.55

export const CSS = `
@keyframes d-fall { from { transform: translate3d(0,-10vh,0) rotate(0deg) } to { transform: translate3d(var(--drift),110vh,0) rotate(360deg) } }
@keyframes d-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }
@keyframes d-float { 0%,100% { transform: translate(0,0) rotate(-4deg) } 50% { transform: translate(10px,-20px) rotate(4deg) } }
@keyframes d-sway { 0%,100% { transform: rotate(-7deg) } 50% { transform: rotate(7deg) } }
@keyframes d-peek { 0%,100% { transform: translateX(0) } 50% { transform: translateX(var(--peek)) } }
@keyframes d-fly { from { transform: translate3d(-15vw,0,0) } to { transform: translate3d(115vw,-30px,0) } }
@keyframes d-pulse { 0%,100% { transform: scale(.9); opacity: .55 } 50% { transform: scale(1.12); opacity: 1 } }
@keyframes d-rise { from { transform: translate3d(0,0,0) } to { transform: translate3d(30px,-120vh,0) } }
@keyframes d-twinkle { 0%,100% { opacity: .25 } 50% { opacity: 1 } }
@keyframes d-glide { 0% { transform: translate3d(62vw,0,0); opacity: 0 } 10% { opacity: 1 } 25% { transform: translate3d(31vw,-9px,0) } 50% { transform: translate3d(0,0,0) } 75% { transform: translate3d(-31vw,-9px,0) } 90% { opacity: 1 } 100% { transform: translate3d(-62vw,0,0); opacity: 0 } }
@keyframes d-spin { to { transform: rotate(360deg) } }
@keyframes d-drop { 0%,100% { transform: translateY(-30px) } 50% { transform: translateY(0) } }
.d-prop { position: absolute; line-height: 1; user-select: none; }
.d-fall { position: absolute; top: 0; line-height: 1; user-select: none; will-change: transform; }
@media (max-width: 767px) { .d-desktop { display: none } }
`

// 'accent' -> the theme colour; anything else is used as written
export const tone = c => (/^#|^rgb/.test(c) ? c : `rgb(var(--c-${c}))`)

const LIGHT_COLORS = ['#ff4d4d', '#ffd24d', '#4dd96a', '#4da6ff']

const Strip = ({ type, still }) => {
    const wrap = 'pointer-events-none fixed left-0 right-0 top-[75px] z-[49] flex justify-between overflow-hidden'
    const anim = (name, dur, i) => (still ? undefined : `${name} ${(dur * SPEED).toFixed(2)}s ease-in-out ${-i * 0.37}s infinite`)
    if (type === 'lights')
        return (
            <div className={wrap} style={{ height: 26 }}>
                <div className="absolute left-0 right-0 top-0 h-[2px] bg-black/60" />
                {Array.from({ length: 34 }, (_, i) => (
                    <span key={i} className="relative top-[2px] block h-3 w-2 rounded-b-full"
                        style={{ background: LIGHT_COLORS[i % 4], boxShadow: `0 0 7px 1px ${LIGHT_COLORS[i % 4]}`, willChange: 'opacity', animation: anim('d-twinkle', 1.8, i), marginTop: i % 2 ? 6 : 0 }} />
                ))}
            </div>
        )
    if (type === 'bunting') {
        const c = ['#e63946', '#ffffff', '#2563eb']
        return (
            <div className={wrap} style={{ height: 34 }}>
                {Array.from({ length: 26 }, (_, i) => (
                    <span key={i} className="block"
                        style={{ width: 0, height: 0, borderLeft: '18px solid transparent', borderRight: '18px solid transparent', borderTop: `30px solid ${c[i % 3]}`, transformOrigin: 'top', animation: anim('d-sway', 3 + (i % 3), i) }} />
                ))}
            </div>
        )
    }
    if (type === 'sparkle')
        return (
            <div className={wrap} style={{ height: 22 }}>
                {Array.from({ length: 40 }, (_, i) => (
                    <span key={i} className="block rounded-full"
                        style={{ width: 4 + (i % 3) * 2, height: 4 + (i % 3) * 2, marginTop: (i * 7) % 14, background: i % 2 ? '#fde68a' : '#e5e7eb', boxShadow: '0 0 5px 1px rgb(253 230 138 / .8)', willChange: 'opacity', animation: anim('d-twinkle', 1.4 + (i % 4) * 0.4, i) }} />
                ))}
            </div>
        )
    if (type === 'leaves')
        return (
            <div className={wrap} style={{ height: 40 }}>
                {Array.from({ length: 22 }, (_, i) => (
                    <span key={i} className="block h-[24px] w-[24px]"
                        style={{ color: tone(['accent', 'accent2', 'accent-dim'][i % 3]), opacity: 0.8, transformOrigin: 'top', marginTop: (i % 3) * 4, animation: anim('d-sway', 4 + (i % 3), i) }}>
                        <Art kind="leaf" />
                    </span>
                ))}
            </div>
        )
    return null
}

const SeasonalDecor = () => {
    const { active, decor, loaded } = useThemeSetting()
    const pathname = usePathname()
    const [ready, setReady] = useState(false)
    const [still, setStill] = useState(false)

    useEffect(() => {
        setReady(true)
        setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    }, [])

    const spec = THEMES.find(t => t.id === active)?.decor
    const fall = spec?.fall
    const falling = useMemo(() => {
        if (!fall || !fall.count) return []
        const palette = {
            snowflake: ['ink'], confetti: ['accent', 'accent2', 'ink', 'secondary2', 'hot'], star5: ['#ffffff', '#e63946', '#60a5fa'], leaf: ['accent', 'accent2', 'danger'],
        }[fall.art] ?? ['ink']
        return Array.from({ length: fall.count }, (_, i) => ({
            color: palette[i % palette.length],
            left: (i * 37 + 11) % 100,
            size: fall.art === 'confetti' ? 9 + ((i * 3) % 6) : 14 + ((i * 7) % 14),
            delay: -((i * 3.1) % 18),
            duration: 18 + ((i * 5) % 14),
            drift: ((i % 5) - 2) * 22,
        }))
    }, [fall])

    if (!ready || !loaded || !spec || decor === false || pathname?.startsWith('/admin')) return null

    return (
        <>
            <style>{CSS}</style>
            <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[5] overflow-hidden" style={{ transform: 'translateZ(0)' }}>
                {!still &&
                    falling.map((p, i) => (
                        <span key={i} className="d-fall"
                            style={{ left: `${p.left}%`, width: p.size, height: p.size * (fall.art === 'confetti' ? 1.8 : 1), color: tone(p.color), opacity: fall.art === 'confetti' ? 0.55 : 0.4, '--drift': `${p.drift}px`, animation: `d-fall ${(p.duration * 0.6).toFixed(1)}s linear ${p.delay}s infinite` }}>
                            <Art kind={fall.art} />
                        </span>
                    ))}
                <Strip type={spec.strip} still={still} />
            </div>
        </>
    )
}

export default SeasonalDecor
