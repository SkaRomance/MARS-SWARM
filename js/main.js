import { Game } from './game.js';
import { getDeviceDetector } from './device-detector.js';

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Inizializza il device detector per mobile/desktop detection
    const deviceDetector = getDeviceDetector();
    deviceDetector.init();
    
    // Initialize game
    const game = new Game();
    
    // Global access for debugging
    window.swarmGame = game;
    window.deviceDetector = deviceDetector;
});
