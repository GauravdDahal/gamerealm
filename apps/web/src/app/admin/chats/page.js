'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { errorMessage } from '@/lib/adminApi'
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

const Inbox = () => {
    const supabase = useMemo(() => createClient(), [])
    const [chats, setChats] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activeId, setActiveId] = useState(null)
    const [messages, setMessages] = useState([])
    const [staffId, setStaffId] = useState(null)
    const [draft, setDraft] = useState('')
    const messagesEndRef = useRef(null)

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
    }, [loadChats, supabase])

    // Any new message anywhere refreshes the chat list (order + unread badges),
    // and is appended live if it belongs to the open thread.
    useEffect(() => {
        const channel = supabase
            .channel('staff-inbox')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                payload => {
                    loadChats()
                    if (payload.new.chat_id === activeId) {
                        setMessages(prev => [...prev, payload.new])
                    }
                },
            )
            .subscribe()
        return () => supabase.removeChannel(channel)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeId])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const openChat = async chat => {
        setActiveId(chat.id)
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chat.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: true })
        setMessages(data ?? [])

        await supabase
            .from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('chat_id', chat.id)
            .eq('sender_id', chat.client_id)
            .eq('is_read', false)
        loadChats()
    }

    const send = async () => {
        if (!draft.trim() || !activeId || !staffId) return
        const text = draft.trim()
        setDraft('')
        const { error: err } = await supabase
            .from('messages')
            .insert({ chat_id: activeId, sender_id: staffId, message: text })
        if (err) console.error('Failed to send:', err)
    }

    const activeChat = chats.find(c => c.id === activeId)

    return (
        <div className="space-y-6">
            <div>
                <h1
                    className="text-2xl text-[#EFE9DA]"
                    style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                    Chats
                </h1>
                <p className="mt-1 text-sm text-[#7E938B]">Player support conversations.</p>
            </div>

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
                <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                    <Panel title={`${chats.length} conversation${chats.length === 1 ? '' : 's'}`} className="h-[600px] overflow-y-auto">
                        <ul className="divide-y divide-[#1E322C]/60">
                            {chats.map(c => (
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
                                            <span className="truncate text-xs text-[#7E938B]">
                                                {c.client_email}
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
                        className="flex h-[600px] flex-col">
                        {activeChat ? (
                            <>
                                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                                    {messages.map(m => (
                                        <div
                                            key={m.id}
                                            className={`flex ${m.sender_id === staffId ? 'justify-end' : 'justify-start'}`}>
                                            <div
                                                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                                                    m.sender_id === staffId
                                                        ? 'bg-[#D4AF57] text-[#0C1714]'
                                                        : 'bg-[#0C1714] text-[#EFE9DA]'
                                                }`}>
                                                <p className="whitespace-pre-wrap">{m.message}</p>
                                                <p
                                                    className={`mt-1 text-[10px] ${
                                                        m.sender_id === staffId
                                                            ? 'text-[#0C1714]/60'
                                                            : 'text-[#7E938B]'
                                                    }`}>
                                                    {formatWhen(m.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                                <div className="flex items-center gap-2 border-t border-[#1E322C] p-3">
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
                                        className="flex-1 resize-none rounded border border-[#1E322C] bg-[#0C1714] px-3 py-2 text-sm text-[#EFE9DA] placeholder-[#7E938B] focus:border-[#D4AF57] focus:outline-none"
                                    />
                                    <button
                                        onClick={send}
                                        className="rounded bg-[#D4AF57] p-2 text-[#0C1714] hover:brightness-110">
                                        <Send size={16} />
                                    </button>
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
