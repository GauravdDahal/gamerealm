/** Numbered "how it works" cards. items: [{ title, text }] */
export default function Steps({ title, items }) {
    return (
        <section className="bg-gray-900 py-12 sm:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="font-godofwar text-2xl text-ink sm:text-3xl">{title}</h2>
                <ol className="mt-6 grid gap-4 md:grid-cols-3">
                    {items.map((s, i) => (
                        <li key={i} className="relative rounded-2xl border border-line/60 bg-surface/60 p-5">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent font-bold text-accent-ink">
                                {i + 1}
                            </span>
                            <h3 className="mt-3 font-bold text-ink">{s.title}</h3>
                            <p className="mt-1 text-sm text-muted">{s.text}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    )
}
