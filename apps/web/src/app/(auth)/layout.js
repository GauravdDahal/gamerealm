import Link from 'next/link'
import { Dice6, Spade, Club, Diamond, Sparkles, ShieldCheck } from 'lucide-react'

export const metadata = {
    title: { absolute: 'Join Casino Play' },
    description: 'Sign in or create your Casino Play account.',
}

const Layout = ({ children }) => (
    <main className="auth-experience">
        <div className="auth-ambient auth-ambient-one" />
        <div className="auth-ambient auth-ambient-two" />
        <div className="auth-grain" />

        <header className="auth-topbar">
            <Link href="/" className="auth-brand" aria-label="Casino Play home">
                <span className="auth-brand-mark"><Dice6 size={27} strokeWidth={1.8} /></span>
                <span>CASINO <b>PLAY</b></span>
            </Link>
            <Link href="/" className="auth-back-link">Back to the tables <span>↗</span></Link>
        </header>

        <section className="auth-stage">
            <aside className="auth-showcase">
                <div className="auth-kicker"><span /> THE HOUSE OF GOOD TIMES</div>
                <h1>MAKE<br /><em>YOUR</em> MOVE.</h1>
                <p className="auth-showcase-copy">Your seat is waiting. Step into the game, explore the tables and make every moment count.</p>
                <div className="auth-showcase-art" aria-hidden="true">
                    <div className="auth-orbit auth-orbit-outer" />
                    <div className="auth-orbit auth-orbit-inner" />
                    <div className="auth-playing-card auth-card-back"><span>♠</span><small>ACE</small></div>
                    <div className="auth-playing-card auth-card-front"><span>♦</span><small>21</small></div>
                    <div className="auth-chip auth-chip-one">♣</div>
                    <div className="auth-chip auth-chip-two">♦</div>
                    <div className="auth-spark auth-spark-one"><Sparkles size={20} /></div>
                    <div className="auth-spark auth-spark-two">✦</div>
                </div>
                <div className="auth-trust"><ShieldCheck size={17} /><span>Secure account access</span><i /> <span>18+ only</span></div>
                <div className="auth-suits" aria-hidden="true"><Spade /><Club /><Diamond /></div>
            </aside>

            <div className="auth-panel-wrap">
                <div className="auth-panel-glow" />
                <div className="auth-panel">
                    {children}
                </div>
                <p className="auth-panel-foot">PLAY SMART. ENJOY THE EXPERIENCE.</p>
            </div>
        </section>
        <footer className="auth-footer">© {new Date().getFullYear()} CASINO PLAY <span>•</span> ALL RIGHTS RESERVED</footer>
    </main>
)

export default Layout
