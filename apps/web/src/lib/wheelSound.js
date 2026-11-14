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

/**
 * The pointer clacking past a peg, like a real prize wheel: a sharp plastic
 * "clack" plus a little woody knock. Fast = light and bright; as the wheel
 * slows each clack gets deeper and heavier, which builds the suspense.
 */
export const tick = (speed = 0.5) => {
    if (!ready()) return
    const t = ctx.currentTime
    const slow = 1 - speed
    noise(t, 0.022, { gain: 0.16 + slow * 0.1, from: 4200 - slow * 1400, to: 1800 })
    tone(520 - slow * 190, t, 0.05 + slow * 0.03, { type: 'triangle', gain: 0.1 + slow * 0.08, slideTo: 210 })
    tone(1900 - slow * 500, t, 0.018, { type: 'square', gain: 0.03 })
}

let bed = null
/** Stop the whirring (used if a spin is cut short). */
export const stopSpin = () => {
    try {
        bed?.stop()
    } catch {}
    bed = null
}

/**
 * Start of the spin: a push "thump", a rising swish, then a whirring bed of
 * air that runs for the whole spin and winds down with the wheel.
 */
export const whoosh = (durationMs = 5600) => {
    if (!ready()) return
    const t = ctx.currentTime
    const dur = durationMs / 1000
    // the push
    tone(140, t, 0.22, { type: 'sine', gain: 0.28, slideTo: 55 })
    noise(t, 0.45, { gain: 0.12, from: 500, to: 4200 })
    // whirring air, pitch and loudness falling as the wheel slows
    stopSpin()
    const len = Math.floor(ctx.sampleRate * 2)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 0.9
    filter.frequency.setValueAtTime(600, t)
    filter.frequency.exponentialRampToValueAtTime(2600, t + 0.5)
    filter.frequency.exponentialRampToValueAtTime(220, t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.45)
    g.gain.exponentialRampToValueAtTime(0.03, t + dur * 0.6)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    // slow wobble so it sounds like something turning
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.setValueAtTime(11, t)
    lfo.frequency.exponentialRampToValueAtTime(1.2, t + dur)
    lfoGain.gain.value = 0.035
    lfo.connect(lfoGain).connect(g.gain)
    src.connect(filter).connect(g).connect(ctx.destination)
    src.start(t)
    lfo.start(t)
    src.stop(t + dur + 0.1)
    lfo.stop(t + dur + 0.1)
    bed = src
}

/** The wheel settling on a slice: one last heavy clack. */
export const settle = () => {
    if (!ready()) return
    const t = ctx.currentTime
    noise(t, 0.04, { gain: 0.26, from: 2600, to: 900 })
    tone(260, t, 0.16, { type: 'triangle', gain: 0.24, slideTo: 120 })
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
