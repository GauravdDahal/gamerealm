'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Send, Paperclip, Mic, Trash2, Loader2, Zap, X, Settings2, Search, UserPlus, CheckCheck, Check, MessagesSquare } from 'lucide-react'
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
import { ErrorState, Panel, Skeleton } from '@/components/admin/ui'

const initials = name =>
    (name || '?')
        .split(' ')
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase()

const timeAgo = iso => {
    if (!iso) return ''
    const s = (Date.now() - new Date(iso).getTime()) / 1000
    if (s < 60) return 'just now'
    if (s < 3600) return `${Math.floor(s / 60)} min ago`
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`
    if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

const formatStamp = iso => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

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

    // /admin/chats?open=<chat id> (from the Players page) opens that conversation.
    const wantedRef = useRef(typeof window !== 'undefined' ? Number(new URLSearchParams(window.location.search).get('open')) || null : null)
    useEffect(() => {
        if (!wantedRef.current || !chats.length) return
        const c = chats.find(x => x.id === wantedRef.current)
        wantedRef.current = null
        if (c) openChat(c)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chats])

    // The chat fills exactly the space left on screen (under the top bar and
    // any banner), so the page itself never scrolls: only the list or the
    // messages do. Recalculated when the screen, keyboard or banner changes.
    const frameRef = useRef(null)
    const [frameH, setFrameH] = useState(null)
    useEffect(() => {
        const fit = () => {
            const el = frameRef.current
            if (!el) return
            const view = window.visualViewport?.height ?? window.innerHeight
            const top = el.getBoundingClientRect().top + window.scrollY
            setFrameH(Math.max(320, Math.round(view - top - 12)))
        }
        fit()
        const ro = new ResizeObserver(fit)
        ro.observe(document.body)
        window.addEventListener('resize', fit)
        window.visualViewport?.addEventListener('resize', fit)
        document.documentElement.classList.add('chat-locked')
        return () => {
            ro.disconnect()
            window.removeEventListener('resize', fit)
            window.visualViewport?.removeEventListener('resize', fit)
            document.documentElement.classList.remove('chat-locked')
        }
    }, [loading, error])

    const activeChat = chats.find(c => c.id === activeId)
    const needle = search.trim().toLowerCase()
    const shownChats = needle
        ? chats.filter(c => `${c.client_name} ${c.client_email}`.toLowerCase().includes(needle))
        : chats

    const stamp = m => (
        <p className={`mt-1 flex items-center gap-1 px-1 text-[11px] text-[#7E938B] ${m.sender_id === staffId ? 'justify-end' : ''}`}>
            {formatStamp(m.created_at)}
            {m.sender_id === staffId && (m.is_read ? <CheckCheck size={14} className="text-[#D4AF57]" /> : <Check size={14} />)}
        </p>
    )

    return (
        <div ref={frameRef} style={frameH ? { height: frameH } : undefined} className="flex h-[75dvh] flex-col">
            {error ? (
                <Panel>
                    <ErrorState message={error} onRetry={loadChats} />
                </Panel>
            ) : loading ? (
                <Panel>
                    <Skeleton />
                </Panel>
            ) : (
                <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-xl border border-[#1E322C] bg-[#0C1714] lg:grid-cols-[340px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
                    {/* ------------------------------------------------ list */}
                    <section className={`flex min-h-0 min-w-0 flex-col border-[#1E322C] bg-[#132320] lg:border-r ${activeChat ? 'hidden lg:flex' : 'flex'}`}>
                        <header className="flex items-center gap-2 px-4 pb-3 pt-4">
                            <h1 className="min-w-0 flex-1 truncate text-2xl text-[#D4AF57]" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                                Messages
                            </h1>
                            <span className={`flex items-center gap-1.5 text-xs ${live ? 'text-emerald-400' : live === false ? 'text-[#C25B45]' : 'text-[#7E938B]'}`}>
                                <span className={`h-2 w-2 rounded-full ${live ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : live === false ? 'bg-[#C25B45]' : 'bg-[#7E938B]'}`} />
                                {live ? 'Live' : live === false ? 'Offline' : '…'}
                            </span>
                            <ChatTools
                                supabase={supabase}
                                onOpened={async chatId => {
                                    const { data } = await supabase.rpc('list_staff_chats')
                                    setChats(data ?? [])
                                    const c = chatId && (data ?? []).find(x => x.id === chatId)
                                    if (c) openChat(c)
                                }}
                            />
                        </header>
                        <div className="px-4 pb-3">
                            <div className="relative">
                                <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7E938B]" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
                                    className="w-full rounded-xl border border-[#1E322C] bg-[#0C1714] py-2.5 pl-10 pr-3 text-sm text-[#EFE9DA] placeholder:text-[#7E938B] focus:border-[#D4AF57] focus:outline-none" />
                            </div>
                        </div>
                        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-[#1E322C]">
                            {chats.length === 0 && (
                                <li className="px-4 py-10 text-center text-sm text-[#7E938B]">No conversations yet. Start one with the + button.</li>
                            )}
                            {chats.length > 0 && shownChats.length === 0 && (
                                <li className="px-4 py-6 text-center text-sm text-[#7E938B]">No conversations match “{search}”.</li>
                            )}
                            {shownChats.map(c => {
                                const active = activeId === c.id
                                return (
                                    <li key={c.id} className="border-b border-[#1E322C]/70">
                                        <button
                                            onClick={() => openChat(c)}
                                            className={`flex w-full items-start gap-3 border-l-2 px-4 py-3.5 text-left transition-colors ${
                                                active ? 'border-[#D4AF57] bg-[#D4AF57]/10' : 'border-transparent hover:bg-[#0C1714]/60'
                                            }`}>
                                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-semibold ${
                                                active ? 'bg-[#D4AF57] text-[#0C1714]' : 'border border-[#D4AF57]/30 bg-[#D4AF57]/10 text-[#D4AF57]'
                                            }`}>
                                                {(c.client_name || '?').trim()[0]?.toUpperCase()}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-baseline justify-between gap-2">
                                                    <span className="truncate font-semibold text-[#EFE9DA]">{c.client_name}</span>
                                                    <span className="shrink-0 text-[11px] text-[#7E938B]">{timeAgo(c.last_message_at)}</span>
                                                </span>
                                                {c.referrer_name && (
                                                    <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-[#D4AF57]">
                                                        <UserPlus size={11} /> Ref: {c.referrer_name}
                                                    </span>
                                                )}
                                                <span className="mt-0.5 flex items-center gap-2">
                                                    <span className={`min-w-0 flex-1 truncate text-sm ${c.unread_count > 0 ? 'text-[#EFE9DA]' : 'text-[#7E938B]'}`}>
                                                        {c.last_message ?? c.client_email}
                                                    </span>
                                                    {c.unread_count > 0 && (
                                                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D4AF57] px-1.5 text-[11px] font-bold text-[#0C1714]">
                                                            {c.unread_count > 99 ? '99+' : c.unread_count}
                                                        </span>
                                                    )}
                                                </span>
                                            </span>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    </section>

                    {/* ------------------------------------------------ thread */}
                    <section className={`relative min-h-0 min-w-0 flex-col ${activeChat ? 'flex' : 'hidden lg:flex'}`}>
                        {qrOpen && activeChat && (
                            <div className="absolute inset-0 z-20 flex flex-col bg-[#0C1714]">
                                <QrPanel tone="admin" onClose={() => setQrOpen(false)} onSend={sendQr} />
                            </div>
                        )}
                        {activeChat ? (
                            <>
                                <div className="flex items-center border-b border-[#1E322C] lg:hidden">
                                    <button onClick={() => setActiveId(null)} className="px-4 py-2 text-sm text-[#D4AF57]">← All messages</button>
                                </div>
                                <PlayerMoney key={activeChat.client_id} supabase={supabase} chat={activeChat} variant="header" onQr={() => setQrOpen(true)} />
                                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-5 sm:px-6">
                                    {messages.map(m => {
                                        const mine = m.sender_id === staffId
                                        const hl = m.style ? HIGHLIGHT_STYLES[m.style] : null
                                        const HlIcon = hl?.icon
                                        const hasText = !!m.message?.trim()
                                        return (
                                            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                                                {m.style === 'broadcast' ? (
                                                    <BroadcastBubble title={m.title} text={m.message} compact />
                                                ) : hl ? (
                                                    <div
                                                        style={{ background: hl.tint, borderColor: hl.bar, boxShadow: `0 0 18px ${hl.tint}` }}
                                                        className="max-w-[78%] space-y-1.5 rounded-2xl border px-4 py-3 text-[15px] font-semibold text-[#EFE9DA]">
                                                        <p style={{ color: hl.bar }} className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide">
                                                            <HlIcon size={14} />
                                                            {m.title || hl.label}
                                                        </p>
                                                        {hasText && <p className="whitespace-pre-wrap break-words">{m.message}</p>}
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={`max-w-[78%] space-y-2 rounded-2xl px-4 py-2.5 text-[15px] ${
                                                            mine ? 'rounded-br-md bg-[#D4AF57] text-[#0C1714]' : 'rounded-bl-md bg-[#1E322C] text-[#EFE9DA]'
                                                        }`}>
                                                        {hasText && <p className="whitespace-pre-wrap break-words">{m.message}</p>}
                                                        {hasMedia(m) && <MessageMedia message={m} urls={urls} mine={mine} />}
                                                    </div>
                                                )}
                                                {stamp(m)}
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                                <div className="relative border-t border-[#1E322C] px-4 py-3 sm:px-5">
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
                                            <div className="flex items-center gap-1.5">
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
                                                    placeholder="Reply to user…"
                                                    className="max-h-32 min-w-0 flex-1 resize-none rounded-2xl border border-[#1E322C] bg-[#132320] px-4 py-2.5 text-sm text-[#EFE9DA] placeholder-[#7E938B] focus:border-[#D4AF57] focus:outline-none"
                                                />
                                                {!draft.trim() && !files.length && voice.supported ? (
                                                    <button onClick={startVoice} aria-label="Record a voice message" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#D4AF57] text-[#0C1714] hover:brightness-110">
                                                        <Mic size={16} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={send}
                                                        disabled={sending}
                                                        aria-label="Send"
                                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#D4AF57] text-[#0C1714] hover:brightness-110 disabled:opacity-50">
                                                        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="mt-2 flex items-center gap-2 pl-1 text-[11px] text-[#7E938B]">
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
                            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[#D4AF57]/30 bg-[#D4AF57]/10 text-[#D4AF57]">
                                    <MessagesSquare size={28} />
                                </span>
                                <p className="text-lg text-[#EFE9DA]">Select a conversation</p>
                                <p className="text-sm text-[#7E938B]">Choose a player on the left to view messages.</p>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    )
}

export default Inbox
