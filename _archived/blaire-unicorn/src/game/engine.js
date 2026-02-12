import { AudioSynth } from '../audio/synth.js';

export class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d'); // alpha:true so CSS background shows through

        this.lastTime = 0;
        this.isRunning = false;
        this.dpr = window.devicePixelRatio || 1;

        // Audio synthesizer (lazy-init on first user gesture)
        this.audio = new AudioSynth();

        // Check user's motion preference
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            this.prefersReducedMotion = e.matches;
        });

        // Entities
        this.unicorn = null;
        this.sparkles = [];

        // Tap interaction: flowers that bloom on the forest floor
        this._flowers = [];

        // Idle tracking
        this._lastInputTime = performance.now();
        this._idleState = 'active'; // 'active' | 'looking' | 'sitting'

        // Ambient floating elements for visual depth
        this._ambientParticles = [];
        this._initAmbient();

        // Input
        this.input = {
            active: false,
            x: 0,
            y: 0
        };

        // Keyboard state for arrow key / WASD movement
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false
        };

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Pause when tab is hidden to save battery/CPU
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRunning) {
                this._wasRunning = true;
                this.pause();
            } else if (!document.hidden && this._wasRunning) {
                this._wasRunning = false;
                this.start();
            }
        });

        // --- Touch / Mouse Input ---
        const handleInput = (e) => {
            if (!this.isRunning) return;
            const touch = e.touches ? e.touches[0] : e;
            this.input.active = true;
            this.input.x = touch.clientX;
            this.input.y = touch.clientY;
            this._lastInputTime = performance.now();
            this._idleState = 'active';
        };

        // Tap detection: single tap (delayed), double-tap, long-press
        this._lastTapTime = 0;
        this._longPressTimer = null;
        this._singleTapTimer = null; // Delayed to allow double-tap cancel

        const handleTapStart = (e) => {
            if (!this.isRunning) return;
            // Init audio on first gesture (browser autoplay policy)
            this.audio.init();
            this.audio.resume();

            const touch = e.touches ? e.touches[0] : e;
            this._tapStartX = touch.clientX;
            this._tapStartY = touch.clientY;
            this._tapStartTime = performance.now();
            handleInput(e);

            // Long-press detection (600ms hold = petting/discovery)
            clearTimeout(this._longPressTimer);
            this._longPressTimer = setTimeout(() => {
                if (!this.isRunning) return;
                this._handleLongPress(this._tapStartX, this._tapStartY);
            }, 600);
        };

        const handleTapEnd = (e) => {
            if (!this.isRunning) return;
            this.input.active = false;
            clearTimeout(this._longPressTimer);

            // Detect tap: short duration AND small movement (prevents drag-release false taps)
            const elapsed = performance.now() - (this._tapStartTime || 0);
            const endTouch = e.changedTouches ? e.changedTouches[0] : e;
            const moveDist = Math.hypot(
                (endTouch.clientX || 0) - (this._tapStartX || 0),
                (endTouch.clientY || 0) - (this._tapStartY || 0)
            );
            if (elapsed < 300 && moveDist < 15) {
                const now = performance.now();
                const tapX = this._tapStartX;
                const tapY = this._tapStartY;

                if (now - this._lastTapTime < 400) {
                    // Double-tap: cancel pending single-tap, fire double
                    clearTimeout(this._singleTapTimer);
                    this._singleTapTimer = null;
                    this._handleDoubleTap(tapX, tapY);
                    this._lastTapTime = 0; // Reset to prevent triple-tap
                } else {
                    // Delay single-tap so double-tap can cancel it
                    this._lastTapTime = now;
                    clearTimeout(this._singleTapTimer);
                    this._singleTapTimer = setTimeout(() => {
                        this._singleTapTimer = null;
                        this._handleTap(tapX, tapY);
                    }, 220);
                }
            }
        };

        const endInput = () => {
            if (!this.isRunning) return;
            this.input.active = false;
        };

        const handleTapCancel = () => {
            this.input.active = false;
            clearTimeout(this._longPressTimer);
            clearTimeout(this._singleTapTimer);
        };

        this.canvas.addEventListener('touchstart', handleTapStart, { passive: true });
        this.canvas.addEventListener('touchmove', handleInput, { passive: true });
        this.canvas.addEventListener('touchend', handleTapEnd);
        this.canvas.addEventListener('touchcancel', handleTapCancel);

        // Mouse compat
        this.canvas.addEventListener('mousedown', handleTapStart);
        this.canvas.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) handleInput(e);
        });
        this.canvas.addEventListener('mouseup', handleTapEnd);

        // --- Keyboard Input ---
        // WCAG 2.1.1: All functionality must be operable via keyboard
        this.canvas.addEventListener('keydown', (e) => {
            if (!this.isRunning) return;
            const handled = this.handleKeyDown(e.key);
            if (handled) {
                e.preventDefault(); // Prevent page scroll when using arrow keys in game
            }
        });

        this.canvas.addEventListener('keyup', (e) => {
            if (!this.isRunning) return;
            this.handleKeyUp(e.key);
        });

        this.loadAssets();
    }

    /**
     * Map key presses to directional movement.
     * Supports Arrow keys and WASD for flexibility.
     * @param {string} key
     * @returns {boolean} true if the key was a game control key
     */
    handleKeyDown(key) {
        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.keys.up = true;
                return true;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.keys.down = true;
                return true;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.keys.left = true;
                return true;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.keys.right = true;
                return true;
            default:
                return false;
        }
    }

    /**
     * @param {string} key
     */
    handleKeyUp(key) {
        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.keys.up = false;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.keys.down = false;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.keys.left = false;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.keys.right = false;
                break;
        }
    }

    async loadAssets() {
        const { Unicorn } = await import('./unicorn.js');
        const { SparkleSystem } = await import('./sparkles.js');
        const { FriendManager } = await import('./friends.js');

        this.unicorn = new Unicorn(this);
        this.sparkleSystem = new SparkleSystem(this);
        this.friendManager = new FriendManager(this);

        console.log("Engine Ready");
    }

    resize() {
        this.dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;
        // Set canvas buffer size for crisp rendering on HiDPI/Retina
        this.canvas.width = w * this.dpr;
        this.canvas.height = h * this.dpr;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    /**
     * Create gentle ambient floating particles (butterflies/stars)
     * for visual richness. Purely decorative — skipped in reduced-motion.
     */
    _initAmbient() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const emojis = ['\u{1F33C}', '\u{2728}', '\u{1F33A}', '\u{1F338}']; // daisy, sparkle, hibiscus, cherry blossom
        for (let i = 0; i < 8; i++) {
            this._ambientParticles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                speed: 10 + Math.random() * 15,
                drift: Math.random() * Math.PI * 2,
                size: 14 + Math.random() * 10,
                emoji: emojis[i % emojis.length],
                alpha: 0.3 + Math.random() * 0.3
            });
        }
    }

    /**
     * Handle a tap interaction: tap unicorn = giggle, tap floor = flower.
     */
    _handleTap(x, y) {
        if (!this.unicorn) return;

        // Check if tap hit the unicorn (within its bounding circle)
        const dx = x - this.unicorn.x;
        const dy = y - this.unicorn.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.unicorn.size * 0.6) {
            // Tapped Blaire! Giggle + hearts + spin
            this.audio.giggle();
            this.unicorn.giggle();
            // Spawn a ring of hearts around her
            if (this.friendManager) {
                for (let i = 0; i < 3; i++) {
                    const angle = (i / 3) * Math.PI * 2;
                    this.friendManager.hearts.push({
                        x: this.unicorn.x + Math.cos(angle) * 30,
                        y: this.unicorn.y + Math.sin(angle) * 30,
                        life: 1.0,
                        scale: 0
                    });
                }
            }
            // Sparkle burst (guard for async asset loading)
            if (this.sparkleSystem) {
                for (let i = 0; i < 6; i++) {
                    this.sparkleSystem.spawn(this.unicorn.x, this.unicorn.y);
                }
            }
            if (navigator.vibrate) navigator.vibrate(10);
        } else {
            // Tapped the forest floor — bloom a flower
            this._spawnFlower(x, y);
            this.audio.flower();
        }
    }

    /**
     * Double-tap: big sparkle explosion wherever you tap.
     * If on the unicorn, super giggle with extra hearts.
     */
    _handleDoubleTap(x, y) {
        if (!this.unicorn) return;

        // Big sparkle burst regardless of location
        if (this.sparkleSystem) {
            for (let i = 0; i < 15; i++) {
                this.sparkleSystem.spawn(
                    x + (Math.random() - 0.5) * 80,
                    y + (Math.random() - 0.5) * 80
                );
            }
        }

        const dx = x - this.unicorn.x;
        const dy = y - this.unicorn.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.unicorn.size * 0.7) {
            // Double-tapped Blaire: super giggle
            this.audio.giggle();
            this.unicorn.giggle();
            // Extra big heart ring
            if (this.friendManager) {
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    this.friendManager.hearts.push({
                        x: this.unicorn.x + Math.cos(angle) * 50,
                        y: this.unicorn.y + Math.sin(angle) * 50,
                        life: 1.2,
                        scale: 0,
                        emoji: '\u{2728}' // ✨
                    });
                }
            }
            if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
        } else {
            // Double-tap floor: flower garden (3 flowers in a cluster)
            for (let i = 0; i < 3; i++) {
                this._spawnFlower(
                    x + (Math.random() - 0.5) * 60,
                    y + (Math.random() - 0.5) * 60
                );
            }
            this.audio.flower();
        }
    }

    /**
     * Long-press: discovery / petting interaction.
     * On unicorn: gentle petting (slow hearts + soft sound).
     * On a friend: shows the friend's name briefly.
     * On floor: spawns a ring of flowers.
     */
    _handleLongPress(x, y) {
        if (!this.unicorn) return;

        const dx = x - this.unicorn.x;
        const dy = y - this.unicorn.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.unicorn.size * 0.7) {
            // Long-press on Blaire: gentle petting
            this.audio.giggle();
            // Slow cascade of hearts
            if (this.friendManager) {
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => {
                        if (!this.friendManager) return;
                        this.friendManager.hearts.push({
                            x: this.unicorn.x + (Math.random() - 0.5) * 40,
                            y: this.unicorn.y - 20 - Math.random() * 30,
                            life: 1.0,
                            scale: 0,
                            emoji: '\u{1F496}' // 💖
                        });
                    }, i * 120);
                }
            }
            if (navigator.vibrate) navigator.vibrate([10, 50, 10, 50, 10]);
        } else {
            // Check if long-press hit a friend (discovery!)
            let hitFriend = null;
            if (this.friendManager) {
                for (const friend of this.friendManager.friends) {
                    const fdx = x - friend.x;
                    const fdy = y - friend.y;
                    if (fdx * fdx + fdy * fdy < friend.type.size * friend.type.size * 0.5) {
                        hitFriend = friend;
                        break;
                    }
                }
            }

            if (hitFriend) {
                // Discovery: announce the friend's name
                const region = document.getElementById('game-announcements');
                if (region) {
                    region.textContent = '';
                    requestAnimationFrame(() => {
                        region.textContent = `You found a ${hitFriend.type.name}! Tap to collect.`;
                    });
                }
                // Visual feedback: sparkle ring around the friend
                if (this.sparkleSystem) {
                    for (let i = 0; i < 4; i++) {
                        const angle = (i / 4) * Math.PI * 2;
                        this.sparkleSystem.spawn(
                            hitFriend.x + Math.cos(angle) * 30,
                            hitFriend.y + Math.sin(angle) * 30
                        );
                    }
                }
                this.audio.spawn(); // Subtle twinkle
            } else {
                // Long-press on floor: flower ring
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2;
                    this._spawnFlower(
                        x + Math.cos(angle) * 40,
                        y + Math.sin(angle) * 40
                    );
                }
                this.audio.flower();
                if (navigator.vibrate) navigator.vibrate(30);
            }
        }
    }

    /**
     * Spawn a decorative flower at (x, y) that blooms and fades.
     */
    _spawnFlower(x, y) {
        const flowers = ['\u{1F33C}', '\u{1F33A}', '\u{1F337}', '\u{1F33B}', '\u{1F338}']; // daisy, hibiscus, tulip, sunflower, cherry blossom
        this._flowers.push({
            x,
            y,
            emoji: flowers[Math.floor(Math.random() * flowers.length)],
            life: 1.0,
            scale: 0
        });
        // Cap at 15 flowers to avoid memory buildup
        if (this._flowers.length > 15) this._flowers.shift();
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this._lastInputTime = performance.now();
        this._idleState = 'active';
        this.audio.resume();
        this.audio.startAmbient();
        requestAnimationFrame((t) => this.loop(t));
    }

    pause() {
        this.isRunning = false;
        this.audio.stopAmbient();
        // Reset keyboard state on pause to prevent stuck keys
        this.keys.up = false;
        this.keys.down = false;
        this.keys.left = false;
        this.keys.right = false;
    }

    loop(time) {
        if (!this.isRunning) return;

        // Clamp dt to prevent teleportation after tab resume or long pause
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        this.update(dt);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // Update ambient particles (gentle float across screen)
        if (!this.prefersReducedMotion) {
            const w = this.canvas.width / this.dpr;
            const h = this.canvas.height / this.dpr;
            for (const p of this._ambientParticles) {
                p.x += Math.sin(p.drift + performance.now() / 3000) * p.speed * dt * 0.5;
                p.y -= p.speed * dt * 0.3; // Gentle upward drift
                // Wrap around screen
                if (p.y < -20) { p.y = h + 20; p.x = Math.random() * w; }
                if (p.x < -20) p.x = w + 20;
                if (p.x > w + 20) p.x = -20;
            }
        }

        // Apply keyboard input: translate directional keys into target position
        if (this.unicorn && (this.keys.up || this.keys.down || this.keys.left || this.keys.right)) {
            // Keyboard counts as input — reset idle state
            this._lastInputTime = performance.now();
            this._idleState = 'active';

            const keySpeed = this.unicorn.speed * dt;
            let dx = 0;
            let dy = 0;
            if (this.keys.left) dx -= keySpeed;
            if (this.keys.right) dx += keySpeed;
            if (this.keys.up) dy -= keySpeed;
            if (this.keys.down) dy += keySpeed;

            // Clamp to logical canvas bounds (canvas.width is DPR-scaled)
            const logicalW = this.canvas.width / this.dpr;
            const logicalH = this.canvas.height / this.dpr;
            this.unicorn.targetX = Math.max(0, Math.min(logicalW, this.unicorn.x + dx));
            this.unicorn.targetY = Math.max(0, Math.min(logicalH, this.unicorn.y + dy));
            this.input.active = false; // Don't override with stale touch position
        }

        // Update flowers (bloom in, fade out)
        for (let i = this._flowers.length - 1; i >= 0; i--) {
            const f = this._flowers[i];
            f.life -= dt * 0.5;
            f.scale = Math.min(1.0, f.scale + dt * 4); // Quick bloom
            if (f.life <= 0) {
                this._flowers.splice(i, 1);
            }
        }

        // Idle state machine
        const idleTime = (performance.now() - this._lastInputTime) / 1000;
        if (idleTime > 12 && this._idleState !== 'sitting') {
            this._idleState = 'sitting';
        } else if (idleTime > 5 && this._idleState === 'active') {
            this._idleState = 'looking';
        }

        if (this.unicorn) {
            this.unicorn.idleState = this._idleState;
            this.unicorn.update(dt, this.input);
        }
        if (this.friendManager) this.friendManager.update(dt);
        if (this.sparkleSystem) this.sparkleSystem.update(dt);
    }

    draw() {
        // Clear using logical size (DPR transform handles actual pixels)
        const w = this.canvas.width / this.dpr;
        const h = this.canvas.height / this.dpr;
        this.ctx.clearRect(0, 0, w, h);

        // Ambient floating particles (behind gameplay elements)
        if (!this.prefersReducedMotion) {
            for (const p of this._ambientParticles) {
                this.ctx.save();
                this.ctx.globalAlpha = p.alpha;
                this.ctx.font = `${p.size}px sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(p.emoji, p.x, p.y);
                this.ctx.restore();
            }
        }

        // Draw tap-flowers (behind friends, above ambient)
        for (const f of this._flowers) {
            if (f.life <= 0) continue;
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, f.life);
            const size = 28 * f.scale;
            this.ctx.font = `${size}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(f.emoji, f.x, f.y);
            this.ctx.restore();
        }

        if (this.friendManager) this.friendManager.draw(this.ctx);
        if (this.unicorn) this.unicorn.draw(this.ctx);
        // Reduced motion: skip sparkle particles (purely decorative, non-essential)
        if (this.sparkleSystem && !this.prefersReducedMotion) {
            this.sparkleSystem.draw(this.ctx);
        }
    }
}
