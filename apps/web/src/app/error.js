'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { TriangleAlert } from 'lucide-react'

/** Shown instead of a blank screen when something unexpected breaks. */
export default function Error({ error, reset }) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-900 px-6 text-center text-white">
            <div className="max-w-md">
                <TriangleAlert className="mx-auto h-12 w-12 text-accent" />
                <h1 className="mt-4 text-2xl font-bold text-ink">Something went wrong</h1>
                <p className="mt-2 text-sm text-muted">
                    We could not load this page. Please try again. If it keeps happening, contact support.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button onClick={() => reset()} className="rounded-xl bg-accent px-6 py-3 font-bold text-accent-ink hover:bg-accent2">
                        Try again
                    </button>
                    <Link href="/" className="rounded-xl border border-line px-6 py-3 font-semibold text-ink hover:bg-surface2">
                        Back to home
                    </Link>
                </div>
            </div>
        </main>
    )
}
