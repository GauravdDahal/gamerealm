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
/** A soft two-note chime, generated in the browser (no sound file needed). */
export const ping = () => {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (!Ctx) return
        audio = audio || new Ctx()
        if (audio.state === 'suspended') audio.resume()
        const now = audio.currentTime
        ;[660, 880].forEach((freq, i) => {
            const osc = audio.createOscillator()
            const gain = audio.createGain()
            osc.type = 'sine'
            osc.frequency.value = freq
            gain.gain.setValueAtTime(0.0001, now + i * 0.14)
            gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.14 + 0.02)
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.14 + 0.3)
            osc.connect(gain).connect(audio.destination)
            osc.start(now + i * 0.14)
            osc.stop(now + i * 0.14 + 0.32)
        })
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
