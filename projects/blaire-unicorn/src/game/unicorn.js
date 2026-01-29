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

        // Simple bobbing animation
        this.bobTimer = 0;
        this.facingRight = true;
    }

    update(dt, input) {
        // Input Following
        if (input.active) {
            this.targetX = input.x;
            this.targetY = input.y;
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

            // Spawn Sparkles while moving
            if (Math.random() < 0.2) {
                this.game.sparkleSystem.spawn(
                    this.x + (Math.random() * 40 - 20),
                    this.y + (Math.random() * 40 + 20)
                );
            }
        }

        // Idle Bobbing
        this.bobTimer += dt * 3;
    }

    draw(ctx) {
        if (!this.image.complete) return;

        ctx.save();
        ctx.translate(this.x, this.y + Math.sin(this.bobTimer) * 10);

        // Flip if facing left
        if (!this.facingRight) {
            ctx.scale(-1, 1);
        }

        // Drop shadow for blending
        ctx.shadowColor = 'rgba(255, 105, 180, 0.5)';
        ctx.shadowBlur = 20;

        ctx.drawImage(
            this.image,
            -this.size / 2,
            -this.size / 2,
            this.size,
            this.size
        );
        ctx.restore();
    }
}
