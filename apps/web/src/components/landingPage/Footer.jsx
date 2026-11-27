'use client'
import React from 'react'
import {
    Gamepad2,
    Twitch,
    Youtube,
    Twitter,
    Disc as Discord,
} from 'lucide-react'
import Link from 'next/link'
import { useSiteContent } from '@/lib/useSiteContent'
import ContactLine from '@/components/common/ContactLine'
import { safeUrl } from '@/lib/safeUrl'

const socialIcons = {
    twitch: Twitch,
    youtube: Youtube,
    twitter: Twitter,
    discord: Discord,
}

const socialNames = {
    twitch: 'Twitch',
    youtube: 'YouTube',
    twitter: 'Twitter',
    discord: 'Discord',
}

export default function Footer() {
    const c = useSiteContent('footer')
    const brand = useSiteContent('brand')

    // Only show icons that have a link.
    const social = c.social.filter(s => s.url && socialIcons[s.platform])

    return (
        <footer className="border-t border-line bg-gray-900 py-16">
            <div className="wrap">
                <div className="grid gap-12 md:grid-cols-4">
                    <div>
                        <Link href="/" aria-label={`${brand.name} home`} className="mb-4 flex w-fit items-center gap-2">
                            {brand.logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={brand.logo} alt="" className="w-11 h-11 object-contain" />
                            ) : (
                                <Gamepad2 className="h-8 w-8 text-accent" />
                            )}
                            {(() => {
                                const [first, ...rest] = (brand.name || '').trim().split(/\s+/)
                                return (
                                    <span className="ts-wordmark whitespace-nowrap text-[clamp(20px,3vw,26px)]" aria-label={brand.name}>
                                        <span className="ts-word-1">{first}</span>
                                        {rest.length > 0 && <span className="ts-word-2"> {rest.join(' ')}</span>}
                                    </span>
                                )
                            })()}
                        </Link>
                        <p className="mb-6 max-w-xs text-muted">{c.description}</p>
                        <div className="flex gap-2">
                            {social.map((s, index) => {
                                const Icon = socialIcons[s.platform]
                                return (
                                    <a
                                        key={index}
                                        href={safeUrl(s.url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={socialNames[s.platform]}
                                        className="icon-btn border border-line">
                                        <Icon />
                                    </a>
                                )
                            })}
                        </div>
                    </div>

                    {c.columns.map((column, index) => (
                        <div key={index}>
                            <h2 className="mb-2 text-sm font-bold text-ink">{column.title}</h2>
                            <ul className="space-y-1">
                                {column.links.map((link, i) => (
                                    <li key={i}>
                                        {link.url ? (
                                            <Link
                                                href={safeUrl(link.url)}
                                                className="inline-flex min-h-[40px] items-center text-muted transition-colors hover:text-accent">
                                                {link.label}
                                            </Link>
                                        ) : (
                                            <span className="text-muted">{link.label}</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    {c.contact.length > 0 && (
                        <div>
                            <h2 className="mb-2 text-sm font-bold text-ink">{c.contact_title}</h2>
                            <ul className="space-y-1">
                                {c.contact.map((line, i) => (
                                    <li key={i}>
                                        <ContactLine text={line.text} className="text-muted" />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="mt-12 border-t border-line pt-8 text-center text-sm text-muted">
                    <p>
                        &copy; {new Date().getFullYear()} {c.copyright_name}. All rights reserved.
                    </p>
                    <p className="decor-credit mt-2 text-xs">
                        Seasonal artwork:{' '}
                        <a href="https://www.vecteezy.com" target="_blank" rel="noopener noreferrer" className="underline">
                            Vecteezy.com
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    )
}
