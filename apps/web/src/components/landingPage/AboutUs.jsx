'use client'
import ChatPreview from '@/components/common/ChatPreview'
import { useSiteContent } from '@/lib/useSiteContent'

export default function AboutUs() {
    const c = useSiteContent('about')

    return (
        <section id="about" className="section relative overflow-hidden bg-surface">
            <div className="wrap grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                <div data-aos="fade">
                    <h2 className="section-title">{c.title}</h2>
                    <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">{c.body}</p>
                    <a href="/support" className="btn btn-secondary btn-lg mt-8">
                        {c.button}
                    </a>
                </div>
                {/* The real product, not a stock animation. */}
                <div className="flex justify-center lg:justify-end" data-aos="fade">
                    <ChatPreview />
                </div>
            </div>
        </section>
    )
}
