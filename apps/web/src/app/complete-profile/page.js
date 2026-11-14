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
            <form onSubmit={save} className="w-full max-w-md space-y-5 rounded-2xl border border-line/60 bg-surface/70 p-6 sm:p-8">
                <div>
                    <CalendarCheck className="h-8 w-8 text-accent" />
                    <h1 className="mt-3 text-2xl font-bold text-ink">One last step</h1>
                    <p className="mt-1 text-sm text-muted">
                        {user?.name ? `Hi ${user.name.split(' ')[0]}! ` : ''}Players must be 18 or older. Add your details to finish signing up.
                    </p>
                </div>
                <label className="block text-sm">
                    <span className="text-ink">Date of birth</span>
                    <input type="date" required max={max} value={dob} onChange={e => setDob(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-line bg-night px-3 py-2.5 text-ink focus:border-accent focus:outline-none" />
                </label>
                <label className="block text-sm">
                    <span className="text-ink">Phone (optional)</span>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel"
                        className="mt-1 w-full rounded-lg border border-line bg-night px-3 py-2.5 text-ink focus:border-accent focus:outline-none" />
                </label>
                <label className="block text-sm">
                    <span className="text-ink">Country (optional)</span>
                    <input value={country} onChange={e => setCountry(e.target.value)} autoComplete="country-name"
                        className="mt-1 w-full rounded-lg border border-line bg-night px-3 py-2.5 text-ink focus:border-accent focus:outline-none" />
                </label>
                {error && <p role="alert" className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>}
                <button type="submit" disabled={saving}
                    className="w-full rounded-xl bg-accent px-4 py-3 font-bold text-accent-ink hover:bg-accent2 disabled:opacity-60">
                    {saving ? 'Saving…' : 'Finish signing up'}
                </button>
            </form>
        </main>
    )
}
