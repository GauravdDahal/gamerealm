'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { adminApi, errorMessage } from '@/lib/adminApi'
import {
    Badge,
    Button,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    Field,
    Input,
    Modal,
    Panel,
    Skeleton,
    useToast,
} from '@/components/admin/ui'

/* Permissions are named "<resource>-<action>", where resource may itself contain
   an underscore (admin_user-view, activity_log-clear). Split on the LAST hyphen. */
const splitPermission = name => {
    const i = name.lastIndexOf('-')
    return i === -1
        ? { resource: name, action: name }
        : { resource: name.slice(0, i), action: name.slice(i + 1) }
}

const prettyResource = r => {
    const words = r.replace(/_/g, ' ')
    return words.charAt(0).toUpperCase() + words.slice(1)
}

const Roles = () => {
    const toast = useToast()
    const [roles, setRoles] = useState([])
    const [permissions, setPermissions] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [open, setOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [name, setName] = useState('')
    const [checked, setChecked] = useState([])
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState(null)

    const [confirming, setConfirming] = useState(null)
    const [deleting, setDeleting] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [r, p] = await Promise.all([adminApi.roles(), adminApi.permissions()])
            setRoles(r?.roles ?? [])
            setPermissions(p?.permissions ?? [])
        } catch (e) {
            setError(
                errorMessage(
                    e,
                    'Could not load roles. This needs the role-view permission.',
                ),
            )
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    // Group the flat permission list into resource sections for the matrix.
    const grouped = useMemo(() => {
        const map = new Map()
        permissions.forEach(p => {
            const { resource, action } = splitPermission(p.name)
            if (!map.has(resource)) map.set(resource, [])
            map.get(resource).push({ ...p, action })
        })
        return Array.from(map.entries())
    }, [permissions])

    const openCreate = () => {
        setEditing(null)
        setName('')
        setChecked([])
        setFormError(null)
        setOpen(true)
    }

    const openEdit = role => {
        setEditing(role)
        setName(role.name)
        setChecked((role.permissions ?? []).map(p => p.name))
        setFormError(null)
        setOpen(true)
    }

    const toggle = permName =>
        setChecked(list =>
            list.includes(permName)
                ? list.filter(n => n !== permName)
                : [...list, permName],
        )

    const toggleGroup = (resource, perms) => {
        const names = perms.map(p => p.name)
        const allOn = names.every(n => checked.includes(n))
        setChecked(list =>
            allOn
                ? list.filter(n => !names.includes(n))
                : [...new Set([...list, ...names])],
        )
    }

    const save = async () => {
        setSaving(true)
        setFormError(null)
        try {
            if (editing) {
                // The update endpoint only accepts permissions — the name is fixed.
                await adminApi.updateRole({
                    role_id: editing.id,
                    permissions: checked,
                })
                toast('Role updated.')
            } else {
                await adminApi.createRole({ name, permissions: checked })
                toast('Role created.')
            }
            setOpen(false)
            load()
        } catch (e) {
            setFormError(errorMessage(e, 'Could not save this role.'))
        } finally {
            setSaving(false)
        }
    }

    const remove = async () => {
        setDeleting(true)
        try {
            await adminApi.deleteRole(confirming.id)
            toast('Role deleted.')
            setConfirming(null)
            load()
        } catch (e) {
            // Backend refuses if the role is still assigned to anyone.
            toast(errorMessage(e, 'Could not delete this role.'), 'error')
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
                        Roles
                    </h1>
                    <p className="mt-1 text-sm text-[#7E938B]">
                        What each group of staff is allowed to do.
                    </p>
                </div>
                <Button variant="primary" onClick={openCreate}>
                    <Plus size={15} />
                    New role
                </Button>
            </div>

            {loading ? (
                <Panel>
                    <Skeleton />
                </Panel>
            ) : error ? (
                <Panel>
                    <ErrorState message={error} onRetry={load} />
                </Panel>
            ) : roles.length === 0 ? (
                <Panel>
                    <EmptyState
                        message="No roles defined yet."
                        action={
                            <Button variant="primary" onClick={openCreate}>
                                Create one
                            </Button>
                        }
                    />
                </Panel>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {roles.map(role => (
                        <Panel
                            key={role.id}
                            title={role.name}
                            action={
                                <span className="inline-flex gap-1">
                                    <button
                                        onClick={() => openEdit(role)}
                                        aria-label={`Edit ${role.name}`}
                                        className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#EFE9DA]">
                                        <Pencil size={15} />
                                    </button>
                                    <button
                                        onClick={() => setConfirming(role)}
                                        aria-label={`Delete ${role.name}`}
                                        className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#C25B45]">
                                        <Trash2 size={15} />
                                    </button>
                                </span>
                            }>
                            <div className="px-4 py-4">
                                {role.permissions?.length ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {role.permissions.map(p => (
                                            <Badge key={p.id}>{p.name}</Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-[#7E938B]">
                                        No permissions granted.
                                    </p>
                                )}
                            </div>
                        </Panel>
                    ))}
                </div>
            )}

            <Modal
                open={open}
                title={editing ? `Edit ${editing.name}` : 'New role'}
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
                                saving || checked.length === 0 || (!editing && !name.trim())
                            }>
                            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create role'}
                        </Button>
                    </>
                }>
                <div className="space-y-5">
                    {editing ? (
                        <p className="text-xs text-[#7E938B]">
                            Role names can&rsquo;t be changed after creation.
                        </p>
                    ) : (
                        <Field label="Role name">
                            <Input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="floor-manager"
                            />
                        </Field>
                    )}

                    {formError && (
                        <p className="rounded border border-[#C25B45]/40 bg-[#2A1512] px-3 py-2 text-xs text-[#EFE9DA]">
                            {formError}
                        </p>
                    )}

                    <div className="space-y-4">
                        {grouped.map(([resource, perms]) => {
                            const allOn = perms.every(p => checked.includes(p.name))
                            return (
                                <div
                                    key={resource}
                                    className="rounded border border-[#1E322C] p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-sm text-[#EFE9DA]">
                                            {prettyResource(resource)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => toggleGroup(resource, perms)}
                                            className="text-xs text-[#7E938B] underline-offset-2 hover:text-[#D4AF57] hover:underline">
                                            {allOn ? 'Clear' : 'Select all'}
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                                        {perms.map(p => (
                                            <label
                                                key={p.id}
                                                className="flex cursor-pointer items-center gap-2 text-sm text-[#7E938B] hover:text-[#EFE9DA]">
                                                <input
                                                    type="checkbox"
                                                    checked={checked.includes(p.name)}
                                                    onChange={() => toggle(p.name)}
                                                    className="h-3.5 w-3.5 accent-[#D4AF57]"
                                                />
                                                {p.action}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                open={!!confirming}
                title="Delete this role?"
                body={`${confirming?.name} will be removed. Roles still assigned to a user can't be deleted.`}
                confirmLabel="Delete role"
                busy={deleting}
                onConfirm={remove}
                onClose={() => setConfirming(null)}
            />
        </div>
    )
}

export default Roles
