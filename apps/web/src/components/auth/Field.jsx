'use client'

import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * One labelled form field for the sign-in and sign-up pages: label, input,
 * optional hint, error, and a show/hide toggle for passwords.
 */
export default function Field({ label, hint, error, type = 'text', id, className = '', optional = false, ...props }) {
    const autoId = useId()
    const fieldId = id || autoId
    const [show, setShow] = useState(false)
    const isPassword = type === 'password'
    const describedBy = [hint && `${fieldId}-hint`, error && `${fieldId}-error`].filter(Boolean).join(' ') || undefined

    return (
        <div className={`auth-field ${className}`}>
            <label htmlFor={fieldId}>
                {label}
                {optional && <span className="auth-optional"> (optional)</span>}
            </label>
            <div className="auth-input-wrap">
                <input
                    id={fieldId}
                    type={isPassword && show ? 'text' : type}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        className="auth-eye"
                        onClick={() => setShow(v => !v)}
                        aria-label={show ? 'Hide password' : 'Show password'}
                        aria-pressed={show}>
                        {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    </button>
                )}
            </div>
            {hint && !error && (
                <p id={`${fieldId}-hint`} className="auth-hint">
                    {hint}
                </p>
            )}
            {error && (
                <p id={`${fieldId}-error`} className="auth-error">
                    {error}
                </p>
            )}
        </div>
    )
}
