/**
 * Main Application Bootstrapper
 */
import { GameEngine } from './game/engine.js';

class App {
    constructor() {
        this.engine = new GameEngine();
        this.init();
    }

    init() {
        console.log("🦄 Unicorn Adventure Booting...");

        // Handle View Changes if we needed JS for it (but we use CSS :target mostly)
        window.addEventListener('hashchange', () => this.handleRoute());

        // Initial Route
        this.handleRoute();

        // Offline Listeners
        window.addEventListener('online', () => document.body.classList.remove('is-offline'));
        window.addEventListener('offline', () => document.body.classList.add('is-offline'));
    }

    handleRoute() {
        const hash = window.location.hash || '#view-home';

        if (hash === '#view-game') {
            this.engine.start();
        } else {
            this.engine.pause();
        }
    }
}

// Start
window.app = new App();
