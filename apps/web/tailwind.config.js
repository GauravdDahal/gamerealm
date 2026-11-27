module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                // Two families only: Nunito for text and UI, Anton for headings
                // (the same face as the logo).
                sans: ['var(--font-ui)', 'system-ui', 'sans-serif'],
                display: ['Anton', 'Impact', 'Arial Narrow', 'sans-serif'],
                nowarehouse: ['Nowharehouse', 'sans-serif'],
            },
            colors: {
                'night': 'rgb(var(--c-night) / <alpha-value>)',
                'surface': 'rgb(var(--c-surface) / <alpha-value>)',
                'surface2': 'rgb(var(--c-surface2) / <alpha-value>)',
                'line': 'rgb(var(--c-line) / <alpha-value>)',
                'ink': 'rgb(var(--c-ink) / <alpha-value>)',
                'muted': 'rgb(var(--c-muted) / <alpha-value>)',
                'dim': 'rgb(var(--c-dim) / <alpha-value>)',
                'accent': 'rgb(var(--c-accent) / <alpha-value>)',
                'accent2': 'rgb(var(--c-accent2) / <alpha-value>)',
                'accent-dim': 'rgb(var(--c-accent-dim) / <alpha-value>)',
                'accent-ink': 'rgb(var(--c-accent-ink) / <alpha-value>)',
                'danger': 'rgb(var(--c-danger) / <alpha-value>)',
                'danger-soft': 'rgb(var(--c-danger-soft) / <alpha-value>)',
                'secondary': 'rgb(var(--c-secondary) / <alpha-value>)',
                'secondary2': 'rgb(var(--c-secondary2) / <alpha-value>)',
                'hot': 'rgb(var(--c-hot) / <alpha-value>)',
                // older names kept so nothing breaks; they follow the theme too
                'game-primary': 'rgb(var(--c-secondary) / <alpha-value>)',
                'game-secondary': 'rgb(var(--c-secondary2) / <alpha-value>)',
                'game-accent': 'rgb(var(--c-hot) / <alpha-value>)',
                random: 'rgb(var(--c-muted) / <alpha-value>)',
                navbarColor: 'rgb(var(--c-ink) / <alpha-value>)',
                custom1: 'rgb(var(--c-dim) / <alpha-value>)',
            },
        },
    },
    plugins: [require('@tailwindcss/forms')],
}
