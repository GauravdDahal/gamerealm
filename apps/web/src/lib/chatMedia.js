'use client'

import { useEffect, useRef, useState } from 'react'

export const MAX_FILES = 5
export const MAX_FILE_BYTES = 15 * 1024 * 1024
export const MAX_VOICE_SECONDS = 120

// What the file picker offers. The database bucket enforces the same list.
export const ATTACH_ACCEPT =
    'image/*,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip'

export const formatSize = bytes => {
    if (!bytes && bytes !== 0) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export const isImage = type => (type || '').startsWith('image/')

const safeName = name =>
    (name || 'file').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80) || 'file'

const uid = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`

/** Returns an error message if the picked files can't be sent, else null. */
export const checkFiles = (files, alreadyPicked = 0) => {
    if (alreadyPicked + files.length > MAX_FILES) {
        return `You can send up to ${MAX_FILES} files at once.`
    }
    const tooBig = files.find(f => f.size > MAX_FILE_BYTES)
    if (tooBig) {
        return `"${tooBig.name}" is larger than ${formatSize(MAX_FILE_BYTES)}.`
    }
    return null
}

const upload = async (supabase, bucket, chatId, file, name, contentType) => {
    const path = `${chatId}/${uid()}-${safeName(name)}`
    const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType, cacheControl: '3600' })
    if (error) throw error
    return path
}

/**
 * Upload any files and voice note, then create ONE message that carries the
 * text and all of them. Putting the file list on the message itself means the
 * other side never sees a message before its files exist.
 */
export const sendChatMessage = async (
    supabase,
    { chatId, senderId, text = '', files = [], voice = null, style = null, title = null, extraAttachments = [] },
) => {
    const attachments = await Promise.all(
        files.map(async f => ({
            path: await upload(
                supabase,
                'chat-attachments',
                chatId,
                f,
                f.name,
                f.type || 'application/octet-stream',
            ),
            name: f.name,
            type: f.type || 'application/octet-stream',
            size: f.size,
        })),
    )

    let voice_path = null
    if (voice) {
        const ext = voice.mime.includes('mp4') ? 'm4a' : voice.mime.includes('ogg') ? 'ogg' : 'webm'
        voice_path = await upload(
            supabase,
            'chat-voice',
            chatId,
            voice.blob,
            `voice.${ext}`,
            voice.mime,
        )
    }

    const row = {
        chat_id: chatId,
        sender_id: senderId,
        message: text,
        attachments: [...attachments, ...extraAttachments],
    }
    if (voice_path) row.voice_path = voice_path
    if (style) row.style = style
    if (title) row.title = title

    const { data, error } = await supabase.from('messages').insert(row).select().single()
    if (error) throw error
    return data
}

/**
 * Private files are shown through short-lived signed links. This keeps a
 * path -> link map for every attachment and voice note in `messages`.
 */
export const useSignedUrls = (supabase, messages) => {
    const [urls, setUrls] = useState({})
    const asked = useRef(new Set())

    useEffect(() => {
        const wanted = { 'chat-attachments': [], 'chat-voice': [] }
        for (const m of messages) {
            for (const a of m.attachments ?? []) {
                if (a.kind === 'game') continue // site images, not private uploads
                if (!asked.current.has(a.path)) wanted['chat-attachments'].push(a.path)
            }
            if (m.voice_path && !asked.current.has(m.voice_path)) {
                wanted['chat-voice'].push(m.voice_path)
            }
        }
        Object.entries(wanted).forEach(([bucket, paths]) => {
            if (!paths.length) return
            paths.forEach(p => asked.current.add(p))
            supabase.storage
                .from(bucket)
                .createSignedUrls(paths, 6 * 60 * 60)
                .then(({ data }) => {
                    const found = {}
                    ;(data ?? []).forEach(d => {
                        if (d.signedUrl) found[d.path] = d.signedUrl
                    })
                    setUrls(prev => ({ ...prev, ...found }))
                })
        })
    }, [messages, supabase])

    return urls
}

/** Microphone recording. `stop()` resolves with { blob, mime, seconds }. */
export const useVoiceRecorder = () => {
    const [recording, setRecording] = useState(false)
    const [seconds, setSeconds] = useState(0)
    const recorder = useRef(null)
    const stream = useRef(null)
    const chunks = useRef([])
    const timer = useRef(null)
    const startedAt = useRef(0)
    const finish = useRef(null)

    const supported =
        typeof window !== 'undefined' &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof window.MediaRecorder !== 'undefined'

    const cleanup = () => {
        clearInterval(timer.current)
        stream.current?.getTracks().forEach(t => t.stop())
        stream.current = null
        recorder.current = null
        setRecording(false)
        setSeconds(0)
    }

    useEffect(() => () => cleanup(), [])

    /** Returns null on success, or a message to show the person. */
    const start = async () => {
        if (!supported) return 'Voice messages are not supported on this browser.'
        try {
            stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch {
            return 'Microphone access was blocked. Allow it in your browser settings to send voice messages.'
        }
        const mime =
            ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(
                t => MediaRecorder.isTypeSupported(t),
            ) || ''
        const rec = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined)
        chunks.current = []
        rec.ondataavailable = e => e.data.size && chunks.current.push(e.data)
        rec.onstop = () => {
            const type = (rec.mimeType || mime || 'audio/webm').split(';')[0]
            const blob = new Blob(chunks.current, { type })
            const secs = Math.round((Date.now() - startedAt.current) / 1000)
            const done = finish.current
            finish.current = null
            cleanup()
            done?.({ blob, mime: type, seconds: secs })
        }
        recorder.current = rec
        startedAt.current = Date.now()
        rec.start()
        setRecording(true)
        setSeconds(0)
        timer.current = setInterval(() => {
            const s = Math.round((Date.now() - startedAt.current) / 1000)
            setSeconds(s)
            if (s >= MAX_VOICE_SECONDS) recorder.current?.stop()
        }, 250)
        return null
    }

    const stop = () =>
        new Promise(resolve => {
            if (!recorder.current) return resolve(null)
            finish.current = resolve
            recorder.current.stop()
        })

    const cancel = () => {
        finish.current = null
        if (recorder.current && recorder.current.state !== 'inactive') {
            recorder.current.onstop = null
            recorder.current.stop()
        }
        cleanup()
    }

    return { supported, recording, seconds, start, stop, cancel }
}

export const formatClock = s =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
