const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://gamerealm-rust.vercel.app'

export default function robots() {
    return {
        rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/auth', '/account-pending', '/complete-profile', '/password-reset'] }],
        sitemap: `${SITE}/sitemap.xml`,
    }
}
