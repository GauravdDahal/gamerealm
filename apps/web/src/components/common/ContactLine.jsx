/**
 * One contact line from the footer. Emails open the mail app, phone numbers
 * start a call, everything else (an address) is plain text.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\+?[\d\s().-]{7,}$/

export default function ContactLine({ text, className = '' }) {
    const t = (text ?? '').trim()
    if (EMAIL.test(t)) {
        return <a href={`mailto:${t}`} className={`hover:text-accent hover:underline ${className}`}>{t}</a>
    }
    if (PHONE.test(t)) {
        return <a href={`tel:${t.replace(/[^\d+]/g, '')}`} className={`hover:text-accent hover:underline ${className}`}>{t}</a>
    }
    return <span className={className}>{t}</span>
}
