'use client'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { useRef, useState, useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'

export default function Testimonial() {
    const [isMobile, setIsMobile] = useState(false)
    const swiperRef = useRef(null)

    const testimonials = [
        { id: 1, name: 'Kylie Rogers', role: 'Player', rating: 4, comment: 'Adipiscing elit, sed do eiusmod tempor incididunt labore dolore magna aliqua.' },
        { id: 2, name: 'Peter Parker', role: 'Player', rating: 4, comment: 'Adipiscing elit, sed do eiusmod tempor incididunt labore dolore magna aliqua. Adipiscing elit.' },
        { id: 3, name: 'Sam Smith', role: 'Player', rating: 5, comment: 'Adipiscing elit, sed do eiusmod tempor incididunt labore dolore magna aliqua.' },
        { id: 4, name: 'Emma Wilson', role: 'Player', rating: 5, comment: 'Adipiscing elit, sed do eiusmod tempor incididunt labore dolore magna aliqua.' },
        { id: 5, name: 'Emma Wilson', role: 'Player', rating: 5, comment: 'Adipiscing elit, sed do eiusmod tempor incididunt labore dolore magna aliqua.' },
    ]

    useEffect(() => {
        AOS.init({ duration: 1000, once: true }) // Initialize AOS for scrolling effects
        const checkScreenSize = () => setIsMobile(window.innerWidth < 768)
        checkScreenSize()
        window.addEventListener('resize', checkScreenSize)
        return () => window.removeEventListener('resize', checkScreenSize)
    }, [])

    return (
        <section
            className="py-10 sm:py-30 bg-gray-900 relative overflow-hidden"
            data-aos="fade-up">
            <style>
                {`
                    .swiper-pagination-bullet {
                        background-color: #eeeff0;
                        opacity: 1;
                        width: 12px;
                        height: 12px;
                        margin: 0 8px !important;
                    }
                    .swiper-pagination-bullet-active {
                        background-color: #09a347;
                    }
                `}
            </style>

            <div className="absolute top-0 left-0 w-1/3 h-full bg-red-900/20 blur-[150px]" />
            <div className="absolute top-0 right-0 w-1/3 h-full bg-red-900/20 blur-[150px]" />

            <div className="container mx-auto px-4 relative">
                <div className="text-center mb-12" data-aos="fade-up">
                    <h3 className="text-white text-4xl sm:text-9xl md:text-4xl lg:text-6xl font-godofwar">
                        Winners feedback
                    </h3>
                    <h2 className="text-gray-200 text-lg font-medium mt-4">
                        What Our Players Say
                    </h2>
                </div>

                <div className="relative" data-aos="fade-up">
                    {!isMobile && (
                        <>
                            <button
                                onClick={() => swiperRef.current?.slidePrev()}
                                className="absolute left-[-33px] sm:left-[-40px] top-1/2 -translate-y-1/2 z-10 bg-gray-300 p-3 sm:p-4 rounded-full shadow-lg hover:bg-gray-400 transition-all duration-300"
                                aria-label="Previous">
                                <svg
                                    className="w-5 h-5 sm:w-6 sm:h-6 text-black"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 19l-7-7 7-7"
                                    />
                                </svg>
                            </button>

                            <button
                                onClick={() => swiperRef.current?.slideNext()}
                                className="absolute right-[-20px] sm:right-[-56px] top-1/2 -translate-y-1/2 z-10 bg-gray-300 p-3 sm:p-4 rounded-full shadow-lg hover:bg-gray-400 transition-all duration-300"
                                aria-label="Next">
                                <svg
                                    className="w-5 h-5 sm:w-6 sm:h-6 text-black"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5l7 7-7 7"
                                    />
                                </svg>
                            </button>
                        </>
                    )}

                    <Swiper
                        modules={[Navigation, Pagination, Autoplay]}
                        spaceBetween={20}
                        slidesPerView={1}
                        breakpoints={{
                            768: { slidesPerView: 2 },
                            1024: { slidesPerView: 3 },
                        }}
                        pagination={{
                            clickable: true,
                            el: '.swiper-pagination',
                        }}
                        autoplay={{ delay: 3000 }}
                        loop
                        className="pb-16"
                        onSwiper={swiper => (swiperRef.current = swiper)}>
                        {testimonials.map(testimonial => (
                            <SwiperSlide key={testimonial.id}>
                                <div className="bg-[#100f2b] rounded-2xl sm:w-full p-6 sm:p-10 m-4 h-full">
                                    <div className="flex gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <svg
                                                key={i}
                                                className={`w-5 h-5 ${i < testimonial.rating ? 'text-yellow-400' : 'text-gray-600'}`}
                                                fill="currentColor"
                                                viewBox="0 0 20 20">
                                                <path d="M9.049 2.927a1 1 0 011.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>
                                    <p className="text-gray-300 mt-6 mb-8 text-[17px] sm:text-xl leading-relaxed">
                                        {testimonial.comment}
                                    </p>
                                    <div>
                                        <h4 className="text-white text-[20px] sm:text-2xl font-semibold">
                                            {testimonial.name}
                                        </h4>
                                        <p className="text-gray-400">
                                            {testimonial.role}
                                        </p>
                                    </div>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>

                    <div className="swiper-pagination !relative !mt-4" />
                </div>
            </div>
        </section>
    )
}
