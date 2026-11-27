'use client'

import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth'
import { useSiteContent } from '@/lib/useSiteContent'
import { safeUrl } from '@/lib/safeUrl'

/**
 * Bonus cards. Everything written here is edited in Admin → Site content.
 * Visitors are sent to sign in; approved players open the support chat with
 * a ready-made request for that bonus.
 */
export default function BonusesSection({ bare = false }) {
    const c = useSiteContent('bonuses')
    const router = useRouter()
    const { user, loading } = useAuth()

    if (c.cards.length === 0) return null

    const claim = card => {
        if (loading) return
        if (!user) return router.push('/users')
        if (user.is_admin || user.is_superadmin || user.is_staff) return
        if (user.is_approved === false) return router.push('/account-pending')
        window.dispatchEvent(
            new CustomEvent('open-game-chat', {
                detail: { title: card.title, text: `Hi! I would like to claim the ${card.title}.` },
            }),
        )
    }

    const odd = c.cards.length % 2 === 1

    return (
        <section id="bonuses" className={`bg-gray-900 ${bare ? 'pb-8 pt-8' : 'section'}`}>
            <div className="wrap">
                {!bare && (
                    <div className="flex flex-wrap items-end justify-between gap-4" data-aos="fade">
                        <div>
                            {c.eyebrow && <p className="eyebrow">{c.eyebrow}</p>}
                            <h2 className="section-title">
                                {c.title} <span className="text-accent">{c.highlight}</span>
                            </h2>
                        </div>
                        {c.link_url && (
                            <a href={safeUrl(c.link_url)} className="btn btn-ghost">
                                {c.link_label} <ArrowRight aria-hidden="true" />
                            </a>
                        )}
                    </div>
                )}

                <div className={`${bare ? '' : 'mt-12 '}grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6`}>
                    {c.cards.map((card, i) => (
                        <div
                            key={i}
                            className={`card flex flex-col ${odd && i === c.cards.length - 1 ? 'md:col-span-2' : ''}`}>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
                                <p className="w-20 shrink-0 font-display text-4xl leading-none text-accent">{card.badge}</p>
                                <div className="min-w-0">
                                    {bare ? (
                                        <h2 className="text-lg font-bold text-ink">{card.title}</h2>
                                    ) : (
                                        <h3 className="text-lg font-bold text-ink">{card.title}</h3>
                                    )}
                                    <p className="mt-2 text-muted">{card.description}</p>
                                    {card.note && <p className="mt-2 text-sm text-dim">{card.note}</p>}
                                </div>
                            </div>
                            <div className="mt-auto pt-6">
                                <button onClick={() => claim(card)} className="btn btn-primary w-full sm:w-auto">
                                    {user === null ? c.signin_label : c.claim_label}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
