'use client'

import { useSiteContent } from '@/lib/useSiteContent'

export default function PaymentSection() {
    const c = useSiteContent('payments')

    if (c.methods.length === 0) return null

    return (
        <div className="bg-gray-900 p-6 md:py-10 md:px-10 lg:px-20 xl:px-60 rounded-lg">
            <h2 className="text-xl font-medium text-white mb-4">{c.title}</h2>
            <div className="flex flex-wrap gap-4">
                {c.methods.map((method, i) => (
                    <div key={i} className="transition-transform hover:scale-105">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={method.image} alt={method.name} className="h-12 sm:h-16 rounded-md" />
                    </div>
                ))}
            </div>
        </div>
    )
}
