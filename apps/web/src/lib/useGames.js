'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Shown while loading, and if the database can't be reached, so the page is
// never empty. Once the games table has rows, those take over.
const FALLBACK = [
    ['Apex Legends', 'img1.jpg', '50K+', true],
    ['Valorant', 'img2.jpg', '45K+', true],
    ['League of Legends', 'img3.jpg', '10K+', false],
    ['Hot Deco', 'img4.jpg', '80K+', true],
    ['Game Time', 'img5.jpg', '80K+', false],
    ['Poker', 'img6.jpg', '80K+', false],
    ['Casino Night', 'img7.jpg', '80K+', true],
    ['Hot Deco 2', 'img8.jpg', '80K+', true],
    ['Hot Deco 3', 'img9.jpeg', '80K+', false],
    ['Hot Deco 4', 'img10.jpg', '80K+', true],
    ['Hot Deco 5', 'img11.jpeg', '80K+', false],
    ['Hot Deco 6', 'img12.jpeg', '80K+', false],
].map(([title, file, players, hot], i) => ({
    id: `fallback-${i}`,
    title,
    image: `/assets/images/gameSectionImg/${file}`,
    logo: null,
    players,
    hot,
}))

// One request shared by every component on the page.
let pending = null
const fetchGames = () => {
    if (!pending) {
        pending = createClient()
            .from('games')
            .select('id,title,image_url,logo_url,players,is_hot')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('id', { ascending: true })
            .then(({ data, error }) => {
                if (error || !data?.length) return null
                return data.map(g => ({
                    id: g.id,
                    title: g.title,
                    image: g.image_url,
                    logo: g.logo_url,
                    players: g.players,
                    hot: g.is_hot,
                }))
            })
            .catch(() => null)
    }
    return pending
}

export const useGames = () => {
    const [games, setGames] = useState(FALLBACK)
    useEffect(() => {
        let alive = true
        fetchGames().then(list => {
            if (alive && list) setGames(list)
        })
        return () => {
            alive = false
        }
    }, [])
    return games
}
