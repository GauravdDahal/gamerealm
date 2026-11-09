'use client'
import React from 'react';
import { Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useSiteContent } from '@/lib/useSiteContent'

const icons = { critical: Shield, warning: AlertTriangle, success: CheckCircle2, danger: XCircle };

export default function RulesSection() {
  const c = useSiteContent('rules');
  return (
      <section id="rules" className="py-32 bg-gray-900">
          <div className="container mx-auto px-4">
              <h2
                  data-aos="fade-down"
                  className="text-4xl sm:text-9xl md:text-4xl lg:text-6xl font-godofwar text-center mb-4 text-white">
                  {c.title}
              </h2>
              <p
                  data-aos="fade-down"
                  data-aos-delay="100"
                  className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">
                  {c.intro}
              </p>
              <div className="grid md:grid-cols-2 gap-8">
                  {c.items.map((rule, index) => {
                      const Icon = icons[rule.type] ?? XCircle
                      return (
                      <div
                          key={index}
                          className="gradient-border p-1"
                          data-aos={index % 2 ? "fade-left" : "fade-right"}
                          data-aos-delay={index * 200}>
                          <div className="bg-gray-900 p-8 rounded-lg h-full">
                              <div className="flex items-start gap-4">
                                  <div
                                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                          rule.type === 'critical'
                                              ? 'bg-red-500/10 text-red-500'
                                              : rule.type === 'warning'
                                                ? 'bg-yellow-500/10 text-yellow-500'
                                                : rule.type === 'success'
                                                  ? 'bg-green-500/10 text-green-500'
                                                  : 'bg-gray-500/10 text-gray-500'
                                      }`}>
                                      <Icon className="w-6 h-6" />
                                  </div>
                                  <div>
                                      <h3 className="text-xl font-glance mb-2 text-white">
                                          {rule.title}
                                      </h3>
                                      <p className="text-gray-400">
                                          {rule.description}
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )})}
              </div>
          </div>
      </section>
  )
}
