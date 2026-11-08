'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    alertsEnabled,
    alertsSupported,
    enableAlerts,
    notify,
    ping,
    previewOf,
    registerWorker,
    setAlertsPref,
} from '@/lib/chatAlerts'

/**
 * Runs on every admin page: counts unread player messages (for the sidebar
 * badge and tab title), chimes and shows a notification for new ones.
 */
export const useAdminChatAlerts = ({ staffId, onChatsPage }) => {
    const supabase = useMemo(() => createClient(), [])
    const [unread, setUnread] = useState(0)
    const [allowed, setAllowed] = useState(false) // has chat-view
    const [alertsOn, setAlertsOn] = useState(false)
    const onChatsRef = useRef(onChatsPage)
    onChatsRef.current = onChatsPage

    useEffect(() => {
        setAlertsOn(alertsEnabled())
        if (alertsEnabled()) registerWorker()
    }, [])

    const loadUnread = useCallback(async () => {
        const { data, error } = await supabase.rpc('list_staff_chats')
        if (error) return false // no chat-view permission: stay quiet
        setAllowed(true)
        setUnread((data ?? []).reduce((n, c) => n + (c.unread_count || 0), 0))
        return true
    }, [supabase])

    useEffect(() => {
        if (!staffId) return
        let channel
        let poll
        let cancelled = false

        const onVisible = () => {
            if (document.visibilityState === 'visible') loadUnread()
        }

        loadUnread().then(ok => {
            if (!ok || cancelled) return
            channel = supabase
                .channel('admin-alerts')
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'messages' },
                    payload => {
                        if (payload.new.sender_id === staffId) return
                        loadUnread()
                        const watching = onChatsRef.current && !document.hidden
                        if (!watching) ping()
                        if (document.hidden) {
                            notify('New player message', previewOf(payload.new), '/admin/chats')
                        }
                    },
                )
                .subscribe(status => {
                    if (status === 'SUBSCRIBED') loadUnread()
                })
            document.addEventListener('visibilitychange', onVisible)
            window.addEventListener('online', loadUnread)
            window.addEventListener('chats-changed', loadUnread)
            poll = setInterval(onVisible, 20000)
        })

        return () => {
            cancelled = true
            if (channel) supabase.removeChannel(channel)
            document.removeEventListener('visibilitychange', onVisible)
            window.removeEventListener('online', loadUnread)
            window.removeEventListener('chats-changed', loadUnread)
            clearInterval(poll)
        }
    }, [staffId, supabase, loadUnread])

    // "(3) Back office" in the browser tab.
    useEffect(() => {
        const base = document.title.replace(/^\(\d+\)\s/, '')
        document.title = unread > 0 ? `(${unread}) ${base}` : base
        return () => {
            document.title = base
        }
    }, [unread])

    const toggleAlerts = async () => {
        if (alertsOn) {
            setAlertsPref(false)
            setAlertsOn(false)
            return null
        }
        const ok = await enableAlerts()
        setAlertsOn(ok)
        if (ok) return null
        return alertsSupported()
            ? 'Notifications are blocked. Allow them in your browser settings.'
            : 'This browser does not support notifications.'
    }

    return { unread, allowed, alertsOn, toggleAlerts }
}
