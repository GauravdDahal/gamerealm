'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Send, Paperclip, Mic, Trash2, Loader2, Zap, X, Settings2, QrCode } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { errorMessage } from '@/lib/adminApi'
import {
    ATTACH_ACCEPT,
    checkFiles,
    formatClock,
    formatSize,
    sendChatMessage,
    useSignedUrls,
    useVoiceRecorder,
} from '@/lib/chatMedia'
import { FileThumb, HIGHLIGHT_STYLES, MessageMedia, hasMedia } from '@/components/chat/MessageMedia'
import QrPanel from '@/components/chat/QrPanel'
import BroadcastBubble from '@/components/chat/BroadcastBubble'
import ChatTools from '@/components/admin/ChatTools'
import PlayerMoney from '@/components/admin/PlayerMoney'
import { Badge, EmptyState, ErrorState, Panel, Skeleton } from '@/components/admin/ui'

const initials = name =>
    (name || '?')
        .split(' ')
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase()

const formatWhen = iso => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const sameDay = d.toDateString() === new Date().toDateString()
    return sameDay
        ? d.toLocaleTimeString(undefined, { timeStyle: 'short' })
        : d.toLocaleDateString(undefined, { dateStyle: 'short' })
}

/** Combine message lists by id, oldest first. */
const mergeMessages = (current, incoming) => {
    const byId = new Map(current.map(m => [m.id, m]))
    incoming.forEach(m => byId.set(m.id, m))
    return [...byId.values()].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at) || a.id - b.id,
    )
}

const Inbox = () => {
    const supabase = useMemo(() => createClient(), [])
    const [chats, setChats] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activeId, setActiveId] = useState(null)
    const [messages, setMessages] = useState([])
    const [staffId, setStaffId] = useState(null)
    const [draft, setDraft] = useState('')
    const [files, setFiles] = useState([])
    const [sending, setSending] = useState(false)
    const [notice, setNotice] = useState('')
    const [style, setStyle] = useState('')
    const [quick, setQuick] = useState([])
    const [quickOpen, setQuickOpen] = useState(false)
    const [qrOpen, setQrOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [live, setLive] = useState(null)
    const fileInputRef = useRef(null)
    const voice = useVoiceRecorder()
    const urls = useSignedUrls(supabase, messages)
    const messagesEndRef = useRef(null)
    const activeIdRef = useRef(null)

    const loadChats = useCallback(async () => {
        setError(null)
        const { data, error: err } = await supabase.rpc('list_staff_chats')
        if (err) {
            setError(errorMessage(err, 'Could not load chats. This needs the chat-view permission.'))
        } else {
            setChats(data ?? [])
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setStaffId(session?.user?.id ?? null))
        loadChats()
        supabase
            .from('quick_replies')
            .select('*')
            .order('created_at', { ascending: true })
            .then(({ data }) => setQuick(data ?? []))
    }, [loadChats, supabase])

    // Reload the open thread. Merges by id, so it can only add or update.
    const refreshThread = useCallback(
        async id => {
            if (!id) return
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('chat_id', id)
                .is('deleted_at', null)
                .order('created_at', { ascending: true })
            if (activeIdRef.current === id) {
                setMessages(prev => mergeMessages(prev, data ?? []))
            }
        },
        [supabase],
    )

    const resync = useCallback(() => {
        loadChats()
        refreshThread(activeIdRef.current)
    }, [loadChats, refreshThread])

    // One live connection for the whole page (it is not torn down when you
    // switch chats, so nothing is lost in between). Live events are a fast
    // path; reloading when the connection opens, the tab becomes visible,
    // the network returns, and every 20s is what guarantees nothing is
    // missed after a sleep or dropped connection.
    useEffect(() => {
        const channel = supabase
            .channel('staff-inbox')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                payload => {
                    loadChats()
                    if (payload.new.chat_id === activeIdRef.current) {
                        setMessages(prev => mergeMessages(prev, [payload.new]))
                    }
                },
            )
            .subscribe(status => {
                setLive(status === 'SUBSCRIBED')
                if (status === 'SUBSCRIBED') resync()
            })

        const onVisible = () => {
            if (document.visibilityState === 'visible') resync()
        }
        document.addEventListener('visibilitychange', onVisible)
        window.addEventListener('online', resync)
        const poll = setInterval(onVisible, 20000)

        return () => {
            supabase.removeChannel(channel)
            document.removeEventListener('visibilitychange', onVisible)
            window.removeEventListener('online', resync)
            clearInterval(poll)
        }
    }, [supabase, loadChats, resync])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const openChat = async chat => {
        activeIdRef.current = chat.id
        setActiveId(chat.id)
        setMessages([]) // never show the previous thread under the new header
        setFiles([])
        setNotice('')
        await refreshThread(chat.id)

        await supabase
            .from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('chat_id', chat.id)
            .eq('sender_id', chat.client_id)
            .eq('is_read', false)
        loadChats()
        window.dispatchEvent(new Event('chats-changed'))
    }

    const deliver = async payload => {
        setSending(true)
        setNotice('')
        try {
            const saved = await sendChatMessage(supabase, {
                chatId: activeId,
                senderId: staffId,
                ...payload,
            })
            setMessages(prev => mergeMessages(prev, [saved]))
            return true
        } catch (err) {
            console.error('Failed to send:', err)
            setNotice('Could not send. Check your connection and try again.')
            return false
        } finally {
            setSending(false)
        }
    }

    const send = async () => {
        const text = draft.trim()
        if ((!text && !files.length) || !activeId || !staffId || sending) return
        const toSend = files
        setDraft('')
        setFiles([])
        const ok = await deliver({ text, files: toSend, style: style || null })
        if (!ok) {
            setDraft(text) // give everything back so nothing is lost
            setFiles(toSend)
        } else {
            setStyle('')
        }
    }

    // Staff tapped a QR code: send its image to the player as an attachment.
    const sendQr = async (code, file) => {
        if (!activeId || !staffId || sending) return false
        const ok = await deliver({ text: `${code.label} QR code`, files: [file] })
        if (ok) setQrOpen(false)
        return ok
    }

    const sendQuick = async q => {
        setQuickOpen(false)
        if (!activeId || !staffId || sending) return
        await deliver({ text: q.body, title: q.title, style: q.style })
    }

    const pickFiles = e => {
        const picked = Array.from(e.target.files ?? [])
        e.target.value = ''
        if (!picked.length) return
        const problem = checkFiles(picked, files.length)
        if (problem) return setNotice(problem)
        setNotice('')
        setFiles(prev => [...prev, ...picked])
    }

    const startVoice = async () => {
        const problem = await voice.start()
        setNotice(problem || '')
    }

    const sendVoice = async () => {
        const note = await voice.stop()
        if (!note || note.seconds < 1) return setNotice('That was too short.')
        await deliver({ voice: note })
    }

    const activeChat = chats.find(c => c.id === activeId)
    const needle = search.trim().toLowerCase()
    const shownChats = needle
        ? chats.filter(c => `${c.client_name} ${c.client_email}`.toLowerCase().includes(needle))
        : chats

    return (
        <div className="flex flex-col gap-6 lg:h-[calc(100dvh-4rem)]">
            <div>
                <h1
                    className="text-2xl text-[#EFE9DA]"
                    style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                    Chats
                </h1>
                <p className="mt-1 text-sm text-[#7E938B]">Player support conversations.</p>
            </div>

            {!error && (
                <ChatTools
                    supabase={supabase}
                    search={search}
                    onSearch={setSearch}
                    onOpened={async chatId => {
                        const { data } = await supabase.rpc('list_staff_chats')
                        setChats(data ?? [])
                        const c = chatId && (data ?? []).find(x => x.id === chatId)
                        if (c) openChat(c)
                    }}
                />
            )}

            {error ? (
                <Panel>
                    <ErrorState message={error} onRetry={loadChats} />
                </Panel>
            ) : loading ? (
                <Panel>
                    <Skeleton />
                </Panel>
            ) : chats.length === 0 ? (
                <Panel>
                    <EmptyState message="No conversations yet." />
                </Panel>
            ) : (
                <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[280px_1fr] lg:grid-rows-[minmax(0,1fr)]">
                    <Panel
                        title={`${chats.length} conversation${chats.length === 1 ? '' : 's'}`}
                        action={
                            <span className={`flex items-center gap-1.5 text-xs ${live ? 'text-emerald-400' : live === false ? 'text-[#C25B45]' : 'text-[#7E938B]'}`}>
                                <span className={`h-2 w-2 rounded-full ${live ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : live === false ? 'bg-[#C25B45]' : 'bg-[#7E938B]'}`} />
                                {live ? 'Live' : live === false ? 'Offline' : 'Connecting'}
                            </span>
                        }
                        className="flex h-[70dvh] min-h-0 flex-col overflow-hidden lg:h-full">
                        <ul className="flex-1 divide-y divide-[#1E322C]/60 overflow-y-auto">
                            {shownChats.length === 0 && (
                                <li className="px-4 py-6 text-center text-sm text-[#7E938B]">No conversations match “{search}”.</li>
                            )}
                            {shownChats.map(c => (
                                <li key={c.id}>
                                    <button
                                        onClick={() => openChat(c)}
                                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                                            activeId === c.id ? 'bg-[#0C1714]' : 'hover:bg-[#0C1714]/50'
                                        }`}>
                                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#1E322C] bg-[#0C1714] text-xs text-[#7E938B]">
                                            {initials(c.client_name)}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="truncate text-sm text-[#EFE9DA]">
                                                    {c.client_name}
                                                </span>
                                                <span className="flex-shrink-0 text-xs text-[#7E938B]">
                                                    {formatWhen(c.last_message_at)}
                                                </span>
                                            </span>
                                            {c.referrer_name && (
                                                <span className="mt-0.5 inline-block rounded bg-[#D4AF57]/10 px-1.5 text-[10px] text-[#D4AF57]">
                                                    Ref: {c.referrer_name}
                                                </span>
                                            )}
                                            <span className="block truncate text-xs text-[#7E938B]">
                                                {c.last_message ?? c.client_email}
                                            </span>
                                        </span>
                                        {c.unread_count > 0 && (
                                            <Badge tone="brass">{c.unread_count}</Badge>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </Panel>

                    <Panel
                        title={activeChat ? activeChat.client_name : 'Select a conversation'}
                        action={
                            activeChat && (
                                <button
                                    onClick={() => setQrOpen(true)}
                                    aria-label="Send a payment QR code"
                                    title="Send a payment QR code"
                                    className="rounded p-1.5 text-[#7E938B] hover:bg-[#1E322C] hover:text-[#D4AF57]">
                                    <QrCode size={18} />
                                </button>
                            )
                        }
                        className="relative flex h-[80dvh] min-h-0 flex-col overflow-hidden lg:h-full">
                        {qrOpen && activeChat && (
                            <div className="absolute inset-0 z-20 flex flex-col bg-[#0C1714]">
                                <QrPanel tone="admin" onClose={() => setQrOpen(false)} onSend={sendQr} />
                            </div>
                        )}
                        {activeChat ? (
                            <>
                                <PlayerMoney key={activeChat.client_id} supabase={supabase} chat={activeChat} />
                                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                                    {messages.map(m => {
                                        const mine = m.sender_id === staffId
                                        const hl = m.style ? HIGHLIGHT_STYLES[m.style] : null
                                        const HlIcon = hl?.icon
                                        const hasText = !!m.message?.trim()
                                        return (
                                            <div
                                                key={m.id}
                                                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                                {m.style === 'broadcast' ? (
                                                    <BroadcastBubble title={m.title} text={m.message} time={formatWhen(m.created_at)} compact />
                                                ) : hl ? (
                                                    <div
                                                        style={{ background: hl.tint, borderLeft: `3px solid ${hl.bar}` }}
                                                        className="max-w-[80%] space-y-2 rounded-lg border border-[#1E322C] px-3 py-2 text-sm text-[#EFE9DA]">
                                                        <p
                                                            style={{ color: hl.bar }}
                                                            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
                                                            <HlIcon size={14} />
                                                            {m.title || hl.label}
                                                        </p>
                                                        {hasText && <p className="whitespace-pre-wrap break-words">{m.message}</p>}
                                                        <p className="text-[10px] text-[#7E938B]">{formatWhen(m.created_at)}</p>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={`max-w-[80%] space-y-2 rounded-lg px-3 py-2 text-sm ${
                                                            mine ? 'bg-[#D4AF57] text-[#0C1714]' : 'bg-[#0C1714] text-[#EFE9DA]'
                                                        }`}>
                                                        {hasText && <p className="whitespace-pre-wrap break-words">{m.message}</p>}
                                                        {hasMedia(m) && <MessageMedia message={m} urls={urls} mine={mine} />}
                                                        <p
                                                            className={`text-[10px] ${
                                                                mine ? 'text-[#0C1714]/60' : 'text-[#7E938B]'
                                                            }`}>
                                                            {formatWhen(m.created_at)}
                                                            {mine && m.is_read ? ' · seen' : ''}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                                <div className="relative border-t border-[#1E322C] p-3">
                                    {quickOpen && (
                                        <div className="absolute bottom-full left-3 right-3 z-10 mb-2 max-h-72 overflow-y-auto rounded border border-[#1E322C] bg-[#132320] shadow-xl">
                                            <div className="flex items-center justify-between border-b border-[#1E322C] px-3 py-2">
                                                <span className="text-xs text-[#7E938B]">Click a reply to send it</span>
                                                <Link href="/admin/quick-replies" className="flex items-center gap-1 text-xs text-[#D4AF57] hover:underline">
                                                    <Settings2 size={12} /> Manage
                                                </Link>
                                            </div>
                                            {quick.length === 0 ? (
                                                <p className="px-3 py-4 text-sm text-[#7E938B]">
                                                    No saved replies yet.{' '}
                                                    <Link href="/admin/quick-replies" className="text-[#D4AF57] underline">Create one</Link>
                                                </p>
                                            ) : (
                                                quick.map(q => {
                                                    const hl = HIGHLIGHT_STYLES[q.style] ?? HIGHLIGHT_STYLES.info
                                                    return (
                                                        <button
                                                            key={q.id}
                                                            onClick={() => sendQuick(q)}
                                                            disabled={sending}
                                                            className="block w-full border-b border-[#1E322C]/60 px-3 py-2 text-left hover:bg-[#0C1714] disabled:opacity-50">
                                                            <span style={{ color: hl.bar }} className="flex items-center gap-1.5 text-xs font-semibold">
                                                                <hl.icon size={13} /> {q.title}
                                                            </span>
                                                            <span className="mt-0.5 line-clamp-2 block text-xs text-[#7E938B]">{q.body}</span>
                                                        </button>
                                                    )
                                                })
                                            )}
                                        </div>
                                    )}

                                    {notice && (
                                        <p className="mb-2 rounded bg-[#C25B45]/15 px-3 py-2 text-xs text-[#e8a090]" role="alert">{notice}</p>
                                    )}

                                    {files.length > 0 && (
                                        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                                            {files.map((f, i) => (
                                                <div key={`${f.name}-${i}`} className="relative flex shrink-0 items-center gap-2 rounded border border-[#1E322C] bg-[#0C1714] py-1.5 pl-2 pr-7">
                                                    <FileThumb file={f} className="h-8 w-8" />
                                                    <span className="max-w-[120px]">
                                                        <span className="block truncate text-xs text-[#EFE9DA]">{f.name}</span>
                                                        <span className="block text-[10px] text-[#7E938B]">{formatSize(f.size)}</span>
                                                    </span>
                                                    <button
                                                        onClick={() => setFiles(list => list.filter((_, n) => n !== i))}
                                                        aria-label={`Remove ${f.name}`}
                                                        className="absolute right-1 top-1 rounded p-0.5 text-[#7E938B] hover:text-[#EFE9DA]">
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {voice.recording ? (
                                        <div className="flex items-center gap-2">
                                            <button onClick={voice.cancel} aria-label="Discard recording" className="rounded p-2 text-[#7E938B] hover:text-[#C25B45]">
                                                <Trash2 size={16} />
                                            </button>
                                            <div className="flex flex-1 items-center gap-3 rounded border border-[#1E322C] bg-[#0C1714] px-3 py-2 text-sm text-[#EFE9DA]">
                                                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#C25B45]" />
                                                Recording… {formatClock(voice.seconds)}
                                            </div>
                                            <button onClick={sendVoice} aria-label="Send voice message" className="rounded bg-[#D4AF57] p-2 text-[#0C1714] hover:brightness-110">
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-end gap-2">
                                                <input ref={fileInputRef} type="file" multiple accept={ATTACH_ACCEPT} onChange={pickFiles} className="hidden" />
                                                <button
                                                    onClick={() => setQuickOpen(v => !v)}
                                                    aria-label="Saved replies"
                                                    title="Saved replies"
                                                    className={`rounded p-2 hover:text-[#D4AF57] ${quickOpen ? 'text-[#D4AF57]' : 'text-[#7E938B]'}`}>
                                                    <Zap size={18} />
                                                </button>
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    aria-label="Attach photos, GIFs or documents"
                                                    disabled={sending}
                                                    className="rounded p-2 text-[#7E938B] hover:text-[#EFE9DA] disabled:opacity-40">
                                                    <Paperclip size={18} />
                                                </button>
                                                <textarea
                                                    value={draft}
                                                    onChange={e => setDraft(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault()
                                                            send()
                                                        }
                                                    }}
                                                    rows={1}
                                                    placeholder="Reply…"
                                                    className="max-h-32 min-w-0 flex-1 resize-none rounded border border-[#1E322C] bg-[#0C1714] px-3 py-2 text-sm text-[#EFE9DA] placeholder-[#7E938B] focus:border-[#D4AF57] focus:outline-none"
                                                />
                                                {!draft.trim() && !files.length && voice.supported ? (
                                                    <button onClick={startVoice} aria-label="Record a voice message" className="rounded bg-[#D4AF57] p-2 text-[#0C1714] hover:brightness-110">
                                                        <Mic size={16} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={send}
                                                        disabled={sending}
                                                        aria-label="Send"
                                                        className="rounded bg-[#D4AF57] p-2 text-[#0C1714] hover:brightness-110 disabled:opacity-50">
                                                        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="mt-2 flex items-center gap-2 text-xs text-[#7E938B]">
                                                <label htmlFor="hl-style">Highlight this message:</label>
                                                <select
                                                    id="hl-style"
                                                    value={style}
                                                    onChange={e => setStyle(e.target.value)}
                                                    className="rounded border border-[#1E322C] bg-[#0C1714] px-2 py-1 text-xs text-[#EFE9DA] focus:border-[#D4AF57] focus:outline-none">
                                                    <option value="">No highlight</option>
                                                    {Object.entries(HIGHLIGHT_STYLES).map(([k, v]) => (
                                                        <option key={k} value={k}>{v.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-1 items-center justify-center">
                                <p className="text-sm text-[#7E938B]">
                                    Pick a conversation on the left.
                                </p>
                            </div>
                        )}
                    </Panel>
                </div>
            )}
        </div>
    )
}

export default Inbox
