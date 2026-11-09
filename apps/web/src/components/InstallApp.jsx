'use client'

import { useEffect } from 'react'
import { registerWorker } from '@/lib/chatAlerts'
import { startInstallCapture } from '@/lib/installApp'

/**
 * Starts the app-install support as early as possible (the browser offers the
 * install prompt only once). The "Get app" button itself lives in the site
 * header: see Navigation.
 */
export default function InstallApp() {
    useEffect(() => {
        registerWorker()
        startInstallCapture()
    }, [])
    return null
}
