'use client'

import { useEffect, useSyncExternalStore } from 'react'

/**
 * "Get app" support shared by the header button. The browser fires
 * `beforeinstallprompt` once, early, so it is captured here and kept until
 * somebody taps the button. iPhones have no install prompt, so they get a hint.
 */
const state = { promptEvent: null, ios: false, standalone: false, ready: false }
const listeners = new Set()
let snapshot = { ...state }
const emit = () => {
    snapshot = { ...state }
    listeners.forEach(l => l())
}

let started = false
export const startInstallCapture = () => {
    if (started || typeof window === 'undefined') return
    started = true
    state.standalone = window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone
    const ua = window.navigator.userAgent
    state.ios = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua)
    state.ready = true
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault()
        state.promptEvent = e
        emit()
    })
    window.addEventListener('appinstalled', () => {
        state.promptEvent = null
        state.standalone = true
        emit()
    })
    emit()
}

export const promptInstall = async () => {
    const e = state.promptEvent
    if (!e) return false
    e.prompt()
    await e.userChoice
    state.promptEvent = null
    emit()
    return true
}

const serverSnapshot = { promptEvent: null, ios: false, standalone: false, ready: false }

export const useInstallApp = () => {
    useEffect(() => startInstallCapture(), [])
    const s = useSyncExternalStore(
        cb => {
            listeners.add(cb)
            return () => listeners.delete(cb)
        },
        () => snapshot,
        () => serverSnapshot,
    )
    return {
        canInstall: !s.standalone && !!s.promptEvent,
        showIosHint: !s.standalone && s.ios,
        install: promptInstall,
    }
}
