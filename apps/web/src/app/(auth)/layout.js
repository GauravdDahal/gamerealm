import Link from 'next/link'
import { ArrowLeft, Club, Diamond, Heart, Spade } from 'lucide-react'

export const metadata = {
    title: { absolute: 'Join Thunder Sweeps', template: '%s | Thunder Sweeps' },
    description: 'Sign in or create your Thunder Sweeps account.',
}

const PERKS = [
    { Icon: Spade, text: 'A free spin on the lucky wheel every day' },
    { Icon: Heart, text: 'Our live chat team sets up and loads your games' },
    { Icon: Diamond, text: 'Rewards every time a friend joins with your link' },
]

const Layout = ({ children }) => (
    <main className="auth">
        <header className="auth-bar">
            <Link href="/" className="auth-brand" aria-label="Thunder Sweeps home">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/images/brand/thunder-sweeps-mark.svg" alt="" width="44" height="44" />
                <span className="ts-wordmark" aria-hidden="true">
                    <span className="ts-word-1">THUNDER</span>
                    <span className="ts-word-2"> SWEEPS</span>
                </span>
            </Link>
            <Link href="/" className="auth-back">
                <ArrowLeft aria-hidden="true" />
                <span>Back to site</span>
            </Link>
        </header>

        <div className="auth-grid">
            <div className="auth-card">
                <div className="auth-card-edge" aria-hidden="true" />
                <div className="auth-card-body">{children}</div>
            </div>

            <section className="auth-pitch" aria-label="Why join">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="auth-pitch-mark" src="/assets/images/brand/thunder-sweeps-mark.svg" alt="" width="220" height="220" />
                <p className="auth-pitch-title">
                    One free spin.
                    <br />
                    <span>Every day.</span>
                </p>
                <ul className="auth-perks">
                    {PERKS.map(({ Icon, text }) => (
                        <li key={text}>
                            <Icon aria-hidden="true" />
                            <span>{text}</span>
                        </li>
                    ))}
                </ul>
                <p className="auth-legal">
                    <Club aria-hidden="true" /> 18+ only. Please play responsibly.
                </p>
            </section>
        </div>

        <footer className="auth-foot">© {new Date().getFullYear()} Thunder Sweeps. All rights reserved.</footer>
    </main>
)

export default Layout
