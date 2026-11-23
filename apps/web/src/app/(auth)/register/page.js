'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/auth'
import GoogleButton from '@/components/auth/GoogleButton'
import Field from '@/components/auth/Field'

/** Latest date of birth that still makes someone 18 today. */
const maxDob = () => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 18)
    return d.toISOString().split('T')[0]
}

const Page = () => {
    const router = useRouter()
    const { register } = useAuth()
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        date_of_birth: '',
        country: '',
        address: '',
        referral_code: '',
    })
    const [errors, setErrors] = useState({})
    const [submitting, setSubmitting] = useState(false)
    const [showReferral, setShowReferral] = useState(false)

    // A friend's link looks like /register?ref=CODE. Remember it in case they browse around first.
    useEffect(() => {
        try {
            const fromLink = new URLSearchParams(window.location.search).get('ref')
            if (fromLink) localStorage.setItem('referral-code', fromLink.trim().toUpperCase().slice(0, 20))
            const code = localStorage.getItem('referral-code')
            if (code) {
                setForm(f => (f.referral_code ? f : { ...f, referral_code: code }))
                setShowReferral(true)
            }
        } catch {}
    }, [])

    const set = key => event => setForm(f => ({ ...f, [key]: event.target.value }))
    const err = key => errors[key]?.[0]

    const submitForm = async event => {
        event.preventDefault()
        setErrors({})

        if (form.password.length < 8) {
            setErrors({ password: ['Use at least 8 characters.'] })
            return
        }

        setSubmitting(true)
        const ok = await register({ setErrors, ...form, password_confirmation: form.password })
        setSubmitting(false)

        if (ok) {
            try { localStorage.removeItem('referral-code') } catch {}
            router.push('/')
        }
    }

    return (
        <div className="auth-content">
            <div className="auth-heading">
                <h1>Take your seat</h1>
                <p>Create your account in a minute. You need to be 18 or over.</p>
            </div>

            <GoogleButton label="Sign up with Google" />

            <form className="auth-form" onSubmit={submitForm}>
                <fieldset className="auth-group">
                    <legend>Your account</legend>
                    <Field label="Full name" value={form.name} onChange={set('name')} required autoFocus autoComplete="name" error={err('name')} />
                    <Field
                        label="Email"
                        type="email"
                        value={form.email}
                        onChange={set('email')}
                        required
                        autoComplete="email"
                        inputMode="email"
                        placeholder="you@example.com"
                        error={err('email')}
                    />
                    <Field
                        label="Password"
                        type="password"
                        value={form.password}
                        onChange={set('password')}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        hint="At least 8 characters."
                        error={err('password') || err('password_confirmation')}
                    />
                </fieldset>

                <fieldset className="auth-group auth-group-grid">
                    <legend>Your details</legend>
                    <Field
                        label="Phone number"
                        type="tel"
                        value={form.phone}
                        onChange={set('phone')}
                        required
                        autoComplete="tel"
                        inputMode="tel"
                        error={err('phone')}
                    />
                    <Field
                        label="Date of birth"
                        type="date"
                        value={form.date_of_birth}
                        onChange={set('date_of_birth')}
                        max={maxDob()}
                        required
                        autoComplete="bday"
                        error={err('date_of_birth')}
                    />
                    <Field label="Country" value={form.country} onChange={set('country')} required autoComplete="country-name" error={err('country')} />
                    <Field label="Address" value={form.address} onChange={set('address')} required autoComplete="street-address" error={err('address')} />
                </fieldset>

                {showReferral ? (
                    <Field
                        label="Referral code"
                        optional
                        value={form.referral_code}
                        onChange={event => setForm(f => ({ ...f, referral_code: event.target.value.toUpperCase() }))}
                        maxLength={20}
                        autoComplete="off"
                        className="auth-code"
                    />
                ) : (
                    <button type="button" className="auth-link auth-reveal" onClick={() => setShowReferral(true)}>
                        Have a referral code?
                    </button>
                )}

                <button type="submit" className="auth-submit" disabled={submitting}>
                    {submitting ? 'Creating your account…' : 'Create account'}
                </button>
            </form>

            <p className="auth-switch">
                Already have an account? <Link href="/users">Sign in</Link>
            </p>
        </div>
    )
}

export default Page
