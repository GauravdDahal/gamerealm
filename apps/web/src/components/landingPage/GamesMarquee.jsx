'use client'

import { useRouter } from 'next/navigation'
import { Flame } from 'lucide-react'
import { useAuth } from '@/hooks/auth'
import { useGames } from '@/lib/useGames'
import { playGame } from '@/lib/playGame'

/**
 * A slow, endless strip of game logos. Logos and names come from the Games
 * page in the admin panel. Tap a logo to ask for that game in chat.
 */
export default function GamesMarquee() {
    const games = useGames()
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()

    // Repeat the list so the strip is always wider than the screen, then twice
    // over again so sliding half-way loops without a jump.
    const repeats = Math.max(1, Math.ceil(8 / games.length))
    const row = Array.from({ length: repeats }).flatMap(() => games)
    const track = [...row, ...row]
    const seconds = Math.max(14, row.length * 2.8)

    return (
        <section
            aria-label="Games"
            className="games-marquee relative overflow-hidden border-y border-gray-800 bg-gray-900 py-6 sm:py-8">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-gray-900 to-transparent sm:w-24" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-gray-900 to-transparent sm:w-24" />
            <div
                className="games-marquee-track flex w-max items-center gap-4 sm:gap-6"
                style={{ animationDuration: `${seconds}s` }}>
                {track.map((game, i) => (
                    <button
                        key={`${game.id}-${i}`}
                        onClick={() => playGame({ game, user, authLoading, router })}
                        aria-hidden={i >= row.length ? true : undefined}
                        tabIndex={i >= row.length ? -1 : 0}
                        className="group flex w-28 shrink-0 flex-col items-center gap-2 sm:w-36">
                        <span className="relative block h-20 w-28 overflow-hidden rounded-xl border border-gray-700 transition group-hover:border-indigo-400 sm:h-24 sm:w-36">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={game.logo || game.image}
                                alt={game.title}
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                            />
                            {game.hot && (
                                <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white">
                                    <Flame className="h-3 w-3" />
                                </span>
                            )}
                        </span>
                        <span className="w-full truncate text-center text-xs text-gray-300 sm:text-sm">
                            {game.title}
                        </span>
                    </button>
                ))}
            </div>
        </section>
    )
}
