const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://gamerealm-rust.vercel.app'

export default function sitemap() {
    const now = new Date()
    return [
        { path: '/', priority: 1 },
        { path: '/games', priority: 0.9 },
        { path: '/bonuses', priority: 0.8 },
        { path: '/referral', priority: 0.7 },
        { path: '/support', priority: 0.6 },
        { path: '/register', priority: 0.5 },
        { path: '/users', priority: 0.4 },
    ].map(({ path, priority }) => ({ url: `${SITE}${path}`, lastModified: now, changeFrequency: 'weekly', priority }))
}
