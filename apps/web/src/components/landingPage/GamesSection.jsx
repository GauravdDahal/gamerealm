"use client"
import React, { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
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
    const showAll = false
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
            return showAll ? games : games.slice(0, 4)
        }
    }

    const displayedGames = getDisplayedGames()

    return (
        <section id="games" className={`bg-gray-900 ${bare ? 'py-10 md:py-14' : 'py-16 md:py-24 lg:py-32'}`}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {!bare && (
                    <>
                <h2
                    data-aos="fade-down"
                    className="text-white text-4xl sm:text-9xl md:text-4xl lg:text-6xl font-godofwar text-center mb-4">
                    {c.title}
                </h2>
                <p
                    data-aos="fade-down"
                    data-aos-delay="50"
                    className="text-gray-400 text-center mb-12 md:mb-16 max-w-2xl mx-auto text-sm sm:text-base">
                    {c.intro}
                </p>
                    </>
                )}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-5 sm:gap-x-6 sm:gap-y-14 mx-auto max-w-7xl place-items-center">
                    {displayedGames.map((game, index) => (
                        <div
                            key={game.id}
                            data-aos="fade-up"
                            data-aos-delay={Math.min(index, 6) * 40}
                            role="button"
                            tabIndex={0}
                            aria-label={`${c.play_label}: ${game.title}`}
                            onClick={() => handleJoinGameClick(game)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    handleJoinGameClick(game)
                                }
                            }}
                            className="group relative w-full max-w-[340px] cursor-pointer overflow-hidden rounded-lg gradient-border">
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-game-primary/20 via-game-secondary/20 to-game-accent/20 opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                            <div className="w-full aspect-[4/5] relative">
                                <Image
                                    src={game.image}
                                    alt=""
                                    fill={true}
                                    sizes="(min-width: 1280px) 340px, (min-width: 1024px) 33vw, 50vw"
                                    style={{ objectFit: 'cover' }}
                                    className="group-hover:scale-105 transition duration-500"
                                />
                                {game.hot && (
                                    <div className="absolute top-2 right-1 z-30">
                                        <Image
                                            src="/assets/images/gameSectionImg/hotIcon.webp"
                                            alt="Hot"
                                            width={64}
                                            height={64}
                                            className="w-26 h-26 object-contain"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col items-stretch gap-1.5 bg-gray-900 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5 sm:py-3">
                                <div className="min-w-0">
                                    {bare ? <h2 className="truncate text-sm sm:text-lg leading-tight font-aldo">{game.title}</h2> : <h3 className="truncate text-sm sm:text-lg leading-tight font-aldo">{game.title}</h3>}
                                    {game.players && (
                                        <p className="hidden text-gray-400 text-sm sm:block">{game.players} Active Players</p>
                                    )}
                                </div>
                                <span className="shrink-0 rounded-lg bg-accent px-3 py-1 text-center text-xs sm:px-4 sm:py-1.5 sm:text-sm font-bold text-accent-ink transition group-hover:bg-accent2">
                                    {c.play_label}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {!bare && games.length > displayedGames.length && (
                    <div className="mt-8 flex justify-center">
                        <Link
                            href="/games"
                            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-accent/60 px-5 text-sm font-bold text-accent transition-colors hover:bg-accent hover:text-accent-ink sm:text-base">
                            See all {games.length} games <ChevronRight size={18} aria-hidden="true" />
                        </Link>
                    </div>
                )}
            </div>
        </section>
    )
}