'use client'

import { ArrowRight, Gift } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth'
import { useSiteContent } from '@/lib/useSiteContent'

/**
 * Bonus cards. Everything written here is edited in Admin → Site content.
 * Visitors are sent to sign in; approved players open the support chat with
 * a ready-made request for that bonus.
 */
export default function BonusesSection() {
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
        <section id="bonuses" className="bg-gray-900 py-12 sm:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-orange-400">
                            <Gift className="h-3.5 w-3.5" /> {c.eyebrow}
                        </p>
                        <h2 className="mt-2 font-godofwar text-3xl leading-tight text-white sm:text-4xl">
                            {c.title} <span className="text-orange-500">{c.highlight}</span>
                        </h2>
                    </div>
                    {c.link_url && (
                        <a
                            href={c.link_url}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-orange-400 hover:text-orange-300">
                            {c.link_label} <ArrowRight className="h-4 w-4" />
                        </a>
                    )}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {c.cards.map((card, i) => (
                        <div
                            key={i}
                            className={`rounded-2xl border border-white/10 bg-gradient-to-br from-[#2a1650] to-[#160b2b] p-5 shadow-lg shadow-black/30 ${
                                odd && i === c.cards.length - 1 ? 'md:col-span-2' : ''
                            }`}>
                            <div className="flex items-start gap-4">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-orange-400/25 bg-white/5 text-lg font-bold text-orange-400">
                                    {card.badge}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-white">{card.title}</h3>
                                    <p className="mt-1 text-sm text-gray-300">{card.description}</p>
                                </div>
                            </div>
                            {card.note && <p className="mt-4 text-xs text-purple-300">{card.note}</p>}
                            <button
                                onClick={() => claim(card)}
                                className="mt-3 w-full rounded-lg bg-gradient-to-r from-orange-400 to-orange-600 px-4 py-3 text-sm font-semibold text-gray-900 shadow-md transition hover:brightness-110">
                                {user ? c.claim_label : c.signin_label}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
