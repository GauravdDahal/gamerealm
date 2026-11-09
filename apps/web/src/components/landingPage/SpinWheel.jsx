'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gift, Sparkles, Volume2, VolumeX, X, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/auth'
import { createClient } from '@/lib/supabase/client'
import { lose, setSoundOn, soundOn, tick, unlock, whoosh, win } from '@/lib/wheelSound'

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
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])
    const { user, loading: authLoading } = useAuth()

    const [segments, setSegments] = useState(FALLBACK)
    const [status, setStatus] = useState(null) // { state, next_spin_at? }
    const [rotation, setRotation] = useState(0)
    const [spinning, setSpinning] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')
    const [, tick] = useState(0)
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
            tick(0.3)
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
                    tick(speed)
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
        const t = setInterval(() => tick(n => n + 1), 30000)
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
        whoosh()
        startTicks(n)

        setTimeout(() => {
            cancelAnimationFrame(frameRef.current)
            setSpinning(false)
            setResult(data)
            loadStatus()
            if (/try again|better luck/i.test(data.label)) lose()
            else win()
        }, SPIN_MS + 150)
    }

    const state = status?.state
    const unlucky = result && /try again|better luck/i.test(result.label)

    const hint = (() => {
        if (error) return { text: error, tone: 'warn' }
        if (state === 'wait') return { text: `Next free spin in ${untilText(status.next_spin_at)}`, tone: 'info' }
        if (state === 'not_approved') return { text: 'Your account is waiting for approval. You can spin once it is approved.', tone: 'info' }
        if (state === 'staff') return { text: 'Admin accounts can’t spin.', tone: 'info' }
        if (!user && !authLoading) return { text: 'Sign in to spin. One free spin every day.', tone: 'info' }
        return { text: 'One free spin every day.', tone: 'info' }
    })()

    const canTap = !spinning && state !== 'wait'
    const cta = !user && !authLoading ? 'Sign in to spin' : state === 'wait' ? 'Come back later' : spinning ? 'Spinning…' : 'Spin now'

    return (
        <section id="home" className="relative overflow-hidden bg-gray-900 pb-12 pt-24 sm:pb-20 sm:pt-32">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        'radial-gradient(60% 50% at 80% 40%, rgba(124,58,237,.28), transparent 70%), radial-gradient(45% 40% at 10% 10%, rgba(79,70,229,.25), transparent 70%), radial-gradient(40% 35% at 50% 100%, rgba(219,39,119,.18), transparent 70%)',
                }}
            />
            <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
                {/* ------------------------------------------------ words */}
                <div className="text-center lg:text-left">
                    <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-300 sm:text-xs">
                        <Zap className="h-3.5 w-3.5" /> Online gaming · Lucky wheel
                    </p>
                    <h1 className="mt-4 font-godofwar text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
                        Spin free.{' '}
                        <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                            Win freeplay.
                        </span>
                    </h1>
                    <p className="mx-auto mt-3 max-w-xl text-sm text-gray-400 sm:mt-4 sm:text-lg lg:mx-0">
                        Every approved player gets one free spin a day. Land on a prize and our team will credit it to
                        your account.
                    </p>

                    <div className="mt-6 hidden flex-wrap justify-center gap-2 sm:flex lg:justify-start">
                        {segments.map(s => (
                            <span
                                key={s.id}
                                className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 bg-gray-800/80 px-2.5 py-1 text-xs text-gray-200">
                                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                                {s.label}
                            </span>
                        ))}
                    </div>

                    <div className="mt-8 hidden flex-col items-center gap-3 lg:flex lg:items-start">
                        <button
                            onClick={spin}
                            disabled={!canTap}
                            className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 px-8 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-900/40 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60">
                            <Sparkles className="h-4 w-4" /> {cta}
                        </button>
                        <p
                            role="status"
                            className={`text-sm ${hint.tone === 'warn' ? 'text-pink-300' : 'text-gray-400'}`}>
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
                                <stop offset="0" stopColor="#f4e5a5" />
                                <stop offset="1" stopColor="#b18f45" />
                            </linearGradient>
                        </defs>
                        <path d="M20 46 L4 10 Q20 -4 36 10 Z" fill="url(#ptr)" stroke="#6b5521" strokeWidth="1.5" />
                        <circle cx="20" cy="14" r="4" fill="#14150f" />
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
                                    <stop offset="0" stopColor="#f4e5a5" />
                                    <stop offset=".5" stopColor="#c9a54f" />
                                    <stop offset="1" stopColor="#8f7a3d" />
                                </linearGradient>
                                <radialGradient id="shine" cx=".5" cy=".5" r=".5">
                                    <stop offset=".55" stopColor="#fff" stopOpacity="0" />
                                    <stop offset="1" stopColor="#fff" stopOpacity=".16" />
                                </radialGradient>
                            </defs>
                            <circle cx={C} cy={C} r={C - 2} fill="url(#rim)" />
                            <circle cx={C} cy={C} r={R + 8} fill="#14150f" />
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
                                return <circle key={i} cx={x} cy={y} r="3.2" fill={i % 2 ? '#fff6cf' : '#7a6529'} />
                            })}
                        </svg>
                    </div>

                    <button
                        onClick={toggleSound}
                        aria-label={sound ? 'Mute wheel sounds' : 'Turn wheel sounds on'}
                        title={sound ? 'Sound on' : 'Sound off'}
                        className="absolute -top-2 right-0 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-gray-700 bg-gray-900/80 text-gray-300 backdrop-blur transition hover:text-white sm:-right-2">
                        {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                    </button>

                    {/* hub */}
                    <button
                        onClick={spin}
                        disabled={!canTap}
                        aria-label="Spin the wheel"
                        className="absolute left-1/2 top-1/2 z-10 flex h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-[5px] border-[#e2ce86] bg-gradient-to-br from-gray-800 to-gray-950 text-white shadow-[0_0_30px_rgba(0,0,0,.6)] transition hover:brightness-125 active:scale-95 disabled:cursor-not-allowed">
                        <Gift className="mb-0.5 h-[22%] w-[22%] text-[#e2ce86]" />
                        <span className="font-godofwar text-[clamp(.8rem,3.2vw,1.35rem)] leading-none">SPIN</span>
                    </button>

                    {/* On phones the wheel itself is the button, so the status goes underneath it. */}
                    <p
                        role="status"
                        className={`mt-5 text-center text-sm lg:hidden ${hint.tone === 'warn' ? 'text-pink-300' : 'text-gray-400'}`}>
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
                        className="gradient-border relative w-full max-w-sm animate-fade-scale-up rounded-2xl bg-gray-900 p-8 text-center">
                        <button
                            onClick={() => setResult(null)}
                            aria-label="Close"
                            className="absolute right-3 top-3 rounded-full p-2 text-gray-400 hover:bg-gray-800 hover:text-white">
                            <X className="h-5 w-5" />
                        </button>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-300">
                            {unlucky ? 'So close' : 'Congratulations'}
                        </p>
                        <h2 className="mt-3 font-godofwar text-3xl text-white">
                            {unlucky ? 'Try again tomorrow' : result.label}
                        </h2>
                        <p className="mt-3 text-gray-400">
                            {unlucky
                                ? 'No prize this time. Your next free spin is in 24 hours.'
                                : 'Our team will credit your prize shortly. Your next free spin is in 24 hours.'}
                        </p>
                        <button
                            onClick={() => setResult(null)}
                            className="mt-6 min-h-[44px] rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 px-8 text-sm font-bold uppercase tracking-wider text-white">
                            Great
                        </button>
                    </div>
                </div>
            )}
        </section>
    )
}
