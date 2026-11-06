'use client'

import Image from 'next/image'
import { useState } from 'react'

const initialsFor = name =>
    (name || '?')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(word => word[0])
        .join('')
        .toUpperCase()

/**
 * Renders a user's avatar, or their initials when there isn't one.
 *
 * next/image throws "Image is missing required src property" if src is null or
 * undefined, and accounts created through the admin panel or the registration
 * form have no avatar — so the fallback is the normal case, not an edge case.
 * Also covers a broken URL via onError.
 */
const UserAvatar = ({ user, size = 30, className = '' }) => {
    const [failed, setFailed] = useState(false)
    const src = user?.avatar

    if (!src || failed) {
        return (
            <span
                aria-label={user?.name ?? 'User'}
                title={user?.name ?? undefined}
                style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
                className={`inline-flex flex-shrink-0 items-center justify-center rounded-full border border-gray-400 bg-gray-600 font-medium text-white ${className}`}>
                {initialsFor(user?.name)}
            </span>
        )
    }

    return (
        <Image
            src={src}
            alt={user?.name ?? 'User'}
            width={size}
            height={size}
            onError={() => setFailed(true)}
            className={`rounded-full border ${className}`}
        />
    )
}

export default UserAvatar
