'use client'

import dynamic from 'next/dynamic'
import Navigation from '@/components/landingPage/Navigation'
import Footer from '@/components/landingPage/Footer'
import SectionDecor from '@/components/SectionDecor'

const ChatPopup = dynamic(() => import('@/components/landingPage/ChatPopup'), { ssr: false })

/** Common frame for the inner pages: menu on top, footer and chat at the bottom. */
export default function PageShell({ children }) {
    return (
        <div className="min-h-screen max-w-screen overflow-hidden bg-gray-900 font-sans text-white">
            <Navigation />
            <main className="pt-24">{children}</main>
            <SectionDecor name="footer">
                <Footer />
            </SectionDecor>
            <ChatPopup />
        </div>
    )
}
