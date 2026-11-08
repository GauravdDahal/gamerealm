import { Nunito } from 'next/font/google'
import '@/app/global.css'
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
    themeColor: '#10110e',
}

const RootLayout = ({ children }) => {
    return (
        <html lang="en" className={nunitoFont.className}>
            <body className="antialiased">
                <AOSProvider />
                <InstallApp />
                {children}
            </body>
        </html>
    )
}

export default RootLayout
