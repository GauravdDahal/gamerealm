// Lets notifications work on phones, and brings the site to the front when one is tapped.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
self.addEventListener('notificationclick', event => {
    event.notification.close()
    const url = event.notification.data?.url || '/'
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            for (const c of list) {
                if ('focus' in c) return c.focus()
            }
            return self.clients.openWindow(url)
        }),
    )
})
