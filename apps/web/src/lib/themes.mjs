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
    decor: {
      fall: { art: 'bat', count: 0 },
      scene: {
        hero: [
          { img: '/assets/decor/halloween/bat2.webp', left: 0, top: '16%', size: 90, op: 0.8, anim: 'fly', dur: 28 },
          { img: '/assets/decor/halloween/spider.webp', hang: true, left: '42%', len: 110, size: 54, op: 0.95 },
        ],
        games: [{ img: '/assets/decor/halloween/ghost.webp', right: '1.5%', top: '-40px', size: 100, op: 0.9, anim: 'float', dur: 8 }],
        about: [{ img: '/assets/decor/halloween/pumpkin.webp', left: '3%', bottom: '-34px', size: 120, anim: 'bob', dur: 7 }],
        footer: [{ img: '/assets/decor/halloween/pumpkin2.webp', right: '6%', top: '-62px', size: 110, anim: 'bob', dur: 8 }],
      },
    },
  },
  {
    id: 'christmas', label: 'Christmas', emoji: '🎄',
    blurb: 'Pine green, candy red and festive gold.',
    tokens: {
      night: '#0c3321', surface: '#4a1020', surface2: '#1b6b41', line: '#35a96b',
      ink: '#fffaf0', muted: '#dcf5e4', dim: '#a6dcba',
      accent: '#ffd23f', accent2: '#fff0a6', 'accent-dim': '#d49a12', 'accent-ink': '#2a1500',
      danger: '#ff4d5e', 'danger-soft': '#ffc2c8',
      secondary: '#22c55e', secondary2: '#6ee7a0', hot: '#ff3b4e',
    },
    scales: { gray: [152, 48], purple: [145, 70], pink: [352, 88], orange: [46, 100] },
    decor: {
      fall: { art: 'snowflake', count: 14 }, strip: 'lights',
      scene: {
        hero: [
          { art: 'spark', left: '36%', top: '110px', size: 22, color: 'accent', op: 0.9, anim: 'pulse', dur: 3 },
          { art: 'spark', left: '6%', top: '34%', size: 16, color: 'accent2', op: 0.8, anim: 'pulse', dur: 4, delay: -1 },
          { art: 'spark', right: '8%', top: '62%', size: 20, color: 'ink', op: 0.8, anim: 'pulse', dur: 3.5, delay: -2 },
          { art: 'spark', left: '48%', top: '58%', size: 14, color: 'accent', op: 0.8, anim: 'pulse', dur: 2.8, delay: -0.5 },
          { kind: 'glide', img: '/assets/decor/christmas/santa.webp', bottom: '16px', size: 720, dur: 34 },
          { img: '/assets/decor/christmas/ornament.webp', desktop: true, right: '5%', top: '70px', size: 64, op: 0.95, anim: 'sway', dur: 5, origin: 'top' }],
        games: [
          { img: '/assets/decor/christmas/sil.webp', left: 0, top: '14px', size: 360, op: 0.12, anim: 'fly', dur: 60 },
          { img: '/assets/decor/christmas/giftstack.webp', left: '2%', bottom: '-14px', size: 130 },
        ],
        about: [
          { kind: 'swag', img: '/assets/decor/christmas/garland-tile.webp', top: '0', height: 86 },
          { img: '/assets/decor/christmas/snowman.webp', right: '3%', bottom: '-24px', size: 100, anim: 'bob', dur: 7 },
        ],
        bonuses: [
          { img: '/assets/decor/christmas/sack.webp', left: '2%', bottom: '-34px', size: 130 },
          { img: '/assets/decor/christmas/snowflake.webp', right: '3%', top: '14px', size: 66, anim: 'spin', dur: 90 },
          { img: '/assets/decor/christmas/cart.webp', right: '4%', bottom: '-30px', size: 140 },
        ],
        why: [
          { img: '/assets/decor/christmas/bell.webp', desktop: true, right: '3%', top: '0', size: 56, anim: 'sway', dur: 4, origin: 'top' },
          { img: '/assets/decor/christmas/gift.webp', left: '2%', bottom: '-10px', size: 90 },
        ],
        rules: [
          { img: '/assets/decor/christmas/sweater.webp', desktop: true, right: '3%', top: '10px', size: 90, anim: 'sway', dur: 7, origin: 'top' },
          { img: '/assets/decor/christmas/gingerbread.webp', desktop: true, left: '3%', bottom: '0', size: 78, anim: 'bob', dur: 6 },
        ],
        faq: [{ img: '/assets/decor/christmas/elfstar.webp', right: '3%', bottom: '-64px', size: 90 }],
        footer: [
          { kind: 'banner', left: '/assets/decor/christmas/elf-left.webp', right: '/assets/decor/christmas/elf-right.webp', tile: '/assets/decor/christmas/bunting.webp', top: '10px', height: 150 },
        ],
      },
    },
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
    decor: {
      fall: { art: 'confetti', count: 12 }, strip: 'sparkle',
      scene: {
        hero: [{ art: 'burst', left: '-60px', top: '18%', size: 200, color: 'accent', op: 0.3, anim: 'pulse', dur: 6 }],
        bonuses: [{ art: 'burst', right: '-50px', top: '10%', size: 180, color: 'accent2', op: 0.28, anim: 'pulse', dur: 7, delay: -2 }],
        why: [{ art: 'flute', right: '4%', bottom: '10px', size: 90, color: 'accent', op: 0.45, anim: 'sway', dur: 7 }],
        footer: [{ art: 'flute', left: '6%', top: '-86px', size: 100, color: 'accent', op: 0.55, anim: 'sway', dur: 8 }],
      },
    },
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
    decor: {
      fall: { art: 'star5', count: 8 }, strip: 'bunting',
      scene: {
        hero: [{ art: 'burst', left: '-60px', top: '20%', size: 190, color: '#e63946', op: 0.3, anim: 'pulse', dur: 6 }],
        about: [{ art: 'star5', right: '4%', top: '24px', size: 60, color: '#ffffff', op: 0.3, anim: 'spin', dur: 50 }],
        bonuses: [{ art: 'burst', right: '-50px', top: '10%', size: 180, color: '#60a5fa', op: 0.3, anim: 'pulse', dur: 7, delay: -2 }],
        footer: [{ art: 'burst', left: '5%', top: '-70px', size: 120, color: '#ffffff', op: 0.3, anim: 'pulse', dur: 6 }],
      },
    },
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
    decor: {
      fall: { art: 'leaf', count: 9 }, strip: 'leaves',
      scene: {
        games: [{ art: 'wheat', left: '1%', bottom: '0', size: 150, color: 'accent2', op: 0.4, anim: 'sway', dur: 9, origin: 'bottom' }],
        about: [{ art: 'pumpkin', right: '3%', bottom: '-30px', size: 110, color: 'accent', op: 0.55, anim: 'bob', dur: 8 }],
        bonuses: [{ art: 'leaf', right: '3%', top: '16px', size: 70, color: 'accent', op: 0.35, anim: 'sway', dur: 7, origin: 'top' }],
        rules: [{ art: 'wheat', right: '2%', bottom: '0', size: 140, color: 'accent2', op: 0.35, anim: 'sway', dur: 9, origin: 'bottom' }],
        footer: [{ art: 'pumpkin', left: '6%', top: '-80px', size: 100, color: 'accent', op: 0.55 }],
      },
    },
  },
]
