const CACHE_NAME = 'media-cloud-v3';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './app.html',
    './css/style.css',
    './manifest.webmanifest',
    './js/auth.js',
    './js/folders.js',
    './js/helpers.js',
    './js/init.js',
    './js/lazy.js',
    './js/login.js',
    './js/media.js',
    './js/setpassword.js',
    './js/upload.js',
    './js/views.js',
    'https://cdn.jsdelivr.net/npm/uikit@3.17.11/dist/css/uikit.min.css',
    'https://cdn.jsdelivr.net/npm/uikit@3.17.11/dist/js/uikit.min.js',
    'https://cdn.jsdelivr.net/npm/uikit@3.17.11/dist/js/uikit-icons.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const responseClone = response.clone();
                if (event.request.url.startsWith(self.location.origin)) {
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
