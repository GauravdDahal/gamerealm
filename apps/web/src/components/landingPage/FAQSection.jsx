'use client'
import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const faqs = [
    {
        question: 'How do I create a Casino Account?',
        answer: 'Creating a casino account is simple and secure. Visit our registration page, fill in your personal details, verify your email address, and complete the identity verification process.',
        aos: 'fade-right',
    },
    {
        question: 'What payment methods are accepted?',
        answer: 'We accept credit/debit cards, e-wallets, bank transfers, and cryptocurrency. All transactions are processed securely.',
        aos: 'fade-left',
    },
    {
        question: 'How can I ensure responsible gaming?',
        answer: 'We promote responsible gaming through deposit limits, self-exclusion options, and reality checks.',
        aos: 'fade-right',
    },
    {
        question: 'What games are available?',
        answer: 'Our platform offers slots, table games, live dealer games, and specialty games from top providers.',
        aos: 'fade-left',
    },
    {
        question: 'How do I withdraw my winnings?',
        answer: 'Navigate to the cashier section, select your withdrawal method, and follow verification steps.',
        aos: 'fade-right',
    },
    {
        question: 'Is my personal information secure?',
        answer: 'Yes, we use state-of-the-art encryption and security measures to protect your personal information.',
        aos: 'fade-left',
    },
    {
        question: 'What are the VIP benefits?',
        answer: 'Our VIP program offers exclusive bonuses, personal account managers, higher betting limits, and special event invitations based on your loyalty level.',
        aos: 'fade-right',
    },
    {
        question: 'How can I contact customer support?',
        answer: 'Our 24/7 customer support team is available via live chat, email, and phone. We aim to respond to all inquiries within minutes.',
        aos: 'fade-left',
    },
]

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
    const [openIndex, setOpenIndex] = useState(null)

    const handleToggle = index => {
        setOpenIndex(openIndex === index ? null : index)
    }

    return (
        <div
            className="bg-white/5 text-white py-[100px] px-4"
            style={{
                backgroundImage: "url('/assets/images/bgfaq.png')",
                backgroundSize: 'cover !important',
            }}>
            <div className="max-w-7xl mx-auto">
                <h1
                    data-aos="fade-down"
                    className="text-4xl sm:text-9xl md:text-4xl lg:text-6xl font-godofwar text-center mb-4">
                    Frequently Asked Questions
                </h1>
                <p
                    data-aos="fade-down"
                    data-aos-delay="100"
                    className="text-center text-gray-300 mb-12 max-w-2xl mx-auto">
                    A casino is a facility for certain types of gambling.
                    Casinos are often built combined with hotels and resorts.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {faqs.map((faq, index) => (
                        <AccordionItem
                            key={index}
                            question={faq.question}
                            answer={faq.answer}
                            isOpen={openIndex === index}
                            onToggle={() => handleToggle(index)}
                            aos={faq.aos}
                            aosDelay={index * 100}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
