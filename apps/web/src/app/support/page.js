'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    ArrowRight, BadgeCheck, ChevronDown, Gamepad2, Gift, HeadphonesIcon, Landmark,
    MessageCircle, Search, Send, Users, Wallet,
} from 'lucide-react'
import PageShell from '@/components/pages/PageShell'
import ChatPreview from '@/components/common/ChatPreview'
import { useAuth } from '@/hooks/auth'
import { useSiteContent } from '@/lib/useSiteContent'
import ContactLine from '@/components/common/ContactLine'

const TOPICS = [
    { Icon: BadgeCheck, title: 'Your account', text: 'Updating your details or a problem signing in.', msg: 'Hi! I need help with my account.' },
    { Icon: Wallet, title: 'Deposits', text: 'Adding funds, payment methods and deposit bonuses.', msg: 'Hi! I need help with a deposit.' },
    { Icon: Landmark, title: 'Withdrawals', text: 'Cashing out your winnings and checking a payout.', msg: 'Hi! I need help with a withdrawal.' },
    { Icon: Gift, title: 'Bonuses & wheel', text: 'Claiming an offer or crediting a lucky-wheel prize.', msg: 'Hi! I need help with a bonus or my wheel prize.' },
    { Icon: Users, title: 'Referral rewards', text: 'Your referral link, friends counted and level rewards.', msg: 'Hi! I have a question about my referral rewards.' },
    { Icon: Gamepad2, title: 'Game problems', text: 'Can’t load a game, lost connection or a game question.', msg: 'Hi! I have a problem with a game.' },
]

export default function SupportPage() {
    const router = useRouter()
    const { user, loading } = useAuth()
    const faq = useSiteContent('faq')
    const footer = useSiteContent('footer')
    const [q, setQ] = useState('')
    const [open, setOpen] = useState(null)

    const staff = !!(user?.is_admin || user?.is_superadmin || user?.is_staff)

    const guard = () => {
        if (loading) return false
        if (!user) return router.push('/users'), false
        if (user.is_approved === false) return router.push('/account-pending'), false
        return !staff
    }
    const openChat = () => guard() && window.dispatchEvent(new CustomEvent('open-chat'))
    const ask = topic => guard() && window.dispatchEvent(new CustomEvent('open-game-chat', { detail: { title: topic.title, text: topic.msg } }))

    const items = useMemo(() => {
        const n = q.trim().toLowerCase()
        return faq.items.filter(i => !n || i.question.toLowerCase().includes(n) || i.answer.toLowerCase().includes(n))
    }, [faq.items, q])

    return (
        <PageShell>
            {/* ------------------------------------------------------- hero */}
            <header className="border-b border-line bg-surface">
                <div className="wrap grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-2">
                    <div>
                        <p className="eyebrow">Live support</p>
                        <h1 className="font-display text-5xl leading-none text-ink sm:text-6xl">
                            We’re here <span className="text-accent">when you play.</span>
                        </h1>
                        <p className="section-intro">
                            Questions about your account, a deposit or a prize? Chat with our team, or find a quick answer below.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <button onClick={openChat} className="btn btn-primary btn-lg">
                                <MessageCircle aria-hidden="true" /> {user ? 'Start live chat' : 'Sign in to chat'}
                            </button>
                            <a href="#answers" className="btn btn-secondary btn-lg">
                                Browse answers <ChevronDown aria-hidden="true" />
                            </a>
                        </div>
                    </div>
                    {/* The real chat, not an abstract shape. */}
                    <div className="hidden justify-center lg:flex lg:justify-end">
                        <ChatPreview />
                    </div>
                </div>
            </header>

            {/* ------------------------------------------------------ topics */}
            <section className="bg-gray-900 py-16 md:py-24">
                <div className="wrap">
                    <h2 className="section-title">What do you need help with?</h2>
                    <p className="section-intro">Pick a topic and your message is ready to send in live chat.</p>
                    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {TOPICS.map(t => (
                            <button
                                key={t.title}
                                onClick={() => ask(t)}
                                className="card group flex flex-col text-left transition-colors hover:border-accent/60">
                                <span className="flex items-center gap-2 text-lg font-bold text-ink">
                                    <t.Icon className="h-[18px] w-[18px] text-accent" aria-hidden="true" />
                                    {t.title}
                                </span>
                                <span className="mt-2 flex-1 text-muted">{t.text}</span>
                                <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-accent">
                                    Ask about this <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* --------------------------------------------------------- how */}
            <section className="border-y border-line bg-night py-16 md:py-24">
                <div className="wrap">
                    <h2 className="section-title">How support works</h2>
                    <ol className="mt-8 grid gap-8 md:grid-cols-3">
                        {[
                            { Icon: HeadphonesIcon, t: 'Open the chat', d: 'Sign in and tap Start live chat.' },
                            { Icon: Send, t: 'Tell us what’s up', d: 'Send a message, a screenshot, or even a voice note.' },
                            { Icon: BadgeCheck, t: 'We sort it out', d: 'Our team replies in the same chat and updates your account.' },
                        ].map((s, i) => (
                            <li key={s.t} className="border-t border-line pt-6">
                                <p className="flex items-center gap-2 text-lg font-bold text-ink">
                                    <s.Icon className="h-[18px] w-[18px] text-accent" aria-hidden="true" />
                                    <span className="text-muted">{i + 1}.</span> {s.t}
                                </p>
                                <p className="mt-2 text-muted">{s.d}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* ---------------------------------------------------- answers */}
            <section id="answers" className="scroll-mt-24 bg-gray-900 py-16 md:py-24">
                <div className="wrap grid gap-12 lg:grid-cols-[1fr_320px]">
                    <div>
                        <h2 className="section-title">Quick answers</h2>
                        <div className="relative mt-6">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" aria-hidden="true" />
                            <input
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                placeholder="Search"
                                aria-label="Search help questions"
                                className="h-12 w-full rounded-lg border border-line bg-night pl-12 pr-4 text-base text-ink placeholder:text-dim focus:border-accent focus:outline-none"
                            />
                        </div>
                        <div className="mt-4 space-y-2">
                            {items.length === 0 && (
                                <p className="card text-muted">No answer found. Try the live chat and our team will help.</p>
                            )}
                            {items.map((it, i) => (
                                <div
                                    key={it.question}
                                    className={`overflow-hidden rounded-xl border bg-surface transition-colors ${open === i ? 'border-accent/60' : 'border-line'}`}>
                                    <button
                                        onClick={() => setOpen(open === i ? null : i)}
                                        aria-expanded={open === i}
                                        className="flex min-h-[56px] w-full items-center justify-between gap-4 px-6 py-4 text-left">
                                        <span className="font-bold text-ink">{it.question}</span>
                                        <ChevronDown className={`h-[18px] w-[18px] shrink-0 text-muted transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} />
                                    </button>
                                    {open === i && <p className="px-6 pb-6 text-muted">{it.answer}</p>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* side card */}
                    <aside className="card h-fit lg:sticky lg:top-28">
                        <h3 className="text-lg font-bold text-ink">Still need help?</h3>
                        <p className="mt-2 text-muted">Our team is one message away.</p>
                        <button onClick={openChat} className="btn btn-primary btn-block mt-6">
                            {user ? 'Open live chat' : 'Sign in to chat'}
                        </button>
                        {footer.contact.length > 0 && (
                            <ul className="mt-6 space-y-2 border-t border-line pt-4 text-sm text-muted">
                                {footer.contact.map((l, i) => <li key={i}><ContactLine text={l.text} /></li>)}
                            </ul>
                        )}
                        <p className="mt-6 border-t border-line pt-4 text-sm text-muted">
                            Please read our <Link href="/#rules" className="text-accent underline">community rules</Link> before you play.
                        </p>
                    </aside>
                </div>
            </section>
        </PageShell>
    )
}
