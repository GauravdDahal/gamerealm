'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import GoogleButton from '@/components/auth/GoogleButton'
import Field from '@/components/auth/Field'

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
        if (q.get('oauth')) setErrors({ email: ['Google sign-in did not finish. Please try again.'] })
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
                <h1>Back at the table</h1>
                <p>Sign in to spin the wheel, chat with our team and play.</p>
            </div>

            {flash && (
                <p role="status" className="auth-flash">
                    <CircleCheck aria-hidden="true" /> {flash}
                </p>
            )}

            <GoogleButton />

            <form onSubmit={submit} className="auth-form">
                <Field
                    label="Email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    error={errors.email?.[0]}
                />
                <Field
                    label="Password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    error={errors.password?.[0]}
                />
                <div className="auth-row-end">
                    <Link href="/forgot-password" className="auth-link">Forgot password?</Link>
                </div>
                <button type="submit" className="auth-submit" disabled={submitting}>
                    {submitting ? 'Signing in…' : 'Sign in'}
                </button>
            </form>

            <p className="auth-switch">
                New to Thunder Sweeps? <Link href="/register">Create an account</Link>
            </p>
        </div>
    )
}

export default SignIn
