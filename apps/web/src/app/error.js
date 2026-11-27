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
                <TriangleAlert className="mx-auto h-[18px] w-[18px] text-accent" aria-hidden="true" />
                <h1 className="mt-4 font-display text-4xl text-ink">Something went wrong</h1>
                <p className="mt-2 text-muted">
                    We could not load this page. Please try again. If it keeps happening, contact support.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button onClick={() => reset()} className="btn btn-primary btn-lg">
                        Try again
                    </button>
                    <Link href="/" className="btn btn-secondary btn-lg">
                        Back to home
                    </Link>
                </div>
            </div>
        </main>
    )
}
