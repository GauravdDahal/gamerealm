"use client";
import { Gamepad2, Gift, MessageCircle, Users } from 'lucide-react';
import { useSiteContent } from '@/lib/useSiteContent'

// One line icon per feature, in the same order as the default features.
const icons = [MessageCircle, Gamepad2, Gift, Users];

export default function WhyChooseUs() {
  const c = useSiteContent('why');

  return (
      <section className="section relative overflow-hidden bg-surface">
          <div className="wrap grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
              <div data-aos="fade">
                  <h2 className="section-title">{c.title}</h2>
                  <p className="section-intro">{c.intro}</p>
                  <p className="mt-4 max-w-xl text-muted">{c.body}</p>
              </div>

              <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
                  {c.features.map(({ title, description }, index) => {
                      const Icon = icons[index % icons.length];
                      return (
                          <li key={index} data-aos="fade" className="border-t border-line pt-6">
                              <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
                                  <Icon className="h-[18px] w-[18px] text-accent" aria-hidden="true" />
                                  {title}
                              </h3>
                              <p className="mt-2 text-muted">{description}</p>
                          </li>
                      )
                  })}
              </ul>
          </div>
      </section>
  )
}
