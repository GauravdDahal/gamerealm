'use client'
import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useSiteContent } from '@/lib/useSiteContent'


const AccordionItem = ({
    question,
    answer,
    isOpen,
    onToggle,
    aos,
    aosDelay,
}) => {
    return (
        <div
            className="hover:gradient-border h-fit rounded-lg overflow-hidden bg-white/5"
            data-aos={aos}
            data-aos-delay={aosDelay}>
            <button
                className="w-full px-6 py-4 text-left flex justify-between items-center transition-all duration-300 ease-in-out"
                onClick={onToggle}
                aria-expanded={isOpen}>
                <span className="text-lg font-semibold">{question}</span>
                {isOpen ? (
                    <ChevronUp className="w-6 h-6 text-[white] transition-transform duration-300" />
                ) : (
                    <ChevronDown className="w-6 h-6 text-[white] transition-transform duration-300" />
                )}
            </button>
            <div
                className={`transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                }`}>
                <div className="px-6 py-4">
                    <p className="text-gray-300">{answer}</p>
                </div>
            </div>
        </div>
    )
}

export default function FAQSection() {
    const c = useSiteContent('faq')
    const [openIndex, setOpenIndex] = useState(null)

    const handleToggle = index => {
        setOpenIndex(openIndex === index ? null : index)
    }

    return (
        <div
            className="bg-white/5 text-white py-[100px] px-4"
            style={{
                backgroundImage: `url('${c.background || '/assets/images/bgfaq.png'}')`,
                backgroundSize: 'cover !important',
            }}>
            <div className="max-w-7xl mx-auto">
                <h1
                    data-aos="fade-down"
                    className="text-4xl sm:text-9xl md:text-4xl lg:text-6xl font-godofwar text-center mb-4">
                    {c.title}
                </h1>
                <p
                    data-aos="fade-down"
                    data-aos-delay="100"
                    className="text-center text-gray-300 mb-12 max-w-2xl mx-auto">
                    {c.intro}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {c.items.map((faq, index) => (
                        <AccordionItem
                            key={index}
                            question={faq.question}
                            answer={faq.answer}
                            isOpen={openIndex === index}
                            onToggle={() => handleToggle(index)}
                            aos={index % 2 ? "fade-left" : "fade-right"}
                            aosDelay={index * 100}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
