'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Field from '@/components/auth/Field'

/**
 * Choose a new password. The emailed reset link goes through /auth/callback,
 * which signs the player in for this one step and sends them here.
 */
const PasswordReset = () => {
    const router = useRouter()
    const [ready, setReady] = useState(null) // null = checking, false = no valid link
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        createClient()
            .auth.getUser()
            .then(({ data }) => setReady(!!data?.user))
            .catch(() => setReady(false))
    }, [])

    const save = async event => {
        event.preventDefault()
        setError('')
        if (password.length < 8) {
            setError('Use at least 8 characters.')
            return
        }
        setSaving(true)
        const supabase = createClient()
        const { error: err } = await supabase.auth.updateUser({ password })
        if (err) {
            setSaving(false)
            setError(
                /different from the old/i.test(err.message)
                    ? 'Choose a password you have not used before.'
                    : /weak|pwned|leak/i.test(err.message)
                      ? 'That password is too easy to guess. Try a longer one.'
                      : 'Could not save your new password. Please try again.',
            )
            return
        }
        await supabase.auth.signOut()
        router.push('/users?reset=1')
    }

    if (ready === null) {
        return (
            <div className="auth-content">
                <div className="auth-heading">
                    <h1>New password</h1>
                    <p>Checking your reset link…</p>
                </div>
            </div>
        )
    }

    if (!ready) {
        return (
            <div className="auth-content">
                <div className="auth-heading">
                    <h1>Link expired</h1>
                    <p>This reset link has expired or was already used. Request a new one and open it on this device.</p>
                </div>
                <Link href="/forgot-password" className="auth-submit flex items-center justify-center">
                    Send a new link
                </Link>
            </div>
        )
    }

    return (
        <div className="auth-content">
            <div className="auth-heading">
                <h1>New password</h1>
                <p>Choose a new password for your account.</p>
            </div>
            <form className="auth-form" onSubmit={save}>
                <Field
                    label="New password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoFocus
                    autoComplete="new-password"
                    hint="At least 8 characters."
                    error={error}
                />
                <button type="submit" className="auth-submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save password'}
                </button>
            </form>
            <p className="auth-switch">
                Remembered it? <Link href="/users">Back to sign in</Link>
            </p>
        </div>
    )
}

export default PasswordReset
