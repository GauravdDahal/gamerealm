'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { adminApi, errorMessage } from '@/lib/adminApi'
import {
    Badge,
    Button,
    Cell,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    Field,
    Input,
    Modal,
    Panel,
    Row,
    Select,
    Skeleton,
    Table,
    useToast,
} from '@/components/admin/ui'

const blank = { name: '', email: '', role_name: '' }

const AdminUsers = () => {
    const toast = useToast()
    const [users, setUsers] = useState([])
    const [roles, setRoles] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [form, setForm] = useState(blank)
    const [editing, setEditing] = useState(null) // user object, or null for "create"
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [fieldError, setFieldError] = useState(null)

    const [confirming, setConfirming] = useState(null)
    const [deleting, setDeleting] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [list, roleOpts] = await Promise.all([
                adminApi.admins(),
                adminApi.roleOptions(),
            ])
            setUsers(list?.adminUsers ?? [])
            setRoles(Array.isArray(roleOpts) ? roleOpts : [])
        } catch (e) {
            setError(errorMessage(e, 'Could not load admin users.'))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const openCreate = () => {
        setEditing(null)
        setForm(blank)
        setFieldError(null)
        setOpen(true)
    }

    const openEdit = user => {
        setEditing(user)
        setForm({
            name: user.name ?? '',
            email: user.email ?? '',
            role_name: user.roles?.[0]?.name ?? '',
        })
        setFieldError(null)
        setOpen(true)
    }

    const save = async () => {
        setSaving(true)
        setFieldError(null)
        try {
            if (editing) {
                await adminApi.updateUser(editing.id, form)
                toast('Changes saved.')
            } else {
                await adminApi.createUser(form)
                // Password is generated server-side and emailed. MAIL_MAILER=log in dev,
                // so it lands in storage/logs/laravel.log rather than an inbox.
                toast('User created. Invite written to the mail log.')
            }
            setOpen(false)
            load()
        } catch (e) {
            setFieldError(errorMessage(e, 'Could not save this user.'))
        } finally {
            setSaving(false)
        }
    }

    const remove = async () => {
        setDeleting(true)
        try {
            await adminApi.deleteUser(confirming.id)
            toast('User deleted.')
            setConfirming(null)
            load()
        } catch (e) {
            toast(errorMessage(e, 'Could not delete this user.'), 'error')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1
                        className="text-2xl text-[#EFE9DA]"
                        style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                        Admin users
                    </h1>
                    <p className="mt-1 text-sm text-[#7E938B]">
                        Staff accounts with access to this back office.
                    </p>
                </div>
                <Button variant="primary" onClick={openCreate}>
                    <Plus size={15} />
                    Add admin
                </Button>
            </div>

            <Panel>
                {loading ? (
                    <Skeleton />
                ) : error ? (
                    <ErrorState message={error} onRetry={load} />
                ) : users.length === 0 ? (
                    <EmptyState
                        message="No admin users yet."
                        action={
                            <Button variant="primary" onClick={openCreate}>
                                Add the first one
                            </Button>
                        }
                    />
                ) : (
                    <Table head={['Name', 'Email', 'Role', 'Level', '']}>
                        {users.map(u => (
                            <Row key={u.id}>
                                <Cell>{u.name}</Cell>
                                <Cell className="text-[#7E938B]">{u.email}</Cell>
                                <Cell>
                                    {u.roles?.length ? (
                                        <span className="flex flex-wrap gap-1">
                                            {u.roles.map(r => (
                                                <Badge key={r.id} tone="brass">
                                                    {r.name}
                                                </Badge>
                                            ))}
                                        </span>
                                    ) : (
                                        <Badge>none</Badge>
                                    )}
                                </Cell>
                                <Cell>
                                    {u.is_superadmin ? (
                                        <Badge tone="brass">Super admin</Badge>
                                    ) : (
                                        <Badge>Admin</Badge>
                                    )}
                                </Cell>
                                <Cell className="text-right whitespace-nowrap">
                                    <span className="inline-flex gap-1">
                                        <button
                                            onClick={() => openEdit(u)}
                                            disabled={!!u.is_superadmin}
                                            title={
                                                u.is_superadmin
                                                    ? 'Super admins cannot be edited'
                                                    : 'Edit'
                                            }
                                            aria-label={`Edit ${u.name}`}
                                            className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA] disabled:cursor-not-allowed disabled:opacity-30">
                                            <Pencil size={15} />
                                        </button>
                                        <button
                                            onClick={() => setConfirming(u)}
                                            disabled={!!u.is_superadmin}
                                            title={
                                                u.is_superadmin
                                                    ? 'Super admins cannot be deleted'
                                                    : 'Delete'
                                            }
                                            aria-label={`Delete ${u.name}`}
                                            className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#C25B45] disabled:cursor-not-allowed disabled:opacity-30">
                                            <Trash2 size={15} />
                                        </button>
                                    </span>
                                </Cell>
                            </Row>
                        ))}
                    </Table>
                )}
            </Panel>

            <Modal
                open={open}
                title={editing ? `Edit ${editing.name}` : 'Add admin user'}
                onClose={() => setOpen(false)}
                footer={
                    <>
                        <Button onClick={() => setOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={save}
                            disabled={
                                saving || !form.name || !form.email || !form.role_name
                            }>
                            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create user'}
                        </Button>
                    </>
                }>
                <div className="space-y-4">
                    <Field label="Name">
                        <Input
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="Jane Doe"
                        />
                    </Field>
                    <Field label="Email">
                        <Input
                            type="email"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            placeholder="jane@example.com"
                        />
                    </Field>
                    <Field
                        label="Role"
                        hint={
                            roles.length === 0
                                ? 'No roles exist yet — create one under Roles first.'
                                : undefined
                        }
                        error={fieldError}>
                        <Select
                            value={form.role_name}
                            onChange={e =>
                                setForm({ ...form, role_name: e.target.value })
                            }>
                            <option value="">Choose a role</option>
                            {roles.map(r => (
                                <option key={r.id} value={r.name}>
                                    {r.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    {!editing && (
                        <p className="text-xs leading-relaxed text-[#7E938B]">
                            A password is generated automatically and emailed to this
                            address. In local development mail goes to
                            storage/logs/laravel.log.
                        </p>
                    )}
                </div>
            </Modal>

            <ConfirmDialog
                open={!!confirming}
                title="Delete this user?"
                body={`${confirming?.name} will lose access immediately. This cannot be undone.`}
                confirmLabel="Delete user"
                busy={deleting}
                onConfirm={remove}
                onClose={() => setConfirming(null)}
            />
        </div>
    )
}

export default AdminUsers
