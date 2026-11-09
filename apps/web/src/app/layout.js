import { Nunito } from 'next/font/google'
import '@/app/global.css'
import '@/app/themes.css'
import ThemeApplier from '@/components/ThemeApplier'
import SeasonalDecor from '@/components/SeasonalDecor'
import { THEMES, DEFAULT_THEME } from '@/lib/themes.mjs'
import AOSProvider from '@/components/AOSProvider'
import InstallApp from '@/components/InstallApp'
const nunitoFont = Nunito({
    subsets: ['latin'],
    display: 'swap',
})

export const metadata = {
    title: 'CASINO PLAY',
    manifest: '/manifest.webmanifest',
    icons: { apple: '/apple-touch-icon.png' },
    appleWebApp: { capable: true, title: 'Casino Play', statusBarStyle: 'black-translucent' },
}

export const viewport = {
    themeColor: '#100627',
}

// Runs before first paint so a returning visitor never sees the wrong theme flash.
const themeBoot = `try{var t=localStorage.getItem('site-theme');var ok=${JSON.stringify(THEMES.map(t => t.id))};if(t&&ok.indexOf(t)>-1)document.documentElement.setAttribute('data-theme',t)}catch(e){}`

const RootLayout = ({ children }) => {
    return (
        <html lang="en" className={nunitoFont.className} data-theme={DEFAULT_THEME} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
            </head>
            <body className="antialiased">
                <ThemeApplier />
                <SeasonalDecor />
                <AOSProvider />
                <InstallApp />
                {children}
            </body>
        </html>
    )
}

export default RootLayout
