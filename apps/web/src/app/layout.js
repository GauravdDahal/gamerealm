import { Nunito } from 'next/font/google'
import '@/app/global.css'
import '@/app/themes.css'
import ThemeApplier from '@/components/ThemeApplier'
import SeasonalDecor from '@/components/SeasonalDecor'
import { THEMES, DEFAULT_THEME } from '@/lib/themes.mjs'
import AOSProvider from '@/components/AOSProvider'
import InstallApp from '@/components/InstallApp'
import ProfileGate from '@/components/ProfileGate'
const nunitoFont = Nunito({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-ui',
})

const SITE = 'Thunder Sweeps'
const DESCRIPTION =
    'Thunder Sweeps: spin the lucky wheel, play your favourite games, chat live with support and earn rewards and referral bonuses.'

export const metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://gamerealm-rust.vercel.app'),
    title: { default: 'Thunder Sweeps | Online Games, Bonuses & Lucky Wheel', template: `%s | ${SITE}` },
    description: DESCRIPTION,
    applicationName: SITE,
    manifest: '/manifest.webmanifest?v=ts1',
    icons: {
        icon: [
            { url: '/ts-favicon.ico', sizes: 'any' },
            { url: '/ts-icon-192.png', sizes: '192x192', type: 'image/png' },
        ],
        shortcut: '/ts-favicon.ico',
        apple: '/ts-apple-touch-icon.png',
    },
    openGraph: { title: SITE, description: DESCRIPTION, siteName: SITE, type: 'website', images: ['/ts-icon-512.png'] },
    twitter: { card: 'summary', title: SITE, description: DESCRIPTION },
    appleWebApp: { capable: true, title: 'Thunder Sweeps', statusBarStyle: 'black-translucent' },
}

export const viewport = {
    themeColor: '#100627',
}

// Runs before first paint so a returning visitor never sees the wrong theme flash.
const themeBoot = `try{var t=localStorage.getItem('site-theme');var ok=${JSON.stringify(THEMES.map(t => t.id))};if(t&&ok.indexOf(t)>-1)document.documentElement.setAttribute('data-theme',t)}catch(e){}`

const RootLayout = ({ children }) => {
    return (
        <html lang="en" className={`${nunitoFont.variable} ${nunitoFont.className}`} data-theme={DEFAULT_THEME} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
            </head>
            <body className="antialiased relative">
                <ThemeApplier />
                <SeasonalDecor />
                <AOSProvider />
                <InstallApp />
                <ProfileGate />
                {children}
            </body>
        </html>
    )
}

export default RootLayout
