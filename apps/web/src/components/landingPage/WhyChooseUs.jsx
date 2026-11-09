"use client";
import { useState, useEffect } from "react";
import dynamic from 'next/dynamic';

import LazyLottie from '@/components/common/LazyLottie';
import { useSiteContent } from '@/lib/useSiteContent'

const animations = ['/Lottie/secure.json', '/Lottie/premium.json', '/Lottie/winner.json', '/Lottie/reward.json'];

export default function WhyChooseUs() {
  const c = useSiteContent('why');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

  }, []);

  return (
      <section className="bg-[#151C28] h-auto text-white p-1 sm:p-4 md:p-3  lg:p-30 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-1/4 left-1/4 text-6xl sm:text-5xl">
                  ♠
              </div>
              <div className="absolute top-1/2 right-1/4 text-6xl sm:text-5xl">
                  ♥
              </div>
              <div className="absolute bottom-1/4 left-1/3 text-6xl sm:text-5xl">
                  ♦
              </div>
              <div className="absolute top-1/3 right-1/3 text-6xl sm:text-5xl">
                  ♣
              </div>
          </div>

          <div className="container mx-auto px-4">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div className="w-full space-y-6">
                      <h1
                          data-aos="fade-down"
                          className="text-5xl sm:text-4xl font-glance leading-tight sm:pt-3">
                          {c.title}
                      </h1>
                      <p
                          data-aos="fade-down"
                          data-aos-delay="100"
                          className="text-lg text-gray-300 max-w-xl">
                          {c.intro}
                      </p>
                      <p
                          data-aos="fade-down"
                          data-aos-delay="200"
                          className="text-gray-400">
                          {c.body}
                      </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-10">
                      {isClient &&
                          c.features.map(
                              (
                                  { title, description },
                                  index,
                              ) => {
                                  return (
                                      <div
                                          key={index}
                                          className="space-y-4 last:mb-8"
                                          data-aos="fade-left"
                                          data-aos-delay={index * 200}>
                                          <div className="w-20 h-20 flex  items-center justify-center">
                                              <LazyLottie src={animations[index % animations.length]} className="w-20 h-20" />
                                          </div>
                                          <h3 className="text-xl font-glance">
                                              {title}
                                          </h3>
                                          <p className="text-gray-400">
                                              {description}
                                          </p>
                                      </div>
                                  )
                              },
                          )}
                  </div>
              </div>
          </div>
      </section>
  )
}