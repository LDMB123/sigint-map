/**
 * Friend Manager — Multi-type animal friends with unique personalities.
 *
 * Each friend type has:
 * - A sprite image
 * - A personality that affects movement/behavior
 * - A unique collection sound
 * - A display name for screen reader announcements
 *
 * Personalities:
 * - bouncy (bunny):  hops energetically, high excitement response
 * - shy (fox):       stays far away, slowly approaches, flees from fast movement
 * - sleepy (owl):    barely moves, gentle sway, spawns at screen edges
 * - gentle (deer):   follows unicorn from safe distance, approaches when idle
 * - curled (hedgehog): stays still until unicorn is very close, then uncurls
 */

// ─── Friend Type Definitions ───────────────────────────────────────────

const FRIEND_TYPES = [
    {
        id: 'bunny',
        name: 'bunny',
        sprite: 'assets/bunny_sprite.png',
        size: 60,
        personality: 'bouncy',
        weight: 30,  // Spawn weight (higher = more common)
        shadowColor: 'rgba(255, 255, 255, 0.4)',
        collectEmoji: '\u{1F496}', // 💖
    },
    {
        id: 'fox',
        name: 'fox',
        sprite: 'assets/fox_sprite.png',
        size: 55,
        personality: 'shy',
        weight: 20,
        shadowColor: 'rgba(255, 180, 120, 0.3)',
        collectEmoji: '\u{1F9E1}', // 🧡
    },
    {
        id: 'owl',
        name: 'owl',
        sprite: 'assets/owl_sprite.png',
        size: 50,
        personality: 'sleepy',
        weight: 15,
        shadowColor: 'rgba(200, 180, 255, 0.3)',
        collectEmoji: '\u{1F49C}', // 💜
    },
    {
        id: 'deer',
        name: 'deer',
        sprite: 'assets/deer_sprite.png',
        size: 58,
        personality: 'gentle',
        weight: 20,
        shadowColor: 'rgba(180, 220, 255, 0.3)',
        collectEmoji: '\u{1F499}', // 💙
    },
    {
        id: 'hedgehog',
        name: 'hedgehog',
        sprite: 'assets/hedgehog_sprite.png',
        size: 45,
        personality: 'curled',
        weight: 15,
        shadowColor: 'rgba(255, 220, 180, 0.3)',
        collectEmoji: '\u{1F49B}', // 💛
    },
];

// Total weight for weighted random selection
const TOTAL_WEIGHT = FRIEND_TYPES.reduce((sum, t) => sum + t.weight, 0);

export class FriendManager {
    constructor(game) {
        this.game = game;
        this.friends = [];

        this.spawnTimer = 0;
        this.score = 0;
        this.maxFriends = 5; // Increases with milestones

        // Throttle announcements so we don't spam the screen reader
        this.pendingAnnouncement = false;

        // Floating hearts/emojis for collection feedback
        this.hearts = [];

        // Load all sprite images + pre-render shadows
        this._sprites = {};     // id → Image
        this._shadows = {};     // id → { canvas, pad }
        this._loadedCount = 0;

        // Track which types have usable sprites
        this._availableTypes = [];

        for (const type of FRIEND_TYPES) {
            const img = new Image();
            img.src = type.sprite;
            this._sprites[type.id] = img;
            img.addEventListener('load', () => {
                this._prerenderShadow(type.id, img, type.size, type.shadowColor);
                this._loadedCount++;
                this._availableTypes.push(type);
            });
            img.addEventListener('error', () => {
                // Sprite file missing — this type won't spawn
                console.warn(`Friend sprite not found: ${type.sprite}`);
            });
        }

        // Collection stats per type (for future bestiary)
        this._collected = {};
        for (const type of FRIEND_TYPES) {
            this._collected[type.id] = 0;
        }
    }

    /**
     * Pre-render a shadow canvas for a given sprite.
     */
    _prerenderShadow(id, img, size, shadowColor) {
        const pad = 20;
        const dim = size + pad * 2;
        const c = document.createElement('canvas');
        c.width = dim;
        c.height = dim;
        const ctx = c.getContext('2d');
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = 10;
        ctx.drawImage(img, pad, pad, size, size);
        this._shadows[id] = { canvas: c, pad };
    }

    /**
     * Pick a random friend type using weighted selection.
     * Only picks from types whose sprites successfully loaded.
     */
    _pickType() {
        const pool = this._availableTypes.length > 0 ? this._availableTypes : [FRIEND_TYPES[0]];
        const totalWeight = pool.reduce((sum, t) => sum + t.weight, 0);
        let roll = Math.random() * totalWeight;
        for (const type of pool) {
            roll -= type.weight;
            if (roll <= 0) return type;
        }
        return pool[0]; // Fallback
    }

    update(dt) {
        // Adaptive spawn rate: faster as score increases (gentler for young players)
        const spawnInterval = Math.max(1.5, 3 - this.score * 0.1);
        this.spawnTimer += dt;
        if (this.spawnTimer > spawnInterval && this.friends.length < this.maxFriends) {
            this.spawn();
            this.spawnTimer = 0;
        }

        const unicorn = this.game.unicorn;
        if (!unicorn) return; // Guard for async loading race

        // Personality-driven movement (frame-rate independent)
        if (!this.game.prefersReducedMotion) {
            const t = performance.now() / 1000;
            for (const friend of this.friends) {
                this._updatePersonality(friend, unicorn, dt, t);
            }
        }

        // Pre-compute squared collision radius once per frame
        // Use each friend's own size for collision
        const unicornHalf = unicorn.size / 2;

        // Update floating hearts
        for (let i = this.hearts.length - 1; i >= 0; i--) {
            const h = this.hearts[i];
            h.life -= dt * 0.8;
            h.y -= 60 * dt; // Float upward
            h.scale = Math.min(1.0, h.scale + dt * 5);
            if (h.life <= 0) {
                this.hearts.splice(i, 1);
            }
        }

        // Collision detection FIRST — removes collected friends before
        // excitement is computed
        for (let i = this.friends.length - 1; i >= 0; i--) {
            const friend = this.friends[i];
            const collisionDist = unicornHalf + friend.type.size / 2;
            const dx = unicorn.x - friend.x;
            const dy = unicorn.y - friend.y;

            if (dx * dx + dy * dy < collisionDist * collisionDist) {
                this.collect(i);
            }
        }

        // Friend awareness: compute distance to unicorn for remaining friends
        const awarenessDist = 180;
        const awarenessDistSq = awarenessDist * awarenessDist;
        for (const friend of this.friends) {
            const fdx = unicorn.x - friend.x;
            const fdy = unicorn.y - friend.y;
            const fdistSq = fdx * fdx + fdy * fdy;
            friend.excitement = fdistSq < awarenessDistSq
                ? 1 - Math.sqrt(fdistSq) / awarenessDist
                : 0;
        }
    }

    /**
     * Personality-driven position update for a single friend.
     */
    _updatePersonality(friend, unicorn, dt, t) {
        const p = friend.type.personality;

        switch (p) {
            case 'bouncy':
                // Classic drift from base position
                friend.x = friend.baseX + Math.sin(t * 0.5 + friend.bobOffset) * 15;
                friend.y = friend.baseY + Math.cos(t * 0.4 + friend.bobOffset * 1.5) * 10;
                break;

            case 'shy': {
                // Slowly approaches unicorn but keeps safe distance.
                // If unicorn moves fast toward fox, fox retreats.
                const sdx = unicorn.x - friend.x;
                const sdy = unicorn.y - friend.y;
                const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
                const safeZone = 150; // Stay at least this far

                if (sdist < safeZone && sdist > 1) {
                    // Flee: move away from unicorn
                    const fleeSpeed = 40 * dt;
                    friend.baseX -= (sdx / sdist) * fleeSpeed;
                    friend.baseY -= (sdy / sdist) * fleeSpeed;
                } else if (sdist > safeZone * 2) {
                    // Slowly drift toward unicorn (curious)
                    const approachSpeed = 15 * dt;
                    friend.baseX += (sdx / sdist) * approachSpeed;
                    friend.baseY += (sdy / sdist) * approachSpeed;
                }

                // Clamp to screen
                const w = this.game.canvas.width / this.game.dpr;
                const h = this.game.canvas.height / this.game.dpr;
                friend.baseX = Math.max(40, Math.min(w - 40, friend.baseX));
                friend.baseY = Math.max(40, Math.min(h - 40, friend.baseY));

                // Small nervous jitter
                friend.x = friend.baseX + Math.sin(t * 2 + friend.bobOffset) * 5;
                friend.y = friend.baseY + Math.cos(t * 2.5 + friend.bobOffset) * 3;
                break;
            }

            case 'sleepy':
                // Very slow, gentle sway — barely moves
                friend.x = friend.baseX + Math.sin(t * 0.15 + friend.bobOffset) * 4;
                friend.y = friend.baseY + Math.cos(t * 0.1 + friend.bobOffset) * 3;
                break;

            case 'gentle': {
                // Follows unicorn from a safe trailing distance.
                // Approaches more when unicorn is idle.
                const gdx = unicorn.x - friend.x;
                const gdy = unicorn.y - friend.y;
                const gdist = Math.sqrt(gdx * gdx + gdy * gdy);
                const idealDist = this.game._idleState === 'active' ? 200 : 120;

                if (gdist > idealDist && gdist > 1) {
                    const followSpeed = 30 * dt;
                    friend.baseX += (gdx / gdist) * followSpeed;
                    friend.baseY += (gdy / gdist) * followSpeed;
                }

                // Gentle sway
                friend.x = friend.baseX + Math.sin(t * 0.3 + friend.bobOffset) * 8;
                friend.y = friend.baseY + Math.cos(t * 0.25 + friend.bobOffset) * 6;
                break;
            }

            case 'curled': {
                // Stays perfectly still until unicorn is close, then "uncurls"
                // (represented by growing from small to full size)
                const cdx = unicorn.x - friend.x;
                const cdy = unicorn.y - friend.y;
                const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
                const uncurlDist = 120;

                if (cdist < uncurlDist) {
                    // Uncurling: grow toward full size
                    friend.uncurl = Math.min(1.0, (friend.uncurl || 0) + dt * 2);
                } else {
                    // Curl back up slowly
                    friend.uncurl = Math.max(0, (friend.uncurl || 0) - dt * 0.5);
                }

                // Tiny wobble only when uncurled
                const wobbleMul = friend.uncurl || 0;
                friend.x = friend.baseX + Math.sin(t * 0.8 + friend.bobOffset) * 3 * wobbleMul;
                friend.y = friend.baseY + Math.cos(t * 0.6 + friend.bobOffset) * 2 * wobbleMul;
                break;
            }
        }
    }

    spawn() {
        const type = this._pickType();
        const margin = 100;
        const dpr = this.game.dpr;
        const w = this.game.canvas.width / dpr;
        const h = this.game.canvas.height / dpr;

        let baseX, baseY;

        if (type.personality === 'sleepy') {
            // Owls spawn at screen edges
            const edge = Math.floor(Math.random() * 4);
            switch (edge) {
                case 0: baseX = margin; baseY = margin + Math.random() * (h - margin * 2); break;
                case 1: baseX = w - margin; baseY = margin + Math.random() * (h - margin * 2); break;
                case 2: baseX = margin + Math.random() * (w - margin * 2); baseY = margin; break;
                default: baseX = margin + Math.random() * (w - margin * 2); baseY = h - margin; break;
            }
        } else if (type.personality === 'shy') {
            // Foxes spawn far from unicorn
            const unicorn = this.game.unicorn;
            if (unicorn) {
                // Pick a spot at least 300px away from unicorn
                for (let attempt = 0; attempt < 5; attempt++) {
                    baseX = margin + Math.random() * (w - margin * 2);
                    baseY = margin + Math.random() * (h - margin * 2);
                    const dx = baseX - unicorn.x;
                    const dy = baseY - unicorn.y;
                    if (dx * dx + dy * dy > 90000) break; // 300² = 90000
                }
            } else {
                baseX = margin + Math.random() * (w - margin * 2);
                baseY = margin + Math.random() * (h - margin * 2);
            }
        } else {
            baseX = margin + Math.random() * (w - margin * 2);
            baseY = margin + Math.random() * (h - margin * 2);
        }

        // Fallback in case baseX/baseY weren't set
        baseX = baseX ?? (margin + Math.random() * (w - margin * 2));
        baseY = baseY ?? (margin + Math.random() * (h - margin * 2));

        this.friends.push({
            x: baseX,
            y: baseY,
            baseX,
            baseY,
            type,
            size: type.size,
            bobOffset: Math.random() * Math.PI * 2,
            excitement: 0,
            uncurl: type.personality === 'curled' ? 0 : 1,
        });

        // Audio: tiny twinkle when a friend appears
        this.game.audio.spawn();
    }

    collect(index) {
        const friend = this.friends[index];
        const type = friend.type;

        // Swap-and-pop: O(1) removal
        const last = this.friends.length - 1;
        if (index !== last) {
            this.friends[index] = this.friends[last];
        }
        this.friends.pop();

        // Effects
        this.score++;
        this._collected[type.id]++;
        this.updateScoreUI();
        this.announceScore(type);

        // Audio: per-type collection sound
        this.game.audio.collectFriend(type.id);

        // Milestone celebrations: bigger sparkle burst at 5, 10, 15...
        const isMilestone = this.score % 5 === 0;
        if (isMilestone) {
            this.maxFriends = Math.min(8, 5 + Math.floor(this.score / 10));
            this.celebrateMilestone(friend.x, friend.y);
        } else if (navigator.vibrate) {
            navigator.vibrate(15);
        }

        // Combo tracking: count rapid collections within 5s window
        const now = performance.now();
        if (now - (this._comboWindowStart || 0) < 5000) {
            this._comboCollections = (this._comboCollections || 0) + 1;
        } else {
            this._comboCollections = 1;
            this._comboWindowStart = now;
        }
        if (this._comboCollections > 0 && this._comboCollections % 3 === 0) {
            this.game.audio.combo();
        }

        // Sparkle Explosion (guard for async loading)
        if (this.game.sparkleSystem) {
            for (let i = 0; i < 10; i++) {
                this.game.sparkleSystem.spawn(friend.x, friend.y);
            }
        }

        // Floating emoji feedback (type-specific), soft cap to avoid unbounded growth
        if (this.hearts.length < 30) {
            this.hearts.push({
                x: friend.x,
                y: friend.y,
                life: 1.0,
                scale: 0,
                emoji: type.collectEmoji
            });
        }
    }

    /**
     * Big sparkle burst + multiple hearts for milestone scores.
     */
    celebrateMilestone(x, y) {
        this.game.audio.milestone();

        if (this.game.sparkleSystem) {
            for (let i = 0; i < 20; i++) {
                this.game.sparkleSystem.spawn(
                    x + (Math.random() - 0.5) * 100,
                    y + (Math.random() - 0.5) * 100
                );
            }
        }
        // Ring of hearts
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            this.hearts.push({
                x: x + Math.cos(angle) * 40,
                y: y + Math.sin(angle) * 40,
                life: 1.2,
                scale: 0,
                emoji: '\u{1F496}'
            });
        }
        if (navigator.vibrate) {
            navigator.vibrate([50, 30, 50]);
        }
    }

    updateScoreUI() {
        const pill = document.querySelector('.kindness-meter');
        const ui = pill?.querySelector('.score-text');
        if (ui) ui.textContent = this.score;

        if (pill) {
            pill.classList.remove('score-bump');
            pill.offsetWidth;
            pill.classList.add('score-bump');
        }
    }

    /**
     * Announce score changes to screen readers via aria-live region.
     * Now includes the animal type name for richer announcements.
     */
    announceScore(type) {
        if (this.pendingAnnouncement) return;
        this.pendingAnnouncement = true;

        const typeName = type?.name || 'friend';

        setTimeout(() => {
            const region = document.getElementById('game-announcements');
            if (region) {
                region.textContent = '';
                requestAnimationFrame(() => {
                    const points = this.score === 1 ? 'point' : 'points';
                    region.textContent = `You found a ${typeName} friend! ${this.score} kindness ${points} total.`;
                });
            }
            this.pendingAnnouncement = false;
        }, 300);
    }

    draw(ctx) {
        // Only draw if at least one sprite is loaded
        if (this._loadedCount === 0) return;

        const time = performance.now() / 1000;

        for (const friend of this.friends) {
            const type = friend.type;
            const img = this._sprites[type.id];
            if (!img?.complete) continue;

            const shadow = this._shadows[type.id];
            const src = shadow?.canvas || img;
            const pad = shadow?.pad || 0;

            const excitement = friend.excitement || 0;

            // Personality-specific draw modifiers
            let bobSpeed, bobAmp, wobbleAmp;
            switch (type.personality) {
                case 'bouncy':
                    bobSpeed = 2 + excitement * 4;
                    bobAmp = 5 + excitement * 10;
                    wobbleAmp = 0.05 + excitement * 0.1;
                    break;
                case 'shy':
                    bobSpeed = 1.5 + excitement * 2;
                    bobAmp = 3 + excitement * 5;
                    wobbleAmp = 0.03 + excitement * 0.15; // More nervous wobble when close
                    break;
                case 'sleepy':
                    bobSpeed = 0.5 + excitement * 1;
                    bobAmp = 2 + excitement * 3;
                    wobbleAmp = 0.02 + excitement * 0.05;
                    break;
                case 'gentle':
                    bobSpeed = 1 + excitement * 2;
                    bobAmp = 4 + excitement * 6;
                    wobbleAmp = 0.04 + excitement * 0.08;
                    break;
                case 'curled':
                    // Uncurl affects how animated the hedgehog is
                    const u = friend.uncurl || 0;
                    bobSpeed = 0.3 + u * 2 + excitement * 2;
                    bobAmp = 1 + u * 5 + excitement * 5;
                    wobbleAmp = u * 0.06 + excitement * 0.08;
                    break;
                default:
                    bobSpeed = 2;
                    bobAmp = 5;
                    wobbleAmp = 0.05;
            }

            const bob = this.game.prefersReducedMotion ? 0 : Math.sin(time * bobSpeed + friend.bobOffset) * bobAmp;
            const wobble = this.game.prefersReducedMotion ? 0 : Math.sin(time * 1.5 + friend.bobOffset * 2) * wobbleAmp;

            // Scale: excitement + uncurl for hedgehog
            let drawScale = 1 + excitement * 0.15;
            if (type.personality === 'curled') {
                // Hedgehog shrinks when curled (0.6 → 1.0)
                drawScale *= 0.6 + (friend.uncurl || 0) * 0.4;
            }

            const drawSize = type.size;

            ctx.save();
            ctx.translate(friend.x, friend.y + bob);
            ctx.rotate(wobble);
            if (!this.game.prefersReducedMotion) {
                ctx.scale(drawScale, drawScale);
            }
            ctx.drawImage(
                src,
                -drawSize / 2 - pad,
                -drawSize / 2 - pad,
                drawSize + pad * 2,
                drawSize + pad * 2
            );
            ctx.restore();
        }

        // Draw floating emojis (type-specific)
        for (const h of this.hearts) {
            if (h.life <= 0) continue;
            ctx.save();
            ctx.globalAlpha = Math.max(0, h.life);
            ctx.font = `${24 * h.scale}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(h.emoji || '\u{1F496}', h.x, h.y);
            ctx.restore();
        }
    }
}
