export class FriendManager {
    constructor(game) {
        this.game = game;
        this.friends = [];
        this.image = new Image();
        this.image.src = 'assets/bunny_sprite.png';

        this.spawnTimer = 0;
        this.score = 0;
    }

    update(dt) {
        this.spawnTimer += dt;
        if (this.spawnTimer > 3 && this.friends.length < 5) {
            this.spawn();
            this.spawnTimer = 0;
        }

        const unicorn = this.game.unicorn;

        for (let i = this.friends.length - 1; i >= 0; i--) {
            const friend = this.friends[i];

            // Check Collision with Unicorn
            const dx = unicorn.x - friend.x;
            const dy = unicorn.y - friend.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < (unicorn.size / 2 + friend.size / 2)) {
                this.collect(i);
            }
        }
    }

    spawn() {
        const margin = 100;
        this.friends.push({
            x: margin + Math.random() * (this.game.canvas.width - margin * 2),
            y: margin + Math.random() * (this.game.canvas.height - margin * 2),
            size: 60,
            bobOffset: Math.random() * Math.PI * 2
        });
    }

    collect(index) {
        const friend = this.friends[index];
        this.friends.splice(index, 1);

        // Effects
        this.score++;
        this.updateScoreUI();

        // Sparkle Explosion
        for (let i = 0; i < 10; i++) {
            this.game.sparkleSystem.spawn(friend.x, friend.y);
        }
    }

    updateScoreUI() {
        const ui = document.querySelector('.kindness-meter span');
        if (ui) ui.textContent = `💖 ${this.score}`;
    }

    draw(ctx) {
        if (!this.image.complete) return;

        const time = performance.now() / 1000;

        for (const friend of this.friends) {
            const bob = Math.sin(time * 2 + friend.bobOffset) * 5;

            ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
            ctx.shadowBlur = 10;

            ctx.drawImage(
                this.image,
                friend.x - friend.size / 2,
                friend.y - friend.size / 2 + bob,
                friend.size,
                friend.size
            );
        }
        ctx.shadowBlur = 0;
    }
}
