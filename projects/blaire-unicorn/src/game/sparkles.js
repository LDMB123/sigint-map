export class SparkleSystem {
    constructor(game) {
        this.game = game;
        this.particles = [];
        this.image = new Image();
        this.image.src = 'assets/sparkle_effect.png';
    }

    spawn(x, y) {
        this.particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 50,
            vy: (Math.random() - 0.5) * 50 - 50, // Float up slightly
            life: 1.0,
            scale: Math.random() * 0.5 + 0.5
        });
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        if (!this.image.complete) return;

        ctx.globalCompositeOperation = 'screen'; // Magical additive blending

        for (const p of this.particles) {
            const alpha = Math.max(0, p.life);
            const size = 30 * p.scale * alpha; // Shrink as they fade

            ctx.globalAlpha = alpha;
            ctx.drawImage(
                this.image,
                p.x - size / 2,
                p.y - size / 2,
                size,
                size
            );
        }

        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
    }
}
