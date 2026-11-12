'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Supabase-backed replacement for the old Laravel/Sanctum useAuth hook.
 * Keeps the same shape (user, login, register, logout, ...) so existing
 * components (Navigation, admin layout, etc.) don't need to change how
 * they call it — only how `user` is populated changes under the hood.
 *
 * `user` carries the profile row plus two convenience flags, `is_admin`
 * and `is_superadmin`, computed from the caller's roles via the
 * `my_access` database function (see supabase/migrations/0003_my_access.sql).
 */
const friendly = message => {
    const m = (message || '').toLowerCase()
    if (m.includes('invalid login')) return 'Wrong email or password. Please check them and try again.'
    if (m.includes('email not confirmed')) return 'Please confirm your email first. Check your inbox for the link.'
    if (m.includes('already registered') || m.includes('already been registered')) return 'An account with this email already exists. Try signing in instead.'
    if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Please wait a minute and try again.'
    if (m.includes('failed to fetch') || m.includes('network')) return 'Could not reach the server. Check your connection and try again.'
    if (m.includes('database error saving')) return 'We could not create your account. Please check your details. You must be 18 or older.'
    if (m.includes('at least 18')) return 'You must be at least 18 years old to register.'
    if (m.includes('password') && m.includes('characters')) return 'Your password is too short. Please use at least 6 characters.'
    return message
}

export const useAuth = ({ middleware, redirectIfAuthenticated } = {}) => {
    const router = useRouter()
    const supabase = createClient()

    const [user, setUser] = useState(undefined) // undefined = not checked yet, null = signed out
    const [loading, setLoading] = useState(true)

    const loadUser = useCallback(async () => {
        const {
            data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
            setUser(null)
            setLoading(false)
            return
        }

        const { data, error } = await supabase.rpc('my_access')

        if (error || !data?.profile) {
            setUser(null)
            setLoading(false)
            return
        }

        const roles = data.roles ?? []
        setUser({
            ...data.profile,
            email_verified_at: session.user.email_confirmed_at,
            is_admin: data.is_staff,
            is_superadmin: roles.includes('super-admin'),
            is_approved: data.is_approved,
        })
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        loadUser()

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => loadUser())

        return () => subscription.unsubscribe()
    }, [loadUser, supabase])

    const register = async ({ setErrors, password_confirmation, ...props }) => {
        setErrors([])

        const { name, email, password, phone, date_of_birth, country, address, referral_code } = props

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name, phone, date_of_birth, country, address, referral_code: referral_code?.trim() || undefined },
            },
        })

        if (error) {
            setErrors({ email: [friendly(error.message)] })
            return false
        }
        return true
    }

    const login = async ({ setErrors, setStatus, email, password }) => {
        setErrors([])
        setStatus?.(null)

        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            setErrors({ email: [friendly(error.message)] })
            return false
        }
        await loadUser()
        return true
    }

    const forgotPassword = async ({ setErrors, setStatus, email }) => {
        setErrors([])
        setStatus(null)

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/password-reset`,
        })

        if (error) {
            setErrors({ email: [friendly(error.message)] })
        } else {
            setStatus('We emailed you a password reset link.')
        }
    }

    const resetPassword = async ({ setErrors, setStatus, password }) => {
        setErrors([])
        setStatus(null)

        const { error } = await supabase.auth.updateUser({ password })

        if (error) {
            setErrors({ password: [friendly(error.message)] })
        } else {
            router.push('/users?reset=1')
        }
    }

    const resendEmailVerification = async ({ setStatus }) => {
        const {
            data: { session },
        } = await supabase.auth.getSession()
        if (!session?.user?.email) return

        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: session.user.email,
        })
        setStatus?.(error ? error.message : 'Verification email sent.')
    }

    const logout = async () => {
        await supabase.auth.signOut()
        setUser(null)
        window.location.pathname = '/users'
    }

    useEffect(() => {
        if (loading) return
        if (middleware === 'guest' && redirectIfAuthenticated && user)
            router.push(redirectIfAuthenticated)
        if (middleware === 'auth' && user === null) router.push('/users')
    }, [user, loading, middleware, redirectIfAuthenticated, router])

    return {
        user,
        loading,
        register,
        login,
        logout,
        forgotPassword,
        resetPassword,
        resendEmailVerification,
    }
}
