const CACHE_NAME = 'unicorn-v1';
const ASSETS = [
    './index.html',
    './manifest.json',
    './styles/main.css',
    './styles/glass.css',
    './styles/animations.css',
    './src/app.js',
    './src/game/engine.js',
    './src/game/unicorn.js',
    './assets/unicorn_sprite.png',
    './assets/forest_background.png',
    './assets/sparkle_effect.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    // Cache-First Strategy
    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request).then((response) => {
                // Optional: Run-time caching could go here, but keeping it strict for now
                return response;
            });
        })
    );
});
