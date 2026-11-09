'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { Check, Copy, Lock, Share2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/auth'
import { useSiteContent } from '@/lib/useSiteContent'

/**
 * Referral levels. Levels and rewards come from the database (edited in
 * Admin > Referrals); the wording comes from Admin > Site content. Hides itself
 * if levels can't be loaded, so the homepage never shows a broken block.
 */
const money = n => `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`

const loadLevels = async () => {
    const { data, error } = await createClient()
        .from('referral_levels')
        .select('level, name, friends_required, reward_amount, deposit_bonus_pct, perk')
        .eq('is_active', true)
        .order('level')
    if (error) throw error
    return data
}

const loadMine = async () => {
    const { data, error } = await createClient().rpc('my_referral')
    if (error) throw error
    return data
}

const LevelCard = ({ lv, state }) => {
    const reached = state === 'reached'
    return (
        <div
            className={`relative rounded-2xl border p-4 transition ${
                reached ? 'border-accent/70 bg-accent/10 shadow-[0_0_24px_rgb(var(--c-accent)/0.15)]' : 'border-line/60 bg-surface/60'
            }`}>
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-dim">Level {lv.level}</span>
                {reached ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-ink">
                        <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                ) : (
                    <Lock className="h-3.5 w-3.5 text-dim" />
                )}
            </div>
            <p className="mt-2 font-godofwar text-xl leading-tight text-ink">{lv.name}</p>
            <p className="mt-1 text-xs text-muted">
                {lv.friends_required} approved {lv.friends_required === 1 ? 'friend' : 'friends'}
            </p>
            <p className="mt-3 text-2xl font-extrabold text-accent">{money(lv.reward_amount)}</p>
            {lv.deposit_bonus_pct > 0 && (
                <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-ink">
                    +{lv.deposit_bonus_pct}% deposit bonus
                </span>
            )}
            {lv.reward_status && (
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-secondary2">
                    {lv.reward_status === 'credited' ? 'Credited' : 'On its way'}
                </p>
            )}
        </div>
    )
}

export default function ReferralSection({ bare = false }) {
    const c = useSiteContent('referral')
    const router = useRouter()
    const { user, loading } = useAuth()
    const [copied, setCopied] = useState(false)

    const { data: levels, error: levelsError } = useSWR('referral-levels', loadLevels, {
        revalidateOnFocus: false,
        shouldRetryOnError: false,
    })
    const approved = !!user && user.is_approved !== false
    const { data: mine } = useSWR(approved ? ['my-referral', user.id ?? 'me'] : null, loadMine, {
        revalidateOnFocus: true,
        shouldRetryOnError: false,
    })

    if (levelsError || !levels || levels.length === 0) return null

    const list = mine?.levels ?? levels.map(l => ({ ...l, reached: false }))
    const count = mine?.approved ?? 0
    const next = list.find(l => !l.reached)
    const link = mine?.code && typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${mine.code}` : ''

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {}
    }
    const share = async () => {
        try {
            if (navigator.share) await navigator.share({ title: 'Join me', text: 'Join me and play!', url: link })
            else copy()
        } catch {}
    }

    return (
        <section id="referrals" className={`bg-gray-900 ${bare ? 'pt-10 pb-4' : 'py-12 sm:py-16'}`}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {!bare && (
                    <>
                <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
                    <Users className="h-3.5 w-3.5" /> {c.eyebrow}
                </p>
                <h2 className="mt-2 font-godofwar text-3xl leading-tight text-ink sm:text-4xl">
                    {c.title} <span className="text-accent">{c.highlight}</span>
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-muted sm:text-base">{c.subtitle}</p>

                    </>
                )}

                {/* ------------------------------------------- personal panel */}
                <div className={`${bare ? '' : 'mt-8 '}rounded-2xl border border-line/60 bg-surface/70 p-5 sm:p-6`}>
                    {loading ? null : !user ? (
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <p className="text-sm text-muted">Create an account to get your personal referral link.</p>
                            <button
                                onClick={() => router.push('/register')}
                                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-ink transition hover:bg-accent2">
                                {c.signin_label}
                            </button>
                        </div>
                    ) : !approved ? (
                        <p className="text-sm text-muted">{c.pending_note}</p>
                    ) : !mine ? (
                        <p className="text-sm text-muted">Loading your link…</p>
                    ) : (
                        <div className="space-y-5">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-dim">Your referral link</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <code className="min-w-0 flex-1 truncate rounded-lg border border-line/60 bg-night px-3 py-2.5 text-sm text-ink">
                                        {link}
                                    </code>
                                    <button
                                        onClick={copy}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink hover:bg-accent2">
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        {copied ? 'Copied' : 'Copy'}
                                    </button>
                                    <button
                                        onClick={share}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface2">
                                        <Share2 className="h-4 w-4" /> Share
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-dim">
                                    Or give friends your code: <span className="font-bold tracking-widest text-ink">{mine.code}</span>
                                </p>
                            </div>

                            <div>
                                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                                    <span className="text-ink">
                                        <b className="text-accent">{count}</b> approved {count === 1 ? 'friend' : 'friends'}
                                        {mine.waiting > 0 && <span className="text-dim"> · {mine.waiting} waiting for approval</span>}
                                    </span>
                                    {next ? (
                                        <span className="text-muted">
                                            {next.friends_required - count} more for <b className="text-ink">{next.name}</b> ({money(next.reward_amount)})
                                        </span>
                                    ) : (
                                        <span className="font-semibold text-accent">Top level reached 🎉</span>
                                    )}
                                </div>
                                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-night">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-accent-dim via-accent to-accent2 transition-all"
                                        style={{ width: `${next ? Math.min(100, (count / next.friends_required) * 100) : 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ---------------------------------------------------- levels */}
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {list.map(lv => (
                        <LevelCard key={lv.level} lv={lv} state={lv.reached ? 'reached' : 'locked'} />
                    ))}
                </div>
                <p className="mt-4 text-xs text-dim">
                    A friend counts once our team approves their account. Rewards are added to your account by our team.
                </p>
            </div>
        </section>
    )
}
