const CACHE_NAME = 'organizator-v2';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './script.js'
];

// Inštalácia Service Workera a uloženie súborov do pamäte
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(urlsToCache))
    );
});

// Získavanie súborov (aby appka fungovala aj offline)
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
});
