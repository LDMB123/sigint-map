export class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false }); // Optimize for no transparency on bg

        this.lastTime = 0;
        this.isRunning = false;

        // Entities
        this.unicorn = null;
        this.sparkles = [];

        // Input
        this.input = {
            active: false,
            x: 0,
            y: 0
        };

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Simple Touch Input
        const handleInput = (e) => {
            if (!this.isRunning) return;
            // e.preventDefault(); // Handled by CSS overscroll-behavior
            const touch = e.touches ? e.touches[0] : e;
            this.input.active = true;
            this.input.x = touch.clientX;
            this.input.y = touch.clientY;
        };

        const endInput = () => {
            if (!this.isRunning) return;
            this.input.active = false;
        };

        this.canvas.addEventListener('touchstart', handleInput, { passive: true }); // Passive for scroll perf
        this.canvas.addEventListener('touchmove', handleInput, { passive: true });
        this.canvas.addEventListener('touchend', endInput);

        // Mouse compat
        this.canvas.addEventListener('mousedown', handleInput);
        this.canvas.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) handleInput(e);
        });
        this.canvas.addEventListener('mouseup', endInput);

        this.loadAssets();
    }

    async loadAssets() {
        // Dynamic import to avoid circular deps if any, but also just cleaner
        const { Unicorn } = await import('./unicorn.js');
        const { SparkleSystem } = await import('./sparkles.js');
        const { FriendManager } = await import('./friends.js');

        this.unicorn = new Unicorn(this);
        this.sparkleSystem = new SparkleSystem(this);
        this.friendManager = new FriendManager(this);

        console.log("🦄 Engine Ready");
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        // Re-center or adjust entities if needed
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    pause() {
        this.isRunning = false;
    }

    loop(time) {
        if (!this.isRunning) return;

        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        this.update(dt);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        if (this.unicorn) this.unicorn.update(dt, this.input);
        if (this.friendManager) this.friendManager.update(dt);
        if (this.sparkleSystem) this.sparkleSystem.update(dt);
    }

    draw() {
        // Clear (or draw background if we were doing it in canvas, but we use CSS bg)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.friendManager) this.friendManager.draw(this.ctx);
        if (this.unicorn) this.unicorn.draw(this.ctx);
        if (this.sparkleSystem) this.sparkleSystem.draw(this.ctx);
    }
}
