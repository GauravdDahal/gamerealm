'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { siteDefaults, withDefaults } from '@/lib/siteDefaults'

const KEY = 'site-content'

const load = async () => {
    const { data, error } = await createClient()
        .from('site_content')
        .select('key, content')
    if (error) throw error
    return Object.fromEntries((data ?? []).map(r => [r.key, r.content]))
}

/**
 * The homepage text and pictures. Returns the built-in wording straight away
 * and swaps in whatever was saved in the admin panel as soon as it arrives.
 * Pass a section name to get just that section.
 */
export const useSiteContent = section => {
    const { data } = useSWR(KEY, load, {
        revalidateOnFocus: false,
        shouldRetryOnError: false,
    })
    const saved = data ?? {}
    if (section) {
        return withDefaults(saved[section], siteDefaults[section] ?? {})
    }
    const all = {}
    for (const k of Object.keys(siteDefaults)) {
        all[k] = withDefaults(saved[k], siteDefaults[k])
    }
    return all
}

export const SITE_CONTENT_KEY = KEY
