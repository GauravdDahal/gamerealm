'use client'

import { useEffect } from 'react'
import { useThemeSetting } from '@/lib/useSiteContent'
import { THEMES, DEFAULT_THEME } from '@/lib/themes.mjs'

// Puts the theme chosen in the admin panel onto <html>, and remembers it so
// the next visit paints the right colours immediately.
const ThemeApplier = () => {
    const { active, loaded } = useThemeSetting()

    useEffect(() => {
        if (!loaded) return // keep the remembered theme until the saved one arrives
        const id = THEMES.some(t => t.id === active) ? active : DEFAULT_THEME
        document.documentElement.setAttribute('data-theme', id)
        try {
            localStorage.setItem('site-theme', id)
        } catch {}
        const night = getComputedStyle(document.documentElement).getPropertyValue('--theme-night').trim()
        if (night) {
            let meta = document.querySelector('meta[name="theme-color"]')
            if (!meta) {
                meta = document.createElement('meta')
                meta.name = 'theme-color'
                document.head.appendChild(meta)
            }
            meta.content = night
        }
    }, [active, loaded])

    return null
}

export default ThemeApplier
