'use client'

import {
        X,
    MessageCircle,
    Send,
    Check,
    CheckCheck,
    Paperclip,
    Mic,
    Bell,
    BellOff,
    Trash2,
    Loader2,
} from 'lucide-react'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/auth'
import { createClient } from '@/lib/supabase/client'
import {
    ATTACH_ACCEPT,
    checkFiles,
    formatClock,
    formatSize,
    sendChatMessage,
    useSignedUrls,
    useVoiceRecorder,
} from '@/lib/chatMedia'
import { alertsEnabled, alertsSupported, enableAlerts, notify, ping, previewOf, registerWorker, setAlertsPref } from '@/lib/chatAlerts'
import { FileThumb, HIGHLIGHT_STYLES, MessageMedia, hasMedia } from '@/components/chat/MessageMedia'

/**
 * Player-side support chat, on Supabase tables + Realtime instead of the
 * old Laravel/Reverb setup. Supports text, images/GIFs/documents, voice notes,
 * highlighted notices from staff, and message alerts.
 */
/** Combine message lists by id, oldest first. */
const mergeMessages = (current, incoming) => {
    const byId = new Map(current.map(m => [m.id, m]))
    incoming.forEach(m => byId.set(m.id, m))
    return [...byId.values()].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at) || a.id - b.id,
    )
}

function ChatPopup() {
    const { user } = useAuth()
    const supabase = useMemo(() => createClient(), [])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [chat, setChat] = useState(null)
    const [loading, setLoading] = useState(true)
    const [files, setFiles] = useState([])
    const [sending, setSending] = useState(false)
    const [notice, setNotice] = useState('')
    const [alertsOn, setAlertsOn] = useState(false)
    const fileInputRef = useRef(null)
    const voice = useVoiceRecorder()
    const urls = useSignedUrls(supabase, messages)
    const messagesEndRef = useRef(null)
    const isOpenRef = useRef(false)
    useEffect(() => {
        isOpenRef.current = isOpen
    }, [isOpen])

    useEffect(() => {
        setAlertsOn(alertsEnabled())
        if (alertsEnabled()) registerWorker()
    }, [])

    const toggleAlerts = async () => {
        if (alertsOn) {
            setAlertsPref(false)
            setAlertsOn(false)
            return
        }
        const ok = await enableAlerts()
        setAlertsOn(ok)
        if (!ok) {
            setNotice(
                alertsSupported()
                    ? 'Notifications are blocked. Allow them in your browser settings to get alerts.'
                    : 'This browser does not support notifications.',
            )
        }
    }

    // Show how many unread replies there are in the browser tab title.
    useEffect(() => {
        const base = document.title.replace(/^\(\d+\)\s/, '')
        document.title = unreadCount > 0 ? `(${unreadCount}) ${base}` : base
        return () => {
            document.title = base
        }
    }, [unreadCount])

    // Only approved players (and staff bypass is handled elsewhere) get a
    // chat — pending/rejected/suspended accounts can't open one (RLS would
    // refuse the insert anyway; this just avoids showing a dead-end button).
    const canChat = user && user.is_approved !== false && !user.is_admin

    const textareaRef = useRef(null)

    // Clear the unread badge whenever the panel is open.
    useEffect(() => {
        if (isOpen) setUnreadCount(0)
    }, [isOpen, messages.length])

    // Keep the newest message in view.
    useEffect(() => {
        if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, [messages.length, isOpen])

    // On phones the chat covers the whole screen, so freeze the page behind it.
    // On larger screens it is a small corner window and the page stays scrollable.
    useEffect(() => {
        if (!isOpen) return
        const phone = window.matchMedia('(max-width: 639px)')
        if (!phone.matches) return
        const previous = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = previous
        }
    }, [isOpen])

    // Close with Escape.
    useEffect(() => {
        if (!isOpen) return
        const onKey = e => e.key === 'Escape' && setIsOpen(false)
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen])

    // Let the message box grow with what is typed (up to a few lines).
    useEffect(() => {
        const el = textareaRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    }, [newMessage, isOpen, chat])

    // Find or note the absence of this player's chat once we know who they are.
    useEffect(() => {
        if (!canChat) {
            setLoading(false)
            return
        }
        let cancelled = false

        const load = async () => {
            const { data } = await supabase
                .from('chats')
                .select('*')
                .eq('client_id', user.id)
                .is('deleted_at', null)
                .maybeSingle()
            if (cancelled) return
            setChat(data ?? null)
            setLoading(false)
        }
        load()
        return () => {
            cancelled = true
        }
    }, [canChat, user?.id, supabase])

    // Load messages and subscribe to new ones once a chat exists.
    useEffect(() => {
        if (!chat) return
        let cancelled = false

        // Merge by id so a message can never appear twice or be dropped,
        // whichever of (history load, live event, our own send) arrives first.
        const load = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('chat_id', chat.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: true })
            if (cancelled) return
            const history = data ?? []
            setMessages(prev => mergeMessages(prev, history))
            // Badge = replies from the team that haven't been read yet. Counted
            // from history, so it is right even for messages that arrived while
            // the page was closed or the phone was asleep.
            if (!isOpenRef.current) {
                setUnreadCount(
                    history.filter(m => m.sender_id !== user.id && !m.is_read).length,
                )
            }
        }
        load()

        const channel = supabase
            .channel(`chat-${chat.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` },
                payload => {
                    setMessages(prev => mergeMessages(prev, [payload.new]))
                    if (payload.new.sender_id !== user.id) {
                        if (!isOpenRef.current) setUnreadCount(c => c + 1)
                        // Chime unless they are looking right at the open chat.
                        if (!isOpenRef.current || document.hidden) ping()
                        if (document.hidden) notify('Support replied', previewOf(payload.new), '/')
                    }
                },
            )
            .subscribe(status => {
                // The live connection takes a moment to open on a brand-new
                // chat. Anything sent before it was ready would be missed, so
                // reload the history once it is.
                if (status === 'SUBSCRIBED') load()
            })

        // A phone suspends a tab's live connection when the screen locks or you
        // switch apps, and messages sent meanwhile are never replayed. So also
        // reload when the tab comes back, the network returns, and every 20s.
        const onVisible = () => {
            if (document.visibilityState === 'visible') load()
        }
        document.addEventListener('visibilitychange', onVisible)
        window.addEventListener('online', load)
        const poll = setInterval(onVisible, 20000)

        return () => {
            cancelled = true
            supabase.removeChannel(channel)
            document.removeEventListener('visibilitychange', onVisible)
            window.removeEventListener('online', load)
            clearInterval(poll)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chat?.id])

    // Mark the other side's messages read while the panel is open.
    useEffect(() => {
        if (!isOpen || !chat) return
        supabase
            .from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('chat_id', chat.id)
            .neq('sender_id', user.id)
            .eq('is_read', false)
            .then(() => {})
    }, [isOpen, chat, messages.length, supabase, user?.id])

    const handleCreateChat = async () => {
        const { data, error } = await supabase
            .from('chats')
            .insert({ client_id: user.id, is_active: true })
            .select()
            .single()
        if (error) {
            console.error('Failed to start chat:', error)
            return null
        }
        setChat(data)
        return data
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

    const deliver = useCallback(
        async ({ text = '', files: toSend = [], voice: note = null, chatId, extraAttachments = [] }) => {
            setSending(true)
            setNotice('')
            try {
                const saved = await sendChatMessage(supabase, {
                    chatId: chatId ?? chat.id,
                    senderId: user.id,
                    text,
                    files: toSend,
                    voice: note,
                    extraAttachments,
                })
                // Show our own message straight away instead of waiting for the live event.
                setMessages(prev => mergeMessages(prev, [saved]))
                return true
            } catch (error) {
                console.error('Failed to send message:', error)
                setNotice('Could not send. Check your connection and try again.')
                return false
            } finally {
                setSending(false)
            }
        },
        [chat, user, supabase],
    )

    const handleSendMessage = useCallback(async () => {
        const text = newMessage.trim()
        if ((!text && !files.length) || !chat || sending) return
        const toSend = files
        setNewMessage('')
        setFiles([])
        const ok = await deliver({ text, files: toSend })
        if (!ok) {
            setNewMessage(text) // give everything back so nothing is lost
            setFiles(toSend)
        }
    }, [newMessage, files, chat, sending, deliver])

    const startVoice = async () => {
        const problem = await voice.start()
        if (problem) setNotice(problem)
        else setNotice('')
    }

    const sendVoice = async () => {
        const note = await voice.stop()
        if (!note || note.seconds < 1) return setNotice('That was too short. Hold on a little longer.')
        await deliver({ voice: note })
    }

    // "Play Game" on a game card: open this chat and send a request with the
    // game's banner. Waits until the chat has finished loading if needed.
    const [gameRequest, setGameRequest] = useState(null)
    const lastGameSent = useRef({})
    useEffect(() => {
        const onRequest = e => setGameRequest({ ...e.detail, at: Date.now() })
        window.addEventListener('open-game-chat', onRequest)
        return () => window.removeEventListener('open-game-chat', onRequest)
    }, [])

    useEffect(() => {
        if (!gameRequest || !canChat || loading) return
        const req = gameRequest
        setGameRequest(null)
        if (Date.now() - req.at > 30000) return // stale
        setIsOpen(true)
        ;(async () => {
            const current = chat ?? (await handleCreateChat())
            if (!current) return
            // Don't send the same request twice if they tap Play repeatedly.
            if (Date.now() - (lastGameSent.current[req.title] ?? 0) < 30000) return
            lastGameSent.current[req.title] = Date.now()
            await deliver({
                chatId: current.id,
                text: req.text ?? `Hi! I would like to play ${req.title}.`,
                extraAttachments: req.image
                    ? [
                          {
                              kind: 'game',
                              path: `game:${req.title}`,
                              name: req.title,
                              type: 'image/jpeg',
                              url: req.image,
                          },
                      ]
                    : [],
            })
        })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameRequest, canChat, loading, chat])

    const handleKeyPress = e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    if (!canChat || loading) return null

    const brand = 'linear-gradient(110deg, rgb(var(--c-accent-dim)), rgb(var(--c-accent2)) 48%, rgb(var(--c-accent-dim)))'
    const display = { fontFamily: "'PlayFairlDisplay', Georgia, serif" }
    const brandFont = { fontFamily: "'Aldo', sans-serif" }
    const formatTime = iso =>
        new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    return (
        <>
            <style>{`
                .casino-scroll { scrollbar-width: thin; scrollbar-color: rgb(var(--c-accent)) rgb(var(--c-night)); }
                .casino-scroll::-webkit-scrollbar { width: 8px; }
                .casino-scroll::-webkit-scrollbar-track { background: transparent; }
                .casino-scroll::-webkit-scrollbar-thumb { background: linear-gradient(rgb(var(--c-accent-dim)), rgb(var(--c-accent))); border-radius: 8px; border: 2px solid rgb(var(--c-night)); }
            `}</style>
            {/* Floating button */}
            <button
                onClick={() => setIsOpen(true)}
                aria-label={unreadCount > 0 ? `Open support chat, ${unreadCount} unread` : 'Open support chat'}
                style={{
                    background: 'rgb(var(--c-accent-dim))',
                    border: '5px dashed rgb(var(--c-accent2))',
                    boxShadow: '0 8px 22px rgba(0,0,0,.6), 0 0 24px rgb(var(--c-accent) / .25)',
                }}
                className={`fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] sm:right-6 sm:bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-accent-ink transition hover:scale-105 active:scale-95 ${
                    isOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
                }`}>
                <MessageCircle className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-night bg-danger px-1 text-[11px] font-bold leading-none text-ink">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-50 sm:inset-auto sm:bottom-6 sm:right-6"
                    role="dialog"
                    aria-label="Support chat">
                    {/* Gradient edge on larger screens, flush full-screen on phones */}
                    <div
                        style={{ background: brand }}
                        className="h-full w-full animate-fade-scale-up sm:h-[min(640px,calc(100dvh-3rem))] sm:w-[400px] sm:rounded-2xl sm:p-px sm:shadow-2xl sm:shadow-black/60">
                        <div
                            style={{ background: 'linear-gradient(145deg, rgb(var(--c-surface2)), rgb(var(--c-night)) 55%)' }}
                            className="flex h-full w-full flex-col overflow-hidden sm:rounded-[15px]">
                            {/* Header */}
                            <div className="flex items-center justify-between gap-3 border-b border-accent/25 bg-black/20 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div
                                        style={{ border: '1px solid rgb(var(--c-accent) / .65)', boxShadow: '0 0 20px rgb(var(--c-accent) / .12)', ...display }}
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] text-xl text-accent"
                                        aria-hidden="true">
                                        &spades;&#xFE0E;
                                    </div>
                                    <div className="min-w-0">
                                        <h3
                                            style={brandFont}
                                            className="truncate text-[15px] leading-tight tracking-[2px] text-ink">
                                            CASINO PLAY
                                        </h3>
                                        <p className="truncate text-[11px] uppercase tracking-[1.5px] text-accent">
                                            Player support
                                        </p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <button
                                        onClick={toggleAlerts}
                                        aria-label={alertsOn ? 'Turn message alerts off' : 'Turn message alerts on'}
                                        title={alertsOn ? 'Alerts on' : 'Get alerts for new replies'}
                                        className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface2 ${
                                            alertsOn ? 'text-accent2' : 'text-muted hover:text-ink'
                                        }`}>
                                        {alertsOn ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                                    </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close chat"
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-ink">
                                    <X className="h-5 w-5" />
                                </button>
                                </div>
                            </div>

                            {chat ? (
                                <>
                                    {/* Messages */}
                                    <div
                                        style={{ background: 'radial-gradient(circle at 85% 0%, rgb(var(--c-accent) / .08), transparent 45%)' }}
                                        className="casino-scroll flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
                                        {messages.length === 0 && (
                                            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                                                <p className="text-2xl tracking-[10px] text-accent" aria-hidden="true">
                                                    <span>&spades;&#xFE0E;</span> <span className="text-danger">&hearts;&#xFE0E;</span> <span className="text-danger">&diams;&#xFE0E;</span> <span>&clubs;&#xFE0E;</span>
                                                </p>
                                                <p style={display} className="text-xl text-ink">Take a seat</p>
                                                <p className="text-sm text-muted">
                                                    Ask us anything. Our team usually replies within a day.
                                                </p>
                                            </div>
                                        )}
                                        {messages.map(msg => {
                                            const mine = msg.sender_id === user.id
                                            const hl = !mine && msg.style ? HIGHLIGHT_STYLES[msg.style] : null
                                            const HlIcon = hl?.icon
                                            const hasText = !!msg.message?.trim()
                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                                                    {hl ? (
                                                        <div
                                                            style={{ background: hl.tint, borderLeft: `3px solid ${hl.bar}` }}
                                                            className="max-w-[88%] space-y-2 break-words rounded-2xl rounded-bl-md border border-white/10 px-3.5 py-2.5 text-[15px] leading-relaxed text-ink">
                                                            <p
                                                                style={{ color: hl.bar }}
                                                                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                                                                <HlIcon className="h-4 w-4" />
                                                                {msg.title || hl.label}
                                                            </p>
                                                            {hasText && <p className="whitespace-pre-wrap break-words">{msg.message}</p>}
                                                            <MessageMedia message={msg} urls={urls} mine={false} />
                                                        </div>
                                                    ) : (
                                                        <div
                                                            style={mine ? { background: 'linear-gradient(110deg, rgb(var(--c-accent-dim)), rgb(var(--c-accent2)) 48%, rgb(var(--c-accent-dim)))' } : undefined}
                                                            className={`max-w-[85%] space-y-2 break-words rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed ${
                                                                mine
                                                                    ? 'rounded-br-md border border-accent2/40 text-accent-ink'
                                                                    : 'rounded-bl-md border border-accent/15 bg-surface text-ink'
                                                            }`}>
                                                            {hasText && <p className="whitespace-pre-wrap break-words">{msg.message}</p>}
                                                            {hasMedia(msg) && <MessageMedia message={msg} urls={urls} mine={mine} />}
                                                        </div>
                                                    )}
                                                    <div className="mt-1 flex items-center gap-1 px-1 text-[11px] text-dim">
                                                        <span>{formatTime(msg.created_at)}</span>
                                                        {mine &&
                                                            (msg.is_read ? (
                                                                <span className="flex items-center gap-0.5 text-emerald-400">
                                                                    <CheckCheck className="h-3.5 w-3.5" /> seen
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-0.5">
                                                                    <Check className="h-3.5 w-3.5" /> sent
                                                                </span>
                                                            ))}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input */}
                                    <div className="border-t border-accent/25 bg-black/25 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                                        {notice && (
                                            <p className="mb-2 rounded-lg bg-danger/15 px-3 py-2 text-xs text-danger-soft" role="alert">
                                                {notice}
                                            </p>
                                        )}

                                        {files.length > 0 && (
                                            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                                                {files.map((f, i) => (
                                                    <div
                                                        key={`${f.name}-${i}`}
                                                        className="relative flex shrink-0 items-center gap-2 rounded-xl border border-line bg-surface py-1.5 pl-2 pr-7">
                                                        <FileThumb file={f} className="h-9 w-9" />
                                                        <span className="max-w-[110px]">
                                                            <span className="block truncate text-xs text-ink">{f.name}</span>
                                                            <span className="block text-[10px] text-dim">{formatSize(f.size)}</span>
                                                        </span>
                                                        <button
                                                            onClick={() => setFiles(list => list.filter((_, n) => n !== i))}
                                                            aria-label={`Remove ${f.name}`}
                                                            className="absolute right-1 top-1 rounded-full p-0.5 text-muted hover:bg-surface2 hover:text-ink">
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {voice.recording ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={voice.cancel}
                                                    aria-label="Discard recording"
                                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface2 hover:text-ink">
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                                <div className="flex min-h-[44px] flex-1 items-center gap-3 rounded-full border border-line bg-surface px-4">
                                                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />
                                                    <span className="text-sm text-ink">Recording… {formatClock(voice.seconds)}</span>
                                                </div>
                                                <button
                                                    onClick={sendVoice}
                                                    aria-label="Send voice message"
                                                    style={{ background: brand }}
                                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent-ink transition hover:brightness-110 active:scale-95">
                                                    <Send className="h-5 w-5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-end gap-1.5">
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    multiple
                                                    accept={ATTACH_ACCEPT}
                                                    onChange={pickFiles}
                                                    className="hidden"
                                                />
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    aria-label="Attach photos, GIFs or documents"
                                                    disabled={sending}
                                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-ink disabled:opacity-40">
                                                    <Paperclip className="h-5 w-5" />
                                                </button>
                                                <textarea
                                                    ref={textareaRef}
                                                    value={newMessage}
                                                    onChange={e => setNewMessage(e.target.value)}
                                                    onKeyDown={handleKeyPress}
                                                    placeholder="Type your message..."
                                                    rows={1}
                                                    className="max-h-[120px] min-h-[44px] min-w-0 flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-2.5 text-base text-ink placeholder-dim focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                                                />
                                                {!newMessage.trim() && !files.length && voice.supported ? (
                                                    <button
                                                        onClick={startVoice}
                                                        aria-label="Record a voice message"
                                                        style={{ background: brand }}
                                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent-ink transition hover:brightness-110 active:scale-95">
                                                        <Mic className="h-5 w-5" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={handleSendMessage}
                                                        disabled={sending || (!newMessage.trim() && !files.length)}
                                                        aria-label="Send message"
                                                        style={{ background: brand }}
                                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent-ink transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:hover:brightness-100">
                                                        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                                    <p className="text-3xl tracking-[10px] text-accent" aria-hidden="true">
                                        <span>&spades;&#xFE0E;</span> <span className="text-danger">&hearts;&#xFE0E;</span> <span className="text-danger">&diams;&#xFE0E;</span> <span>&clubs;&#xFE0E;</span>
                                    </p>
                                    <div>
                                        <p style={display} className="text-2xl text-ink">Need a hand?</p>
                                        <p className="mt-1 text-sm text-muted">
                                            Start a conversation and our team will get back to you.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleCreateChat}
                                        style={{ background: brand }}
                                        className="min-h-[46px] rounded-[10px] border border-accent2 px-7 text-[11px] font-black uppercase tracking-[1.7px] text-accent-ink shadow-[0_8px_24px_rgb(var(--c-accent) / .18)] transition hover:brightness-110 active:scale-95">
                                        Start Conversation
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default ChatPopup
