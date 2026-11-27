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
                subtitle="Pick an offer and ask our team in one tap. Your request opens in live chat." />
            <BonusesSection bare />
            <Steps
                title="How claiming works"
                items={[
                    { title: 'Sign in', text: 'Create an account. It is ready to use straight away.' },
                    { title: 'Tap claim', text: 'Choose a bonus. Your request opens in live chat, ready to send.' },
                    { title: 'We credit it', text: 'Our team checks the offer rules and adds the bonus to your account.' },
                ]}
            />
            <div className="wrap pb-16 md:pb-24">
                <div className="card flex flex-wrap items-center justify-between gap-4">
                    <p className="max-w-xl text-ink">Want even more? Invite friends and unlock bigger rewards with every level.</p>
                    <Link href="/referral" className="btn btn-secondary">
                        See referral levels
                    </Link>
                </div>
            </div>
        </PageShell>
    )
}
