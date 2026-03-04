// Asset manifest for Service Worker precache.
// Safari 26.2 iPadOS 26.2 — no compat shims needed.
//
// NOTE: Audio is synthesized via Web Audio API + SpeechSynthesis (no WAV files).
// Trunk does NOT hash filenames in this config — names are stable.
//
// WEEK 1 OPTIMIZATION: Tiered loading strategy
// - CRITICAL_ASSETS: Needed for first paint (<2s target)
// - DEFERRED_ASSETS: Lazy-loaded on demand or after first paint
//
// Phase 4.1: Import asset paths from generated manifest.
// This file is loaded via importScripts() from sw.js, so it must stay classic-script compatible.
importScripts('./asset-manifest.js');
const ASSET_MANIFEST = self.ASSET_MANIFEST || { companions: {}, gardens: {} };

// Extract companion and garden assets from manifest
const MANIFEST_COMPANIONS = Object.values(ASSET_MANIFEST.companions).map(path => `/${path}`);
const MANIFEST_GARDENS = Object.values(ASSET_MANIFEST.gardens).map(path => `/${path}`);

// CRITICAL: App shell + home screen only (first paint)
const CRITICAL_ASSETS = [
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/wasm-init.js',
  '/panel-registry.js',
  '/db-worker.js',
  '/db-contract.js',

  // App WASM + JS glue (Trunk output):
  '/blaires-kind-heart.js',
  '/blaires-kind-heart_bg.wasm',

  // SQLite WASM files (OPFS VFS):
  '/sqlite/sqlite3.js',
  '/sqlite/sqlite3.wasm',
  '/sqlite/sqlite3-opfs-async-proxy.js',

  // CSS (critical for layout):
  '/tokens.css',
  '/app.css',
  '/home.css',
  '/animations.css',

  // Background grain texture (2.5KB, used by app.css body):
  '/noise.webp',

  // App icons (manifest requirement):
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png',

  // Home screen background (first paint, WebP optimized):
  '/illustrations/backgrounds/home-bg.webp',

  // Blaire splash screen (loading state, must be cached for first paint):
  '/illustrations/blaire/sparkle-splash-optimized.webp',

  // Companion assets (default skin, visible on boot) - from manifest:
  ...MANIFEST_COMPANIONS.filter(path => path.includes('default_')),

  // Home screen buttons (19 WebP files):
  '/illustrations/buttons/btn-act-helping.webp',
  '/illustrations/buttons/btn-act-hug.webp',
  '/illustrations/buttons/btn-act-love.webp',
  '/illustrations/buttons/btn-act-nice-words.webp',
  '/illustrations/buttons/btn-act-sharing.webp',
  '/illustrations/buttons/btn-act-unicorn.webp',
  '/illustrations/buttons/btn-game-catcher.webp',
  '/illustrations/buttons/btn-game-hug.webp',
  '/illustrations/buttons/btn-game-memory.webp',
  '/illustrations/buttons/btn-game-paint.webp',
  '/illustrations/buttons/btn-game-unicorn.webp',
  '/illustrations/buttons/btn-gardens.webp',
  '/illustrations/buttons/btn-games.webp',
  '/illustrations/buttons/btn-kind-acts.webp',
  '/illustrations/buttons/btn-my-week.webp',
  '/illustrations/buttons/btn-quests.webp',
  '/illustrations/buttons/btn-show-mom.webp',
  '/illustrations/buttons/btn-stickers.webp',
  '/illustrations/buttons/btn-stories.webp',

  // Runtime diagnostics (imported at SW startup via importScripts):
  '/runtime-diagnostics.js',

  // Phase 5 prefetch moved to DEFERRED_ASSETS — saves ~510KB from SW install critical path
];

// DEFERRED: Panel-specific assets (loaded after activation, non-blocking)
const DEFERRED_ASSETS = [
  // Panel CSS (Trunk.toml has filehash=false, so filenames are stable):
  '/tracker.css',
  '/quests.css',
  '/stories.css',
  '/rewards.css',
  '/games.css',
  '/gardens.css',
  '/progress.css',
  '/mom.css',
  '/particles.css',
  '/scroll-effects.css',

  // Splash screens (home screen launch only — not needed for in-browser PWA):
  '/icons/splash-1488x2266.png',
  '/icons/splash-2266x1488.png',

  // Phase 5 prefetch (moved from CRITICAL for faster install):
  // Companion skin sampler (5 WebP, ~150KB)
  ...MANIFEST_COMPANIONS.filter(path =>
    !path.includes('default_') && path.includes('_happy')
  ),
  // Garden stage sampler (12 WebP, ~360KB)
  ...MANIFEST_GARDENS.filter(path => path.includes('_stage_1')),

  // WebGPU shaders (games panel only):
  '/shaders/particles_compute.wgsl',
  '/shaders/particles_render.wgsl',

  // Panel backgrounds (deferred until panel opens, WebP optimized):
  '/illustrations/backgrounds/tracker-bg.webp',
  '/illustrations/backgrounds/rewards-bg.webp',
  '/illustrations/backgrounds/quests-bg.webp',
  '/illustrations/backgrounds/games-bg.webp',
  '/illustrations/backgrounds/progress-bg.webp',
  '/illustrations/backgrounds/stories-bg.webp',
  '/illustrations/backgrounds/gardens-bg.webp',

  // Stickers (rewards panel only):
  '/illustrations/stickers/unicorn-rainbow.webp',
  '/illustrations/stickers/unicorn-sparkle.webp',
  '/illustrations/stickers/unicorn-magic.webp',
  '/illustrations/stickers/unicorn-star.webp',
  '/illustrations/stickers/unicorn-purple.webp',
  '/illustrations/stickers/balloon-red.webp',
  '/illustrations/stickers/balloon-double.webp',
  '/illustrations/stickers/party-popper.webp',
  '/illustrations/stickers/heart-purple.webp',
  '/illustrations/stickers/star-gold.webp',
  '/illustrations/stickers/heart-sparkling.webp',
  '/illustrations/stickers/bunny.webp',
  '/illustrations/stickers/puppy.webp',
  '/illustrations/stickers/kitty.webp',
  '/illustrations/stickers/butterfly.webp',
  '/illustrations/stickers/sunflower.webp',
  '/illustrations/stickers/rainbow.webp',
  '/illustrations/stickers/cherry-blossom.webp',
  '/illustrations/stickers/streak-3-fire.webp',
  '/illustrations/stickers/streak-7-gem.webp',
  '/illustrations/stickers/streak-14-crown.webp',
  '/illustrations/stickers/streak-30-trophy.webp',
  '/illustrations/stickers/unicorn-queen.webp',

  // Wave 6: Sticker art completion (22 new illustrations):
  '/illustrations/stickers/confetti-ball.webp',
  '/illustrations/stickers/tanabata-tree.webp',
  '/illustrations/stickers/glowing-star.webp',
  '/illustrations/stickers/heart-ribbon.webp',
  '/illustrations/stickers/bird.webp',
  '/illustrations/stickers/sunshine.webp',
  '/illustrations/stickers/tulip.webp',
  '/illustrations/stickers/garden-hero.webp',
  '/illustrations/stickers/kindness-champion.webp',
  '/illustrations/stickers/super-helper.webp',
  '/illustrations/stickers/mastery-bronze-sharing.webp',
  '/illustrations/stickers/mastery-bronze-helping.webp',
  '/illustrations/stickers/mastery-bronze-hug.webp',
  '/illustrations/stickers/mastery-bronze-love.webp',
  '/illustrations/stickers/mastery-silver-sharing.webp',
  '/illustrations/stickers/mastery-silver-helping.webp',
  '/illustrations/stickers/mastery-silver-hug.webp',
  '/illustrations/stickers/mastery-silver-love.webp',
  '/illustrations/stickers/mastery-gold-sharing.webp',
  '/illustrations/stickers/mastery-gold-helping.webp',
  '/illustrations/stickers/mastery-gold-hug.webp',
  '/illustrations/stickers/mastery-gold-love.webp',

  // Mom mode inline icons (4 stickers used in mom_mode.rs):
  '/illustrations/stickers/lock-gold.webp',
  '/illustrations/stickers/calendar-magic.webp',
  '/illustrations/stickers/chart-sparkle.webp',
  '/illustrations/stickers/pencil-star.webp',

  // Story illustrations (stories panel only):
  '/illustrations/stories/lost-bunny-cover.webp',
  '/illustrations/stories/lost-bunny-1.webp',
  '/illustrations/stories/lost-bunny-end.webp',
  '/illustrations/stories/rainy-day-cover.webp',
  '/illustrations/stories/rainy-day-sharing.webp',
  '/illustrations/stories/rainy-day-end.webp',
  '/illustrations/stories/garden-surprise-cover.webp',
  '/illustrations/stories/garden-watering.webp',
  '/illustrations/stories/garden-end.webp',
  '/illustrations/stories/new-kid-cover.webp',
  '/illustrations/stories/new-kid-alone.webp',
  '/illustrations/stories/new-kid-end.webp',
  '/illustrations/stories/sharing-lunch-cover.webp',
  '/illustrations/stories/sharing-lunch-offer.webp',
  '/illustrations/stories/sharing-lunch-end.webp',

  // Wave 5: New story illustrations (10 stories × 3 images):
  '/illustrations/stories/unicorn-forest-cover.webp',
  '/illustrations/stories/unicorn-forest-1.webp',
  '/illustrations/stories/unicorn-forest-end.webp',
  '/illustrations/stories/lonely-dragon-cover.webp',
  '/illustrations/stories/lonely-dragon-1.webp',
  '/illustrations/stories/lonely-dragon-end.webp',
  '/illustrations/stories/fairy-village-cover.webp',
  '/illustrations/stories/fairy-village-1.webp',
  '/illustrations/stories/fairy-village-end.webp',
  '/illustrations/stories/sibling-adventure-cover.webp',
  '/illustrations/stories/sibling-adventure-1.webp',
  '/illustrations/stories/sibling-adventure-end.webp',
  '/illustrations/stories/grandpa-day-cover.webp',
  '/illustrations/stories/grandpa-day-1.webp',
  '/illustrations/stories/grandpa-day-end.webp',
  '/illustrations/stories/new-neighbor-cover.webp',
  '/illustrations/stories/new-neighbor-1.webp',
  '/illustrations/stories/new-neighbor-end.webp',
  '/illustrations/stories/lost-puppy-cover.webp',
  '/illustrations/stories/lost-puppy-1.webp',
  '/illustrations/stories/lost-puppy-end.webp',
  '/illustrations/stories/library-helper-cover.webp',
  '/illustrations/stories/library-helper-1.webp',
  '/illustrations/stories/library-helper-end.webp',
  '/illustrations/stories/park-cleanup-cover.webp',
  '/illustrations/stories/park-cleanup-1.webp',
  '/illustrations/stories/park-cleanup-end.webp',
  '/illustrations/stories/birthday-surprise-cover.webp',
  '/illustrations/stories/birthday-surprise-1.webp',
  '/illustrations/stories/birthday-surprise-end.webp',

  // Kind-act icons (tracker panel only):
  '/illustrations/acts/act-hug.webp',
  '/illustrations/acts/act-helping.webp',
  '/illustrations/acts/act-love.webp',
  '/illustrations/acts/act-nice-words.webp',
  '/illustrations/acts/act-sharing.webp',
  '/illustrations/acts/act-unicorn.webp',

  // Game illustrations (games panel only):
  '/illustrations/games/game-catcher.webp',
  '/illustrations/games/game-memory.webp',
  '/illustrations/games/game-hug.webp',
  '/illustrations/games/game-paint.webp',

  // Blaire character (rewards/mom panel):
  '/illustrations/blaire/sparkle-unicorn.webp',
  // sparkle-splash-optimized.webp moved to CRITICAL_ASSETS (loading screen)

  // Game sprites (games panel only):
  '/game-sprites/bunny_sprite.webp',
  '/game-sprites/deer_sprite.webp',
  '/game-sprites/forest_background.webp',
  '/game-sprites/fox_sprite.webp',
  '/game-sprites/hedgehog_sprite.webp',
  '/game-sprites/owl_sprite.webp',
  '/game-sprites/sparkle_effect.webp',
  '/game-sprites/unicorn_sprite.webp',

  // Companion unlockable skins (rewards panel) - from manifest:
  // Phase 5: Moved *_happy variants to CRITICAL_ASSETS for prefetch
  ...MANIFEST_COMPANIONS.filter(path =>
    !path.includes('default_') && !path.includes('_happy')
  ),

  // Garden stages (gardens panel only, 60 WebP files) - from manifest:
  // Phase 5: Moved stage_1 variants to CRITICAL_ASSETS for prefetch
  ...MANIFEST_GARDENS.filter(path => !path.includes('_stage_1')),
];
