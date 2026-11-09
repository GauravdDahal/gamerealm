'use client'

/**
 * Wheel sound effects, generated in the browser (no audio files to load).
 * The audio context is created on the first tap, because browsers only
 * allow sound after a person has interacted with the page.
 */

const KEY = 'wheel-sound-off'
let ctx = null

export const soundOn = () => {
    try {
        return localStorage.getItem(KEY) !== '1'
    } catch {
        return true
    }
}

export const setSoundOn = on => {
    try {
        localStorage.setItem(KEY, on ? '0' : '1')
    } catch {}
}

/** Call from a click/tap handler. */
export const unlock = () => {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (!Ctx) return
        ctx = ctx || new Ctx()
        if (ctx.state === 'suspended') ctx.resume()
    } catch {}
}

const ready = () => soundOn() && ctx && ctx.state !== 'closed'

const tone = (freq, start, dur, { type = 'sine', gain = 0.15, slideTo = null } = {}) => {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, start)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur)
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(gain, start + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    osc.connect(g).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + dur + 0.03)
}

const noise = (start, dur, { gain = 0.08, from = 3000, to = 800 } = {}) => {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur))
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(from, start)
    filter.frequency.exponentialRampToValueAtTime(to, start + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, start)
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    src.connect(filter).connect(g).connect(ctx.destination)
    src.start(start)
}

/** The pointer flicking past a peg. `speed` 0..1 makes fast ticks a little higher and softer. */
export const tick = (speed = 0.5) => {
    if (!ready()) return
    const t = ctx.currentTime
    tone(1500 + speed * 500, t, 0.045, { type: 'triangle', gain: 0.1 - speed * 0.03, slideTo: 900 })
}

/** Start of the spin: a rising whoosh. */
export const whoosh = () => {
    if (!ready()) return
    const t = ctx.currentTime
    noise(t, 0.7, { gain: 0.09, from: 500, to: 3500 })
    tone(180, t, 0.6, { type: 'sawtooth', gain: 0.04, slideTo: 520 })
}

/** A prize: fanfare, then sparkle. */
export const win = () => {
    if (!ready()) return
    const t = ctx.currentTime
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        tone(f, t + i * 0.11, 0.35, { type: 'triangle', gain: 0.16 })
        tone(f * 2, t + i * 0.11, 0.25, { type: 'sine', gain: 0.05 })
    })
    // held chord
    ;[523.25, 659.25, 783.99, 1046.5].forEach(f => tone(f, t + 0.46, 0.9, { type: 'triangle', gain: 0.09 }))
    // coin sparkle
    for (let i = 0; i < 7; i++) {
        tone(1800 + Math.random() * 1800, t + 0.5 + i * 0.07, 0.12, { type: 'sine', gain: 0.05 })
    }
    noise(t + 0.45, 0.5, { gain: 0.03, from: 6000, to: 4000 })
}

/** No prize: gentle, not harsh. */
export const lose = () => {
    if (!ready()) return
    const t = ctx.currentTime
    tone(392, t, 0.28, { type: 'triangle', gain: 0.1 })
    tone(311.13, t + 0.18, 0.5, { type: 'triangle', gain: 0.1, slideTo: 277 })
}
