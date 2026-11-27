/**
 * The wording and pictures the website shows when nothing has been saved in
 * the admin panel yet. Saving a section in Admin → Site content replaces the
 * matching part. Lists (FAQ items, rules, …) are replaced as a whole.
 */
export const siteDefaults = {
    brand: {
        name: 'THUNDER SWEEPS',
        logo: '/assets/images/brand/thunder-sweeps-mark.svg',
        join_label: 'Join now',
        nav: [
            { label: 'Home', href: '/' },
            { label: 'Games', href: '/games' },
            { label: 'Bonuses', href: '/bonuses' },
            { label: 'Referral', href: '/referral' },
            { label: 'Support', href: '/support' },
        ],
    },
    wheel: {
        eyebrow: '',
        title: 'Spin free.',
        highlight: 'Win freeplay.',
        subtitle:
            'Every player gets one free spin a day. Land on a prize and our team credits it to your account.',
    },
    events: {
        title: 'Rewards and bonuses',
        intro: 'Two more ways to get extra play: invite friends, or claim a bonus on your next deposit.',
        cards: [
            {
                title: 'Refer and earn',
                description:
                    'Share your personal link. Each level you reach as friends join unlocks a reward, from $5 up to $50.',
                button: 'Get your link',
            },
            {
                title: 'Deposit bonuses',
                description: 'See the offers you can claim on your next deposit.',
                button: 'View bonuses',
            },
        ],
    },
    games: {
        title: 'Featured games',
        intro: 'Tap any game to request it. Our team sets up your account and loads your points in chat.',
        play_label: 'Play game',
        more_label: 'See more',
        less_label: 'Show less',
    },
    marquee: {
        items: [
            { text: 'Jackpot' },
            { text: 'Casino' },
            { text: 'Spinning wheel' },
            { text: 'Casino games' },
        ],
    },
    about: {
        title: 'About us',
        body: 'Thunder Sweeps puts your favourite sweepstakes games and a real support team in one place. Tell us in live chat which game you want, and we set up your account and load your points. Spin the lucky wheel once a day for freeplay, claim deposit bonuses, and earn extra every time a friend joins with your link.',
        button: 'Contact support',
    },
    cta: {
        signin_label: 'Sign in to play',
    },
    // Example offers: replace them with your real bonuses in Admin → Site content.
    bonuses: {
        eyebrow: 'Bonuses',
        title: 'More to play with,',
        highlight: 'every deposit.',
        link_label: 'See all bonuses',
        link_url: '',
        signin_label: 'Sign in to claim',
        claim_label: 'Claim bonus',
        cards: [
            {
                badge: '50%',
                title: '50% Welcome Deposit Bonus',
                description: 'Start strong: your first deposit gets a 50% boost, straight into your wallet.',
                note: 'One time only',
            },
            {
                badge: '20%',
                title: '20% Daily Deposit Bonus',
                description: 'Claim every 12 hours and get 20% extra on your next deposit.',
                note: 'Every 12h',
            },
            {
                badge: '40%',
                title: '40% Big Deposit Bonus',
                description: 'Deposit $50 or more and take 40% on top.',
                note: 'Every 24h · min deposit $50.00',
            },
        ],
    },
    why: {
        title: 'Why play with Thunder Sweeps',
        intro: 'Real people on live chat, fast game loads and something to win every day.',
        body: 'Every message reaches a real member of our team, not a bot. Pick a game and we handle the account, the deposit and the cashout for you, with every step right there in your chat. A free spin each day, regular deposit bonuses and referral levels mean there is always something extra to play for.',
        features: [
            {
                title: 'Live chat support',
                description:
                    'Ask anything in chat and a real team member answers. Deposits, cashouts and game problems are all sorted right there.',
            },
            {
                title: 'Popular sweepstakes games',
                description:
                    'Your favourite sweepstakes games in one place. Pick one and we set up your game account for you.',
            },
            {
                title: 'Daily rewards',
                description:
                    'One free spin on the lucky wheel every day, plus deposit bonuses you can claim from the Bonuses page.',
            },
            {
                title: 'Refer and level up',
                description:
                    'Invite friends with your link and unlock a bigger reward at every referral level, up to $50 and a 20% deposit bonus.',
            },
        ],
    },
    rules: {
        title: 'Community rules',
        intro: 'A few rules that keep the games fair for everyone.',
        items: [
            {
                title: 'Fair play',
                description: 'Cheating or exploiting a game gets your account suspended.',
                type: 'critical',
            },
            {
                title: 'One player per account',
                description: 'Accounts are for one person. Please don’t share yours.',
                type: 'warning',
            },
            {
                title: 'Prizes and rewards',
                description:
                    'Wheel prizes, bonuses and referral rewards are added to your account by our team after a quick check.',
                type: 'success',
            },
            {
                title: 'Be respectful',
                description: 'No harassment or abuse in chat. Repeated abuse leads to a permanent ban.',
                type: 'danger',
            },
        ],
    },
    faq: {
        title: 'Frequently asked questions',
        intro: 'Quick answers about accounts, deposits, cashouts and bonuses. Can’t find yours? Ask us in live chat.',
        background: '',
        items: [
            {
                question: 'How do I create an account?',
                answer: 'Tap Join now, then sign up with Google or your email. You need to be 18 or over. Your account is ready to use straight away.',
            },
            {
                question: 'What payment methods are accepted?',
                answer: 'Deposits go through the payment QR codes in live chat. Open the chat, tap the QR button and pick a method.',
            },
            {
                question: 'How can I ensure responsible gaming?',
                answer: 'Set yourself a budget and take breaks. If you want us to pause or close your account, message our team in live chat.',
            },
            {
                question: 'What games are available?',
                answer: 'Every game on the Games page. Tap one and our team sets up your account in live chat.',
            },
            {
                question: 'How do I withdraw my winnings?',
                answer: 'Ask in live chat. Our team checks your game balance and sends your cashout.',
            },
            {
                question: 'Is my personal information secure?',
                answer: 'Yes. Your details are stored securely and only our support team can see them.',
            },
            {
                question: 'How do referral rewards work?',
                answer: 'Share your link from the Referral page. Each level you reach unlocks a reward, which our team adds to your account.',
            },
            {
                question: 'How can I contact customer support?',
                answer: 'Open the live chat with the button at the bottom right. Our team usually replies within a few minutes.',
            },
        ],
    },
    // No testimonials until you add real ones in the admin panel. The section
    // stays hidden on the website while this list is empty.
    testimonials: {
        title: 'Winners feedback',
        subtitle: 'What Our Players Say',
        items: [],
    },
    payments: {
        title: 'Payment methods',
        methods: [
            { name: 'Mastercard', image: '/assets/images/paymentSectionImg/mastercard.jpg' },
            { name: 'Visa', image: '/assets/images/paymentSectionImg/visa.jpg' },
        ],
    },
    referral: {
        eyebrow: 'Refer & earn',
        title: 'Invite friends,',
        highlight: 'level up your rewards.',
        subtitle:
            'Share your personal link. Every friend who joins counts toward your level, and each new level unlocks a bigger reward.',
        signin_label: 'Sign up to get your link',
        pending_note: 'Your referral link appears here as soon as your account is active.',
    },
    theme: { active: 'casino', decor: true },
    footer: {
        description:
            'Sweepstakes games, a free daily spin and a team on live chat whenever you play. 18+ only. Please play responsibly.',
        copyright_name: 'Thunder Sweeps',
        social: [
            { platform: 'twitch', url: '' },
            { platform: 'youtube', url: '' },
            { platform: 'twitter', url: '' },
            { platform: 'discord', url: '' },
        ],
        columns: [
            {
                title: 'Quick links',
                links: [
                    { label: 'Home', url: '/' },
                    { label: 'Games', url: '/games' },
                    { label: 'Bonuses', url: '/bonuses' },
                    { label: 'Referral rewards', url: '/referral' },
                ],
            },
            {
                title: 'Help',
                links: [
                    { label: 'Support', url: '/support' },
                    { label: 'Community rules', url: '/#rules' },
                    { label: 'Sign in or join', url: '/users' },
                ],
            },
        ],
        contact_title: 'Contact Us',
        // Add your real email, phone number and address in Admin > Site content > Footer.
        // Emails and phone numbers become tap-to-send and tap-to-call links.
        contact: [],
    },
}

/** Fills gaps: saved values win, anything missing falls back to the default. */
export const withDefaults = (saved, defaults) => {
    if (saved === undefined || saved === null) return defaults
    if (Array.isArray(defaults)) return Array.isArray(saved) ? saved : defaults
    if (defaults && typeof defaults === 'object') {
        const out = { ...defaults }
        for (const k of Object.keys(saved)) {
            out[k] = k in defaults ? withDefaults(saved[k], defaults[k]) : saved[k]
        }
        return out
    }
    return saved
}
