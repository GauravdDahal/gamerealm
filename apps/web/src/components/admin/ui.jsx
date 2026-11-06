'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { X, Check, AlertTriangle, Inbox } from 'lucide-react'

/* Palette — kept here so pages import names, not hex codes.
   ink    #0C1714  page background, deep felt green
   felt   #132320  raised surface
   line   #1E322C  hairline borders
   brass  #D4AF57  the single accent
   bone   #EFE9DA  primary text
   muted  #7E938B  secondary text
   clay   #C25B45  destructive
*/

/* ---------------------------------------------------------------- buttons */

const variants = {
    primary:
        'bg-[#D4AF57] text-[#0C1714] hover:brightness-110 border-transparent font-medium',
    ghost: 'bg-transparent text-[#EFE9DA] hover:bg-[#1E322C] border-[#1E322C]',
    danger: 'bg-transparent text-[#C25B45] hover:bg-[#C25B45] hover:text-[#EFE9DA] border-[#C25B45]/40',
}

export const Button = ({
    children,
    variant = 'ghost',
    className = '',
    disabled,
    ...props
}) => (
    <button
        disabled={disabled}
        className={`inline-flex items-center justify-center gap-2 rounded border px-3 py-1.5 text-sm
            transition-colors duration-150 focus:outline-none focus-visible:ring-2
            focus-visible:ring-[#D4AF57] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C1714]
            disabled:cursor-not-allowed disabled:opacity-40
            ${variants[variant]} ${className}`}
        {...props}>
        {children}
    </button>
)

/* ----------------------------------------------------------------- inputs */

export const Field = ({ label, hint, error, children }) => (
    <label className="block">
        <span className="mb-1.5 block text-sm text-[#EFE9DA]">{label}</span>
        {children}
        {hint && !error && (
            <span className="mt-1 block text-xs text-[#7E938B]">{hint}</span>
        )}
        {error && <span className="mt-1 block text-xs text-[#C25B45]">{error}</span>}
    </label>
)

export const inputClass = `w-full rounded border border-[#1E322C] bg-[#0C1714] px-3 py-2 text-sm
    text-[#EFE9DA] placeholder-[#7E938B] focus:border-[#D4AF57] focus:outline-none`

export const Input = props => <input className={inputClass} {...props} />

export const Select = ({ children, ...props }) => (
    <select className={inputClass} {...props}>
        {children}
    </select>
)

/* ------------------------------------------------------------------ badge */

export const Badge = ({ children, tone = 'neutral' }) => {
    const tones = {
        neutral: 'border-[#1E322C] text-[#7E938B]',
        brass: 'border-[#D4AF57]/40 text-[#D4AF57]',
        clay: 'border-[#C25B45]/40 text-[#C25B45]',
    }
    return (
        <span
            className={`inline-block rounded-full border px-2 py-0.5 text-xs whitespace-nowrap ${tones[tone]}`}>
            {children}
        </span>
    )
}

/* ------------------------------------------------------------------ panel */

export const Panel = ({ title, action, children, className = '' }) => (
    <section
        className={`rounded border border-[#1E322C] bg-[#132320] ${className}`}>
        {(title || action) && (
            <header className="flex items-center justify-between gap-4 border-b border-[#1E322C] px-4 py-3">
                <h2 className="text-sm text-[#EFE9DA]">{title}</h2>
                {action}
            </header>
        )}
        {children}
    </section>
)

/* ------------------------------------------------------------ empty/error */

export const EmptyState = ({ message, action }) => (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <Inbox size={22} className="text-[#1E322C]" strokeWidth={1.5} />
        <p className="max-w-sm text-sm text-[#7E938B]">{message}</p>
        {action}
    </div>
)

export const ErrorState = ({ message, onRetry }) => (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <AlertTriangle size={22} className="text-[#C25B45]" strokeWidth={1.5} />
        <p className="max-w-sm text-sm text-[#EFE9DA]">{message}</p>
        {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
)

export const Skeleton = ({ rows = 5 }) => (
    <div className="space-y-2 p-4" aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded bg-[#1E322C]/50" />
        ))}
    </div>
)

/* ------------------------------------------------------------------ table */

export const Table = ({ head, children }) => (
    <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
            <thead>
                <tr className="border-b border-[#1E322C] text-left">
                    {head.map(h => (
                        <th
                            key={h}
                            className="px-4 py-2.5 font-normal text-[#7E938B] whitespace-nowrap">
                            {h}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>{children}</tbody>
        </table>
    </div>
)

export const Row = ({ children }) => (
    <tr className="border-b border-[#1E322C]/60 last:border-0 hover:bg-[#0C1714]/50">
        {children}
    </tr>
)

export const Cell = ({ children, className = '' }) => (
    <td className={`px-4 py-3 align-middle text-[#EFE9DA] ${className}`}>{children}</td>
)

/* ------------------------------------------------------------------ modal */

export const Modal = ({ open, title, onClose, children, footer }) => {
    useEffect(() => {
        if (!open) return
        const onKey = e => e.key === 'Escape' && onClose()
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [open, onClose])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/70"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="relative z-10 w-full max-w-lg rounded border border-[#1E322C] bg-[#132320] shadow-2xl">
                <header className="flex items-center justify-between border-b border-[#1E322C] px-4 py-3">
                    <h2 className="text-sm text-[#EFE9DA]">{title}</h2>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded p-1 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA]">
                        <X size={16} />
                    </button>
                </header>
                <div className="max-h-[65vh] overflow-y-auto px-4 py-4">{children}</div>
                {footer && (
                    <footer className="flex justify-end gap-2 border-t border-[#1E322C] px-4 py-3">
                        {footer}
                    </footer>
                )}
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ toast */

const ToastContext = createContext(() => {})
export const useToast = () => useContext(ToastContext)

export const ToastProvider = ({ children }) => {
    const [items, setItems] = useState([])

    const push = useCallback((message, tone = 'ok') => {
        const id = Date.now() + Math.random()
        setItems(list => [...list, { id, message, tone }])
        setTimeout(() => setItems(list => list.filter(t => t.id !== id)), 4000)
    }, [])

    return (
        <ToastContext.Provider value={push}>
            {children}
            <div
                className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2"
                aria-live="polite">
                {items.map(t => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-center gap-2 rounded border px-3 py-2 text-sm shadow-lg
                            ${
                                t.tone === 'error'
                                    ? 'border-[#C25B45]/50 bg-[#2A1512] text-[#EFE9DA]'
                                    : 'border-[#D4AF57]/40 bg-[#132320] text-[#EFE9DA]'
                            }`}>
                        {t.tone === 'error' ? (
                            <AlertTriangle size={14} className="text-[#C25B45]" />
                        ) : (
                            <Check size={14} className="text-[#D4AF57]" />
                        )}
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

/* ------------------------------------------------------------ confirmation */

export const ConfirmDialog = ({ open, title, body, confirmLabel, onConfirm, onClose, busy }) => (
    <Modal
        open={open}
        title={title}
        onClose={onClose}
        footer={
            <>
                <Button onClick={onClose} disabled={busy}>
                    Cancel
                </Button>
                <Button variant="danger" onClick={onConfirm} disabled={busy}>
                    {busy ? 'Working…' : confirmLabel}
                </Button>
            </>
        }>
        <p className="text-sm leading-relaxed text-[#7E938B]">{body}</p>
    </Modal>
)
