"use client"
import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import Image from 'next/image'
import dynamic from 'next/dynamic';

const Lottie = dynamic(() => import('lottie-react'), {
  ssr: false,
});

export default function GamesSection() {
    const [showAll, setShowAll] = useState(false)
    const [screenWidth, setScreenWidth] = useState(
        typeof window !== 'undefined' ? window.innerWidth : 0,
    );
    const [fireAnimation, setFireAnimation] = useState(null);

    useEffect(() => {
    if (typeof window !== 'undefined') {
        fetch('/Lottie/fire.json')
          .then((response) => response.json())
          .then((data) => {
            setFireAnimation(data);
          })
          .catch((error) => {
            console.error('Error loading Lottie animation:', error);
          });
      }
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setScreenWidth(window.innerWidth)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const games = [
        {
            title: 'Apex Legends',
            image: '/assets/images/gameSectionImg/img1.jpg',
            players: '50K+',
            hot:true
        },
        {
            title: 'Valorant',
            image: '/assets/images/gameSectionImg/img2.jpg',
            players: '45K+',
            hot:true
        },
        {
            title: 'League of Legends',
            image: '/assets/images/gameSectionImg/img3.jpg',
            players: '10K+',
            hot:false
        },
        {
            title: 'Hot Deco',
            image: '/assets/images/gameSectionImg/img4.jpg',
            players: '80K+',
            hot:true
        },
        {
            title: 'Game Time',
            image: '/assets/images/gameSectionImg/img5.jpg',
            players: '80K+',
            hot:false
        },
        {
            title: 'Poker',
            image: '/assets/images/gameSectionImg/img6.jpg',
            players: '80K+',
            hot:false
        },
        {
            title: 'Casino Night',
            image: '/assets/images/gameSectionImg/img7.jpg',
            players: '80K+',
            hot:true
        },
        {
            title: 'Hot Deco',
            image: '/assets/images/gameSectionImg/img8.jpg',
            players: '80K+',
            hot:true
        },
        {
            title: 'Hot Deco',
            image: '/assets/images/gameSectionImg/img9.jpeg',
            players: '80K+',
            hot:false
        },
        {
            title: 'Hot Deco',
            image: '/assets/images/gameSectionImg/img10.jpg',
            players: '80K+',
            hot: true
        },
        {
            title: 'Hot Deco',
            image: '/assets/images/gameSectionImg/img11.jpeg',
            players: '80K+',
            hot:false
        },
        {
            title: 'Hot Deco',
            image: '/assets/images/gameSectionImg/img12.jpeg',
            players: '80K+',
            hot:false
        },
    ]

    const handleJoinGameClick = gameTitle => {
        console.log(`Joining game: ${gameTitle}`)
    }

    const getDisplayedGames = () => {
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
        screenWidth < 1536 && games.length > (screenWidth >= 768 ? 8 : 3)

    return (
        <section id="games" className="py-16 md:py-24 lg:py-32 bg-gray-900">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <h2
                    data-aos="fade-down"
                    data-aos-duration="1000"
                    className="text-white text-4xl sm:text-9xl md:text-4xl lg:text-6xl font-godofwar text-center mb-4">
                    Featured Games
                </h2>
                <p
                    data-aos="fade-down"
                    data-aos-duration="1000"
                    data-aos-delay="200"
                    className="text-gray-400 text-center mb-12 md:mb-16 max-w-2xl mx-auto text-sm sm:text-base">
                    Dive into our selection of popular competitive games and
                    start your journey to the top.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 gap-y-10 mx-4 sm:mx-20 sm:gap-50 sm:gap-y-16 lg:gap-25 lg:gap-y-20 place-items-center">
                    {displayedGames.map((game, index) => (
                        <div
                            key={index}
                            data-aos="fade-up"
                            data-aos-duration="1000"
                            data-aos-delay={100 * (index + 1)}
                            className="group relative w-full sm:w-[300px] lg:max-w-[280px] overflow-hidden rounded-lg gradient-border">
                            <div className="absolute inset-0 bg-gradient-to-r from-game-primary/20 via-game-secondary/20 to-game-accent/20 opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
                            <div className="w-full h-[300px] sm:h-[200px] md:h-[350px] relative">
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
                                            src="/assets/images/gameSectionImg/hotIcon.gif"
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
                                        <p className="text-gray-400 text-sm sm:text-base">
                                            {game.players} Active Players
                                        </p>
                                    </div>
                                </div>
                                {screenWidth < 768 && (
                                    <button
                                        onClick={() =>
                                            handleJoinGameClick(game.title)
                                        }
                                        className="absolute inset-0 items-center rounded-lg text-sm font-medium">
                                        <span className="border border-white text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base">
                                            Play Game
                                        </span>
                                    </button>
                                )}
                                <button
                                    onClick={() =>
                                        handleJoinGameClick(game.title)
                                    }
                                    className="absolute inset-0 flex justify-center items-center opacity-0 group-hover:opacity-100 transition">
                                    <span className="border border-white text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base">
                                        Play Game
                                    </span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {shouldShowButton && (
                    <div className="mt-8 text-center flex justify-center">
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="text-white gradient-border bg-gray-900 px-4 sm:px-6 py-2 text-sm sm:text-base font-medium flex items-center gap-2">
                            {showAll ? 'Show Less' : 'See More'}
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