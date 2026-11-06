'use client'

const items = [
    { text: 'Jackpot ♠' },
    { text: 'casino ♠', opacity: 'opacity-60' },
    { text: 'Spinning wheel ♠' },
    { text: 'casino games ♠', opacity: 'opacity-60' },
]

/* Pure CSS scrolling (see .marquee-track in global.css): no JavaScript loop. */
const Marquee = () => (
    <div className="relative w-full overflow-hidden bg-[#151C28]">
        <div className="py-8 md:py-12 lg:py-16">
            <div className="marquee-track flex w-max whitespace-nowrap">
                {[...items, ...items].map((item, index) => (
                    <h1
                        key={index}
                        className={`FontMarquee font-marquee-text mx-4 text-4xl md:text-6xl lg:text-8xl font-bold uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#c5214d] via-[#060665] to-[#c0cb1b] ${item.opacity ?? ''}`}>
                        {item.text}
                    </h1>
                ))}
            </div>
        </div>
    </div>
)

export default Marquee
