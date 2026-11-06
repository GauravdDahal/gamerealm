'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * Sign in. Replaces the previous Facebook/Google social login screen —
 * accounts are now created manually and approved by an admin.
 *
 * Kept at /users because Navigation and HeroSection both link here.
 */
const SignIn = () => {
    const router = useRouter()
    const supabase = createClient()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [errors, setErrors] = useState({})
    const [submitting, setSubmitting] = useState(false)

    const submit = async event => {
        event.preventDefault()
        setSubmitting(true)
        setErrors({})

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (signInError) {
            setErrors({ email: [signInError.message] })
            setSubmitting(false)
            return
        }

        const { data } = await supabase.rpc('my_access')

        if (data?.is_staff) {
            router.push('/admin')
        } else if (data?.profile?.status && data.profile.status !== 'approved') {
            router.push('/account-pending')
        } else {
            router.push('/')
        }
        setSubmitting(false)
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4">
            <div className="w-full max-w-md bg-white/80 backdrop-blur-sm rounded-lg p-8">
                <div className="space-y-2 pb-6">
                    <h1 className="text-3xl font-bold text-center text-black">
                        Welcome back
                    </h1>
                    <p className="text-center text-sm text-gray-600">
                        Sign in with your email and password.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoFocus
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:border-indigo-500 focus:outline-none"
                        />
                        {errors.email && (
                            <p className="mt-1 text-sm text-red-600">{errors.email[0]}</p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:border-indigo-500 focus:outline-none"
                        />
                        {errors.password && (
                            <p className="mt-1 text-sm text-red-600">
                                {errors.password[0]}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50">
                        {submitting ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>

                <div className="mt-6 flex items-center justify-between text-sm">
                    <Link
                        href="/register"
                        className="text-indigo-600 hover:underline">
                        Create an account
                    </Link>
                    <Link
                        href="/forgot-password"
                        className="text-gray-600 hover:underline">
                        Forgot password?
                    </Link>
                </div>

                <button
                    onClick={() => router.push('/')}
                    className="mt-6 flex w-full items-center justify-center gap-2 text-sm text-gray-600 hover:text-black">
                    <Home className="h-4 w-4" />
                    Back to home
                </button>
            </div>
        </main>
    )
}

export default SignIn
