'use client'

import React, { useState, useEffect } from 'react'
import {
    Dice6,
    Menu,
    X,
    LogOut,
    CreditCard,
    ShieldCheck,
    Download,
    Share,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth'
import Image from 'next/image'
import UserAvatar from '@/components/common/UserAvatar'
import { useSiteContent } from '@/lib/useSiteContent'
import { useInstallApp } from '@/lib/installApp'

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

    useEffect(() => {
        setIsMobileMenuOpen(false)
        setIsProfileOpen(false)
    }, [pathname])

    const isAdmin = !!(user?.is_admin || user?.is_superadmin)

    const handleJoinClick = () => {
        router.push('/users')
    }

    const handleLogout = () => {
        logout()
    }

    return (
        <nav
            className={'fixed top-0 left-0 right-0 z-50 transition-all bg-gradient-to-r from-night via-surface to-night border-b border-line/70 backdrop-blur duration-300 w-full px-4 py-5'}>
            <div className="max-w-8xl mx-auto px-4">
                <div className="flex items-center justify-between w-full">
                    {/* Logo - Far Left */}
                    <Link href="/" aria-label={`${brand.name} home`} className="flex items-center gap-2">
                        {brand.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={brand.logo} alt={brand.name} className="w-9 h-9 object-contain" />
                        ) : (
                            <Dice6 className="w-9 h-9 text-accent animate-float" />
                        )}
                        <span className="text-base sm:text-xl whitespace-nowrap bg-clip-text font-FontMarquee bg-gradient-to-r font-test from-accent2 via-accent to-accent2 text-transparent">
                            {brand.name}
                        </span>
                    </Link>

                    {/* Center Navigation Links */}
                    <div className="hidden md:flex items-center gap-9 my-1 absolute left-1/2 transform -translate-x-1/2">
                        {brand.nav.map((link, i) => (
                            <Link
                                key={i}
                                href={link.href}
                                className={`text-[20px] font-aldo transition-transform hover:scale-125 duration-200 hover:text-accent ${active(link.href) ? 'text-accent' : 'text-ink'}`}>
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Profile/Join Button - Far Right */}
                    <div className="flex items-center gap-2 sm:gap-4 ml-auto">
                        {(app.canInstall || app.showIosHint) && (
                            <div className="relative">
                                <button
                                    onClick={() => (app.canInstall ? app.install() : setIosHint(v => !v))}
                                    aria-label="Get the app"
                                    className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-accent2 bg-accent px-2.5 py-1 font-aldo text-sm text-accent-ink transition-transform hover:scale-105 hover:bg-accent2">
                                    <Download className="h-4 w-4" />
                                    <span>Get app</span>
                                </button>
                                {iosHint && (
                                    <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-accent/40 bg-night p-3 text-xs text-muted shadow-xl">
                                        Tap <Share className="inline h-3.5 w-3.5 align-text-bottom" /> then
                                        &ldquo;Add to Home Screen&rdquo;.
                                    </div>
                                )}
                            </div>
                        )}
                        {isAdmin && (
                            <Link
                                href="/admin"
                                aria-label="Admin panel"
                                className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-accent2 bg-accent px-2.5 py-1 font-aldo text-sm text-accent-ink transition-transform hover:scale-105 hover:bg-accent2 md:hidden">
                                <ShieldCheck className="h-4 w-4" />
                                <span>Admin</span>
                            </Link>
                        )}
                        <div className="md:hidden">
                            <button
                                onClick={() =>
                                    setIsMobileMenuOpen(!isMobileMenuOpen)
                                }
                                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                                aria-expanded={isMobileMenuOpen}
                                className="text-white p-2">
                                {isMobileMenuOpen ? <X /> : <Menu />}
                            </button>
                        </div>

                        {user ? (
                            <div className="relative hidden md:block">
                                <div>
                                    <button
                                        onClick={() =>
                                            setIsProfileOpen(!isProfileOpen)
                                        }
                                        className="flex items-center space-x-2">
                                        <UserAvatar user={user} size={30} />
                                        <span className="w-2 h-2 bg-green-500 rounded-full absolute bottom-1 right-1"></span>
                                    </button>
                                </div>
                                {isProfileOpen && (
                                    <div className="absolute p-1 right-0 mt-2 w-47 bg-gray-300 shadow-lg rounded-lg overflow-hidden">
                                        <div className="p-2 flex items-center space-x-1 border-b">
                                            <UserAvatar user={user} size={30} />
                                            <div>
                                                <p className="text-xs text-black">
                                                    {user?.name}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() =>
                                                setIsProfileOpen(false)
                                            }
                                            className="absolute top-2 right-2 p-1 text-gray-500 hover:text-black">
                                            <X className="w-4 h-4 mt-2" />
                                        </button>
                                        <div className="p-1 text-black">
                                            {(user?.is_admin ||
                                                user?.is_superadmin) && (
                                                <div
                                                    onClick={() => {
                                                        setIsProfileOpen(false)
                                                        router.push('/admin')
                                                    }}
                                                    className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 cursor-pointer border-b">
                                                    <ShieldCheck size={18} />
                                                    <p className="text-xs font-extralight">
                                                        Admin panel
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="flex text-xs gap-4 gradient-border bg-gray-900 px-6 py-1 font-medium w-full">
                                            <LogOut size={15} />
                                            <span>Logout</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <button
                                    onClick={handleJoinClick}
                                    className="text-accent-ink hidden md:block rounded-xl border-2 border-accent2 font-aldo bg-accent px-3 py-1 transition-transform hover:scale-105 hover:bg-accent2">
                                    {brand.join_label}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {isMobileMenuOpen && (
                    <div className="md:hidden bg-surface border border-line mt-4 p-4 rounded-lg">
                        {user && (
                            <div className="flex items-center bg-surface2 rounded-lg shadow-md justify-between relative">
                                <p className="text-center font-semibold text-ink px-4 py-2">
                                    Hello, {user?.name}{' '}
                                </p>
                                <div className="relative w-8 h-8">
                                    <UserAvatar
                                        user={user}
                                        size={30}
                                        className="w-full h-full"
                                    />
                                    <span className="w-2 h-2 bg-green-500 rounded-full absolute bottom-0 right-0 border border-white"></span>
                                </div>
                            </div>
                        )}
                        <div className="flex flex-col gap-3 mx-3 my-2 mb-4">
                            {brand.nav.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`hover:text-accent font-aldo ${active(link.href) ? 'text-accent' : 'text-ink'}`}>
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                        <div>
                            {user ? (
                                <div className="flex flex-col gap-2">
                                    {isAdmin && (
                                        <Link
                                            href="/admin"
                                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-accent2 bg-accent px-6 py-2 font-medium text-accent-ink hover:bg-accent2">
                                            <ShieldCheck size={16} /> Admin panel
                                        </Link>
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-white font-extralight gradient-border bg-gray-900 px-6 py-2">
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleJoinClick}
                                    className="text-accent-ink bg-accent rounded-xl border-2 font-aldo border-accent2 px-6 py-2 font-medium w-full hover:bg-accent2">
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