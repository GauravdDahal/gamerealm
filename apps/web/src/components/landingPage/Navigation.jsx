'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Dice6, Menu, X, LogOut, ShieldCheck, Download, Share } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth'
import UserAvatar from '@/components/common/UserAvatar'
import { useSiteContent } from '@/lib/useSiteContent'
import { useInstallApp } from '@/lib/installApp'
import { safeUrl } from '@/lib/safeUrl'

// eslint-disable-next-line no-unused-vars
export default function Navigation({ isScrolled }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const { user, logout } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const active = href => href === pathname
    const brand = useSiteContent('brand')
    const app = useInstallApp()
    const [iosHint, setIosHint] = useState(false)
    const profileRef = useRef(null)

    useEffect(() => {
        setIsMobileMenuOpen(false)
        setIsProfileOpen(false)
    }, [pathname])

    // Close the profile menu when clicking anywhere else.
    useEffect(() => {
        if (!isProfileOpen) return
        const close = e => {
            if (profileRef.current && !profileRef.current.contains(e.target)) setIsProfileOpen(false)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [isProfileOpen])

    const isAdmin = !!(user?.is_admin || user?.is_superadmin)
    const [first, ...rest] = (brand.name || '').trim().split(/\s+/)

    return (
        <nav className="fixed left-0 right-0 top-0 z-50 w-full border-b border-line bg-night/95 backdrop-blur">
            <div className="wrap">
                <div className="flex h-16 items-center justify-between gap-4 sm:h-20">
                    <Link href="/" aria-label={`${brand.name} home`} className="flex min-w-0 items-center gap-2">
                        {brand.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={brand.logo} alt="" className="ts-logo-mark h-9 w-9 shrink-0 object-contain min-[360px]:h-10 min-[360px]:w-10 sm:h-12 sm:w-12" />
                        ) : (
                            <Dice6 className="h-8 w-8 text-accent" />
                        )}
                        <span className="ts-wordmark whitespace-nowrap text-[clamp(15px,5.2vw,22px)] sm:text-3xl" aria-label={brand.name}>
                            <span className="ts-word-1">{first}</span>
                            {rest.length > 0 && <span className="ts-word-2"> {rest.join(' ')}</span>}
                        </span>
                    </Link>

                    <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 xl:flex">
                        {brand.nav.map((link, i) => (
                            <Link
                                key={i}
                                href={safeUrl(link.href, '/')}
                                aria-current={active(link.href) ? 'page' : undefined}
                                className={`flex h-10 items-center rounded-lg px-4 text-base font-bold transition-colors hover:text-accent ${
                                    active(link.href) ? 'text-accent' : 'text-ink'
                                }`}>
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    <div className="ml-auto flex shrink-0 items-center gap-1 pl-2 min-[360px]:gap-2 sm:gap-3">
                        {(app.canInstall || app.showIosHint) && (
                            <div className="relative">
                                <button
                                    onClick={() => (app.canInstall ? app.install() : setIosHint(v => !v))}
                                    aria-label="Get the app"
                                    className="btn btn-secondary w-10 px-0 sm:w-auto sm:px-4">
                                    <Download />
                                    <span className="hidden sm:inline">Get app</span>
                                </button>
                                {iosHint && (
                                    <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-line bg-surface p-4 text-sm text-muted shadow-xl">
                                        Tap <Share className="inline h-4 w-4 align-text-bottom" /> then &ldquo;Add to Home Screen&rdquo;.
                                    </div>
                                )}
                            </div>
                        )}
                        {isAdmin && (
                            <Link href="/admin" aria-label="Admin panel" className="btn btn-secondary w-10 px-0 sm:w-auto sm:px-4 xl:hidden">
                                <ShieldCheck />
                                <span className="hidden sm:inline">Admin</span>
                            </Link>
                        )}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={isMobileMenuOpen}
                            className="icon-btn text-ink xl:hidden">
                            {isMobileMenuOpen ? <X /> : <Menu />}
                        </button>

                        {user ? (
                            <div className="relative hidden md:block" ref={profileRef}>
                                <button
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    aria-label="Account menu"
                                    aria-expanded={isProfileOpen}
                                    className="relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-surface2">
                                    <UserAvatar user={user} size={32} />
                                </button>
                                {isProfileOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface p-2 shadow-xl">
                                        <div className="flex items-center gap-3 px-2 py-2">
                                            <UserAvatar user={user} size={32} />
                                            <p className="min-w-0 truncate text-sm font-bold text-ink">{user?.name}</p>
                                        </div>
                                        <div className="my-1 h-px bg-line" />
                                        {isAdmin && (
                                            <button
                                                onClick={() => {
                                                    setIsProfileOpen(false)
                                                    router.push('/admin')
                                                }}
                                                className="flex h-10 w-full items-center gap-3 rounded-lg px-2 text-sm text-ink transition-colors hover:bg-surface2">
                                                <ShieldCheck className="h-4 w-4 text-muted" /> Admin panel
                                            </button>
                                        )}
                                        <button
                                            onClick={logout}
                                            className="flex h-10 w-full items-center gap-3 rounded-lg px-2 text-sm text-ink transition-colors hover:bg-surface2">
                                            <LogOut className="h-4 w-4 text-muted" /> Log out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button onClick={() => router.push('/users')} className="btn btn-primary hidden md:inline-flex">
                                {brand.join_label}
                            </button>
                        )}
                    </div>
                </div>

                {isMobileMenuOpen && (
                    <div className="mb-4 rounded-2xl border border-line bg-surface p-2 xl:hidden">
                        {user && (
                            <div className="flex items-center gap-3 px-2 py-2">
                                <UserAvatar user={user} size={32} />
                                <p className="min-w-0 truncate text-sm font-bold text-ink">{user?.name}</p>
                            </div>
                        )}
                        <div className="flex flex-col">
                            {brand.nav.map((link, i) => (
                                <Link
                                    key={i}
                                    href={safeUrl(link.href, '/')}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    aria-current={active(link.href) ? 'page' : undefined}
                                    className={`flex h-12 items-center rounded-lg px-2 text-base font-bold transition-colors hover:bg-surface2 ${
                                        active(link.href) ? 'text-accent' : 'text-ink'
                                    }`}>
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                        <div className="mt-2 flex flex-col gap-2 border-t border-line p-2 pt-4">
                            {user ? (
                                <>
                                    {isAdmin && (
                                        <Link href="/admin" className="btn btn-secondary btn-block">
                                            <ShieldCheck /> Admin panel
                                        </Link>
                                    )}
                                    <button onClick={logout} className="btn btn-secondary btn-block">
                                        <LogOut /> Log out
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => router.push('/users')} className="btn btn-primary btn-block">
                                    {brand.join_label}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    )
}
