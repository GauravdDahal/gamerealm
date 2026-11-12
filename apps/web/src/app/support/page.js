'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    ArrowRight, BadgeCheck, ChevronDown, Gamepad2, Gift, HeadphonesIcon, Landmark,
    MessageCircle, Search, Send, Users, Wallet,
} from 'lucide-react'
import PageShell from '@/components/pages/PageShell'
import { useAuth } from '@/hooks/auth'
import { useSiteContent } from '@/lib/useSiteContent'
import ContactLine from '@/components/common/ContactLine'

const TOPICS = [
    { Icon: BadgeCheck, title: 'Account approval', text: 'Waiting for your account to be approved, or need to update details.', msg: 'Hi! I need help with my account approval.' },
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
            <header className="relative isolate overflow-hidden border-b border-line/60">
                <div aria-hidden className="absolute inset-0 -z-10"
                    style={{ background: 'radial-gradient(55% 90% at 80% 10%, rgb(var(--c-accent) / 0.22), transparent 60%), radial-gradient(45% 80% at 5% 90%, rgb(var(--c-secondary) / 0.18), transparent 60%)' }} />
                <div aria-hidden className="absolute -right-24 top-6 -z-10 h-72 w-72 rounded-full border border-accent/20 sm:h-96 sm:w-96" />
                <div aria-hidden className="absolute -right-8 top-24 -z-10 h-48 w-48 rounded-full border border-accent/30 sm:h-64 sm:w-64" />
                <div className="container mx-auto px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
                    <p className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                        </span>
                        Live support
                    </p>
                    <h1 className="mt-5 max-w-3xl font-godofwar text-4xl leading-[1.05] text-ink sm:text-6xl lg:text-7xl">
                        We’re here <span className="text-accent">when you play.</span>
                    </h1>
                    <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">
                        Questions about your account, a deposit or a prize? Chat with our team, or find a quick answer below.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <button onClick={openChat}
                            className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-bold text-accent-ink shadow-lg shadow-accent/20 transition hover:scale-[1.03] hover:bg-accent2">
                            <MessageCircle className="h-5 w-5" /> {user ? 'Start live chat' : 'Sign in to chat'}
                        </button>
                        <a href="#answers"
                            className="inline-flex items-center gap-2 rounded-xl border border-line px-6 py-3 font-semibold text-ink transition hover:bg-surface2">
                            Browse answers <ChevronDown className="h-4 w-4" />
                        </a>
                    </div>
                </div>
            </header>

            {/* ------------------------------------------------------ topics */}
            <section className="bg-gray-900 py-14 sm:py-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="font-godofwar text-2xl text-ink sm:text-3xl">What do you need help with?</h2>
                    <p className="mt-2 text-sm text-muted">Pick a topic and your message is ready to send in live chat.</p>
                    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {TOPICS.map(t => (
                            <button key={t.title} onClick={() => ask(t)}
                                className="group relative overflow-hidden rounded-2xl border border-line/60 bg-surface/60 p-5 text-left transition hover:-translate-y-1 hover:border-accent/60 hover:bg-surface2">
                                <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/10 transition group-hover:scale-150" aria-hidden />
                                <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
                                    <t.Icon className="h-5 w-5" />
                                </span>
                                <h3 className="relative mt-4 font-bold text-ink">{t.title}</h3>
                                <p className="relative mt-1 text-sm text-muted">{t.text}</p>
                                <span className="relative mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                                    Ask about this <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* --------------------------------------------------------- how */}
            <section className="border-y border-line/60 bg-night/60 py-14 sm:py-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="font-godofwar text-2xl text-ink sm:text-3xl">How support works</h2>
                    <div className="relative mt-10 grid gap-8 md:grid-cols-3">
                        <div aria-hidden className="absolute left-[16%] right-[16%] top-6 hidden h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent md:block" />
                        {[
                            { Icon: HeadphonesIcon, t: 'Open the chat', d: 'Sign in with an approved account and tap Start live chat.' },
                            { Icon: Send, t: 'Tell us what’s up', d: 'Send a message, a screenshot, or even a voice note.' },
                            { Icon: BadgeCheck, t: 'We sort it out', d: 'Our team replies in the same chat and updates your account.' },
                        ].map(s => (
                            <div key={s.t} className="relative text-center">
                                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent/50 bg-night text-accent shadow-[0_0_24px_rgb(var(--c-accent)/0.25)]">
                                    <s.Icon className="h-5 w-5" />
                                </span>
                                <h3 className="mt-4 font-bold text-ink">{s.t}</h3>
                                <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{s.d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---------------------------------------------------- answers */}
            <section id="answers" className="scroll-mt-24 bg-gray-900 py-14 sm:py-20">
                <div className="container mx-auto grid gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
                    <div>
                        <h2 className="font-godofwar text-2xl text-ink sm:text-3xl">Quick answers</h2>
                        <div className="relative mt-5">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
                            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search questions…"
                                className="w-full rounded-xl border border-line bg-night py-3 pl-10 pr-4 text-sm text-ink placeholder:text-dim focus:border-accent focus:outline-none" />
                        </div>
                        <div className="mt-4 space-y-3">
                            {items.length === 0 && (
                                <p className="rounded-xl border border-line/60 bg-surface/60 p-5 text-sm text-muted">
                                    No answer found. Try the live chat and our team will help.
                                </p>
                            )}
                            {items.map((it, i) => (
                                <div key={it.question} className={`overflow-hidden rounded-xl border bg-surface/60 transition ${open === i ? 'border-accent/60' : 'border-line/60'}`}>
                                    <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}
                                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
                                        <span className="font-semibold text-ink">{it.question}</span>
                                        <ChevronDown className={`h-5 w-5 shrink-0 text-accent transition ${open === i ? 'rotate-180' : ''}`} />
                                    </button>
                                    {open === i && <p className="px-5 pb-5 text-sm text-muted">{it.answer}</p>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* side card */}
                    <aside className="h-fit rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/15 to-surface/60 p-6 lg:sticky lg:top-28">
                        <h3 className="font-godofwar text-xl text-ink">Still need help?</h3>
                        <p className="mt-2 text-sm text-muted">Our team is one message away.</p>
                        <button onClick={openChat}
                            className="mt-5 w-full rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-ink hover:bg-accent2">
                            {user ? 'Open live chat' : 'Sign in to chat'}
                        </button>
                        {footer.contact.length > 0 && (
                            <ul className="mt-5 space-y-2 border-t border-line/60 pt-4 text-sm text-muted">
                                {footer.contact.map((l, i) => <li key={i}><ContactLine text={l.text} /></li>)}
                            </ul>
                        )}
                        <p className="mt-5 border-t border-line/60 pt-4 text-xs text-dim">
                            Please read our <Link href="/#rules" className="text-accent underline">community rules</Link> before you play.
                        </p>
                    </aside>
                </div>
            </section>
        </PageShell>
    )
}
