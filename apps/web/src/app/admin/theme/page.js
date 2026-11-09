'use client'

import { useEffect, useState } from 'react'
import { mutate as globalMutate } from 'swr'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SITE_CONTENT_KEY, useSiteContent } from '@/lib/useSiteContent'
import { THEMES } from '@/lib/themes.mjs'
import { Button, Panel, useToast } from '@/components/admin/ui'

const SWATCHES = ['night', 'surface2', 'secondary', 'accent', 'accent2', 'ink']

const Preview = ({ theme }) => {
    const t = theme.tokens
    return (
        <div className="overflow-hidden rounded-lg border border-[#1E322C]" style={{ background: t.night }}>
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: t.surface }}>
                <span className="h-2 w-2 rounded-full" style={{ background: t.accent }} />
                <span className="h-1.5 w-10 rounded" style={{ background: t.muted, opacity: 0.6 }} />
                <span className="ml-auto h-1.5 w-6 rounded" style={{ background: t.dim, opacity: 0.6 }} />
            </div>
            <div className="space-y-2 p-3">
                <div className="h-2 w-3/4 rounded" style={{ background: t.ink }} />
                <div className="h-1.5 w-1/2 rounded" style={{ background: t.muted, opacity: 0.7 }} />
                <div className="flex gap-2 pt-1">
                    <span className="rounded px-3 py-1 text-[10px] font-bold" style={{ background: t.accent, color: t['accent-ink'] }}>
                        Play now
                    </span>
                    <span className="rounded border px-3 py-1 text-[10px]" style={{ borderColor: t.line, color: t.ink }}>
                        Learn more
                    </span>
                </div>
                <div className="flex gap-1 pt-1">
                    {SWATCHES.map(s => (
                        <span key={s} className="h-3 flex-1 rounded-sm" style={{ background: t[s] }} />
                    ))}
                </div>
            </div>
        </div>
    )
}

const ThemePage = () => {
    const toast = useToast()
    const live = useSiteContent('theme')
    const [active, setActive] = useState(live.active)
    const [decor, setDecor] = useState(live.decor !== false)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        setActive(live.active)
        setDecor(live.decor !== false)
    }, [live.active, live.decor])

    const dirty = active !== live.active || decor !== (live.decor !== false)

    const save = async () => {
        setBusy(true)
        const { error } = await createClient()
            .from('site_content')
            .upsert({ key: 'theme', content: { active, decor } })
        setBusy(false)
        if (error)
            return toast(
                /row-level security|permission/i.test(error.message)
                    ? 'You do not have permission to change the site.'
                    : error.message,
                'error',
            )
        await globalMutate(SITE_CONTENT_KEY)
        toast('Saved. Visitors now see the new theme.')
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-medium text-[#EFE9DA]">Site theme</h1>
                <p className="mt-1 text-sm text-[#7E938B]">
                    Choose the colours of the whole public website. Pick one, press Save, and every visitor sees it
                    straight away. Switch back any time.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {THEMES.map(theme => {
                    const on = theme.id === active
                    return (
                        <button
                            key={theme.id}
                            type="button"
                            onClick={() => setActive(theme.id)}
                            className={`rounded-xl border p-3 text-left transition ${
                                on ? 'border-[#D4AF57] bg-[#132320]' : 'border-[#1E322C] hover:border-[#7E938B]'
                            }`}>
                            <Preview theme={theme} />
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-lg">{theme.emoji}</span>
                                <span className="font-medium text-[#EFE9DA]">{theme.label}</span>
                                {on && (
                                    <span className="ml-auto inline-flex items-center gap-1 rounded bg-[#D4AF57] px-2 py-0.5 text-xs font-medium text-[#0C1714]">
                                        <Check size={12} /> Selected
                                    </span>
                                )}
                                {theme.id === live.active && !on && (
                                    <span className="ml-auto text-xs text-[#7E938B]">Live now</span>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-[#7E938B]">{theme.blurb}</p>
                        </button>
                    )
                })}
            </div>

            <Panel title="Extras">
                <label className="flex items-center gap-3 text-sm text-[#EFE9DA]">
                    <input type="checkbox" checked={decor} onChange={e => setDecor(e.target.checked)} />
                    Show gentle falling decorations (pumpkins, snow, fireworks…) on seasonal themes
                </label>
            </Panel>

            <div className="flex items-center gap-3">
                <Button variant="primary" onClick={save} disabled={busy || !dirty}>
                    {busy ? 'Saving…' : 'Save theme'}
                </Button>
                {dirty && <span className="text-xs text-[#7E938B]">Unsaved changes</span>}
            </div>
        </div>
    )
}

export default ThemePage
