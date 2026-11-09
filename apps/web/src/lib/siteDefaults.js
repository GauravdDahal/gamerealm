/**
 * The wording and pictures the website shows when nothing has been saved in
 * the admin panel yet. Saving a section in Admin → Site content replaces the
 * matching part. Lists (FAQ items, rules, …) are replaced as a whole.
 */
export const siteDefaults = {
    brand: {
        name: 'CASINO PLAY',
        logo: '',
        join_label: 'JOIN NOW',
        nav: [
            { label: 'Home', href: '#home' },
            { label: 'Games', href: '#games' },
            { label: 'Events', href: '#tournaments' },
            { label: 'Rules', href: '#rules' },
        ],
    },
    wheel: {
        eyebrow: 'Online gaming · Lucky wheel',
        title: 'Spin free.',
        highlight: 'Win freeplay.',
        subtitle:
            'Every approved player gets one free spin a day. Land on a prize and our team will credit it to your account.',
    },
    events: {
        title: 'Earn Rewards And Bonuses',
        intro: 'Participate in our referral program and upcoming bonuses to maximize your rewards.',
        cards: [
            {
                title: 'Refer And Earn',
                description:
                    'Invite your friends and earn exclusive rewards for each successful referral!',
                button: 'Refer Now',
            },
            {
                title: 'Upcoming Bonuses',
                description:
                    'Stay tuned for exciting rewards and exclusive bonus opportunities!',
                button: 'View Bonuses',
            },
        ],
    },
    games: {
        title: 'Featured Games',
        intro: 'Dive into our selection of popular competitive games and start your journey to the top.',
        play_label: 'Play Game',
        more_label: 'See More',
        less_label: 'Show Less',
    },
    marquee: {
        items: [
            { text: 'Jackpot ♠' },
            { text: 'casino ♠' },
            { text: 'Spinning wheel ♠' },
            { text: 'casino games ♠' },
        ],
    },
    about: {
        title: 'About US',
        body: 'A casino is a facility for certain types of gambling. Casinos are often built near or combined with hotels, resorts, restaurants, retail shopping, cruise ships, and other tourist attractions. Our players get a friendly team, quick support through live chat, and a regular schedule of games, events and rewards.',
        button: 'Learn More',
    },
    cta: {
        signin_label: 'Sign in to Play',
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
        title: 'Why Play Our Casino',
        intro: 'Experience the thrill of premium online gaming with industry-leading security and endless entertainment options.',
        body: 'Join thousands of players worldwide who trust our platform for its reliability, fairness, and exceptional gaming experience. Our commitment to transparency and player satisfaction has made us a leading choice in the online gaming community, with a track record of creating memorable gaming moments and lasting player relationships.',
        features: [
            {
                title: 'Secure & Fair Gaming',
                description:
                    'Advanced encryption and certified RNG technology ensure your gaming experience is both safe and fair.',
            },
            {
                title: 'Premium Game Selection',
                description:
                    'Access hundreds of high-quality casino games from top providers, updated regularly with new releases.',
            },
            {
                title: 'Competitive Rewards',
                description:
                    'Enjoy industry-leading winning rates and exclusive bonus programs designed to maximize your chances.',
            },
            {
                title: 'Smart Investment Gaming',
                description:
                    'Strategic gaming options with real earning potential through our innovative reward systems.',
            },
        ],
    },
    rules: {
        title: 'Community Rules',
        intro: 'To maintain a fair and enjoyable gaming environment, all members must follow these essential rules.',
        items: [
            {
                title: 'Fair Play Policy',
                description:
                    'All players must adhere to our strict fair play policy. Any form of cheating or exploitation will result in immediate account suspension.',
                type: 'critical',
            },
            {
                title: 'Account Sharing',
                description:
                    'Account sharing is strictly prohibited. Each account should be used by a single player only.',
                type: 'warning',
            },
            {
                title: 'Tournament Participation',
                description:
                    'Players must be at least level 10 and have completed account verification to participate in tournaments.',
                type: 'success',
            },
            {
                title: 'Toxic Behavior',
                description:
                    'Zero tolerance for toxic behavior, harassment, or discrimination. Violations will lead to permanent bans.',
                type: 'danger',
            },
        ],
    },
    faq: {
        title: 'Frequently Asked Questions',
        intro: 'A casino is a facility for certain types of gambling. Casinos are often found in or alongside hotels and resorts.',
        background: '',
        items: [
            {
                question: 'How do I create a Casino Account?',
                answer: 'Creating a casino account is simple and secure. Visit our registration page, fill in your personal details, verify your email address, and complete the identity verification process.',
            },
            {
                question: 'What payment methods are accepted?',
                answer: 'We accept credit/debit cards, e-wallets, bank transfers, and cryptocurrency. All transactions are processed securely.',
            },
            {
                question: 'How can I ensure responsible gaming?',
                answer: 'We promote responsible gaming through deposit limits, self-exclusion options, and reality checks.',
            },
            {
                question: 'What games are available?',
                answer: 'Our platform offers slots, table games, live dealer games, and specialty games from top providers.',
            },
            {
                question: 'How do I withdraw my winnings?',
                answer: 'Navigate to the cashier section, select your withdrawal method, and follow verification steps.',
            },
            {
                question: 'Is my personal information secure?',
                answer: 'Yes, we use state-of-the-art encryption and security measures to protect your personal information.',
            },
            {
                question: 'What are the VIP benefits?',
                answer: 'Our VIP program offers exclusive bonuses, personal account managers, higher betting limits, and special event invitations based on your loyalty level.',
            },
            {
                question: 'How can I contact customer support?',
                answer: 'Our 24/7 customer support team is available via live chat, email, and phone. We aim to respond to all inquiries within minutes.',
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
        title: 'Payment Methods',
        methods: [
            { name: 'Mastercard', image: '/assets/images/paymentSectionImg/mastercard.jpg' },
            { name: 'Visa', image: '/assets/images/paymentSectionImg/visa.jpg' },
        ],
    },
    theme: { active: 'casino', decor: true },
    footer: {
        description:
            'Experience the thrill of the game anytime, anywhere! Spin the reels, place your bets, and chase big wins with the ultimate online casino adventure. Luck is just a click away! 🎰💰🔥',
        copyright_name: 'CASINO PLAY',
        social: [
            { platform: 'twitch', url: '' },
            { platform: 'youtube', url: '' },
            { platform: 'twitter', url: '' },
            { platform: 'discord', url: '' },
        ],
        columns: [
            {
                title: 'Quick Links',
                links: [
                    { label: 'Home', url: '#home' },
                    { label: 'Featured Games', url: '#games' },
                    { label: 'Contact', url: '' },
                ],
            },
            {
                title: 'Games',
                links: [
                    { label: 'Spin Wheel', url: '' },
                    { label: 'Cards', url: '' },
                    { label: 'Poker', url: '' },
                    { label: 'Roulette', url: '' },
                ],
            },
        ],
        contact_title: 'Contact Us',
        contact: [
            { text: 'support@gamerealm.com' },
            { text: '+1 (555) 123-4567' },
            { text: '123 Gaming Street' },
            { text: 'Los Angeles, CA 90001' },
        ],
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
