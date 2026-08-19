// bump on every deploy: the activate handler deletes every cache that is not
// this one, so a new version wipes the old files outright
const CACHE_NAME = 'st-alias-pwa-v21'
const urlsToCache = ['index.html', 'admin.html', 'styles.css', 'scripts.js', 'admin.js', 'db.js', 'words.json', 'manifest.json', 'favicon.png', 'logo.png']

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME)
        // reload bypasses the HTTP cache, so a deploy cannot install stale copies
        .then((cache) => cache.addAll(urlsToCache.map((url) => new Request(url, { cache: 'reload' }))))
        .then(() => self.skipWaiting())
    )
})

self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys()
        .then((cacheNames) => Promise.all(
            cacheNames
                .filter((name) => name !== CACHE_NAME)
                .map((name) => caches.delete(name))
        ))
        .then(() => self.clients.claim())
    )
})

// network-first: a cache-first worker keeps serving the old index.html and
// styles.css indefinitely, which is why edits did not show up after a deploy.
// the cache stays as the offline fallback only.
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // only same-origin, successful responses are worth storing
                if (response.ok && new URL(event.request.url).origin === self.location.origin) {
                    const copy = response.clone()
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
                }
                return response
            })
            .catch(() => caches.match(event.request).then((cached) => cached || caches.match('index.html')))
    )
})
