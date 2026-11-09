'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Download, Share, X } from 'lucide-react'
import { registerWorker } from '@/lib/chatAlerts'

const HIDE_KEY = 'install-app-hidden-until'

/**
 * Makes the site installable like an app.
 * - Android / desktop Chrome and Edge: an "Install" button that opens the
 *   browser's own install prompt.
 * - iPhone / iPad (Safari): a short hint, since iOS has no install prompt.
 * Only shown on the homepage, never inside the installed app, and a dismissed
 * card stays away for a week.
 */
export default function InstallApp() {
    const pathname = usePathname()
    const [promptEvent, setPromptEvent] = useState(null)
    const [ios, setIos] = useState(false)
    const [hidden, setHidden] = useState(true)

    useEffect(() => {
        registerWorker()

        const standalone =
            window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
        if (standalone) return

        try {
            if (Number(localStorage.getItem(HIDE_KEY)) > Date.now()) return
        } catch {}

        const ua = window.navigator.userAgent
        const onIos = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua)
        if (onIos) {
            setIos(true)
            setHidden(false)
        }

        const onPrompt = e => {
            e.preventDefault() // keep the prompt so our own button can open it
            setPromptEvent(e)
            setHidden(false)
        }
        const onInstalled = () => setHidden(true)
        window.addEventListener('beforeinstallprompt', onPrompt)
        window.addEventListener('appinstalled', onInstalled)
        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt)
            window.removeEventListener('appinstalled', onInstalled)
        }
    }, [])

    const dismiss = () => {
        setHidden(true)
        try {
            localStorage.setItem(HIDE_KEY, String(Date.now() + 7 * 24 * 3600 * 1000))
        } catch {}
    }

    const install = async () => {
        if (!promptEvent) return
        promptEvent.prompt()
        await promptEvent.userChoice
        setPromptEvent(null)
        setHidden(true)
    }

    if (hidden || pathname !== '/' || (!promptEvent && !ios)) return null

    return (
        <div
            role="dialog"
            aria-label="Install the app"
            style={{ background: 'linear-gradient(145deg, rgb(var(--c-surface2)), rgb(var(--c-night)) 60%)' }}
            className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-24 z-40 flex max-w-sm items-center gap-3 rounded-2xl border border-accent/40 p-3 shadow-2xl shadow-black/60 sm:left-6 sm:right-auto">
            <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/60 text-xl text-accent">
                &spades;&#xFE0E;
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Get the Casino Play app</p>
                {ios ? (
                    <p className="text-xs text-muted">
                        Tap <Share className="inline h-3.5 w-3.5 align-text-bottom" /> then
                        &ldquo;Add to Home Screen&rdquo;.
                    </p>
                ) : (
                    <p className="text-xs text-muted">Opens full screen, one tap from your home screen.</p>
                )}
            </div>
            {!ios && (
                <button
                    onClick={install}
                    style={{ background: 'linear-gradient(110deg, rgb(var(--c-accent-dim)), rgb(var(--c-accent2)) 48%, rgb(var(--c-accent-dim)))' }}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider text-accent-ink">
                    <Download className="h-3.5 w-3.5" /> Install
                </button>
            )}
            <button
                onClick={dismiss}
                aria-label="Not now"
                className="shrink-0 rounded-full p-1 text-muted hover:text-white">
                <X className="h-4 w-4" />
            </button>
        </div>
    )
}
