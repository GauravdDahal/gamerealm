'use client'
import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useSiteContent } from '@/lib/useSiteContent'

const AccordionItem = ({ question, answer, isOpen, onToggle }) => (
    <div className={`h-fit overflow-hidden rounded-xl border bg-surface transition-colors ${isOpen ? 'border-accent/60' : 'border-line'}`}>
        <button className="flex min-h-[56px] w-full items-center justify-between gap-4 px-6 py-4 text-left" onClick={onToggle} aria-expanded={isOpen}>
            <span className="text-base font-bold text-ink md:text-lg">{question}</span>
            <ChevronDown className={`h-[18px] w-[18px] shrink-0 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && <p className="px-6 pb-6 text-muted">{answer}</p>}
    </div>
)

export default function FAQSection() {
    const c = useSiteContent('faq')
    const [openIndex, setOpenIndex] = useState(null)

    return (
        <div
            className="section relative bg-gray-900"
            style={{
                backgroundImage: `url('${c.background || '/assets/images/bgfaq.png'}')`,
                backgroundSize: 'cover',
            }}>
            {/* Keep the admin-chosen background as a quiet texture behind the text. */}
            <div className="absolute inset-0 bg-night/90" aria-hidden="true" />
            <div className="wrap relative">
                <div data-aos="fade">
                    <h2 className="section-title">{c.title}</h2>
                    <p className="section-intro">{c.intro}</p>
                </div>
                <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {c.items.map((faq, index) => (
                        <AccordionItem
                            key={index}
                            question={faq.question}
                            answer={faq.answer}
                            isOpen={openIndex === index}
                            onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
