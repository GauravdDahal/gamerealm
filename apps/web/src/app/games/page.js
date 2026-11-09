'use client'

import { Gamepad2 } from 'lucide-react'
import PageShell from '@/components/pages/PageShell'
import PageHero from '@/components/pages/PageHero'
import GamesSection from '@/components/landingPage/GamesSection'
import { useSiteContent } from '@/lib/useSiteContent'

export default function GamesPage() {
    const c = useSiteContent('games')
    return (
        <PageShell>
            <PageHero eyebrow="Game library" Icon={Gamepad2} title="All" highlight="games" subtitle={c.intro} />
            <GamesSection bare all />
        </PageShell>
    )
}
