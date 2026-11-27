'use client'

import { useSiteContent } from '@/lib/useSiteContent'

export default function PaymentSection() {
    const c = useSiteContent('payments')

    if (c.methods.length === 0) return null

    return (
        <div className="border-t border-line bg-gray-900 py-12">
            <div className="wrap">
                <h2 className="text-sm font-bold text-muted">{c.title}</h2>
                <ul className="mt-4 flex flex-wrap gap-4">
                    {c.methods.map((method, i) => (
                        <li key={i}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={method.image} alt={method.name} width={96} height={64} loading="lazy" className="h-12 w-auto rounded-lg sm:h-16" />
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
