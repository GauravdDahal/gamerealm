'use client'

import { useSiteContent } from '@/lib/useSiteContent'


/* Pure CSS scrolling (see .marquee-track in global.css): no JavaScript loop. */
const Marquee = () => {
    const { items: words } = useSiteContent('marquee')
    const items = words.map((w, i) => ({ text: w.text, opacity: i % 2 ? 'opacity-60' : '' }))
    if (items.length === 0) return null
    return (
    <div className="relative w-full overflow-hidden bg-surface">
        <div className="py-8 md:py-12 lg:py-16">
            <div className="marquee-track flex w-max whitespace-nowrap">
                {[...items, ...items].map((item, index) => (
                    <h1
                        key={index}
                        className={`FontMarquee font-marquee-text mx-4 text-4xl md:text-6xl lg:text-8xl font-bold uppercase text-transparent bg-clip-text bg-gradient-to-r from-danger via-secondary to-accent2 ${item.opacity ?? ''}`}>
                        {item.text}
                    </h1>
                ))}
            </div>
        </div>
    </div>
    )
}

export default Marquee
