'use client'
import React from 'react';
import { Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useSiteContent } from '@/lib/useSiteContent'

const icons = { critical: Shield, warning: AlertTriangle, success: CheckCircle2, danger: XCircle };
// Status colour only on the icon; the card itself stays neutral.
const tones = { critical: 'text-red-400', warning: 'text-amber-400', success: 'text-emerald-400', danger: 'text-red-400' };

export default function RulesSection() {
  const c = useSiteContent('rules');
  return (
      <section id="rules" className="section bg-gray-900">
          <div className="wrap">
              <div data-aos="fade">
                  <h2 className="section-title">{c.title}</h2>
                  <p className="section-intro">{c.intro}</p>
              </div>
              <ol className="mt-12 grid gap-4 md:grid-cols-2 md:gap-6">
                  {c.items.map((rule, index) => {
                      const Icon = icons[rule.type] ?? XCircle
                      return (
                          <li key={index} data-aos="fade" className="card flex gap-4">
                              <Icon className={`mt-1 h-[18px] w-[18px] shrink-0 ${tones[rule.type] ?? 'text-muted'}`} aria-hidden="true" />
                              <div>
                                  <h3 className="text-lg font-bold text-ink">{rule.title}</h3>
                                  <p className="mt-2 text-muted">{rule.description}</p>
                              </div>
                          </li>
                      )
                  })}
              </ol>
          </div>
      </section>
  )
}
