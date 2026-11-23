/**
 * Links typed in by staff (site content, banners, socials) are shown to every
 * visitor. Only allow ordinary web, email and phone links, and on-site paths,
 * so a `javascript:` or `data:` link can never run code in a player's browser.
 */
export const safeUrl = (url, fallback = '#') => {
    if (typeof url !== 'string') return fallback
    const u = url.trim()
    if (!u) return fallback
    if (u.startsWith('/') && !u.startsWith('//')) return u
    if (u.startsWith('#')) return u
    if (/^(https?:|mailto:|tel:)/i.test(u)) return u
    return fallback
}
