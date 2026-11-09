// Hand-drawn (code-drawn) line-art and silhouettes for the seasonal themes.
// Everything is one-colour SVG using currentColor, so it takes the theme's
// colours and stays elegant instead of looking like clip-art.

const rad = d => (d * Math.PI) / 180
const P = (cx, cy, r, a) => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))]
const f = n => Math.round(n * 10) / 10

const burst = () => {
    const out = []
    for (let i = 0; i < 18; i++) {
        const a = i * 20
        const long = i % 2 === 0
        const [x1, y1] = P(50, 50, 9, a)
        const [x2, y2] = P(50, 50, long ? 42 : 29, a)
        out.push(<line key={i} x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} strokeWidth="1.6" strokeLinecap="round" />)
        out.push(<circle key={`d${i}`} cx={f(x2)} cy={f(y2)} r={long ? 2.2 : 1.5} fill="currentColor" stroke="none" />)
    }
    out.push(<circle key="c" cx="50" cy="50" r="3" fill="currentColor" stroke="none" />)
    return out
}

const snowflake = () => {
    const out = []
    for (let i = 0; i < 6; i++) {
        const a = i * 60
        const [x2, y2] = P(50, 50, 44, a)
        out.push(<line key={i} x1="50" y1="50" x2={f(x2)} y2={f(y2)} strokeWidth="1.8" strokeLinecap="round" />)
        for (const [t, len] of [[0.62, 14], [0.36, 10]]) {
            const [bx, by] = P(50, 50, 44 * t, a)
            for (const s of [-42, 42]) {
                const [ex, ey] = P(bx, by, len, a + s)
                out.push(<line key={`${i}-${t}-${s}`} x1={f(bx)} y1={f(by)} x2={f(ex)} y2={f(ey)} strokeWidth="1.4" strokeLinecap="round" />)
            }
        }
    }
    return out
}

const cobweb = () => {
    const out = []
    const angles = [0, 15, 30, 45, 60, 75, 90]
    for (const a of angles) {
        const [x, y] = P(0, 0, 100, a)
        out.push(<line key={`s${a}`} x1="0" y1="0" x2={f(x)} y2={f(y)} strokeWidth="1" />)
    }
    for (const r of [16, 32, 50, 70, 92]) {
        let d = ''
        angles.forEach((a, i) => {
            const [x, y] = P(0, 0, r, a)
            if (i === 0) d += `M${f(x)} ${f(y)}`
            else {
                const [cx, cy] = P(0, 0, r * 0.8, (a + angles[i - 1]) / 2)
                d += ` Q${f(cx)} ${f(cy)} ${f(x)} ${f(y)}`
            }
        })
        out.push(<path key={`r${r}`} d={d} strokeWidth="1" fill="none" />)
    }
    return out
}

const deadTree = () => {
    const out = []
    let n = 0
    const grow = (x, y, len, ang, depth) => {
        const [x2, y2] = P(x, y, len, ang)
        out.push(<line key={n++} x1={f(x)} y1={f(y)} x2={f(x2)} y2={f(y2)} strokeWidth={depth * 1.1 + 0.5} strokeLinecap="round" />)
        if (depth <= 1) return
        const wob = ((n * 37) % 17) - 8
        grow(x2, y2, len * 0.74, ang - 24 + wob, depth - 1)
        grow(x2, y2, len * 0.7, ang + 26 + wob, depth - 1)
        if (depth > 3 && n % 2) grow(x2, y2, len * 0.5, ang + wob * 2, depth - 2)
    }
    grow(50, 100, 24, -90, 6)
    return out
}

const pine = () => (
    <>
        <polygon points="50,6 72,38 28,38" fill="currentColor" stroke="none" />
        <polygon points="50,24 78,62 22,62" fill="currentColor" stroke="none" />
        <polygon points="50,44 86,88 14,88" fill="currentColor" stroke="none" />
        <rect x="45" y="88" width="10" height="10" fill="currentColor" stroke="none" />
    </>
)

const leaf = (
    <>
        <path d="M50 6 C18 34 14 68 50 96 C86 68 82 34 50 6 Z" fill="currentColor" fillOpacity=".16" strokeWidth="2" />
        <path d="M50 14 L50 100 M50 40 L34 28 M50 54 L30 42 M50 68 L34 58 M50 40 L66 28 M50 54 L70 42 M50 68 L66 58" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </>
)

const wheat = () => {
    const out = [<path key="st" d="M50 100 C50 70 52 40 50 8" strokeWidth="2" fill="none" strokeLinecap="round" />]
    for (let i = 0; i < 7; i++) {
        const y = 12 + i * 9
        out.push(<ellipse key={`l${i}`} cx={f(41)} cy={y + 4} rx="4.2" ry="8" transform={`rotate(-32 41 ${y + 4})`} fill="currentColor" fillOpacity=".25" strokeWidth="1.4" />)
        out.push(<ellipse key={`r${i}`} cx={f(59)} cy={y + 4} rx="4.2" ry="8" transform={`rotate(32 59 ${y + 4})`} fill="currentColor" fillOpacity=".25" strokeWidth="1.4" />)
    }
    out.push(<ellipse key="top" cx="50" cy="8" rx="3.6" ry="8" fill="currentColor" fillOpacity=".25" strokeWidth="1.4" />)
    return out
}

const pumpkin = (
    <>
        <ellipse cx="50" cy="60" rx="14" ry="30" fill="currentColor" fillOpacity=".12" strokeWidth="2" />
        <ellipse cx="33" cy="60" rx="15" ry="28" fill="currentColor" fillOpacity=".12" strokeWidth="2" />
        <ellipse cx="67" cy="60" rx="15" ry="28" fill="currentColor" fillOpacity=".12" strokeWidth="2" />
        <path d="M50 30 C50 20 52 14 58 10" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M38 52 L44 62 L32 62 Z M62 52 L68 62 L56 62 Z M36 74 Q50 86 64 74" strokeWidth="2" fill="currentColor" fillOpacity=".5" strokeLinejoin="round" />
    </>
)

const bat = (
    <path
        d="M50 38 C46 30 40 26 34 28 C26 22 14 22 4 30 C12 30 18 34 20 40 C14 40 10 44 10 50 C18 46 26 48 30 54 C36 50 44 52 50 62 C56 52 64 50 70 54 C74 48 82 46 90 50 C90 44 86 40 80 40 C82 34 88 30 96 30 C86 22 74 22 66 28 C60 26 54 30 50 38 Z"
        fill="currentColor" stroke="none"
    />
)

const moon = (
    <>
        <circle cx="50" cy="50" r="38" fill="currentColor" fillOpacity=".22" stroke="none" />
        <circle cx="50" cy="50" r="38" fill="none" strokeWidth="2" />
        <circle cx="38" cy="40" r="7" fill="currentColor" fillOpacity=".25" stroke="none" />
        <circle cx="60" cy="58" r="10" fill="currentColor" fillOpacity=".2" stroke="none" />
        <circle cx="62" cy="34" r="4" fill="currentColor" fillOpacity=".25" stroke="none" />
    </>
)

const star5 = <polygon points="50,6 61,38 95,38 67,58 78,92 50,71 22,92 33,58 5,38 39,38" fill="currentColor" fillOpacity=".25" strokeWidth="2" strokeLinejoin="round" />
const spark = <path d="M50 4 C52 36 64 48 96 50 C64 52 52 64 50 96 C48 64 36 52 4 50 C36 48 48 36 50 4 Z" fill="currentColor" stroke="none" />
const dot = <circle cx="50" cy="50" r="30" fill="currentColor" stroke="none" />
const confetti = <rect x="30" y="10" width="40" height="80" rx="4" fill="currentColor" stroke="none" />

const flute = (
    <>
        <path d="M34 8 L66 8 L62 52 Q50 66 38 52 Z" fill="currentColor" fillOpacity=".15" strokeWidth="2.2" strokeLinejoin="round" />
        <line x1="50" y1="62" x2="50" y2="90" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="36" y1="92" x2="64" y2="92" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="46" cy="26" r="2" fill="currentColor" stroke="none" /><circle cx="54" cy="36" r="1.6" fill="currentColor" stroke="none" />
    </>
)

const ART = {
    burst, snowflake, cobweb, deadTree, pine, leaf, wheat, pumpkin, bat, moon, star5, spark, dot, confetti, flute,
}

const Art = ({ kind, className, style }) => {
    const a = ART[kind]
    const body = typeof a === 'function' ? a() : a
    return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" className={className} style={style} focusable="false">
            {body}
        </svg>
    )
}

export default Art
