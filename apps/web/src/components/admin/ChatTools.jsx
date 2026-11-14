'use client'

import { useCallback, useMemo, useState } from 'react'
import { Check, Loader2, Megaphone, MessageSquarePlus, Search } from 'lucide-react'
import { Button, Modal, useToast } from '@/components/admin/ui'
import { errorMessage } from '@/lib/adminApi'
import BroadcastBubble from '@/components/chat/BroadcastBubble'

/**
 * Admin chat toolbar: search conversations, start a chat with any approved
 * player, and broadcast one announcement to all or selected players.
 */
const initials = n => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

const PlayerRow = ({ p, checked, onClick, badge }) => (
    <li>
        <button type="button" onClick={onClick}
            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#0C1714] ${checked ? 'bg-[#0C1714]' : ''}`}>
            {checked !== undefined && (
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? 'border-[#D4AF57] bg-[#D4AF57] text-[#0C1714]' : 'border-[#7E938B]'}`}>
                    {checked && <Check size={12} strokeWidth={3} />}
                </span>
            )}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#1E322C] bg-[#0C1714] text-xs text-[#7E938B]">
                {initials(p.name)}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-[#EFE9DA]">{p.name}</span>
                <span className="block truncate text-xs text-[#7E938B]">{p.email}</span>
            </span>
            {badge}
        </button>
    </li>
)

export default function ChatTools({ supabase, search, onSearch, onOpened }) {
    const toast = useToast()
    const [players, setPlayers] = useState(null)
    const [loadError, setLoadError] = useState('')
    const [mode, setMode] = useState(null) // 'new' | 'broadcast'
    const [q, setQ] = useState('')
    const [audience, setAudience] = useState('all')
    const [picked, setPicked] = useState(() => new Set())
    const [text, setText] = useState('')
    const [busy, setBusy] = useState(false)

    const loadPlayers = useCallback(async () => {
        setLoadError('')
        const { data, error } = await supabase.rpc('chat_player_directory')
        if (error) setLoadError(errorMessage(error, 'Could not load players.'))
        else setPlayers(data ?? [])
    }, [supabase])

    const open = m => {
        setMode(m)
        setQ('')
        loadPlayers()
    }
    const close = () => {
        if (busy) return
        setMode(null)
    }

    const filtered = useMemo(() => {
        const n = q.trim().toLowerCase()
        return (players ?? []).filter(p => !n || p.name.toLowerCase().includes(n) || p.email.toLowerCase().includes(n))
    }, [players, q])

    const startChat = async p => {
        setBusy(true)
        const { data, error } = await supabase.rpc('staff_open_chat', { p_player: p.id })
        setBusy(false)
        if (error) return toast(errorMessage(error, 'Could not open this conversation.'), 'error')
        setMode(null)
        onOpened(data)
    }

    const toggle = id =>
        setPicked(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })

    const count = audience === 'all' ? players?.length ?? 0 : picked.size
    const canSend = !busy && text.trim().length > 0 && count > 0

    const send = async () => {
        if (!canSend) return
        setBusy(true)
        const { data, error } = await supabase.rpc('broadcast_message', {
            p_players: audience === 'all' ? null : [...picked],
            p_text: text.trim(),
        })
        setBusy(false)
        if (error) return toast(errorMessage(error, 'Could not send the broadcast.'), 'error')
        toast(`Broadcast sent to ${data} player${data === 1 ? '' : 's'}.`)
        setText('')
        setPicked(new Set())
        setMode(null)
        onOpened(null)
    }

    const list = (
        <>
            <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7E938B]" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search players by name or email…" autoFocus
                    className="w-full rounded border border-[#1E322C] bg-[#0C1714] py-2 pl-9 pr-3 text-sm text-[#EFE9DA] placeholder:text-[#7E938B] focus:border-[#D4AF57] focus:outline-none" />
            </div>
            <div className="mt-2 max-h-[40dvh] overflow-y-auto rounded border border-[#1E322C]">
                {loadError ? (
                    <p className="p-4 text-sm text-[#C25B45]">{loadError}</p>
                ) : players === null ? (
                    <p className="flex justify-center p-6 text-[#7E938B]"><Loader2 size={18} className="animate-spin" /></p>
                ) : filtered.length === 0 ? (
                    <p className="p-4 text-sm text-[#7E938B]">No players found.</p>
                ) : (
                    <ul className="divide-y divide-[#1E322C]/60">
                        {filtered.map(p =>
                            mode === 'new' ? (
                                <PlayerRow key={p.id} p={p} onClick={() => startChat(p)}
                                    badge={p.chat_id ? <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">Chatting</span> : null} />
                            ) : (
                                <PlayerRow key={p.id} p={p} checked={picked.has(p.id)} onClick={() => toggle(p.id)} />
                            ),
                        )}
                    </ul>
                )}
            </div>
        </>
    )

    return (
        <>
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1 basis-56">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7E938B]" />
                    <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search conversations…"
                        className="w-full rounded border border-[#1E322C] bg-[#132320] py-2 pl-9 pr-3 text-sm text-[#EFE9DA] placeholder:text-[#7E938B] focus:border-[#D4AF57] focus:outline-none" />
                </div>
                <Button onClick={() => open('new')}>
                    <MessageSquarePlus size={14} className="mr-1 inline" /> New chat
                </Button>
                <button onClick={() => open('broadcast')}
                    className="inline-flex items-center gap-1.5 rounded bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 px-3 py-2 text-sm font-bold text-white shadow-[0_0_14px_rgba(255,90,0,.45)] transition hover:brightness-110">
                    <Megaphone size={15} /> Broadcast
                </button>
            </div>

            <Modal open={mode === 'new'} title="Start a conversation" onClose={close}>
                <p className="mb-3 text-xs text-[#7E938B]">Pick an approved player. Players you already chat with open their existing conversation.</p>
                {list}
            </Modal>

            <Modal
                open={mode === 'broadcast'}
                title="Broadcast message"
                onClose={close}
                footer={
                    <>
                        <Button onClick={close} disabled={busy}>Cancel</Button>
                        <button onClick={send} disabled={!canSend}
                            className="inline-flex items-center gap-1.5 rounded bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
                            {busy ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
                            Send to {count}
                        </button>
                    </>
                }>
                <div className="space-y-4">
                    <p className="text-xs text-[#7E938B]">Arrives in each player’s chat as a flaming, sparkling announcement.</p>
                    <div className="grid grid-cols-2 gap-2">
                        {[['all', 'All players'], ['select', 'Select players']].map(([k, l]) => (
                            <button key={k} type="button" onClick={() => setAudience(k)}
                                className={`rounded border px-3 py-2 text-sm ${audience === k ? 'border-[#D4AF57] bg-[#D4AF57]/15 text-[#EFE9DA]' : 'border-[#1E322C] text-[#7E938B] hover:text-[#EFE9DA]'}`}>
                                {l}
                            </button>
                        ))}
                    </div>
                    {audience === 'select' && (
                        <div>
                            {list}
                            <div className="mt-2 flex items-center justify-between text-xs text-[#7E938B]">
                                <span>{picked.size} selected</span>
                                <span className="flex gap-3">
                                    <button type="button" onClick={() => setPicked(new Set(filtered.map(p => p.id)))} className="hover:text-[#EFE9DA]">Select shown</button>
                                    <button type="button" onClick={() => setPicked(new Set())} className="hover:text-[#EFE9DA]">Clear</button>
                                </span>
                            </div>
                        </div>
                    )}
                    <textarea value={text} onChange={e => setText(e.target.value)} rows={4} maxLength={1000} placeholder="Write an announcement…"
                        className="w-full rounded border border-[#1E322C] bg-[#0C1714] px-3 py-2 text-sm text-[#EFE9DA] placeholder:text-[#7E938B] focus:border-[#D4AF57] focus:outline-none" />
                    {text.trim() && (
                        <div>
                            <p className="mb-2 text-[11px] uppercase tracking-wide text-[#7E938B]">Preview</p>
                            <BroadcastBubble text={text.trim()} />
                        </div>
                    )}
                </div>
            </Modal>
        </>
    )
}
