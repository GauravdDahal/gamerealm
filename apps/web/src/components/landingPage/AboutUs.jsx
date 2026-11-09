'use client'
import { useEffect } from 'react'
import LazyLottie from '@/components/common/LazyLottie'
import AOS from 'aos'
import 'aos/dist/aos.css'
import dynamic from 'next/dynamic'
import { useSiteContent } from '@/lib/useSiteContent'
export default function AboutUs() {
    const c = useSiteContent('about')

    return (
        <section id='about' className="min-h-[600px] bg-[#151C28] relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
                    <div
                        className="space-y-6 order-1 sm:order-1 lg:order-1"
                        data-aos="fade-right"
                        data-aos-offset="200">
                        <h1
                            className="text-4xl sm:text-5xl font-godofwar text-white tracking-tight"
                            data-aos="fade-up"
                            data-aos-delay="200">
                            {c.title}
                        </h1>
                        <p
                            className="text-lg text-gray-300 leading-relaxed max-w-xl"
                            data-aos="fade-up"
                            data-aos-delay="300">
                            {c.body}
                        </p>
                        <button
                            className="border border-game-primary hover:bg-blue-950 ease-in-out delay-300 duration-1000 px-8 py-3 rounded-full font-medium transition backdrop-blur-sm"
                            data-aos="fade-up"
                            data-aos-delay="400">
                            {c.button}
                        </button>
                    </div>
                    <div
                        className="relative h-[400px] sm:h-[500px] lg:h-[600px] flex justify-center items-center order-2 sm:order-2 lg:order-2"
                        data-aos="fade-left"
                        data-aos-delay="200">
                        <LazyLottie src="/Lottie/spin.json" className="w-full h-full" />
                    </div>
                </div>
            </div>
        </section>
    )
}
