/** Page title band used by Games, Bonuses and Referral. */
export default function PageHero({ eyebrow, Icon, title, highlight, subtitle, children }) {
    return (
        <header className="relative isolate overflow-hidden border-b border-line/60">
            <div
                aria-hidden
                className="absolute inset-0 -z-10"
                style={{
                    background:
                        'radial-gradient(60% 120% at 85% 0%, rgb(var(--c-accent) / 0.18), transparent 60%), radial-gradient(50% 100% at 0% 100%, rgb(var(--c-secondary) / 0.14), transparent 60%)',
                }}
            />
            <div className="container mx-auto px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
                <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
                    {Icon && <Icon className="h-3.5 w-3.5" />} {eyebrow}
                </p>
                <h1 className="mt-3 font-godofwar text-4xl leading-tight text-ink sm:text-6xl">
                    {title} {highlight && <span className="text-accent">{highlight}</span>}
                </h1>
                {subtitle && <p className="mt-4 max-w-2xl text-sm text-muted sm:text-base">{subtitle}</p>}
                {children}
            </div>
        </header>
    )
}
