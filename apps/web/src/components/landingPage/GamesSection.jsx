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
        <section id="games" className={`bg-gray-900 ${bare ? 'pb-16 pt-8 md:pb-24' : 'section'}`}>
            <div className="wrap">
                {!bare && (
                    <div data-aos="fade">
                        <h2 className="section-title">{c.title}</h2>
                        <p className="section-intro">{c.intro}</p>
                    </div>
                )}
                <div className={`grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 ${bare ? '' : 'mt-12'}`}>
                    {displayedGames.map(game => (
                        <div
                            key={game.id}
                            data-aos="fade"
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
                            className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-accent/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent2">
                            <div className="relative aspect-[4/5] w-full">
                                <Image
                                    src={game.image}
                                    alt=""
                                    fill={true}
                                    sizes="(min-width: 1280px) 300px, (min-width: 1024px) 33vw, 50vw"
                                    style={{ objectFit: 'cover' }}
                                />
                            </div>
                            {/* Card radius 16 minus 8px padding = 8px button radius. */}
                            <div className="flex flex-1 flex-col gap-2 p-2">
                                <div className="flex min-w-0 items-baseline justify-between gap-2 px-2 pt-2">
                                    {bare ? (
                                        <h2 className="truncate text-sm font-bold text-ink sm:text-base">{game.title}</h2>
                                    ) : (
                                        <h3 className="truncate text-sm font-bold text-ink sm:text-base">{game.title}</h3>
                                    )}
                                    {game.hot && <span className="shrink-0 text-xs font-bold text-accent">Hot</span>}
                                </div>
                                {game.players && <p className="hidden px-2 text-sm text-muted sm:block">{game.players} active players</p>}
                                <span className="btn btn-primary btn-block mt-auto">{c.play_label}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {!bare && games.length > displayedGames.length && (
                    <div className="mt-8">
                        <Link href="/games" className="btn btn-secondary">
                            See all {games.length} games <ChevronRight aria-hidden="true" />
                        </Link>
                    </div>
                )}
            </div>
        </section>
    )
}
