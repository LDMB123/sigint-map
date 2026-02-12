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
        console.log("Unicorn Adventure Booting...");

        // Init audio on first interaction (button clicks count)
        const initAudio = () => {
            this.engine.audio.init();
            document.removeEventListener('pointerdown', initAudio);
        };
        document.addEventListener('pointerdown', initAudio);

        // Handle View Changes with View Transitions API (progressive enhancement)
        window.addEventListener('hashchange', () => {
            // Audio: transition sweep
            this.engine.audio.transition();

            if (document.startViewTransition) {
                // Callback must be synchronous DOM update only.
                // CSS :target handles the view switch; async focus/announce
                // goes into .finished so it doesn't block the transition.
                const transition = document.startViewTransition(() => {
                    // Synchronous: engine start/pause happens here
                    const hash = window.location.hash || '#view-home';
                    if (hash === '#view-game') {
                        this.engine.start();
                    } else {
                        this.engine.pause();
                    }
                });
                transition.finished.then(() => this.postRouteSetup());
            } else {
                this.handleRoute();
            }
        });

        // Button tap sound for glass buttons
        document.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.glass-button')) {
                this.engine.audio.tap();
            }
        });

        // Initial Route
        this.handleRoute();

        // Offline Listeners
        window.addEventListener('online', () => {
            document.body.classList.remove('is-offline');
            this.announce('Back online');
        });
        window.addEventListener('offline', () => {
            document.body.classList.add('is-offline');
            // The offline toast has its own aria-live, no double-announce needed
        });
    }

    handleRoute() {
        const hash = window.location.hash || '#view-home';

        if (hash === '#view-game') {
            this.engine.start();
            // Focus management: move focus to the game canvas
            // Use requestAnimationFrame to ensure the view is visible first
            requestAnimationFrame(() => {
                const canvas = document.getElementById('game-canvas');
                if (canvas) {
                    canvas.focus();
                    this.announce('Game started. Use arrow keys or touch to move the unicorn. Collect animal friends to earn kindness points.');
                }
            });
        } else {
            this.engine.pause();
            // Focus management: move focus to the play button on home screen
            requestAnimationFrame(() => {
                const playBtn = document.getElementById('play-button');
                if (playBtn) {
                    playBtn.focus();
                }
            });
        }
    }

    /**
     * Async post-route work (focus management, announcements).
     * Called after View Transition finishes so it doesn't block the animation.
     */
    postRouteSetup() {
        const hash = window.location.hash || '#view-home';
        if (hash === '#view-game') {
            const canvas = document.getElementById('game-canvas');
            if (canvas) {
                canvas.focus();
                this.announce('Game started. Use arrow keys or touch to move the unicorn. Collect animal friends to earn kindness points.');
            }
        } else {
            const playBtn = document.getElementById('play-button');
            if (playBtn) playBtn.focus();
        }
    }

    /**
     * Announce a message to screen readers via the game-announcements live region.
     * @param {string} message
     */
    announce(message) {
        const region = document.getElementById('game-announcements');
        if (region) {
            // Clear first, then set, to ensure re-announcement even if text is same
            region.textContent = '';
            requestAnimationFrame(() => {
                region.textContent = message;
            });
        }
    }
}

// Start
window.app = new App();
