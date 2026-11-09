'use client'

import { Users } from 'lucide-react'
import PageShell from '@/components/pages/PageShell'
import PageHero from '@/components/pages/PageHero'
import Steps from '@/components/pages/Steps'
import ReferralSection from '@/components/landingPage/ReferralSection'
import { useSiteContent } from '@/lib/useSiteContent'

export default function ReferralPage() {
    const c = useSiteContent('referral')
    return (
        <PageShell>
            <PageHero eyebrow={c.eyebrow} Icon={Users} title={c.title} highlight={c.highlight} subtitle={c.subtitle} />
            <ReferralSection bare />
            <Steps
                title="How it works"
                items={[
                    { title: 'Share your link', text: 'Approved players get a personal link and code to send to friends.' },
                    { title: 'Friends join', text: 'A friend counts once our team approves their new account.' },
                    { title: 'Level up', text: 'Every level you reach unlocks a one-time reward, credited by our team.' },
                ]}
            />
        </PageShell>
    )
}
