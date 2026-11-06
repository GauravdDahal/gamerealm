import { Nunito } from 'next/font/google'
import '@/app/global.css'
import AOSProvider from '@/components/AOSProvider'
const nunitoFont = Nunito({
    subsets: ['latin'],
    display: 'swap',
})

export const metadata = {
    title: 'CASINO PLAY',
}

const RootLayout = ({ children }) => {
    return (
        <html lang="en" className={nunitoFont.className}>
            <body className="antialiased">
                <AOSProvider />
                {children}
            </body>
        </html>
    )
}

export default RootLayout
