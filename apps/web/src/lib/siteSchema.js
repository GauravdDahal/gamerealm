/**
 * Describes every editable part of the homepage, for the admin form.
 * field.type: text | textarea | image | select | number | list
 * A list has `fields` (what each entry contains) and `itemLabel` (which field
 * names an entry in the editor). Lists can contain lists.
 */

const social = ['twitch', 'youtube', 'twitter', 'discord'].map(v => ({
    value: v,
    label: v[0].toUpperCase() + v.slice(1),
}))

export const siteSchema = [
    {
        key: 'brand',
        label: 'Name & menu',
        help: 'The name and menu at the top of every page.',
        fields: [
            { name: 'name', label: 'Site name', type: 'text' },
            { name: 'logo', label: 'Logo picture (optional)', type: 'image', hint: 'Replaces the dice icon in the menu.' },
            { name: 'join_label', label: 'Join button text', type: 'text' },
            {
                name: 'nav',
                label: 'Menu links',
                type: 'list',
                itemLabel: 'label',
                addLabel: 'Add menu link',
                fields: [
                    { name: 'label', label: 'Text', type: 'text' },
                    { name: 'href', label: 'Goes to', type: 'text', hint: 'For a section on this page use #games, #rules, #about, #tournaments.' },
                ],
            },
        ],
    },
    {
        key: 'wheel',
        label: 'Top of page (lucky wheel)',
        help: 'The words next to the lucky wheel. The slider pictures above it are in Banners; the prizes are in Lucky wheel.',
        fields: [
            { name: 'eyebrow', label: 'Small line above the title', type: 'text' },
            { name: 'title', label: 'Title', type: 'text' },
            { name: 'highlight', label: 'Title, coloured part', type: 'text' },
            { name: 'subtitle', label: 'Sentence under the title', type: 'textarea' },
        ],
    },
    {
        key: 'events',
        label: 'Rewards & bonuses',
        fields: [
            { name: 'title', label: 'Title', type: 'text' },
            { name: 'intro', label: 'Introduction', type: 'textarea' },
            {
                name: 'cards',
                label: 'Cards',
                type: 'list',
                itemLabel: 'title',
                addLabel: 'Add card',
                fields: [
                    { name: 'title', label: 'Card title', type: 'text' },
                    { name: 'description', label: 'Text', type: 'textarea' },
                    { name: 'button', label: 'Button text', type: 'text' },
                    { name: 'href', label: 'Button goes to', type: 'text', hint: 'Leave empty for the default. Sections: #referrals, #bonuses, #games, #rules.' },
                ],
            },
        ],
    },
    {
        key: 'games',
        label: 'Games section',
        help: 'The words around the games. Add, remove and picture the games themselves under Games.',
        fields: [
            { name: 'title', label: 'Title', type: 'text' },
            { name: 'intro', label: 'Introduction', type: 'textarea' },
            { name: 'play_label', label: 'Play button text', type: 'text' },
            { name: 'more_label', label: '"See more" button text', type: 'text' },
            { name: 'less_label', label: '"Show less" button text', type: 'text' },
        ],
    },
    {
        key: 'marquee',
        label: 'Moving words',
        help: 'The big words that slide across the page.',
        fields: [
            {
                name: 'items',
                label: 'Words',
                type: 'list',
                itemLabel: 'text',
                addLabel: 'Add words',
                fields: [{ name: 'text', label: 'Text', type: 'text' }],
            },
        ],
    },
    {
        key: 'about',
        label: 'About us',
        fields: [
            { name: 'title', label: 'Title', type: 'text' },
            { name: 'body', label: 'Text', type: 'textarea', rows: 6 },
            { name: 'button', label: 'Button text', type: 'text' },
        ],
    },
    {
        key: 'cta',
        label: 'Play banner',
        help: 'The heading and text of this banner are in Banners. Here is its button.',
        fields: [{ name: 'signin_label', label: 'Sign-in button text', type: 'text' }],
    },
    {
        key: 'referral',
        label: 'Referral levels',
        help: 'The words around the referral section. The levels themselves (friends needed, rewards) are edited in Referrals.',
        fields: [
            { name: 'eyebrow', label: 'Small line above the title', type: 'text' },
            { name: 'title', label: 'Title', type: 'text' },
            { name: 'highlight', label: 'Title, coloured part', type: 'text' },
            { name: 'subtitle', label: 'Text under the title', type: 'textarea' },
            { name: 'signin_label', label: 'Button text when not signed in', type: 'text' },
            { name: 'pending_note', label: 'Note for players still waiting for approval', type: 'text' },
        ],
    },
    {
        key: 'bonuses',
        label: 'Bonus offers',
        help: 'The bonus cards. Visitors who are not signed in are sent to sign in; approved players open the chat with a ready-made request. Change the example offers to your real ones.',
        fields: [
            { name: 'eyebrow', label: 'Small line above the title', type: 'text' },
            { name: 'title', label: 'Title', type: 'text' },
            { name: 'highlight', label: 'Title, orange part', type: 'text' },
            { name: 'link_label', label: 'Top-right link text', type: 'text' },
            { name: 'link_url', label: 'Top-right link goes to', type: 'text', hint: 'Leave empty to hide the link.' },
            { name: 'signin_label', label: 'Button text when not signed in', type: 'text' },
            { name: 'claim_label', label: 'Button text when signed in', type: 'text' },
            {
                name: 'cards',
                label: 'Bonus cards',
                type: 'list',
                itemLabel: 'title',
                addLabel: 'Add bonus',
                fields: [
                    { name: 'badge', label: 'Badge', type: 'text', hint: 'The big short figure, for example 50%.' },
                    { name: 'title', label: 'Title', type: 'text' },
                    { name: 'description', label: 'Text', type: 'textarea' },
                    { name: 'note', label: 'Small note', type: 'text', hint: 'For example: Every 24h · min deposit $50.00' },
                ],
            },
        ],
    },
    {
        key: 'why',
        label: 'Why play with us',
        fields: [
            { name: 'title', label: 'Title', type: 'text' },
            { name: 'intro', label: 'Introduction', type: 'textarea' },
            { name: 'body', label: 'More text', type: 'textarea', rows: 5 },
            {
                name: 'features',
                label: 'Points',
                type: 'list',
                itemLabel: 'title',
                addLabel: 'Add point',
                fields: [
                    { name: 'title', label: 'Title', type: 'text' },
                    { name: 'description', label: 'Text', type: 'textarea' },
                ],
            },
        ],
    },
    {
        key: 'rules',
        label: 'Community rules',
        fields: [
            { name: 'title', label: 'Title', type: 'text' },
            { name: 'intro', label: 'Introduction', type: 'textarea' },
            {
                name: 'items',
                label: 'Rules',
                type: 'list',
                itemLabel: 'title',
                addLabel: 'Add rule',
                fields: [
                    { name: 'title', label: 'Rule', type: 'text' },
                    { name: 'description', label: 'Explanation', type: 'textarea' },
                    {
                        name: 'type',
                        label: 'Colour',
                        type: 'select',
                        options: [
                            { value: 'critical', label: 'Red (very serious)' },
                            { value: 'warning', label: 'Yellow (warning)' },
                            { value: 'success', label: 'Green (requirement)' },
                            { value: 'danger', label: 'Grey (conduct)' },
                        ],
                    },
                ],
            },
        ],
    },
    {
        key: 'faq',
        label: 'Questions & answers',
        fields: [
            { name: 'title', label: 'Title', type: 'text' },
            { name: 'intro', label: 'Introduction', type: 'textarea' },
            { name: 'background', label: 'Background picture (optional)', type: 'image' },
            {
                name: 'items',
                label: 'Questions',
                type: 'list',
                itemLabel: 'question',
                addLabel: 'Add question',
                fields: [
                    { name: 'question', label: 'Question', type: 'text' },
                    { name: 'answer', label: 'Answer', type: 'textarea' },
                ],
            },
        ],
    },
    {
        key: 'testimonials',
        label: 'Player reviews',
        help: 'Only add reviews that real players have given you. The section stays hidden while the list is empty.',
        fields: [
            { name: 'title', label: 'Title', type: 'text' },
            { name: 'subtitle', label: 'Line under the title', type: 'text' },
            {
                name: 'items',
                label: 'Reviews',
                type: 'list',
                itemLabel: 'name',
                addLabel: 'Add review',
                fields: [
                    { name: 'name', label: 'Player name', type: 'text' },
                    { name: 'role', label: 'Label under the name', type: 'text', hint: 'For example: Player' },
                    { name: 'rating', label: 'Stars (1 to 5)', type: 'number', min: 1, max: 5 },
                    { name: 'comment', label: 'What they said', type: 'textarea' },
                ],
            },
        ],
    },
    {
        key: 'payments',
        label: 'Payment methods',
        fields: [
            { name: 'title', label: 'Title', type: 'text' },
            {
                name: 'methods',
                label: 'Methods',
                type: 'list',
                itemLabel: 'name',
                addLabel: 'Add payment method',
                fields: [
                    { name: 'name', label: 'Name', type: 'text' },
                    { name: 'image', label: 'Logo picture', type: 'image' },
                ],
            },
        ],
    },
    {
        key: 'footer',
        label: 'Footer',
        fields: [
            { name: 'description', label: 'Short description', type: 'textarea' },
            { name: 'copyright_name', label: 'Name in the copyright line', type: 'text' },
            {
                name: 'social',
                label: 'Social media links',
                type: 'list',
                itemLabel: 'platform',
                addLabel: 'Add social link',
                fields: [
                    { name: 'platform', label: 'Network', type: 'select', options: social },
                    { name: 'url', label: 'Link', type: 'text', hint: 'Leave empty to hide this icon.' },
                ],
            },
            {
                name: 'columns',
                label: 'Link columns',
                type: 'list',
                itemLabel: 'title',
                addLabel: 'Add column',
                fields: [
                    { name: 'title', label: 'Column title', type: 'text' },
                    {
                        name: 'links',
                        label: 'Links',
                        type: 'list',
                        itemLabel: 'label',
                        addLabel: 'Add link',
                        fields: [
                            { name: 'label', label: 'Text', type: 'text' },
                            { name: 'url', label: 'Goes to', type: 'text', hint: 'Leave empty to show plain text.' },
                        ],
                    },
                ],
            },
            { name: 'contact_title', label: 'Contact column title', type: 'text' },
            {
                name: 'contact',
                label: 'Contact lines',
                type: 'list',
                itemLabel: 'text',
                addLabel: 'Add line',
                fields: [{ name: 'text', label: 'Text', type: 'text' }],
            },
        ],
    },
]
