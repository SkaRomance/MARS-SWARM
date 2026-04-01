import { Game } from './game.js';

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    
    // Global access for debugging
    window.swarmGame = game;
});
