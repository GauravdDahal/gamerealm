import Link from 'next/link'
import { Dice6 } from 'lucide-react'

export const metadata = {
    title: 'Page not found',
    description: 'This page could not be found.',
}

const NotFoundPage = () => (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-gray-900 px-6 text-center text-white">
        <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
                background:
                    'radial-gradient(50% 60% at 50% 40%, rgb(var(--c-accent) / 0.18), transparent 65%), radial-gradient(40% 50% at 10% 100%, rgb(var(--c-secondary) / 0.15), transparent 60%)',
            }}
        />
        <div className="max-w-md">
            <Dice6 className="mx-auto h-14 w-14 animate-float text-accent" />
            <p className="mt-6 font-godofwar text-7xl text-accent sm:text-8xl">404</p>
            <h1 className="mt-2 text-2xl font-bold text-ink">This page is not on the table</h1>
            <p className="mt-3 text-sm text-muted">
                The page you are looking for has moved or never existed. Head back and keep playing.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/" className="rounded-xl bg-accent px-6 py-3 font-bold text-accent-ink hover:bg-accent2">
                    Back to home
                </Link>
                <Link href="/games" className="rounded-xl border border-line px-6 py-3 font-semibold text-ink hover:bg-surface2">
                    Browse games
                </Link>
                <Link href="/support" className="rounded-xl border border-line px-6 py-3 font-semibold text-ink hover:bg-surface2">
                    Get support
                </Link>
            </div>
        </div>
    </main>
)

export default NotFoundPage
