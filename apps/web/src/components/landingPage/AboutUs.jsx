'use client'
import { useEffect } from 'react'
import spinAnimation from '/public/Lottie/spin.json'
import AOS from 'aos'
import 'aos/dist/aos.css'
import dynamic from 'next/dynamic'
const Lottie = dynamic(() => import('lottie-react'), { ssr: false })
export default function AboutUs() {
    useEffect(() => {
        AOS.refresh()
        AOS.init({
            duration: 1000,
            once: false,
            easing: 'ease-out',
            mirror: true,
        })

        return () => {
            AOS.refresh()
        }
    }, [])

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
                            About US
                        </h1>
                        <p
                            className="text-lg text-gray-300 leading-relaxed max-w-xl"
                            data-aos="fade-up"
                            data-aos-delay="300">
                            A casino is a facility for certain types of
                            gambling. Casinos are often built near or combined
                            with hotels, resorts, restaurants, retail shopping,
                            cruise ships, and other tourist attractions. Lorem
                            ipsum dolor sit amet consectetur adipisicing elit.
                            Lorem ipsum, dolor sit amet consectetur adipisicing
                            elit. Voluptatum harum odit facere culpa eaque,
                            accusantium ullam repellat distinctio quo impedit.
                        </p>
                        <button
                            className="border border-game-primary hover:bg-blue-950 ease-in-out delay-300 duration-1000 px-8 py-3 rounded-full font-medium transition backdrop-blur-sm"
                            data-aos="fade-up"
                            data-aos-delay="400">
                            Learn More
                        </button>
                    </div>
                    <div
                        className="relative h-[400px] sm:h-[500px] lg:h-[600px] flex justify-center items-center order-2 sm:order-2 lg:order-2"
                        data-aos="fade-left"
                        data-aos-delay="200">
                        <Lottie
                            animationData={spinAnimation}
                            loop={true}
                            className="w-full h-full"
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}
