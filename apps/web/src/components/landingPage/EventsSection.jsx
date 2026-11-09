"use client";
import React from "react";
import { Gift, Send } from "lucide-react";
import { useSiteContent } from '@/lib/useSiteContent'

const fallbackLinks = ['/referral', '/bonuses']

const styles = [
  { gradient: "from-green-400 to-blue-500", btnGradient: "from-green-500 to-blue-600", Icon: Send },
  { gradient: "from-purple-500 to-pink-500", btnGradient: "from-purple-500 to-pink-600", Icon: Gift },
];

export default function EventSection() {
  const c = useSiteContent('events')
  return (
      <section id="tournaments" className="py-16 sm:py-24 bg-gray-900">
          <div className="container mx-auto px-4 text-center">
              <h2
                  className="text-3xl sm:text-4xl lg:text-5xl font-godofwar mb-4"
                  data-aos="fade-down">
                  {c.title}
              </h2>
              <p
                  className="text-gray-400 mb-10 sm:mb-16 max-w-2xl mx-auto"
                  data-aos="fade-down"
                  data-aos-delay="100">
                  {c.intro}
              </p>

              <div className="grid md:grid-cols-2 gap-6 sm:gap-10">
                  {c.cards.map((card, index) => {
                      const st = styles[index % styles.length]
                      return (
                      <div
                          key={index}
                          data-aos="fade-up"
                          data-aos-delay={index * 150}>
                          <div className="relative h-full bg-gray-800 p-6 sm:p-8 rounded-xl border border-gray-700 shadow-md transition-transform duration-300 hover:scale-[1.03]">
                              <div className="flex items-center gap-4 mb-4">
                                  <div
                                      className={`w-14 h-14 shrink-0 flex items-center justify-center rounded-lg bg-gradient-to-r ${st.gradient}`}>
                                      <st.Icon className="w-6 h-6 text-white" />
                                  </div>
                                  <h3 className="text-2xl sm:text-3xl font-aldo text-white text-left">
                                      {card.title}
                                  </h3>
                              </div>

                              <p className="text-gray-400 text-left mb-6">
                                  {card.description}
                              </p>

                              <a
                                  href={card.href || fallbackLinks[index] || '#home'}
                                  className={`inline-block bg-gradient-to-r ${st.btnGradient} text-white px-6 py-3 rounded-full font-medium transition-all hover:opacity-80 shadow-lg`}>
                                  {card.button}
                              </a>
                          </div>
                      </div>
                  )})}
              </div>
          </div>
      </section>
  )
}
