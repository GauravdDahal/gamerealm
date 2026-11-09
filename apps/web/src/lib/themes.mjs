// Single source of truth for the site's colour themes.
// `node scripts/generate-themes.mjs` turns this into src/app/themes.css.
// Every colour on the public site comes from these tokens, so adding or
// tweaking a theme only means editing this file and re-running the script.

export const DEFAULT_THEME = 'casino'

// tint = [hue, saturation%] used to build the gray/secondary/accent/hot scales
export const THEMES = [
  {
    id: 'casino', label: 'Casino Night', emoji: '🎰',
    blurb: 'The everyday look: deep violet with warm orange.',
    tokens: {
      night: '#100627', surface: '#1b0f3d', surface2: '#2a1650', line: '#43307a',
      ink: '#f6f0ff', muted: '#b9acdc', dim: '#8f80b8',
      accent: '#ff9a1f', accent2: '#ffc15e', 'accent-dim': '#b45309', 'accent-ink': '#1d0b00',
      danger: '#e5484d', 'danger-soft': '#ffb3b3',
      secondary: '#6d4aff', secondary2: '#9b6dff', hot: '#ff4fa3',
    },
    scales: { gray: [265, 22], purple: [262, 80], pink: [330, 85], orange: [30, 100] },
  },
  {
    id: 'halloween', label: 'Halloween', emoji: '🎃',
    blurb: 'Pumpkin orange on near-black, with witchy purple and slime green.',
    tokens: {
      night: '#0d0905', surface: '#1a110a', surface2: '#2a1a0d', line: '#4d2f14',
      ink: '#fff3e6', muted: '#d6ad8c', dim: '#a07a58',
      accent: '#ff7a00', accent2: '#ffa63d', 'accent-dim': '#a84d00', 'accent-ink': '#1a0900',
      danger: '#e0342c', 'danger-soft': '#ffb4a8',
      secondary: '#7b2cbf', secondary2: '#a855f7', hot: '#84cc16',
    },
    scales: { gray: [25, 22], purple: [275, 70], pink: [85, 75], orange: [28, 100] },
    decor: { glyphs: ['🎃', '🦇', '👻', '🕸️'], count: 14 },
  },
  {
    id: 'christmas', label: 'Christmas', emoji: '🎄',
    blurb: 'Pine green, candy red and festive gold.',
    tokens: {
      night: '#06130d', surface: '#0d2218', surface2: '#143324', line: '#245238',
      ink: '#fff8ef', muted: '#b9d6c4', dim: '#80a28f',
      accent: '#f5c542', accent2: '#ffe08a', 'accent-dim': '#a67c10', 'accent-ink': '#1a1400',
      danger: '#dc2f3f', 'danger-soft': '#ffb8bf',
      secondary: '#168a4a', secondary2: '#34c26e', hot: '#e11d48',
    },
    scales: { gray: [150, 20], purple: [145, 65], pink: [350, 80], orange: [45, 92] },
    decor: { glyphs: ['❄️', '❅', '🎄', '⭐'], count: 22 },
  },
  {
    id: 'newyear', label: 'New Year', emoji: '🎆',
    blurb: 'Midnight blue with champagne gold and silver sparkle.',
    tokens: {
      night: '#080a18', surface: '#11142b', surface2: '#1b2040', line: '#33396a',
      ink: '#fffbea', muted: '#c9c8b2', dim: '#908f7c',
      accent: '#facc15', accent2: '#fde68a', 'accent-dim': '#a16207', 'accent-ink': '#1a1500',
      danger: '#ef4444', 'danger-soft': '#fecaca',
      secondary: '#4f6bff', secondary2: '#8aa2ff', hot: '#f5a3d0',
    },
    scales: { gray: [230, 25], purple: [228, 80], pink: [330, 70], orange: [48, 95] },
    decor: { glyphs: ['✨', '🎆', '🥂', '⭐'], count: 16 },
  },
  {
    id: 'independence', label: 'Independence Day', emoji: '🎇',
    blurb: 'Navy blue, firework red and white.',
    tokens: {
      night: '#050a1f', surface: '#0c1738', surface2: '#142459', line: '#2b3d82',
      ink: '#ffffff', muted: '#bcc7ee', dim: '#8793c8',
      accent: '#e63946', accent2: '#ff6b78', 'accent-dim': '#9b1c28', 'accent-ink': '#ffffff',
      danger: '#f97316', 'danger-soft': '#fed7aa',
      secondary: '#2563eb', secondary2: '#60a5fa', hot: '#e2e8f0',
    },
    scales: { gray: [225, 30], purple: [220, 85], pink: [355, 80], orange: [355, 78] },
    decor: { glyphs: ['🎆', '🎇', '⭐', '🇺🇸'], count: 16 },
  },
  {
    id: 'thanksgiving', label: 'Thanksgiving', emoji: '🦃',
    blurb: 'Harvest brown, pumpkin, burgundy and mustard.',
    tokens: {
      night: '#120a05', surface: '#201208', surface2: '#31200f', line: '#5b3b1d',
      ink: '#fff4e0', muted: '#d6b78f', dim: '#a38762',
      accent: '#e8841f', accent2: '#f6b04f', 'accent-dim': '#9a500c', 'accent-ink': '#1c0d02',
      danger: '#d6382f', 'danger-soft': '#fbb7ae',
      secondary: '#9f1d35', secondary2: '#d0475f', hot: '#d4a017',
    },
    scales: { gray: [28, 24], purple: [348, 68], pink: [42, 85], orange: [30, 90] },
    decor: { glyphs: ['🍂', '🍁', '🌽', '🦃'], count: 16 },
  },
]
