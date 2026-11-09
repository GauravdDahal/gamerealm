'use client'

import React, { useState, useEffect } from 'react'
import {
    Dice6,
    Menu,
    X,
    LogOut,
    User,
    Settings,
    CreditCard,
    ShieldCheck,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth'
import Image from 'next/image'
import UserAvatar from '@/components/common/UserAvatar'
import { useSiteContent } from '@/lib/useSiteContent'

export default function Navigation({ isScrolled }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const { user, logout } = useAuth()
    const router = useRouter();
    const brand = useSiteContent('brand')

    const handleJoinClick = () => {
        router.push('/users')
    }

    const handleLogout = () => {
        logout()
    }

    return (
        <nav
            className={'fixed top-0 left-0 right-0 z-50 transition-all bg-gradient-to-r from-[#d5d3ae] via-[#a09a63] to-[#534c28] duration-300 w-full px-4 py-5'}>
            <div className="max-w-8xl mx-auto px-4">
                <div className="flex items-center justify-between w-full">
                    {/* Logo - Far Left */}
                    <div className="flex items-center gap-2">
                        {brand.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={brand.logo} alt={brand.name} className="w-9 h-9 object-contain" />
                        ) : (
                            <Dice6 className="w-9 h-9 text-[#4f46e5] animate-float" />
                        )}
                        <span className="text-xl bg-clip-text font-FontMarquee bg-gradient-to-r font-test from-[#4f46e5] via-[#605C66] to-[#322C3C] text-transparent">
                            {brand.name}
                        </span>
                    </div>

                    {/* Center Navigation Links */}
                    <div className="hidden md:flex items-center gap-9 my-1 absolute left-1/2 transform -translate-x-1/2">
                        {brand.nav.map((link, i) => (
                            <a
                                key={i}
                                href={link.href}
                                className="text-[#0d012e] text-[20px] font-aldo transition-transform hover:scale-125 duration-200 hover:text-white">
                                {link.label}
                            </a>
                        ))}
                    </div>

                    {/* Profile/Join Button - Far Right */}
                    <div className="flex items-center gap-4 ml-auto">
                        <div className="md:hidden">
                            <button
                                onClick={() =>
                                    setIsMobileMenuOpen(!isMobileMenuOpen)
                                }
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
                                            <div className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 cursor-pointer">
                                                <User size={18} />
                                                <p className="text-xs font-extralight">
                                                    My Profile
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 cursor-pointer">
                                                <Settings size={18} />
                                                <p className="text-xs font-extralight">
                                                    Settings
                                                </p>
                                            </div>
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
                                    className="text-black hidden md:block rounded-xl border-2 border-black boreder-opacity-40 font-aldo bg-[#bdbb9a] px-3 py-1 transition-transform hover:scale-105 hover:text-[#faf4bb] hover:border-white hover:bg-[#2b3133]">
                                    {brand.join_label}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {isMobileMenuOpen && (
                    <div className="md:hidden bg-gray-300 mt-4 p-4 rounded-lg">
                        {user && (
                            <div className="flex items-center bg-gray-400 rounded-lg shadow-md justify-between relative">
                                <p className="text-center font-semibold text-gray-800 px-4 py-2">
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
                                <a
                                    key={i}
                                    href={link.href}
                                    className="hover:text-game-primary font-aldo text-[#0d012e]">
                                    {link.label}
                                </a>
                            ))}
                        </div>
                        <div>
                            {user ? (
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-white font-extralight gradient-border bg-gray-900 px-6 py-2">
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleJoinClick}
                                    className="text-[#0d012e] bg-[#bdbb9a] rounded-xl border-2 font-aldo border-black boreder-opacity-40 px-6 py-2 font-medium w-full">
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