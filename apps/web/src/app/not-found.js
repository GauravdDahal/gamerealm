import Link from 'next/link'

export const metadata = {
    title: 'Page not found',
    description: 'This page could not be found.',
}

const NotFoundPage = () => (
    <main className="flex min-h-screen items-center justify-center bg-gray-900 px-6 text-center text-white">
        <div className="max-w-md">
            <p className="font-display text-8xl leading-none text-accent">404</p>
            <h1 className="mt-4 text-2xl font-bold text-ink">This page is not on the table</h1>
            <p className="mt-2 text-muted">The page you are looking for has moved or never existed. Head back and keep playing.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/" className="btn btn-primary btn-lg">
                    Back to home
                </Link>
                <Link href="/games" className="btn btn-secondary btn-lg">
                    Browse games
                </Link>
                <Link href="/support" className="btn btn-secondary btn-lg">
                    Get support
                </Link>
            </div>
        </div>
    </main>
)

export default NotFoundPage
