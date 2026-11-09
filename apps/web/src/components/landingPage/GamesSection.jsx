"use client"
import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth'
import { useGames } from '@/lib/useGames'
import { useSiteContent } from '@/lib/useSiteContent'
import { playGame } from '@/lib/playGame'


export default function GamesSection({ bare = false, all = false }) {
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const games = useGames()
    const c = useSiteContent('games')
    const [showAll, setShowAll] = useState(false)
    const [screenWidth, setScreenWidth] = useState(
        typeof window !== 'undefined' ? window.innerWidth : 0,
    );

    useEffect(() => {
        const handleResize = () => {
            setScreenWidth(window.innerWidth)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const handleJoinGameClick = game => playGame({ game, user, authLoading, router })

    const getDisplayedGames = () => {
        if (all) return games
        if (screenWidth >= 1536) {
            return games
        } else if (screenWidth >= 768) {
            return showAll ? games : games.slice(0, 8)
        } else {
            return showAll ? games : games.slice(0, 3)
        }
    }

    const displayedGames = getDisplayedGames()
    const shouldShowButton =
        !all && screenWidth < 1536 && games.length > (screenWidth >= 768 ? 8 : 3)

    return (
        <section id="games" className={`bg-gray-900 ${bare ? 'py-10 md:py-14' : 'py-16 md:py-24 lg:py-32'}`}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {!bare && (
                    <>
                <h2
                    data-aos="fade-down"
                    data-aos-duration="1000"
                    className="text-white text-4xl sm:text-9xl md:text-4xl lg:text-6xl font-godofwar text-center mb-4">
                    {c.title}
                </h2>
                <p
                    data-aos="fade-down"
                    data-aos-duration="1000"
                    data-aos-delay="200"
                    className="text-gray-400 text-center mb-12 md:mb-16 max-w-2xl mx-auto text-sm sm:text-base">
                    {c.intro}
                </p>
                    </>
                )}
                <div className="grid grid-cols-1 min-[560px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10 sm:gap-y-14 mx-auto max-w-7xl place-items-center">
                    {displayedGames.map((game, index) => (
                        <div
                            key={game.id}
                            data-aos="fade-up"
                            data-aos-duration="1000"
                            data-aos-delay={100 * (index + 1)}
                            className="group relative w-full max-w-[340px] overflow-hidden rounded-lg gradient-border">
                            <div className="absolute inset-0 bg-gradient-to-r from-game-primary/20 via-game-secondary/20 to-game-accent/20 opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
                            <div className="w-full aspect-[4/5] relative">
                                <Image
                                    src={game.image}
                                    alt={game.title}
                                    fill={true}
                                    style={{ objectFit: 'cover' }}
                                    className="group-hover:scale-110 group-hover:blur-sm transition duration-500"
                                />
                                {game.hot && (
                                    <div className="absolute top-2 right-1 z-30">
                                        <Image
                                            src="/assets/images/gameSectionImg/hotIcon.webp"
                                            alt="Hot Icon"
                                            width={164}
                                            height={164}
                                            className="w-26 h-26 object-contain"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent flex flex-col justify-end p-4 sm:p-6 z-20">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-aldo mb-1 sm:mb-2">
                                            {game.title}
                                        </h3>
                                        {game.players && (
                                            <p className="text-gray-400 text-sm sm:text-base">
                                                {game.players} Active Players
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {screenWidth < 768 && (
                                    <button
                                        onClick={() =>
                                            handleJoinGameClick(game)
                                        }
                                        className="absolute inset-0 items-center rounded-lg text-sm font-medium">
                                        <span className="border border-white text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base">
                                            {c.play_label}
                                        </span>
                                    </button>
                                )}
                                <button
                                    onClick={() =>
                                        handleJoinGameClick(game)
                                    }
                                    className="absolute inset-0 flex justify-center items-center opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition">
                                    <span className="border border-white text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base">
                                        {c.play_label}
                                    </span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {!bare && (
                    <div className="mt-6 text-center">
                        <Link href="/games" className="text-sm font-semibold text-accent hover:text-accent2">
                            View all games →
                        </Link>
                    </div>
                )}

                {shouldShowButton && (
                    <div className="mt-8 text-center flex justify-center">
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="text-white gradient-border bg-gray-900 px-4 sm:px-6 py-2 text-sm sm:text-base font-medium flex items-center gap-2">
                            {showAll ? c.less_label : c.more_label}
                            {showAll ? (
                                <ChevronUp size={18} />
                            ) : (
                                <ChevronDown size={18} />
                            )}
                        </button>
                    </div>
                )}
            </div>
        </section>
    )
}