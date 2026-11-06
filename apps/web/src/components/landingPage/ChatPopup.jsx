'use client'

import { Gamepad2, X, MessageCircle, Send } from 'lucide-react'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/auth'
import { createClient } from '@/lib/supabase/client'

/**
 * Player-side support chat, on Supabase tables + Realtime instead of the
 * old Laravel/Reverb setup. File and voice attachments from the previous
 * version aren't wired up yet — they need a Supabase Storage bucket and
 * policies that don't exist yet, so this is text-only for now.
 */
function ChatPopup() {
    const { user } = useAuth()
    const supabase = useMemo(() => createClient(), [])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [chat, setChat] = useState(null)
    const [loading, setLoading] = useState(true)
    const messagesEndRef = useRef(null)

    // Only approved players (and staff bypass is handled elsewhere) get a
    // chat — pending/rejected/suspended accounts can't open one (RLS would
    // refuse the insert anyway; this just avoids showing a dead-end button).
    const canChat = user && user.is_approved !== false && !user.is_admin

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0)
            scrollToBottom()
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [messages, isOpen])

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

        const load = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('chat_id', chat.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: true })
            if (!cancelled) setMessages(data ?? [])
        }
        load()

        const channel = supabase
            .channel(`chat-${chat.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` },
                payload => {
                    setMessages(prev => [...prev, payload.new])
                    if (!isOpen && payload.new.sender_id !== user.id) {
                        setUnreadCount(c => c + 1)
                    }
                },
            )
            .subscribe()

        return () => {
            cancelled = true
            supabase.removeChannel(channel)
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
        if (!error) setChat(data)
    }

    const handleSendMessage = useCallback(async () => {
        if (!newMessage.trim() || !chat) return
        const text = newMessage.trim()
        setNewMessage('')
        const { error } = await supabase
            .from('messages')
            .insert({ chat_id: chat.id, sender_id: user.id, message: text })
        if (error) {
            console.error('Failed to send message:', error)
        }
    }, [newMessage, chat, user, supabase])

    const handleKeyPress = e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    if (!canChat || loading) return null

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-game-primary text-white flex items-center justify-center shadow-lg hover:bg-[#4f46e5] transition-colors z-50 ${
                    isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}>
                <MessageCircle className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-gray-900 rounded-lg shadow-xl flex flex-col gradient-border animate-fade-scale-up">
                        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Gamepad2 className="w-6 h-6 text-game-primary" />
                                <h3 className="font-bold">Support Chat</h3>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {chat ? (
                            <>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px] max-h-[600px]">
                                    {messages.length === 0 && (
                                        <p className="text-center text-sm text-gray-500 py-8">
                                            Say hello — our team usually replies within a day.
                                        </p>
                                    )}
                                    {messages.map(msg => (
                                        <div
                                            key={msg.id}
                                            className={`flex flex-col ${
                                                msg.sender_id === user.id ? 'items-end' : 'items-start'
                                            }`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                {msg.sender_id === user.id &&
                                                    (msg.is_read ? (
                                                        <span className="text-sm text-green-400">seen</span>
                                                    ) : (
                                                        <span className="text-sm text-gray-500">sent</span>
                                                    ))}
                                                <span className="text-xs text-gray-500">
                                                    {new Date(msg.created_at).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <div
                                                className={`max-w-[80%] rounded-lg p-3 ${
                                                    msg.sender_id === user.id
                                                        ? 'bg-[#4f46e5] text-white'
                                                        : 'bg-gray-800 text-gray-100'
                                                }`}>
                                                <p className="whitespace-pre-wrap">{msg.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className="p-4 border-t border-gray-800">
                                    <div className="flex items-center gap-2">
                                        <textarea
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                            placeholder="Type your message..."
                                            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-game-primary resize-none"
                                            rows={1}
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            className="text-white bg-[#4f46e5] hover:bg-[#7c3aed] p-2 rounded-lg transition-colors">
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center my-5">
                                <button
                                    onClick={handleCreateChat}
                                    className="text-white bg-[#4f46e5] hover:bg-[#7c3aed] px-6 py-2 rounded-lg transition-colors">
                                    Start Conversation
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

export default ChatPopup
