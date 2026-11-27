'use client'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { useSiteContent } from '@/lib/useSiteContent'

export default function Testimonial() {
    const [isMobile, setIsMobile] = useState(false)
    const swiperRef = useRef(null)

    const c = useSiteContent('testimonials')
    const testimonials = c.items.map((t, i) => ({ ...t, id: i }))

    useEffect(() => {
        const checkScreenSize = () => setIsMobile(window.innerWidth < 768)
        checkScreenSize()
        window.addEventListener('resize', checkScreenSize)
        return () => window.removeEventListener('resize', checkScreenSize)
    }, [])

    if (testimonials.length === 0) return null

    return (
        <section className="section relative overflow-hidden bg-gray-900" data-aos="fade">
            <style>
                {`
                    .swiper-pagination-bullet {
                        background-color: rgb(var(--c-muted));
                        opacity: 1;
                        width: 8px;
                        height: 8px;
                        margin: 0 4px !important;
                    }
                    .swiper-pagination-bullet-active {
                        background-color: rgb(var(--c-accent));
                    }
                `}
            </style>

            <div className="wrap relative">
                <div>
                    <h2 className="section-title">{c.title}</h2>
                    {c.subtitle && <p className="section-intro">{c.subtitle}</p>}
                </div>

                <div className="relative mt-12">
                    {!isMobile && (
                        <div className="absolute -top-20 right-0 flex gap-2">
                            <button onClick={() => swiperRef.current?.slidePrev()} className="icon-btn border border-line" aria-label="Previous">
                                <ChevronLeft />
                            </button>
                            <button onClick={() => swiperRef.current?.slideNext()} className="icon-btn border border-line" aria-label="Next">
                                <ChevronRight />
                            </button>
                        </div>
                    )}

                    <Swiper
                        modules={[Navigation, Pagination, Autoplay]}
                        spaceBetween={16}
                        slidesPerView={1}
                        breakpoints={{
                            768: { slidesPerView: 2, spaceBetween: 24 },
                            1024: { slidesPerView: 3, spaceBetween: 24 },
                        }}
                        pagination={{ clickable: true, el: '.swiper-pagination' }}
                        autoplay={{ delay: 5000 }}
                        loop
                        onSwiper={swiper => (swiperRef.current = swiper)}>
                        {testimonials.map(testimonial => (
                            <SwiperSlide key={testimonial.id} className="!h-auto">
                                <figure className="card flex h-full flex-col">
                                    <div className="flex gap-1" aria-label={`${testimonial.rating} out of 5`}>
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                aria-hidden="true"
                                                className={`h-4 w-4 ${i < testimonial.rating ? 'fill-current text-accent' : 'text-line'}`}
                                            />
                                        ))}
                                    </div>
                                    <blockquote className="mt-4 flex-1 text-lg leading-relaxed text-ink">{testimonial.comment}</blockquote>
                                    <figcaption className="mt-6">
                                        <p className="font-bold text-ink">{testimonial.name}</p>
                                        {testimonial.role && <p className="text-sm text-muted">{testimonial.role}</p>}
                                    </figcaption>
                                </figure>
                            </SwiperSlide>
                        ))}
                    </Swiper>

                    <div className="swiper-pagination !relative !mt-6" />
                </div>
            </div>
        </section>
    )
}
