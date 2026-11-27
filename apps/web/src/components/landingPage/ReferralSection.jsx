'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { Check, Copy, Share2 } from 'lucide-react'
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

/** One row of the level ladder: a short ranked list instead of identical cards. */
const LevelRow = ({ lv, isNext }) => (
    <li className={`flex items-center gap-4 px-4 py-3 ${isNext ? 'bg-accent/10' : ''}`}>
        <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold ${
                lv.reached ? 'border-accent bg-accent text-accent-ink' : 'border-line text-muted'
            }`}>
            {lv.reached ? <Check className="h-4 w-4" aria-label="Reached" /> : lv.level}
        </span>
        <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-ink">{lv.name}</p>
            <p className="text-sm text-muted">
                {lv.friends_required} {lv.friends_required === 1 ? 'friend' : 'friends'}
                {lv.deposit_bonus_pct > 0 && <> · +{lv.deposit_bonus_pct}% deposit bonus</>}
                {lv.reward_status && <> · {lv.reward_status === 'credited' ? 'Credited' : 'On its way'}</>}
            </p>
        </div>
        <p className="shrink-0 font-display text-2xl text-accent">{money(lv.reward_amount)}</p>
    </li>
)

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

    const H = bare ? 'h2' : 'h3'

    return (
        <section id="referrals" className={`bg-gray-900 ${bare ? 'pb-8 pt-8' : 'section'}`}>
            <div className="wrap">
                {!bare && (
                    <div data-aos="fade">
                        {c.eyebrow && <p className="eyebrow">{c.eyebrow}</p>}
                        <h2 className="section-title">
                            {c.title} <span className="text-accent">{c.highlight}</span>
                        </h2>
                        <p className="section-intro">{c.subtitle}</p>
                    </div>
                )}

                {/* Wide personal panel next to a narrow level list. */}
                <div className={`${bare ? '' : 'mt-12 '}grid gap-4 md:gap-6 lg:grid-cols-5`}>
                    <div className="card lg:col-span-3">
                        {loading ? null : !user ? (
                            <div className="flex h-full flex-col items-start justify-center gap-4">
                                <H className="text-lg font-bold text-ink">Get your personal link</H>
                                <p className="text-muted">Create an account to get a link and code you can send to friends.</p>
                                <button onClick={() => router.push('/register')} className="btn btn-primary">
                                    {c.signin_label}
                                </button>
                            </div>
                        ) : !approved ? (
                            <p className="text-muted">{c.pending_note}</p>
                        ) : !mine ? (
                            <p className="text-muted">Loading your link…</p>
                        ) : (
                            <div className="space-y-8">
                                <div>
                                    <H className="text-lg font-bold text-ink">Your referral link</H>
                                    <div className="mt-4 flex flex-wrap items-center gap-2">
                                        <code className="flex h-10 min-w-0 flex-1 items-center truncate rounded-lg border border-line bg-night px-4 text-sm text-ink">
                                            {link}
                                        </code>
                                        <button onClick={copy} className="btn btn-primary">
                                            {copied ? <Check /> : <Copy />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </button>
                                        <button onClick={share} className="btn btn-secondary">
                                            <Share2 /> Share
                                        </button>
                                    </div>
                                    <p className="mt-2 text-sm text-muted">
                                        Or give friends your code: <span className="font-bold tracking-wider text-ink">{mine.code}</span>
                                    </p>
                                </div>

                                <div>
                                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                                        <span className="text-ink">
                                            <b className="text-accent">{count}</b> {count === 1 ? 'friend' : 'friends'} counted
                                            {mine.waiting > 0 && <span className="text-muted"> · {mine.waiting} waiting for approval</span>}
                                        </span>
                                        {next ? (
                                            <span className="text-muted">
                                                {next.friends_required - count} more for <b className="text-ink">{next.name}</b> ({money(next.reward_amount)})
                                            </span>
                                        ) : (
                                            <span className="font-bold text-accent">Top level reached</span>
                                        )}
                                    </div>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-night">
                                        <div
                                            className="h-full rounded-full bg-accent"
                                            style={{ width: `${next ? Math.min(100, (count / next.friends_required) * 100) : 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-line bg-surface lg:col-span-2">
                        <H className="border-b border-line px-4 py-3 text-sm font-bold text-muted">Levels</H>
                        <ol className="divide-y divide-line">
                            {list.map(lv => (
                                <LevelRow key={lv.level} lv={lv} isNext={next && lv.level === next.level} />
                            ))}
                        </ol>
                    </div>
                </div>
                <p className="mt-4 text-sm text-muted">
                    A friend counts once their account is active. Our team adds your level rewards to your account.
                </p>
            </div>
        </section>
    )
}
