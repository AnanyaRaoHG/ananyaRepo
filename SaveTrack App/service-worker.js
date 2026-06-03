const CACHE_NAME = 'wake-and-take-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
	'/add.html',
    '/style.css',
    '/script.js',
    '/manifest.json'
    // You would list your icon files here too
    // '/icons/icon-192x192.png'
];

// Installation event: Caches the necessary files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event: Serves cached content when offline (simple example)
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // No cache hit - fetch from network
                return fetch(event.request);
            })
    );
});