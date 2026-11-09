'use client'

import Link from 'next/link'
import { Gift } from 'lucide-react'
import PageShell from '@/components/pages/PageShell'
import PageHero from '@/components/pages/PageHero'
import Steps from '@/components/pages/Steps'
import BonusesSection from '@/components/landingPage/BonusesSection'
import { useSiteContent } from '@/lib/useSiteContent'

export default function BonusesPage() {
    const c = useSiteContent('bonuses')
    return (
        <PageShell>
            <PageHero eyebrow={c.eyebrow} Icon={Gift} title={c.title} highlight={c.highlight}
                subtitle="Pick an offer and ask our team in one tap. Approved players are connected straight to live chat." />
            <BonusesSection bare />
            <Steps
                title="How claiming works"
                items={[
                    { title: 'Sign in', text: 'Create an account and wait for our team to approve it.' },
                    { title: 'Tap claim', text: 'Choose a bonus. Your request opens in live chat, ready to send.' },
                    { title: 'We credit it', text: 'Our team checks the offer rules and adds the bonus to your account.' },
                ]}
            />
            <div className="container mx-auto px-4 pb-16 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent/40 bg-accent/10 p-6">
                    <p className="max-w-xl text-ink">Want even more? Invite friends and unlock bigger rewards with every level.</p>
                    <Link href="/referral" className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-ink hover:bg-accent2">
                        See referral levels
                    </Link>
                </div>
            </div>
        </PageShell>
    )
}
