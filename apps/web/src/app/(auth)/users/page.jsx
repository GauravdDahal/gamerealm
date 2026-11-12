'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleCheck } from 'lucide-react'
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
    const [flash, setFlash] = useState('')

    useEffect(() => {
        const q = new URLSearchParams(window.location.search)
        if (q.get('reset')) setFlash('Your password was changed. Sign in with your new password.')
    }, [])

    const submit = async event => {
        event.preventDefault()
        setSubmitting(true)
        setErrors({})

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (signInError) {
            const m = signInError.message.toLowerCase()
            setErrors({
                email: [
                    m.includes('invalid login')
                        ? 'Wrong email or password. Please check them and try again.'
                        : m.includes('not confirmed')
                          ? 'Please confirm your email first. Check your inbox for the link.'
                          : m.includes('failed to fetch')
                            ? 'Could not reach the server. Check your connection and try again.'
                            : signInError.message,
                ],
            })
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
        <div className="auth-content">
            <div className="auth-heading">
                <span className="auth-eyebrow">WELCOME BACK</span>
                <h2>Good to see you<span>.</span></h2>
                <p>Sign in to pick up where the excitement left off.</p>
            </div>

            {flash && (
                <p role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                    <CircleCheck size={16} /> {flash}
                </p>
            )}

            <form onSubmit={submit} className="auth-form">
                <div>
                    <label htmlFor="email">Email address</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoFocus
                        autoComplete="email"
                    />
                    {errors.email && <p className="mt-2 text-sm text-red-400">{errors.email[0]}</p>}
                </div>

                <div>
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                    />
                    {errors.password && <p className="mt-2 text-sm text-red-400">{errors.password[0]}</p>}
                </div>

                <div className="auth-login-actions">
                    <Link href="/forgot-password">Forgot your password?</Link>
                    <button type="submit" disabled={submitting}>
                        {submitting ? 'Signing in…' : 'Sign in'}
                    </button>
                </div>
            </form>

            <div className="auth-switch">
                New to Casino Play? <Link href="/register">Create an account <span>→</span></Link>
            </div>
        </div>
    )
}

export default SignIn
