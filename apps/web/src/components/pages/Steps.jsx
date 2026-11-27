/** Numbered "how it works" steps. items: [{ title, text }] */
export default function Steps({ title, items }) {
    return (
        <section className="bg-gray-900 pb-16 pt-8 md:pb-24">
            <div className="wrap">
                <h2 className="font-display text-3xl text-ink">{title}</h2>
                <ol className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
                    {items.map((s, i) => (
                        <li key={i} className="card">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent text-sm font-bold text-accent">
                                {i + 1}
                            </span>
                            <h3 className="mt-4 text-lg font-bold text-ink">{s.title}</h3>
                            <p className="mt-2 text-muted">{s.text}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    )
}
