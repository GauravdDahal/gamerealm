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
        <footer className="bg-gray-900 border-t border-gray-800 py-20">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-4 gap-12">
                    <div>
                        <Link href="/" aria-label={`${brand.name} home`} className="mb-6 flex w-fit items-center gap-2">
                            {brand.logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={brand.logo} alt={brand.name} className="w-8 h-8 object-contain" />
                            ) : (
                                <Gamepad2 className="w-8 h-8 text-secondary animate-float" />
                            )}
                            <span className="text-xl  font-bold bg-clip-text bg-gradient-to-r from-secondary via-secondary2 to-hot text-transparent">
                                {brand.name}
                            </span>
                        </Link>
                        <p className="text-gray-400 mb-6">{c.description}</p>
                        <div className="flex gap-4">
                            {social.map((s, index) => {
                                const Icon = socialIcons[s.platform]
                                return (
                                    <a
                                        key={index}
                                        href={s.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={socialNames[s.platform]}
                                        className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-secondary delay-200 ease-in-out duration-150 transition-colors">
                                        <Icon className="w-5 h-5" />
                                    </a>
                                )
                            })}
                        </div>
                    </div>

                    {c.columns.map((column, index) => (
                        <div key={index}>
                            <h4 className="text-lg font-bold mb-6 text-white">{column.title}</h4>
                            <ul className="space-y-4">
                                {column.links.map((link, i) => (
                                    <li key={i}>
                                        {link.url ? (
                                            <Link
                                                href={link.url}
                                                className="text-gray-400 hover:text-accent transition-colors">
                                                {link.label}
                                            </Link>
                                        ) : (
                                            <span className="text-gray-400">{link.label}</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    {c.contact.length > 0 && (
                        <div>
                            <h4 className="text-lg font-bold mb-6 text-white">{c.contact_title}</h4>
                            <ul className="space-y-4">
                                {c.contact.map((line, i) => (
                                    <li key={i}>
                                        <ContactLine text={line.text} className="text-gray-400" />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="border-t border-gray-800 mt-16 pt-8 text-center text-gray-600 dark:text-gray-400">
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
