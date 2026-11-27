/** Page title band used by Games, Bonuses and Referral. */
export default function PageHero({ eyebrow, Icon, title, highlight, subtitle, children }) {
    return (
        <header className="border-b border-line bg-surface">
            <div className="wrap py-12 sm:py-16">
                {eyebrow && (
                    <p className="eyebrow flex items-center gap-2">
                        {Icon && <Icon className="h-4 w-4" aria-hidden="true" />} {eyebrow}
                    </p>
                )}
                <h1 className="font-display text-5xl leading-none text-ink sm:text-6xl">
                    {title} {highlight && <span className="text-accent">{highlight}</span>}
                </h1>
                {subtitle && <p className="section-intro">{subtitle}</p>}
                {children}
            </div>
        </header>
    )
}
