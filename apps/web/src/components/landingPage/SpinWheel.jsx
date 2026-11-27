'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gift, Volume2, VolumeX, X } from 'lucide-react'
import { useAuth } from '@/hooks/auth'
import { createClient } from '@/lib/supabase/client'
import { useSiteContent } from '@/lib/useSiteContent'
import { lose, setSoundOn, settle, soundOn, stopSpin, tick as tickSound, unlock, whoosh, win } from '@/lib/wheelSound'

// Shown until the real segments arrive (and if they can't be loaded).
const FALLBACK = [
    ['$2 Freeplay', '#4f46e5'],
    ['10% Bonus', '#7c3aed'],
    ['$5 Freeplay', '#db2777'],
    ['Try Again', '#334155'],
    ['15% Bonus', '#0ea5e9'],
    ['$10 Freeplay', '#f59e0b'],
    ['20% Bonus', '#10b981'],
    ['$50 Freeplay', '#e11d48'],
].map(([label, color], i) => ({ id: `f${i}`, label, color }))

const SPIN_MS = 5600
const SIZE = 400
const C = SIZE / 2
const R = 176 // wheel radius inside the rim

const polar = (deg, r) => {
    const a = (deg * Math.PI) / 180 // 0deg = top, clockwise
    return [C + r * Math.sin(a), C - r * Math.cos(a)]
}

const slicePath = (from, to) => {
    const [x1, y1] = polar(from, R)
    const [x2, y2] = polar(to, R)
    return `M ${C} ${C} L ${x1} ${y1} A ${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2} Z`
}

const untilText = iso => {
    const ms = new Date(iso).getTime() - Date.now()
    if (ms <= 0) return 'now'
    const h = Math.floor(ms / 3600000)
    const m = Math.ceil((ms % 3600000) / 60000)
    return h > 0 ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`
}

export default function SpinWheel() {
    const copy = useSiteContent('wheel')
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])
    const { user, loading: authLoading } = useAuth()

    const [segments, setSegments] = useState(FALLBACK)
    const [status, setStatus] = useState(null) // { state, next_spin_at? }
    const [rotation, setRotation] = useState(0)
    const [spinning, setSpinning] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')
    const [, refresh] = useState(0)
    const rotationRef = useRef(0)
    const wheelRef = useRef(null)
    const frameRef = useRef(0)
    const [sound, setSound] = useState(true)

    useEffect(() => {
        setSound(soundOn())
        return () => cancelAnimationFrame(frameRef.current)
    }, [])

    const toggleSound = () => {
        const next = !sound
        setSound(next)
        setSoundOn(next)
        if (next) {
            unlock()
            tickSound(0.3)
        }
    }

    // Tick each time the pointer passes into a new slice, by watching the
    // wheel's real on-screen angle while it turns.
    const startTicks = segCount => {
        const slice = 360 / segCount
        const angleNow = () => {
            const m = getComputedStyle(wheelRef.current).transform
            if (!m || m === 'none') return 0
            const [a, b] = m.slice(m.indexOf('(') + 1, -1).split(',').map(Number)
            return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360
        }
        let lastSlice = Math.floor((((360 - angleNow()) % 360) / slice))
        let lastAngle = angleNow()
        let lastTick = 0
        const loop = now => {
            const angle = angleNow()
            const sliceNow = Math.floor((((360 - angle) % 360) / slice))
            if (sliceNow !== lastSlice) {
                lastSlice = sliceNow
                if (now - lastTick > 30) {
                    const speed = Math.min(1, Math.abs(((angle - lastAngle + 540) % 360) - 180) / 30)
                    tickSound(speed)
                    lastTick = now
                }
            }
            lastAngle = angle
            frameRef.current = requestAnimationFrame(loop)
        }
        frameRef.current = requestAnimationFrame(loop)
    }

    // Wheel segments (public).
    useEffect(() => {
        supabase.rpc('wheel_segments').then(({ data }) => {
            if (data?.length >= 2) setSegments(data)
        })
    }, [supabase])

    const loadStatus = useCallback(async () => {
        const { data } = await supabase.rpc('wheel_status')
        setStatus(data ?? null)
    }, [supabase])

    useEffect(() => {
        if (!authLoading) loadStatus()
    }, [authLoading, user?.id, loadStatus])

    // Keep the "next spin in" text fresh.
    useEffect(() => {
        const t = setInterval(() => refresh(n => n + 1), 30000)
        return () => clearInterval(t)
    }, [])

    const n = segments.length
    const seg = 360 / n

    const spin = async () => {
        if (spinning) return
        setError('')
        if (authLoading) return
        if (!user) return router.push('/users')
        if (status?.state === 'not_approved') return router.push('/account-pending')
        if (status?.state === 'staff') return setError('Admin accounts can’t spin. Sign in as a player to try it.')
        if (status?.state === 'closed') return setError('The wheel is closed right now. Check back soon.')
        if (status?.state === 'needs_deposit') return setError('Make a deposit to unlock your free spin. Our team can help in chat.')
        if (status?.state === 'wait') return setError(`Your next free spin is in ${untilText(status.next_spin_at)}.`)

        unlock() // sound is only allowed after a tap, so start it here
        setSpinning(true)
        const { data, error: err } = await supabase.rpc('spin_wheel')
        if (err) {
            setSpinning(false)
            setError(err.message?.startsWith('You already') ? 'You already spun today. Come back tomorrow!' : err.message || 'Could not spin. Please try again.')
            loadStatus()
            return
        }

        let index = segments.findIndex(s => String(s.id) === String(data.prize_id))
        if (index < 0) index = segments.findIndex(s => s.label === data.label)
        if (index < 0) index = 0

        // Land somewhere inside the winning slice, with a few full turns first.
        const jitter = (Math.random() - 0.5) * seg * 0.7
        const wanted = (360 - ((index + 0.5) * seg + jitter) + 360) % 360
        const base = rotationRef.current - (rotationRef.current % 360)
        const next = base + 360 * 6 + wanted
        rotationRef.current = next
        setRotation(next)
        whoosh(SPIN_MS)
        startTicks(n)

        setTimeout(() => {
            cancelAnimationFrame(frameRef.current)
            setSpinning(false)
            setResult(data)
            loadStatus()
            stopSpin()
            settle()
            setTimeout(() => (/try again|better luck/i.test(data.label) ? lose() : win()), 320)
        }, SPIN_MS + 150)
    }

    const state = status?.state
    const unlucky = result && /try again|better luck/i.test(result.label)

    const hint = (() => {
        if (error) return { text: error, tone: 'warn' }
        if (state === 'closed') return { text: 'The wheel is closed right now. Check back soon.', tone: 'info' }
        if (state === 'needs_deposit') return { text: `Make a deposit to unlock your spin (within ${status.hours} hours).`, tone: 'info' }
        if (state === 'wait') return { text: `Next free spin in ${untilText(status.next_spin_at)}`, tone: 'info' }
        if (state === 'not_approved') return { text: 'Your account is waiting for approval. You can spin once it is approved.', tone: 'info' }
        if (state === 'staff') return { text: 'Admin accounts can’t spin.', tone: 'info' }
        if (!user && !authLoading) return { text: 'Sign in to spin. One free spin every day.', tone: 'info' }
        return { text: 'One free spin every day.', tone: 'info' }
    })()

    const canTap = !spinning && !['wait', 'closed', 'needs_deposit'].includes(state)
    const cta = !user && !authLoading ? 'Sign in to spin' : state === 'wait' || state === 'closed' ? 'Come back later' : state === 'needs_deposit' ? 'Deposit to spin' : spinning ? 'Spinning…' : 'Spin now'

    return (
        <section id="home" className="relative overflow-hidden bg-gray-900 pb-12 pt-24 sm:pb-20 sm:pt-32">
            <div className="wrap relative grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
                {/* ------------------------------------------------ words */}
                <div className="text-center lg:text-left">
                    {copy.eyebrow && <p className="eyebrow">{copy.eyebrow}</p>}
                    <h1 className="font-display text-5xl leading-none text-ink sm:text-6xl lg:text-7xl">
                        {copy.title} <span className="text-accent">{copy.highlight}</span>
                    </h1>
                    <p className="mx-auto mt-4 max-w-xl text-base text-muted sm:text-lg lg:mx-0">
                        {copy.subtitle}
                    </p>

                    <ul className="mt-8 hidden flex-wrap justify-center gap-2 sm:flex lg:justify-start" aria-label="Prizes on the wheel">
                        {segments.map(s => (
                            <li key={s.id} className="chip">
                                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                                {s.label}
                            </li>
                        ))}
                    </ul>

                    <div className="mt-8 hidden flex-col items-center gap-3 lg:flex lg:items-start">
                        <button onClick={spin} disabled={!canTap} className="btn btn-primary btn-lg">
                            <Gift /> {cta}
                        </button>
                        <p role="status" className={`text-sm ${hint.tone === 'warn' ? 'text-danger' : 'text-muted'}`}>
                            {hint.text}
                        </p>
                    </div>
                </div>

                {/* ----------------------------------------------- wheel */}
                <div className="relative mx-auto w-[min(88vw,460px)]">
                    {/* pointer */}
                    <svg
                        viewBox="0 0 40 48"
                        className="absolute left-1/2 top-0 z-20 h-[11%] w-[11%] -translate-x-1/2 -translate-y-[18%] drop-shadow-[0_4px_6px_rgba(0,0,0,.5)]"
                        aria-hidden="true">
                        <defs>
                            <linearGradient id="ptr" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" style={{ stopColor: 'rgb(var(--c-accent2))' }} />
                                <stop offset="1" style={{ stopColor: 'rgb(var(--c-accent-dim))' }} />
                            </linearGradient>
                        </defs>
                        <path d="M20 46 L4 10 Q20 -4 36 10 Z" fill="url(#ptr)" style={{ stroke: 'rgb(var(--c-accent-dim))' }} strokeWidth="1.5" />
                        <circle cx="20" cy="14" r="4" style={{ fill: 'rgb(var(--c-night))' }} />
                    </svg>

                    <div
                        ref={wheelRef}
                        className="aspect-square w-full will-change-transform"
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            transition: spinning || rotation ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.62, 0.08, 1)` : 'none',
                        }}>
                        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img" aria-label="Lucky wheel">
                            <defs>
                                <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0" style={{ stopColor: 'rgb(var(--c-accent2))' }} />
                                    <stop offset=".5" style={{ stopColor: 'rgb(var(--c-accent))' }} />
                                    <stop offset="1" style={{ stopColor: 'rgb(var(--c-accent))' }} />
                                </linearGradient>
                                <radialGradient id="shine" cx=".5" cy=".5" r=".5">
                                    <stop offset=".55" stopColor="#fff" stopOpacity="0" />
                                    <stop offset="1" stopColor="#fff" stopOpacity=".16" />
                                </radialGradient>
                            </defs>
                            <circle cx={C} cy={C} r={C - 2} fill="url(#rim)" />
                            <circle cx={C} cy={C} r={R + 8} style={{ fill: 'rgb(var(--c-night))' }} />
                            {segments.map((s, i) => {
                                const mid = (i + 0.5) * seg
                                const [tx, ty] = polar(mid, R * 0.69)
                                const flip = mid > 180 // keep text readable on the left half
                                const size = s.label.length > 9 ? 14 : 17
                                return (
                                    <g key={s.id}>
                                        <path d={slicePath(i * seg, (i + 1) * seg)} fill={s.color} stroke="rgba(255,255,255,.28)" strokeWidth="1.5" />
                                        <text
                                            x={tx}
                                            y={ty}
                                            transform={`rotate(${flip ? mid + 90 : mid - 90} ${tx} ${ty})`}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fill="#fff"
                                            fontWeight="800"
                                            fontSize={size}
                                            style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,.35)', strokeWidth: 3 }}>
                                            {s.label}
                                        </text>
                                    </g>
                                )
                            })}
                            <circle cx={C} cy={C} r={R} fill="url(#shine)" />
                            {Array.from({ length: 24 }).map((_, i) => {
                                const [x, y] = polar(i * 15, C - 11)
                                return <circle key={i} cx={x} cy={y} r="3.2" style={{ fill: i % 2 ? 'rgb(var(--c-ink))' : 'rgb(var(--c-accent-dim))' }} />
                            })}
                        </svg>
                    </div>

                    <button
                        onClick={toggleSound}
                        aria-label={sound ? 'Mute wheel sounds' : 'Turn wheel sounds on'}
                        title={sound ? 'Sound on' : 'Sound off'}
                        className="icon-btn absolute -top-2 left-0 z-30 border border-line bg-night/90 sm:-left-2">
                        {sound ? <Volume2 /> : <VolumeX />}
                    </button>

                    {/* hub */}
                    <button
                        onClick={spin}
                        disabled={!canTap}
                        aria-label="Spin the wheel"
                        className="absolute left-1/2 top-1/2 z-10 flex h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border-4 border-accent2 bg-night text-ink shadow-[0_8px_24px_rgba(0,0,0,.5)] transition-colors hover:bg-surface disabled:cursor-not-allowed">
                        <Gift className="h-[22%] w-[22%] text-accent2" />
                        <span className="font-display text-[clamp(.8rem,3.2vw,1.35rem)] leading-none tracking-wide">SPIN</span>
                    </button>

                    {/* On phones the wheel itself is the button, so the status goes underneath it. */}
                    <p
                        role="status"
                        className={`mt-4 text-center text-sm lg:hidden ${hint.tone === 'warn' ? 'text-danger' : 'text-muted'}`}>
                        {hint.text}
                    </p>
                </div>
            </div>

            {/* ------------------------------------------------ result */}
            {result && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setResult(null)}>
                    <div
                        onClick={e => e.stopPropagation()}
                        className="relative w-full max-w-sm animate-fade-scale-up rounded-2xl border border-line bg-surface p-8 text-center shadow-2xl">
                        <button onClick={() => setResult(null)} aria-label="Close" className="icon-btn absolute right-4 top-4">
                            <X />
                        </button>
                        <p className="eyebrow">{unlucky ? 'So close' : 'You won'}</p>
                        <h2 className="font-display text-4xl leading-tight text-ink">
                            {unlucky ? 'Try again tomorrow' : result.label}
                        </h2>
                        <p className="mt-4 text-muted">
                            {unlucky
                                ? 'No prize this time. Your next free spin is in 24 hours.'
                                : 'Our team will credit your prize shortly. Your next free spin is in 24 hours.'}
                        </p>
                        <button onClick={() => setResult(null)} className="btn btn-primary btn-lg mt-8 w-full">
                            Done
                        </button>
                    </div>
                </div>
            )}
        </section>
    )
}
