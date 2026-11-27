"use client";
import React from "react";
import { Gift, Send } from "lucide-react";
import { useSiteContent } from '@/lib/useSiteContent'
import { safeUrl } from '@/lib/safeUrl'

const fallbackLinks = ['/referral', '/bonuses']
const icons = [Send, Gift]

export default function EventSection() {
  const c = useSiteContent('events')
  return (
      <section id="tournaments" className="section bg-gray-900">
          <div className="wrap">
              <div data-aos="fade">
                  <h2 className="section-title">{c.title}</h2>
                  <p className="section-intro">{c.intro}</p>
              </div>

              {/* First card wide, second narrow: not a row of identical boxes. */}
              <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
                  {c.cards.map((card, index) => {
                      const Icon = icons[index % icons.length]
                      return (
                          <div
                              key={index}
                              data-aos="fade"
                              className={`card flex flex-col ${index === 0 ? 'md:col-span-2' : ''}`}>
                              <h3 className="flex items-center gap-2 text-xl font-bold text-ink">
                                  <Icon className="h-[18px] w-[18px] text-accent" aria-hidden="true" />
                                  {card.title}
                              </h3>
                              <p className="mt-2 max-w-xl flex-1 text-muted">{card.description}</p>
                              <div className="mt-6">
                                  <a
                                      href={safeUrl(card.href || fallbackLinks[index], '#home')}
                                      className={`btn ${index === 0 ? 'btn-primary' : 'btn-secondary'}`}>
                                      {card.button}
                                  </a>
                              </div>
                          </div>
                      )
                  })}
              </div>
          </div>
      </section>
  )
}
