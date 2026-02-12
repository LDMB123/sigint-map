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
// Phase 4.1: Import asset paths from generated manifest
import ASSET_MANIFEST from './asset-manifest.js';

// Extract companion and garden assets from manifest
const MANIFEST_COMPANIONS = Object.values(ASSET_MANIFEST.companions).map(path => `/${path}`);
const MANIFEST_GARDENS = Object.values(ASSET_MANIFEST.gardens).map(path => `/${path}`);

// CRITICAL: App shell + home screen only (first paint)
const CRITICAL_ASSETS = [
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/wasm-init.js',
  '/db-worker.js',

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
  '/assets/noise.png',

  // App icons (manifest requirement):
  '/icons/app-icon-192.png',
  '/icons/app-icon-512.png',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png',
  '/icons/sparkle-unicorn.svg',

  // Home screen background (first paint, WebP optimized):
  '/illustrations/backgrounds/home-bg.webp',

  // Companion assets (default skin, visible on boot) - from manifest:
  ...MANIFEST_COMPANIONS.filter(path => path.includes('default_')),

  // Home screen buttons (18 WebP files):
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
  '/illustrations/buttons/btn-games.webp',
  '/illustrations/buttons/btn-kind-acts.webp',
  '/illustrations/buttons/btn-my-week.webp',
  '/illustrations/buttons/btn-quests.webp',
  '/illustrations/buttons/btn-show-mom.webp',
  '/illustrations/buttons/btn-stickers.webp',
  '/illustrations/buttons/btn-stories.webp',

  // Phase 5: Aggressive prefetching - Companion skin sampler (5 WebP, ~150KB)
  // One happy expression per unlockable skin type for offline warmth - from manifest
  ...MANIFEST_COMPANIONS.filter(path =>
    !path.includes('default_') && path.includes('_happy')
  ),

  // Phase 5: Aggressive prefetching - Garden stage sampler (12 WebP, ~360KB)
  // One stage_1 per garden type for instant gardens panel open - from manifest
  ...MANIFEST_GARDENS.filter(path => path.includes('_stage_1')),
];

// DEFERRED: Panel-specific assets (loaded on demand)
const DEFERRED_ASSETS = [
  // Panel CSS (not needed until panel opens):
  '/tracker.css',
  '/quests.css',
  '/stories.css',
  '/rewards.css',
  '/games.css',
  '/mom.css',
  '/progress.css',
  '/particles.css',
  '/gardens.css',
  '/scroll-effects.css',
  '/particle-effects.css',

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

  // Stickers (rewards panel only):
  '/illustrations/stickers/unicorn-rainbow.png',
  '/illustrations/stickers/unicorn-sparkle.png',
  '/illustrations/stickers/unicorn-magic.png',
  '/illustrations/stickers/unicorn-star.png',
  '/illustrations/stickers/unicorn-purple.png',
  '/illustrations/stickers/balloon-red.png',
  '/illustrations/stickers/balloon-double.png',
  '/illustrations/stickers/party-popper.png',
  '/illustrations/stickers/heart-purple.png',
  '/illustrations/stickers/star-gold.png',
  '/illustrations/stickers/heart-sparkling.png',
  '/illustrations/stickers/bunny.png',
  '/illustrations/stickers/puppy.png',
  '/illustrations/stickers/kitty.png',
  '/illustrations/stickers/butterfly.png',
  '/illustrations/stickers/sunflower.png',
  '/illustrations/stickers/rainbow.png',
  '/illustrations/stickers/cherry-blossom.png',
  '/illustrations/stickers/streak-3-fire.png',
  '/illustrations/stickers/streak-7-gem.png',
  '/illustrations/stickers/streak-14-crown.png',
  '/illustrations/stickers/streak-30-trophy.png',
  '/illustrations/stickers/unicorn-queen.png',

  // Story illustrations (stories panel only):
  '/illustrations/stories/lost-bunny-cover.png',
  '/illustrations/stories/lost-bunny-1.png',
  '/illustrations/stories/lost-bunny-end.png',
  '/illustrations/stories/rainy-day-cover.png',
  '/illustrations/stories/rainy-day-sharing.png',
  '/illustrations/stories/rainy-day-end.png',
  '/illustrations/stories/garden-surprise-cover.png',
  '/illustrations/stories/garden-watering.png',
  '/illustrations/stories/garden-end.png',
  '/illustrations/stories/new-kid-cover.png',
  '/illustrations/stories/new-kid-alone.png',
  '/illustrations/stories/new-kid-end.png',
  '/illustrations/stories/sharing-lunch-cover.png',
  '/illustrations/stories/sharing-lunch-offer.png',
  '/illustrations/stories/sharing-lunch-end.png',

  // Kind-act icons (tracker panel only):
  '/illustrations/acts/act-hug.png',
  '/illustrations/acts/act-helping.png',
  '/illustrations/acts/act-love.png',
  '/illustrations/acts/act-nice-words.png',
  '/illustrations/acts/act-sharing.png',
  '/illustrations/acts/act-unicorn.png',

  // Game illustrations (games panel only):
  '/illustrations/games/game-catcher.png',
  '/illustrations/games/game-memory.png',
  '/illustrations/games/game-hug.png',
  '/illustrations/games/game-paint.png',

  // Blaire character (rewards/mom panel):
  '/illustrations/blaire/sparkle-unicorn.png',
  '/illustrations/blaire/sparkle-splash-optimized.png',

  // Game sprites (games panel only):
  '/game-sprites/bunny_sprite.png',
  '/game-sprites/deer_sprite.png',
  '/game-sprites/forest_background.png',
  '/game-sprites/fox_sprite.png',
  '/game-sprites/hedgehog_sprite.png',
  '/game-sprites/owl_sprite.png',
  '/game-sprites/sparkle_effect.png',
  '/game-sprites/unicorn_sprite.png',

  // Companion unlockable skins (rewards panel) - from manifest:
  // Phase 5: Moved *_happy variants to CRITICAL_ASSETS for prefetch
  ...MANIFEST_COMPANIONS.filter(path =>
    !path.includes('default_') && !path.includes('_happy')
  ),

  // Garden stages (gardens panel only, 60 WebP files) - from manifest:
  // Phase 5: Moved stage_1 variants to CRITICAL_ASSETS for prefetch
  ...MANIFEST_GARDENS.filter(path => !path.includes('_stage_1')),
];

// Combined manifest for Service Worker precache
const PRECACHE_ASSETS = [...CRITICAL_ASSETS, ...DEFERRED_ASSETS];
