/**
 * A still picture of the real support chat, with sample messages, used where
 * the site needs a visual (About, Support). It mirrors ChatPopup's look.
 * Screen readers get a one-line description instead of the sample messages.
 */
const MESSAGES = [
    { me: true, text: 'Hi! Can you set me up on Juwa?' },
    { me: false, text: 'Sure. Your Juwa account is ready: username tsw_jordan.' },
    { me: true, text: 'Great, please load $20.' },
    { me: false, text: 'Done. 20 points added. Good luck!' },
]

export default function ChatPreview({ className = '' }) {
    return (
        <div
            role="img"
            aria-label="Preview of the support chat: a player asks for a game account and the team loads their points."
            className={`w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/40 ${className}`}>
            <div aria-hidden="true">
                <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                    <div className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/assets/images/brand/messenger.svg" alt="" width="40" height="40" className="h-10 w-10 rounded-full" />
                        <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-surface bg-emerald-400" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-base font-bold leading-tight text-ink">Player support</p>
                        <p className="truncate text-xs text-muted">We usually reply in a few minutes</p>
                    </div>
                </div>
                <div className="space-y-2 bg-night px-4 py-4">
                    <p className="pb-2 text-center text-xs font-medium text-dim">Today 8:42 PM</p>
                    {MESSAGES.map((m, i) => (
                        <div key={i} className={`flex ${m.me ? 'justify-end' : 'justify-start'}`}>
                            <p
                                className={`max-w-[80%] rounded-[20px] px-4 py-2 text-sm leading-snug ${
                                    m.me ? 'bg-accent text-accent-ink' : 'bg-surface2 text-ink'
                                }`}>
                                {m.text}
                            </p>
                        </div>
                    ))}
                    <p className="pr-1 pt-1 text-right text-xs text-dim">Seen</p>
                </div>
                <div className="flex items-center gap-2 border-t border-line px-4 py-3">
                    <span className="flex h-10 flex-1 items-center rounded-full bg-surface2 px-4 text-sm text-muted">Aa</span>
                </div>
            </div>
        </div>
    )
}
