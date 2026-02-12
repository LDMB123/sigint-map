export class Unicorn {
    constructor(game) {
        this.game = game;
        this.x = 100;
        this.y = 300;
        this.size = 120; // Size in px

        this.targetX = this.x;
        this.targetY = this.y;

        this.speed = 300; // px per second

        this.image = new Image();
        this.image.src = 'assets/unicorn_sprite.png';

        // Pre-rendered shadow canvas (avoids per-frame shadowBlur GPU cost)
        this._shadowCanvas = null;
        this.image.addEventListener('load', () => this._prerenderShadow());

        // Simple bobbing animation
        this.bobTimer = 0;
        this.facingRight = true;

        // Squash & stretch state for movement feel
        this._squash = 1.0; // 1.0 = neutral, <1 = squashed horizontally

        // Giggle animation state
        this._giggleTimer = 0; // > 0 means currently giggling

        // Idle state (set by engine): 'active' | 'looking' | 'sitting'
        this.idleState = 'active';
        this._lookAngle = 0; // Head rotation for looking around
        this._sittingSquash = 1.0; // Vertical squash for sitting

        // Footstep sound throttle
        this._stepTimer = 0;
    }

    _prerenderShadow() {
        const pad = 40; // Extra space for shadow bleed
        const dim = this.size + pad * 2;
        const c = document.createElement('canvas');
        c.width = dim;
        c.height = dim;
        const ctx = c.getContext('2d');
        ctx.shadowColor = 'rgba(255, 105, 180, 0.5)';
        ctx.shadowBlur = 20;
        ctx.drawImage(this.image, pad, pad, this.size, this.size);
        this._shadowCanvas = c;
        this._shadowPad = pad;
    }

    /**
     * Trigger a giggle animation (called when player taps the unicorn).
     */
    giggle() {
        this._giggleTimer = 0.5; // Half-second spin
    }

    update(dt, input) {
        // Input Following
        if (input.active) {
            this.targetX = input.x;
            this.targetY = input.y;
        }

        // Giggle animation countdown
        if (this._giggleTimer > 0) {
            this._giggleTimer -= dt;
        }

        // Smooth Movement (Lerp-like)
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 10) {
            const moveDist = this.speed * dt;
            const ratio = Math.min(moveDist / dist, 1);

            this.x += dx * ratio;
            this.y += dy * ratio;

            // Direction
            if (dx > 5) this.facingRight = true;
            if (dx < -5) this.facingRight = false;

            // Squash & stretch: stretch in direction of movement
            this._squash = 0.92;

            // Footstep sound: throttled to every ~0.25s
            this._stepTimer -= dt;
            if (this._stepTimer <= 0) {
                this.game.audio.step();
                this._stepTimer = 0.25;
            }

            // Spawn Sparkles while moving (guard for async loading)
            if (Math.random() < 0.2 && this.game.sparkleSystem) {
                this.game.sparkleSystem.spawn(
                    this.x + (Math.random() * 40 - 20),
                    this.y + (Math.random() * 40 + 20)
                );
            }
        }

        // Ease squash back to neutral
        this._squash += (1.0 - this._squash) * Math.min(dt * 8, 1);

        // Idle behavior: looking around / sitting
        if (!this.game.prefersReducedMotion) {
            if (this.idleState === 'looking' && this._giggleTimer <= 0) {
                // Gentle head rotation (accumulated timer — no snap on pause/resume)
                this._lookAngle = Math.sin((this._lookTimer || 0) * 0.67) * 0.15;
            } else {
                // Ease back to neutral (also clears during giggle to avoid compounding)
                this._lookAngle += (0 - this._lookAngle) * Math.min(dt * 5, 1);
            }

            if (this.idleState === 'sitting') {
                // Squash down to look like sitting
                this._sittingSquash += (0.85 - this._sittingSquash) * Math.min(dt * 3, 1);
            } else {
                this._sittingSquash += (1.0 - this._sittingSquash) * Math.min(dt * 5, 1);
            }
        }

        // Idle look timer (accumulated, not absolute — safe across pause/resume)
        if (this.idleState === 'looking') {
            this._lookTimer = (this._lookTimer || 0) + dt;
        }

        // Idle Bobbing
        this.bobTimer += dt * 3;
    }

    draw(ctx) {
        if (!this.image.complete) return;

        const src = this._shadowCanvas || this.image;
        const pad = this._shadowPad || 0;
        const drawSize = this.size + pad * 2;

        ctx.save();
        const bobOffset = this.game.prefersReducedMotion ? 0 : Math.sin(this.bobTimer) * 10;
        ctx.translate(this.x, this.y + bobOffset);

        if (!this.facingRight) {
            ctx.scale(-1, 1);
        }

        // Idle: looking around rotation
        if (!this.game.prefersReducedMotion && Math.abs(this._lookAngle) > 0.001) {
            ctx.rotate(this._lookAngle);
        }

        // Giggle: playful spin
        if (this._giggleTimer > 0 && !this.game.prefersReducedMotion) {
            const spinProgress = 1 - (this._giggleTimer / 0.5);
            ctx.rotate(spinProgress * Math.PI * 2);
        }

        // Squash & stretch: volume-preserving (scaleX * scaleY ≈ 1)
        if (!this.game.prefersReducedMotion) {
            const sy = this._squash * this._sittingSquash;
            const sx = 1.0 / sy; // Preserve volume
            ctx.scale(sx, sy);
        }

        // Draw pre-rendered sprite+shadow (no per-frame shadowBlur)
        ctx.drawImage(
            src,
            -drawSize / 2,
            -drawSize / 2,
            drawSize,
            drawSize
        );
        ctx.restore();
    }
}
