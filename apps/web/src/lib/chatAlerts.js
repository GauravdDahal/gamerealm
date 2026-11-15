'use client'

/**
 * Message alerts: a short sound, a desktop/phone notification while the tab is
 * in the background, and an "(n)" count in the tab title.
 * Works while the site is open in a tab. It does not wake a closed browser.
 */

const PREF_KEY = 'chat-alerts-enabled'

export const alertsSupported = () => typeof window !== 'undefined' && 'Notification' in window

export const alertsEnabled = () => {
    if (!alertsSupported() || Notification.permission !== 'granted') return false
    try {
        return localStorage.getItem(PREF_KEY) !== '0'
    } catch {
        return true
    }
}

export const setAlertsPref = on => {
    try {
        localStorage.setItem(PREF_KEY, on ? '1' : '0')
    } catch {}
}

/** Must be called from a click. Returns true when alerts are now on. */
export const enableAlerts = async () => {
    if (!alertsSupported()) return false
    let permission = Notification.permission
    if (permission === 'default') permission = await Notification.requestPermission()
    if (permission !== 'granted') return false
    setAlertsPref(true)
    registerWorker()
    return true
}

export const registerWorker = () => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return Promise.resolve(null)
    return navigator.serviceWorker.register('/sw.js').catch(() => null)
}

let audio
const getAudio = () => {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    audio = audio || new Ctx()
    if (audio.state === 'suspended') audio.resume()
    return audio
}

// One soft, rounded note: a sine with a touch of overtone and a quick fade,
// like a small glass/marimba hit.
const note = (ctx, freq, at, { dur = 0.22, gain = 0.2 } = {}) => {
    ;[[1, gain], [2, gain * 0.18], [3, gain * 0.06]].forEach(([mult, g]) => {
        const osc = ctx.createOscillator()
        const amp = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq * mult
        amp.gain.setValueAtTime(0.0001, at)
        amp.gain.exponentialRampToValueAtTime(g, at + 0.008)
        amp.gain.exponentialRampToValueAtTime(0.0001, at + dur / mult)
        osc.connect(amp).connect(ctx.destination)
        osc.start(at)
        osc.stop(at + dur + 0.05)
    })
}

/** New message: a bright, friendly two-note "pop-ding" (messenger style), made in the browser. */
let pingFile = null
export const ping = () => {
    try {
        if (typeof Audio !== 'undefined') {
            pingFile = pingFile || new Audio('/assets/sounds/messenger.mp3')
            pingFile.currentTime = 0
            pingFile.volume = 0.7
            const r = pingFile.play()
            if (r && r.catch) r.catch(() => synthPing())
            return
        }
    } catch {}
    synthPing()
}

const synthPing = () => {
    try {
        const ctx = getAudio()
        if (!ctx) return
        const t = ctx.currentTime
        // tiny "pop" at the front
        const pop = ctx.createOscillator()
        const pg = ctx.createGain()
        pop.type = 'sine'
        pop.frequency.setValueAtTime(520, t)
        pop.frequency.exponentialRampToValueAtTime(1400, t + 0.045)
        pg.gain.setValueAtTime(0.0001, t)
        pg.gain.exponentialRampToValueAtTime(0.16, t + 0.01)
        pg.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
        pop.connect(pg).connect(ctx.destination)
        pop.start(t)
        pop.stop(t + 0.09)
        note(ctx, 987.77, t + 0.05, { dur: 0.2, gain: 0.2 }) // B5
        note(ctx, 1318.51, t + 0.15, { dur: 0.42, gain: 0.22 }) // E6
    } catch {}
}

/** Your own message went out: a short, quiet upward "bloop". */
export const sentPop = () => {
    try {
        const ctx = getAudio()
        if (!ctx) return
        const t = ctx.currentTime
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(420, t)
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.09)
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.015)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13)
        osc.connect(g).connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.15)
    } catch {}
}

/** A system notification. Silently does nothing if the person hasn't allowed it. */
export const notify = async (title, body, url = '/') => {
    if (!alertsEnabled()) return
    const options = { body, icon: '/favicon.ico', tag: 'chat-message', renotify: true, data: { url } }
    try {
        const reg = await navigator.serviceWorker?.getRegistration?.()
        if (reg?.showNotification) return reg.showNotification(title, options)
        new Notification(title, options)
    } catch {}
}

/** What a message looks like in a notification. */
export const previewOf = m => {
    if (m.voice_path) return '🎤 Voice message'
    if (m.title) return m.title
    if (m.message) return m.message.slice(0, 120)
    const n = m.attachments?.length ?? 0
    return n ? `📎 ${n} file${n === 1 ? '' : 's'}` : 'New message'
}
