'use client'

import Button from '@/components/Button'
import Input from '@/components/Input'
import InputError from '@/components/InputError'
import Label from '@/components/Label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/hooks/auth'

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
        phone: '',
        date_of_birth: '',
        country: '',
        address: '',
        password: '',
        password_confirmation: '',
    })
    const [errors, setErrors] = useState({})
    const [submitting, setSubmitting] = useState(false)

    const set = key => event => setForm({ ...form, [key]: event.target.value })

    const submitForm = async event => {
        event.preventDefault()
        setErrors({})

        if (form.password !== form.password_confirmation) {
            setErrors({ password_confirmation: ['Passwords do not match.'] })
            return
        }
        if (form.password.length < 8) {
            setErrors({ password: ['Password must be at least 8 characters.'] })
            return
        }

        setSubmitting(true)
        const ok = await register({ setErrors, ...form })
        setSubmitting(false)

        if (ok) {
            // Account exists but is pending; the gate handles what they see next.
            router.push('/account-pending')
        }
    }

    return (
        <div className="auth-content auth-register-content">
        <div className="auth-heading">
            <span className="auth-eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
            <h2>Join the <em>play.</em></h2>
            <p>Create your account and get ready to take your seat.</p>
        </div>
        <form className="auth-form auth-register-form" onSubmit={submitForm}>
            <p className="auth-notice">
                Every account is checked by our team before it goes live. You&rsquo;ll
                get access once it&rsquo;s approved.
            </p>

            <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                    id="name"
                    type="text"
                    value={form.name}
                    className="block mt-1 w-full"
                    onChange={set('name')}
                    required
                    autoFocus
                />
                <InputError messages={errors.name} className="mt-2" />
            </div>

            <div className="mt-4">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    value={form.email}
                    className="block mt-1 w-full"
                    onChange={set('email')}
                    required
                />
                <InputError messages={errors.email} className="mt-2" />
            </div>

            <div className="mt-4">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    className="block mt-1 w-full"
                    onChange={set('phone')}
                    required
                    placeholder="+977 98X XXX XXXX"
                />
                <InputError messages={errors.phone} className="mt-2" />
            </div>

            <div className="mt-4">
                <Label htmlFor="date_of_birth">Date of birth</Label>
                <Input
                    id="date_of_birth"
                    type="date"
                    value={form.date_of_birth}
                    className="block mt-1 w-full"
                    onChange={set('date_of_birth')}
                    max={maxDob()}
                    required
                />
                <p className="mt-1 text-xs text-gray-500">
                    You must be 18 or over to open an account.
                </p>
                <InputError messages={errors.date_of_birth} className="mt-2" />
            </div>

            <div className="mt-4">
                <Label htmlFor="country">Country</Label>
                <Input
                    id="country"
                    type="text"
                    value={form.country}
                    className="block mt-1 w-full"
                    onChange={set('country')}
                    required
                />
                <InputError messages={errors.country} className="mt-2" />
            </div>

            <div className="mt-4">
                <Label htmlFor="address">Address</Label>
                <Input
                    id="address"
                    type="text"
                    value={form.address}
                    className="block mt-1 w-full"
                    onChange={set('address')}
                    required
                />
                <InputError messages={errors.address} className="mt-2" />
            </div>

            <div className="mt-4">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    type="password"
                    value={form.password}
                    className="block mt-1 w-full"
                    onChange={set('password')}
                    required
                    autoComplete="new-password"
                />
                <InputError messages={errors.password} className="mt-2" />
            </div>

            <div className="mt-4">
                <Label htmlFor="password_confirmation">Confirm password</Label>
                <Input
                    id="password_confirmation"
                    type="password"
                    value={form.password_confirmation}
                    className="block mt-1 w-full"
                    onChange={set('password_confirmation')}
                    required
                />
                <InputError
                    messages={errors.password_confirmation}
                    className="mt-2"
                />
            </div>

            <div className="flex items-center justify-end mt-5">
                <Button disabled={submitting}>
                    {submitting ? 'Creating…' : 'Create account'}
                </Button>
            </div>
        </form>
        <div className="auth-switch">Already have an account? <Link href="/login">Sign in <span>→</span></Link></div>
        </div>
    )
}

export default Page
