'use client'

import { useEffect, useState } from 'react'
import { useThemeSetting } from '@/lib/useSiteContent'
import { THEMES } from '@/lib/themes.mjs'
import Art from '@/components/decorArt'
import { tone } from '@/components/SeasonalDecor'

// Wraps one homepage section. The seasonal theme can place a small piece of
// artwork "sitting" in that section (on a corner or along an edge), so it
// scrolls with the section instead of floating over the page.
const sizeOf = p => `clamp(${Math.round(p.size * 0.5)}px, ${(p.size / 12.8).toFixed(1)}vw, ${p.size}px)`

const Glide = ({ p, still }) => (
    <span style={{ position: 'absolute', left: 0, right: 0, bottom: p.bottom, overflow: 'hidden', lineHeight: 0, display: 'flex', justifyContent: 'center', padding: '28px 0 6px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.img} alt="" draggable={false}
            style={{ width: `min(${p.size}px, 92%)`, height: 'auto', animation: still ? undefined : `d-glide ${p.dur ?? 30}s linear infinite` }} />
    </span>
)

// one pattern repeated edge to edge, like a garland hung across a doorway
const Swag = ({ p }) => (
    <span style={{ position: 'absolute', left: 0, right: 0, top: p.top, height: `clamp(${Math.round(p.height * 0.6)}px, ${(p.height / 12.8).toFixed(1)}vw, ${p.height}px)`, backgroundImage: `url(${p.img})`, backgroundRepeat: 'repeat-x', backgroundSize: 'auto 100%', backgroundPosition: 'center top' }} />
)

// two elves at the page edges hold a bunting line between them
const Banner = ({ p }) => {
    const h = `clamp(${Math.round(p.height * 0.6)}px, ${(p.height / 9).toFixed(1)}vw, ${p.height}px)`
    return (
        <span style={{ position: 'absolute', left: 0, right: 0, top: p.top, display: 'flex', alignItems: 'flex-start', lineHeight: 0, '--h': h }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.left} alt="" draggable={false} style={{ height: 'var(--h)', width: 'auto', flex: 'none' }} />
            <span style={{ flex: 1, marginTop: 'calc(var(--h) * 0.262)', marginLeft: 'calc(var(--h) * -0.02)', marginRight: 'calc(var(--h) * -0.02)', height: 'calc(var(--h) * 0.24)', backgroundImage: `url(${p.tile})`, backgroundRepeat: 'repeat-x', backgroundSize: 'auto 100%' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.right} alt="" draggable={false} style={{ height: 'var(--h)', width: 'auto', flex: 'none' }} />
        </span>
    )
}

const Item = ({ p, still }) => {
    const straddles = [p.top, p.bottom].some(v => typeof v === 'string' && v.startsWith('-'))
    if ((p.desktop || straddles) && !p.kind) return <span className="d-desktop"><Piece p={p} still={still} /></span>
    return <Piece p={p} still={still} />
}

const Piece = ({ p, still }) => {
    if (p.kind === 'glide') return <Glide p={p} still={still} />
    if (p.kind === 'swag') return <Swag p={p} />
    if (p.kind === 'banner') return <Banner p={p} />
    const base = { position: 'absolute', width: sizeOf(p), color: tone(p.color ?? 'accent'), opacity: p.op ?? 0.6, left: p.left, right: p.right, top: p.top, bottom: p.bottom, lineHeight: 0 }
    let style = base
    if (!still && p.anim && p.anim !== 'none') {
        const dur = p.dur ?? 7
        style =
            p.anim === 'fly'
                ? { ...base, left: 0, animation: `d-fly ${dur}s linear ${p.delay ?? 0}s infinite` }
                : { ...base, transformOrigin: p.origin ? `50% ${p.origin === 'top' ? '0%' : '100%'}` : undefined, animation: `d-${p.anim} ${dur}s ease-in-out ${p.delay ?? 0}s infinite` }
    }
    if (p.hang)
        return (
            <span style={{ position: 'absolute', left: p.left, top: p.len, width: sizeOf(p), opacity: p.op ?? 1, lineHeight: 0, animation: still ? undefined : 'd-drop 7s ease-in-out infinite' }}>
                <span style={{ position: 'absolute', left: '68%', top: -p.len, width: 1, height: p.len + 6, background: 'rgb(var(--c-ink) / .45)' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" draggable={false} style={{ width: '100%', height: 'auto', display: 'block' }} />
            </span>
        )
    return (
        <span style={style} className="select-none">
            {p.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.img} alt="" draggable={false} style={{ width: '100%', height: 'auto', display: 'block' }} />
            ) : (
                <span style={{ display: 'block', width: '100%', aspectRatio: '1' }}>
                    <Art kind={p.art} />
                </span>
            )}
        </span>
    )
}

const SectionDecor = ({ name, children }) => {
    const { active, decor, loaded } = useThemeSetting()
    const [ready, setReady] = useState(false)
    const [still, setStill] = useState(false)
    useEffect(() => {
        setReady(true)
        setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    }, [])

    const items = ready && loaded && decor !== false ? (THEMES.find(t => t.id === active)?.decor?.scene?.[name] ?? []) : []

    return (
        <div className="relative">
            {children}
            {items.length > 0 && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[4]">
                    {items
                        .filter(p => !(still && p.anim === 'fly'))
                        .map((p, i) => (
                            <Item key={i} p={p} still={still} />
                        ))}
                </div>
            )}
        </div>
    )
}

export default SectionDecor
