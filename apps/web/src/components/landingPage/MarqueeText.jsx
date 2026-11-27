'use client'

import { Spade } from 'lucide-react'
import { useSiteContent } from '@/lib/useSiteContent'

// Words may end with a card-suit character; the separator icon replaces it.
const clean = text => String(text || '').replace(/[\s♠♥♦♣]+$/u, '')

/* Pure CSS scrolling (see .marquee-track in global.css): no JavaScript loop. */
const Marquee = () => {
    const { items: words } = useSiteContent('marquee')
    const items = words.map(w => clean(w.text)).filter(Boolean)
    if (items.length === 0) return null
    return (
        <div className="relative w-full overflow-hidden border-b border-line bg-surface py-8 md:py-12" aria-hidden="true">
            <div className="marquee-track flex w-max items-center whitespace-nowrap">
                {[...items, ...items].map((text, index) => (
                    <span key={index} className="flex items-center">
                        <span className={`px-6 font-display text-3xl uppercase md:text-5xl ${index % 2 ? 'text-muted' : 'text-ink'}`}>
                            {text}
                        </span>
                        <Spade className="h-[18px] w-[18px] text-accent" />
                    </span>
                ))}
            </div>
        </div>
    )
}

export default Marquee
