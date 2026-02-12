const CACHE_NAME = 'unicorn-v7';
const ASSETS = [
    './index.html',
    './manifest.json',
    './styles/main.css',
    './styles/glass.css',
    './styles/animations.css',
    './styles/a11y.css',
    './src/app.js',
    './src/game/engine.js',
    './src/game/unicorn.js',
    './src/game/sparkles.js',
    './src/game/friends.js',
    './src/audio/synth.js',
    './assets/unicorn_sprite.png',
    './assets/bunny_sprite.png',
    // NOTE: fox, owl, deer, hedgehog sprites added to cache dynamically
    // when generated. cache.addAll() rejects if ANY file 404s.
    './assets/forest_background.png',
    './assets/sparkle_effect.png',
    './assets/app_icon.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            // Clean old caches
            caches.keys().then((keys) =>
                Promise.all(
                    keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
                )
            ),
            // Enable navigation preload if supported
            self.registration.navigationPreload?.enable()
        ]).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const dest = request.destination;

    // Navigation requests: use preload response if available
    if (request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                const preloadResponse = await event.preloadResponse;
                if (preloadResponse) return preloadResponse;

                const cached = await caches.match(request);
                if (cached) return cached;

                try {
                    return await fetch(request);
                } catch {
                    return caches.match('./index.html');
                }
            })()
        );
        return;
    }

    // Static assets (style, script, image): cache-first
    if (dest === 'style' || dest === 'script' || dest === 'image') {
        event.respondWith(
            caches.match(request).then((cached) =>
                cached || fetch(request).then((response) => {
                    // Cache successful responses for next load
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
            )
        );
        return;
    }

    // Everything else: cache-first with network fallback
    event.respondWith(
        caches.match(request).then((cached) => cached || fetch(request))
    );
});
