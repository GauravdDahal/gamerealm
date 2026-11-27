'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/auth'

/** Google sign-ups land here once to give their date of birth (18+). */
export default function CompleteProfile() {
    const router = useRouter()
    const { user, loading } = useAuth()
    const [dob, setDob] = useState('')
    const [phone, setPhone] = useState('')
    const [country, setCountry] = useState('')
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (loading) return
        if (!user) router.replace('/users')
        else if (user.date_of_birth) router.replace(user.is_approved ? '/' : '/account-pending')
    }, [user, loading, router])

    const save = async e => {
        e.preventDefault()
        setError('')
        setSaving(true)
        const { error: err } = await createClient().rpc('complete_profile', { p_dob: dob, p_phone: phone, p_country: country })
        setSaving(false)
        if (err) {
            setError(err.message?.includes('18') ? 'You must be at least 18 years old to play.' : 'Could not save. Please try again.')
            return
        }
        window.location.assign('/account-pending')
    }

    const max = new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0, 10)

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-900 px-4 py-12 text-white">
            <form onSubmit={save} className="w-full max-w-md space-y-6 rounded-2xl border border-line bg-surface p-6 sm:p-8">
                <div>
                    <p className="eyebrow flex items-center gap-2">
                        <CalendarCheck className="h-4 w-4" aria-hidden="true" /> Almost done
                    </p>
                    <h1 className="font-display text-4xl leading-tight text-ink">One last step</h1>
                    <p className="mt-2 text-muted">
                        {user?.name ? `Hi ${user.name.split(' ')[0]}! ` : ''}Players must be 18 or older. Add your details to finish signing up.
                    </p>
                </div>
                <label className="block text-sm">
                    <span className="text-ink">Date of birth</span>
                    <input type="date" required max={max} value={dob} onChange={e => setDob(e.target.value)}
                        className="mt-2 h-12 w-full rounded-lg border border-line bg-night px-4 text-ink focus:border-accent focus:outline-none" />
                </label>
                <label className="block text-sm">
                    <span className="text-ink">Phone (optional)</span>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel"
                        className="mt-2 h-12 w-full rounded-lg border border-line bg-night px-4 text-ink focus:border-accent focus:outline-none" />
                </label>
                <label className="block text-sm">
                    <span className="text-ink">Country (optional)</span>
                    <input value={country} onChange={e => setCountry(e.target.value)} autoComplete="country-name"
                        className="mt-2 h-12 w-full rounded-lg border border-line bg-night px-4 text-ink focus:border-accent focus:outline-none" />
                </label>
                {error && <p role="alert" className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>}
                <button type="submit" disabled={saving} className="btn btn-primary btn-lg btn-block">
                    {saving ? 'Saving…' : 'Finish signing up'}
                </button>
            </form>
        </main>
    )
}
