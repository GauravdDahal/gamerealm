'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Navigation, Pagination } from 'swiper/modules'
import { ChevronRight } from 'lucide-react'
import 'swiper/css'
import 'swiper/css/navigation'
import { useRouter } from 'next/navigation'
import 'swiper/css/pagination'
import { createClient } from '@/lib/supabase/client'

const fallbackSlides = [
    {
        image: '/assets/images/heroSectionImg/img2.jpg',
        title: 'Discount at pre-registration',
        subtitle: 'Join the ultimate gaming community where legends are born. Compete in tournaments, connect with fellow gamers, and embrace victory.',
    },
    {
        image: '/assets/images/heroSectionImg/img1.jpg',
        title: 'Spin the wheel of your success',
        subtitle: 'Enter tournaments with massive prize pools and prove your worth against the best players worldwide.',
    },
    {
        image: '/assets/images/heroSectionImg/img2.jpg',
        title: 'Play Roulette and Win Big',
        subtitle: 'Connect with millions of players, share your achievements, and make lasting friendships in our vibrant community.',
    },
]

export default function HeroSection() {
    const router = useRouter()
    const [banners, setBanners] = useState([])

    useEffect(() => {
        const fetchBanners = async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('banner_groups')
                .select('id, banners(id, title, description, image_url, created_at)')
                .eq('is_active', true)

            if (error) {
                console.error('Error fetching banners:', error)
                setBanners(fallbackSlides)
                return
            }

            // image_url is expected to be a full URL (e.g. a Supabase Storage
            // public link), not a path on the old Laravel server.
            const flat = (data ?? [])
                .flatMap(group => group.banners ?? [])
                .map(banner => ({
                    ...banner,
                    subtitle: banner.description,
                }))

            setBanners(flat.length > 0 ? flat : fallbackSlides)
        }

        fetchBanners()
    }, [])

    const handleJoinClick = () => {
        router.push('/users')
    }

    return (
        <section
            id="home"
            className="relative h-screen md:h-[90vh] flex flex-col overflow-hidden bg-gray-900">
            <div className="relative h-full">
                <Swiper
                    modules={[Autoplay, Navigation, Pagination]}
                    spaceBetween={0}
                    slidesPerView={1}
                    autoplay={{ delay: 7000, disableOnInteraction: false }}
                    speed={1200}
                    navigation={{
                        nextEl: '.swiper-button-next',
                        prevEl: '.swiper-button-prev',
                    }}
                    pagination={{ 
                        clickable: true,
                        el: '.swiper-pagination',
                        type: 'bullets',
                    }}
                    loop={banners.length > 1}
                    className="h-full">
                    {banners.map((slide, index) => (
                        <SwiperSlide key={index}>
                            <div className="relative w-full h-full">
                                <div className="absolute inset-0">
                                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 to-gray-900/50 z-10" />
                                    <Image
                                        src={slide.image_url || slide.image || '/assets/images/placeholder.jpg'}
                                        alt={slide.title || 'Slide image'}
                                        fill={true}
                                        priority={index === 0} // Only prioritize first image
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 100vw"
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>
                                <div className="relative z-20 h-full container mx-auto px-4 sm:px-6 py-6 flex items-center">
                                    <div className="max-w-3xl">
                                        <h1
                                            className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-aldo leading-tight mb-3 sm:mb-4 md:mb-6"
                                            data-aos="fade-up">
                                            {slide.title}
                                        </h1>
                                        <p
                                            className="text-white text-sm sm:text-base md:text-lg mb-4 sm:mb-6 md:mb-8 max-w-md sm:max-w-xl"
                                            data-aos="fade-up"
                                            data-aos-delay="500">
                                            {slide.description || slide.subtitle}
                                        </p>
                                        <div
                                            className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4"
                                            data-aos="fade-up"
                                            data-aos-delay="700">
                                            <button
                                                onClick={handleJoinClick}
                                                className="text-white gradient-border bg-gray-900/50 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium transition-transform hover:scale-105 flex items-center justify-center gap-1 sm:gap-2">
                                                Join Now{' '}
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                            <a
                                                href="#about"
                                                className="text-white border border-game-primary hover:bg-game-primary/10 px-4 sm:px-6 py-2 sm:py-3 rounded-full text-sm sm:text-base font-medium transition backdrop-blur-sm flex items-center justify-center">
                                                Learn More
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>

                {/* Custom pagination for better mobile visibility */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 swiper-pagination !flex !justify-center !gap-1"></div>
                
                {/* Navigation buttons with better mobile handling */}
                <div className="swiper-button-next !hidden sm:!flex !text-white !w-10 !h-10 after:!text-sm md:after:!text-base"></div>
                <div className="swiper-button-prev !hidden sm:!flex !text-white !w-10 !h-10 after:!text-sm md:after:!text-base"></div>
            </div>
        </section>
    )
}