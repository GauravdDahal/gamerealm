import AdminShell from '@/components/admin/AdminShell'

export const metadata = {
    title: { absolute: 'Admin | Casino Play' },
    description: 'Casino Play administration.',
    robots: { index: false, follow: false },
}

export default function Layout({ children }) {
    return <AdminShell>{children}</AdminShell>
}
