'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fraunces, Inter } from 'next/font/google'
import {
    LayoutGrid,
    ShieldCheck,
    Users,
    KeyRound,
    ScrollText,
    Images,
    UserCheck,
    MessageCircle,
    Zap,
    Gamepad2,
    Gift,
    UserPlus,
    QrCode,
    Server,
    PencilLine,
    Palette,
    Bell,
    BellOff,
    LogOut,
    Menu,
} from 'lucide-react'
import LowBalanceBanner from '@/components/admin/LowBalanceBanner'
import { createClient } from '@/lib/supabase/client'
import { ToastProvider, useToast } from '@/components/admin/ui'
import { useAdminChatAlerts } from '@/lib/useAdminChatAlerts'

const fraunces = Fraunces({
    subsets: ['latin'],
    weight: ['600'],
    display: 'swap',
    variable: '--font-display',
})
const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-ui',
})

const nav = [
    { href: '/admin', label: 'Overview', icon: LayoutGrid },
    { href: '/admin/users', label: 'Admin users', icon: ShieldCheck },
    { href: '/admin/registrations', label: 'Registrations', icon: UserCheck },
    { href: '/admin/clients', label: 'Players', icon: Users },
    { href: '/admin/chats', label: 'Chats', icon: MessageCircle },
    { href: '/admin/quick-replies', label: 'Saved replies', icon: Zap },
    { href: '/admin/roles', label: 'Roles', icon: KeyRound },
    { href: '/admin/activity', label: 'Activity', icon: ScrollText },
    { href: '/admin/banners', label: 'Banners', icon: Images },
    { href: '/admin/games', label: 'Games', icon: Gamepad2 },
    { href: '/admin/wheel', label: 'Lucky wheel', icon: Gift },
    { href: '/admin/qr-codes', label: 'QR codes', icon: QrCode },
    { href: '/admin/providers', label: 'Game providers', icon: Server },
    { href: '/admin/referrals', label: 'Referrals', icon: UserPlus },
    { href: '/admin/site', label: 'Site content', icon: PencilLine },
    { href: '/admin/theme', label: 'Site theme', icon: Palette },
]

/* Deliberately not using useAuth({ middleware: 'auth' }).
   That hook redirects to /verify-email whenever `user` is falsy, which includes
   the moment before SWR has resolved — so every visit to /admin would bounce.
   Checking the session here keeps this section self-contained. */
const Shell = ({ children }) => {
    const [status, setStatus] = useState('loading') // loading | ready | anon
    const [user, setUser] = useState(null)
    const pathname = usePathname()
    const [navOpen, setNavOpen] = useState(false)
    const supabase = createClient()
    const toast = useToast()
    const alerts = useAdminChatAlerts({
        staffId: status === 'ready' ? user?.id : null,
        onChatsPage: pathname.startsWith('/admin/chats'),
    })

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession()

            if (!session) {
                if (!cancelled) setStatus('anon')
                return
            }

            const { data, error } = await supabase.rpc('my_access')
            if (cancelled) return

            if (error || !data?.profile) {
                setStatus('anon')
                return
            }

            const roles = data.roles ?? []
            setUser({
                ...data.profile,
                is_admin: data.is_staff,
                is_superadmin: roles.includes('super-admin'),
            })
            setStatus('ready')
        }

        load()
        return () => {
            cancelled = true
        }
    }, [supabase])

    useEffect(() => setNavOpen(false), [pathname])

    const signOut = async () => {
        await supabase.auth.signOut()
        window.location.href = '/users'
    }

    if (status === 'loading') {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-sm text-[#7E938B]">Checking your session…</p>
            </div>
        )
    }

    if (status === 'anon') {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
                <h1 className="text-lg text-[#EFE9DA]">Sign in to continue</h1>
                <p className="max-w-sm text-sm text-[#7E938B]">
                    The back office needs a staff account.
                </p>
                <Link
                    href="/users"
                    className="rounded border border-[#D4AF57] bg-[#D4AF57] px-3 py-1.5 text-sm text-[#0C1714]">
                    Go to sign in
                </Link>
            </div>
        )
    }

    if (!user?.is_admin && !user?.is_superadmin) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
                <h1 className="text-lg text-[#EFE9DA]">This area is for staff accounts</h1>
                <p className="max-w-sm text-sm text-[#7E938B]">
                    You&rsquo;re signed in as {user?.email}, which doesn&rsquo;t have admin
                    access.
                </p>
                <div className="flex gap-2">
                    <Link
                        href="/"
                        className="rounded border border-[#1E322C] px-3 py-1.5 text-sm text-[#EFE9DA] hover:bg-[#1E322C]">
                        Back to the site
                    </Link>
                    <button
                        onClick={signOut}
                        className="rounded border border-[#1E322C] px-3 py-1.5 text-sm text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA]">
                        Sign out
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex">
            {/* -------------------------------------------------------- sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-[#1E322C]
                    bg-[#0C1714] transition-transform duration-200 lg:translate-x-0
                    ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center gap-2.5 border-b border-[#1E322C] px-5 py-4">
                    <span className="text-lg leading-none text-[#D4AF57]" aria-hidden="true">
                        &spades;
                    </span>
                    <span
                        className="text-[17px] tracking-tight text-[#EFE9DA]"
                        style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                        Back office
                    </span>
                </div>

                <nav className="flex-1 space-y-0.5 px-3 py-4">
                    {nav.map(({ href, label, icon: Icon }) => {
                        const active =
                            href === '/admin'
                                ? pathname === '/admin'
                                : pathname.startsWith(href)
                        return (
                            <Link
                                key={href}
                                href={href}
                                aria-current={active ? 'page' : undefined}
                                className={`flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors
                                    ${
                                        active
                                            ? 'bg-[#132320] text-[#D4AF57]'
                                            : 'text-[#7E938B] hover:bg-[#132320] hover:text-[#EFE9DA]'
                                    }`}>
                                <Icon size={16} strokeWidth={1.75} />
                                <span className="flex-1">{label}</span>
                                {href === '/admin/chats' && alerts.unread > 0 && (
                                    <span className="rounded-full bg-[#D4AF57] px-1.5 text-[11px] font-semibold leading-5 text-[#0C1714]">
                                        {alerts.unread > 99 ? '99+' : alerts.unread}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                <div className="border-t border-[#1E322C] px-3 py-3">
                    <div className="px-2 pb-2">
                        <p className="truncate text-sm text-[#EFE9DA]">{user.name}</p>
                        <p className="truncate text-xs text-[#7E938B]">{user.email}</p>
                    </div>
                    {alerts.allowed && (
                        <button
                            onClick={async () => {
                                const problem = await alerts.toggleAlerts()
                                if (problem) toast(problem, 'error')
                            }}
                            className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm text-[#7E938B] hover:bg-[#132320] hover:text-[#EFE9DA]">
                            {alerts.alertsOn ? <Bell size={16} strokeWidth={1.75} className="text-[#D4AF57]" /> : <BellOff size={16} strokeWidth={1.75} />}
                            {alerts.alertsOn ? 'Alerts on' : 'Turn on alerts'}
                        </button>
                    )}
                    <button
                        onClick={signOut}
                        className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm text-[#7E938B] hover:bg-[#132320] hover:text-[#EFE9DA]">
                        <LogOut size={16} strokeWidth={1.75} />
                        Sign out
                    </button>
                </div>
            </aside>

            {navOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 lg:hidden"
                    onClick={() => setNavOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* ----------------------------------------------------------- main */}
            <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
                <header className="flex items-center gap-3 border-b border-[#1E322C] px-4 py-3 lg:hidden">
                    <button
                        onClick={() => setNavOpen(v => !v)}
                        aria-label="Toggle navigation"
                        aria-expanded={navOpen}
                        className="rounded border border-[#1E322C] p-1.5 text-[#EFE9DA]">
                        <Menu size={16} />
                    </button>
                    <span
                        className="text-[15px]"
                        style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                        Back office
                    </span>
                </header>

                <LowBalanceBanner />
                <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    {children}
                </main>
            </div>
        </div>
    )
}

const scrollbarCss = `
    html:has(.admin-root) { scrollbar-width: thin; scrollbar-color: #35503f #0C1714; }
    .admin-root * { scrollbar-width: thin; scrollbar-color: #35503f transparent; }
    html:has(.admin-root)::-webkit-scrollbar, .admin-root *::-webkit-scrollbar { width: 8px; height: 8px; }
    html:has(.admin-root)::-webkit-scrollbar-track { background: #0C1714; }
    .admin-root *::-webkit-scrollbar-track { background: transparent; }
    html:has(.admin-root)::-webkit-scrollbar-thumb, .admin-root *::-webkit-scrollbar-thumb { background: #35503f; border-radius: 8px; border: 2px solid #0C1714; }
    html:has(.admin-root)::-webkit-scrollbar-thumb:hover, .admin-root *::-webkit-scrollbar-thumb:hover { background: #D4AF57; }
`

const AdminLayout = ({ children }) => (
    <ToastProvider>
        <style>{scrollbarCss}</style>
        <div
            className={`admin-root ${fraunces.variable} ${inter.variable} min-h-screen bg-[#0C1714] text-[#EFE9DA]`}
            style={{ fontFamily: 'var(--font-ui), system-ui, sans-serif' }}>
            <Shell>{children}</Shell>
        </div>
    </ToastProvider>
)

export default AdminLayout
