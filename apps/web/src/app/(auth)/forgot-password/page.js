'use client'

import Link from 'next/link'

import { useAuth } from '@/hooks/auth'
import { useState } from 'react'
import Field from '@/components/auth/Field'
import AuthSessionStatus from '@/app/(auth)/AuthSessionStatus'

const Page = () => {
    const { forgotPassword } = useAuth({
        middleware: 'guest',
        redirectIfAuthenticated: '/dashboard',
    })

    const [email, setEmail] = useState('')
    const [errors, setErrors] = useState([])
    const [status, setStatus] = useState(null)

    const submitForm = event => {
        event.preventDefault()

        forgotPassword({ email, setErrors, setStatus })
    }

    return (
        <div className="auth-content">
            <div className="auth-heading">
                <h1>Reset your password</h1>
                <p>Enter your email and we&rsquo;ll send you a link to choose a new password.</p>
            </div>

            <AuthSessionStatus className="auth-flash" status={status} />

            <form className="auth-form" onSubmit={submitForm}>
                <Field
                    label="Email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    error={errors.email?.[0]}
                />
                <button type="submit" className="auth-submit">Send reset link</button>
            </form>

            <p className="auth-switch">
                Remembered it? <Link href="/users">Back to sign in</Link>
            </p>
        </div>
    )
}

export default Page
