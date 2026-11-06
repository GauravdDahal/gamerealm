'use client'

import React, { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import Navigation from '@/components/landingPage/Navigation'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import Footer from '@/components/landingPage/Footer'
import EventsSection from '@/components/landingPage/EventsSection'
import RulesSection from '@/components/landingPage/RulesSection'
import WhyChooseUs from '@/components/landingPage/WhyChooseUs'
import FAQSection from '@/components/landingPage/FAQSection'
import MarqueeText from '@/components/landingPage/MarqueeText'
import AboutUs from '@/components/landingPage/AboutUs'
import Testimonial from '@/components/landingPage/Testomonials'
import CatSection from '@/components/landingPage/CatSection'
import PaymentSection from '@/components/landingPage/PaymentSection'
const HeroSection = dynamic(
    () => import('@/components/landingPage/HeroSection'),
    { loading: () => <LoadingSpinner />, ssr: false },
)
const GamesSection = dynamic(
    () => import('@/components/landingPage/GamesSection'),
    { loading: () => <LoadingSpinner />, ssr: false },
)
const ChatPopup = dynamic(() => import('@/components/landingPage/ChatPopup'), {
    loading: () => <LoadingSpinner />,
    ssr: false,
})

function Home() {
    const [isScrolled, setIsScrolled] = useState(false)
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <div className="min-h-screen max-w-screen overflow-hidden bg-gray-900 text-white font-sans">
            <Navigation isScrolled={isScrolled} />
            <Suspense fallback={<LoadingSpinner />}>
                <HeroSection />
                <EventsSection />
            </Suspense>
            <GamesSection />
            <MarqueeText />
            <AboutUs />
            <CatSection />
            <WhyChooseUs />
            <RulesSection />
            <FAQSection />
            <Testimonial />
            <PaymentSection />
            <Footer />
            <ChatPopup />
        </div>
    )
}

export default Home
