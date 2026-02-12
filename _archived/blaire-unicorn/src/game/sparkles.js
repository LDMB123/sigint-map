export class SparkleSystem {
    constructor(game) {
        this.game = game;
        this.particles = [];
        this.activeCount = 0; // Track live particles for swap-and-pop
        this.image = new Image();
        this.image.src = 'assets/sparkle_effect.png';

        // Object pool: pre-allocate particle slots to avoid GC churn
        this.pool = [];
        for (let i = 0; i < 100; i++) {
            this.pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, scale: 0 });
        }
    }

    spawn(x, y) {
        let p;
        if (this.activeCount < this.pool.length) {
            // Reuse from pool
            p = this.pool[this.activeCount];
        } else {
            // Pool exhausted, grow it
            p = { x: 0, y: 0, vx: 0, vy: 0, life: 0, scale: 0 };
            this.pool.push(p);
        }

        p.x = x;
        p.y = y;
        p.vx = (Math.random() - 0.5) * 50;
        p.vy = (Math.random() - 0.5) * 50 - 50;
        p.life = 1.0;
        p.scale = Math.random() * 0.5 + 0.5;
        this.activeCount++;
    }

    update(dt) {
        let i = 0;
        while (i < this.activeCount) {
            const p = this.pool[i];
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            if (p.life <= 0) {
                // Swap-and-pop: O(1) removal instead of O(n) splice
                this.activeCount--;
                this.pool[i] = this.pool[this.activeCount];
                this.pool[this.activeCount] = p;
                // Don't increment i — re-check the swapped-in particle
            } else {
                i++;
            }
        }
    }

    draw(ctx) {
        if (!this.image.complete || this.activeCount === 0) return;

        ctx.globalCompositeOperation = 'screen';

        for (let i = 0; i < this.activeCount; i++) {
            const p = this.pool[i];
            const alpha = Math.max(0, p.life);
            const size = 30 * p.scale * alpha;

            ctx.save();
            ctx.globalAlpha = alpha;
            // Subtle rotation for visual richness
            ctx.translate(p.x, p.y);
            ctx.rotate(p.life * 3);
            ctx.drawImage(
                this.image,
                -size / 2,
                -size / 2,
                size,
                size
            );
            ctx.restore();
        }

        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
    }
}
