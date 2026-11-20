import AdminShell from '@/components/admin/AdminShell'

export const metadata = {
    title: { absolute: 'Admin | Thunder Sweeps' },
    description: 'Thunder Sweeps administration.',
    robots: { index: false, follow: false },
}

export default function Layout({ children }) {
    return <AdminShell>{children}</AdminShell>
}
