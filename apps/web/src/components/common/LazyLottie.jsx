'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

const cache = new Map()

/**
 * A Lottie animation that only exists while it is on screen.
 * Looping Lottie files are expensive; several playing at once, even off-screen,
 * can freeze the page. This loads the file when it scrolls near the viewport
 * and removes the animation again when it leaves.
 */
export default function LazyLottie({ src, className, loop = true }) {
    const box = useRef(null)
    const [visible, setVisible] = useState(false)
    const [data, setData] = useState(cache.get(src) ?? null)

    useEffect(() => {
        const el = box.current
        if (!el || typeof IntersectionObserver === 'undefined') return
        const io = new IntersectionObserver(
            ([entry]) => setVisible(entry.isIntersecting),
            { rootMargin: '150px' },
        )
        io.observe(el)
        return () => io.disconnect()
    }, [])

    useEffect(() => {
        if (!visible || data) return
        let cancelled = false
        fetch(src)
            .then(r => r.json())
            .then(json => {
                cache.set(src, json)
                if (!cancelled) setData(json)
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [visible, data, src])

    return (
        <div ref={box} className={className}>
            {visible && data ? (
                <Lottie animationData={data} loop={loop} className="h-full w-full" />
            ) : null}
        </div>
    )
}
