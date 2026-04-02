import { Renderer } from './renderer.js';
import { Worm } from './worm.js';
import { Fruit } from './fruit.js';
import { ParticleSystem } from './particles.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = null;
        this.worm = null;
        this.fruit = null;
        this.particles = null;
        
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('swarm_highscore')) || 0;
        this.isPlaying = false;
        this.isGameOver = false;
        this.isPaused = false;
        this.lastTime = 0;
        
        // Saved game data
        this.savedGame = null;
        this.loadSavedGameData();
        
        // UI Elements
        this.ui = {
            score: document.getElementById('score-value'),
            highScore: document.getElementById('high-score-value'),
            finalScore: document.getElementById('final-score-value'),
            pauseScore: document.getElementById('pause-score-value'),
            mainMenu: document.getElementById('main-menu'),
            gameOver: document.getElementById('game-over'),
            pauseMenu: document.getElementById('pause-menu'),
            touchControls: document.getElementById('touch-controls')
        };
        
        // Input state
        this.keys = {};
        this.touchDir = null;
        
        this.init();
    }
    
    init() {
        // Initialize renderer
        this.renderer = new Renderer(this.canvas);
        
        // Initialize game objects
        this.worm = new Worm(this.renderer.scene);
        this.fruit = new Fruit(this.renderer.scene, this.renderer.boundarySize);
        this.particles = new ParticleSystem(this.renderer.scene);
        
        // Update UI
        this.ui.highScore.textContent = this.highScore;
        
        // Setup input
        this.setupInput();
        
        // Start render loop
        requestAnimationFrame((t) => this.loop(t));
    }
    
    setupInput() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            this.handleKeyInput(e.key);
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // Touch controls (pulsanti)
        const touchButtons = document.querySelectorAll('.touch-btn');
        touchButtons.forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleTouchInput(btn.dataset.dir);
            });
            btn.addEventListener('mousedown', (e) => {
                this.handleTouchInput(btn.dataset.dir);
            });
        });
        
        // Invisible touch zones (clicca sui lati dello schermo)
        const touchZones = document.querySelectorAll('.touch-zone');
        touchZones.forEach(zone => {
            zone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleTouchInput(zone.dataset.dir);
            }, { passive: false });
            zone.addEventListener('click', (e) => {
                this.handleTouchInput(zone.dataset.dir);
            });
        });
        
        // Menu buttons
        document.getElementById('btn-start').addEventListener('click', () => this.start());
        document.getElementById('btn-restart').addEventListener('click', () => this.restart());
        document.getElementById('btn-highscores').addEventListener('click', () => this.showHighScores());
        document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-save').addEventListener('click', () => this.saveGame());
        document.getElementById('btn-load').addEventListener('click', () => this.loadGame());
        document.getElementById('btn-quit').addEventListener('click', () => this.quitToMenu());
        document.getElementById('btn-save-gameover').addEventListener('click', () => this.saveScore());
        
        // Prevent context menu
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    handleKeyInput(key) {
        // Pause toggle - Space, P, or Escape
        if (key === ' ' || key === 'p' || key === 'P' || key === 'Escape') {
            if (this.isPlaying && !this.isGameOver) {
                this.togglePause();
            }
            return;
        }
        
        if (!this.isPlaying || this.isGameOver || this.isPaused) return;
        
        const directions = {
            'ArrowUp': { x: 0, z: -1 },
            'w': { x: 0, z: -1 },
            'W': { x: 0, z: -1 },
            'ArrowDown': { x: 0, z: 1 },
            's': { x: 0, z: 1 },
            'S': { x: 0, z: 1 },
            'ArrowLeft': { x: -1, z: 0 },
            'a': { x: -1, z: 0 },
            'A': { x: -1, z: 0 },
            'ArrowRight': { x: 1, z: 0 },
            'd': { x: 1, z: 0 },
            'D': { x: 1, z: 0 }
        };
        
        if (directions[key]) {
            this.worm.setDirection(new THREE.Vector3(
                directions[key].x,
                0,
                directions[key].z
            ));
        }
    }
    
    handleTouchInput(dir) {
        if (!this.isPlaying || this.isGameOver) return;
        
        const directions = {
            'up': { x: 0, z: -1 },
            'down': { x: 0, z: 1 },
            'left': { x: -1, z: 0 },
            'right': { x: 1, z: 0 }
        };
        
        if (directions[dir]) {
            this.worm.setDirection(new THREE.Vector3(
                directions[dir].x,
                0,
                directions[dir].z
            ));
        }
    }
    
    start() {
        this.isPlaying = true;
        this.isGameOver = false;
        this.score = 0;
        this.ui.score.textContent = '0';
        this.ui.mainMenu.classList.remove('active');
        this.ui.gameOver.classList.remove('active');
        
        // Reset worm
        this.worm.reset();
        
        // Respawn fruit
        this.fruit.remove();
        this.fruit = new Fruit(this.renderer.scene, this.renderer.boundarySize);
        
        // Clear particles
        this.particles.clear();
    }
    
    restart() {
        this.start();
    }
    
    togglePause() {
        if (!this.isPlaying || this.isGameOver) return;
        
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.ui.pauseScore.textContent = this.score;
            this.ui.pauseMenu.classList.add('active');
        } else {
            this.ui.pauseMenu.classList.remove('active');
            this.lastTime = performance.now();
        }
    }
    
    saveGame() {
        if (!this.isPlaying && !this.isGameOver) return;
        
        const gameState = {
            score: this.score,
            wormLength: this.worm.getLength(),
            wormDirection: {
                x: this.worm.direction.x,
                z: this.worm.direction.z
            },
            wormPosition: {
                x: this.worm.head.position.x,
                z: this.worm.head.position.z
            },
            fruitPosition: {
                x: this.fruit.position.x,
                z: this.fruit.position.z
            },
            savedAt: new Date().toLocaleString()
        };
        
        localStorage.setItem('swarm_saved_game', JSON.stringify(gameState));
        this.savedGame = gameState;
        
        // Visual feedback
        this.showNotification('GAME SAVED!');
    }
    
    saveScore() {
        // Save to high scores list
        const scoreEntry = {
            score: this.score,
            length: this.worm ? this.worm.getLength() : 0,
            date: new Date().toLocaleString(),
            id: Date.now()
        };
        
        // Get existing scores
        let highScores = JSON.parse(localStorage.getItem('swarm_highscores')) || [];
        
        // Add new score
        highScores.push(scoreEntry);
        
        // Sort by score (descending)
        highScores.sort((a, b) => b.score - a.score);
        
        // Keep only top 10
        highScores = highScores.slice(0, 10);
        
        // Save back
        localStorage.setItem('swarm_highscores', JSON.stringify(highScores));
        
        // Update high score if needed
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('swarm_highscore', this.highScore);
            this.ui.highScore.textContent = this.highScore;
        }
        
        this.showNotification('SCORE SAVED!');
        
        // Show high scores
        this.showHighScores();
    }
    
    showHighScores() {
        const highScores = JSON.parse(localStorage.getItem('swarm_highscores')) || [];
        
        if (highScores.length === 0) {
            this.showNotification('NO SCORES YET');
            return;
        }
        
        // Create high scores panel
        const panel = document.createElement('div');
        panel.className = 'highscores-panel';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(10, 15, 10, 0.95);
            border: 2px solid var(--mars-green);
            border-radius: 16px;
            padding: 30px;
            z-index: 1000;
            font-family: 'Orbitron', sans-serif;
            color: #fff;
            min-width: 300px;
            box-shadow: 0 0 40px rgba(0, 200, 81, 0.3);
        `;
        
        let html = '<h3 style="text-align: center; color: var(--mars-green); margin-bottom: 20px; font-size: 24px;">TOP SCORES</h3>';
        html += '<table style="width: 100%; border-collapse: collapse;">';
        
        highScores.forEach((entry, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            html += `
                <tr style="border-bottom: 1px solid rgba(0,200,81,0.2);">
                    <td style="padding: 10px; color: var(--mars-green);">${medal}</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold;">${entry.score}</td>
                    <td style="padding: 10px; text-align: right; font-size: 12px; color: #888;">${entry.date.split(',')[0]}</td>
                </tr>
            `;
        });
        
        html += '</table>';
        html += '<button id="close-highscores" style="margin-top: 20px; width: 100%; padding: 12px; background: var(--mars-green); border: none; border-radius: 8px; font-family: Orbitron; font-weight: bold; cursor: pointer;">CLOSE</button>';
        
        panel.innerHTML = html;
        document.body.appendChild(panel);
        
        document.getElementById('close-highscores').addEventListener('click', () => {
            panel.remove();
        });
    }
    
    loadSavedGameData() {
        const saved = localStorage.getItem('swarm_saved_game');
        if (saved) {
            this.savedGame = JSON.parse(saved);
        }
    }
    
    loadGame() {
        if (!this.savedGame) {
            this.showNotification('NO SAVED GAME');
            return;
        }
        
        // Close pause menu if open
        this.ui.pauseMenu.classList.remove('active');
        this.isPaused = false;
        
        // Reset and restore state
        this.score = this.savedGame.score;
        this.ui.score.textContent = this.score;
        this.isPlaying = true;
        this.isGameOver = false;
        this.ui.mainMenu.classList.remove('active');
        this.ui.gameOver.classList.remove('active');
        
        // Reset worm and restore length
        this.worm.reset();
        const segmentsToAdd = this.savedGame.wormLength - this.worm.initialLength;
        for (let i = 0; i < segmentsToAdd; i++) {
            this.worm.grow();
        }
        
        // Restore worm position
        this.worm.head.position.set(
            this.savedGame.wormPosition.x,
            0.5,
            this.savedGame.wormPosition.z
        );
        this.worm.direction.set(
            this.savedGame.wormDirection.x,
            0,
            this.savedGame.wormDirection.z
        );
        this.worm.targetDirection.copy(this.worm.direction);
        
        // Restore fruit
        this.fruit.remove();
        this.fruit = new Fruit(this.renderer.scene, this.renderer.boundarySize);
        this.fruit.position.set(
            this.savedGame.fruitPosition.x,
            0.5,
            this.savedGame.fruitPosition.z
        );
        this.fruit.mesh.position.copy(this.fruit.position);
        
        this.showNotification('GAME LOADED!');
    }
    
    quitToMenu() {
        this.isPaused = false;
        this.isPlaying = false;
        this.isGameOver = false;
        this.ui.pauseMenu.classList.remove('active');
        this.ui.gameOver.classList.remove('active');
        this.ui.mainMenu.classList.add('active');
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 200, 81, 0.9);
            color: #000;
            padding: 15px 30px;
            border-radius: 8px;
            font-family: 'Orbitron', sans-serif;
            font-weight: 700;
            font-size: 16px;
            z-index: 1000;
            animation: fadeInOut 2s ease forwards;
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 2000);
    }
    
    gameOver() {
        this.isPlaying = false;
        this.isGameOver = true;
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('swarm_highscore', this.highScore);
            this.ui.highScore.textContent = this.highScore;
        }
        
        // Show final score
        this.ui.finalScore.textContent = this.score;
        this.ui.gameOver.classList.add('active');
        
        // Explosion effect at head position
        this.particles.createExplosionEffect(
            this.worm.getHeadPosition(),
            0xff4757
        );
    }
    
    checkFruitCollision() {
        const headPos = this.worm.getHeadPosition();
        const fruitPos = this.fruit.getPosition();
        
        const distance = headPos.distanceTo(fruitPos);
        
        if (distance < 1.2) {
            // Eat fruit
            this.score += 10;
            this.ui.score.textContent = this.score;
            
            // Grow worm
            this.worm.grow();
            
            // Particle effect
            this.particles.createEatEffect(fruitPos, this.fruit.colorScheme.main);
            
            // Respawn fruit - passa posizione worm per evitare spawn troppo vicino
            this.fruit.spawn(headPos);
            
            return true;
        }
        return false;
    }
    
    update(deltaTime) {
        if (!this.isPlaying || this.isGameOver || this.isPaused) return;
        
        // Update worm
        const status = this.worm.update(deltaTime, this.renderer.boundarySize);
        
        if (status === 'collision') {
            this.gameOver();
            return;
        }
        
        // Update fruit
        this.fruit.update(deltaTime);
        
        // Check collisions
        this.checkFruitCollision();
        
        // Update particles
        this.particles.update();
        
        // Occasionally create sparkles around fruit
        if (Math.random() < 0.02) {
            this.particles.createSparkle(
                this.fruit.getPosition(),
                this.fruit.colorScheme.main
            );
        }
        
        // Camera follow (smooth)
        const headPos = this.worm.getHeadPosition();
        const targetCamPos = new THREE.Vector3(
            headPos.x * 0.3,
            25,
            headPos.z * 0.3 + 25
        );
        this.renderer.camera.position.lerp(targetCamPos, deltaTime * 2);
        this.renderer.camera.lookAt(headPos.x * 0.5, 0, headPos.z * 0.5);
    }
    
    loop(time) {
        // FIX: Clamp deltaTime per evitare salti quando cambia tab o lagga
        const deltaTime = Math.min((time - this.lastTime) / 1000, 0.033); // Max 33ms (30fps min)
        this.lastTime = time;
        
        // Update game logic
        this.update(deltaTime);
        
        // Update lights
        this.renderer.updateLights(time / 1000);
        
        // Render
        this.renderer.render();
        
        // Continue loop
        requestAnimationFrame((t) => this.loop(t));
    }
}

// Make THREE available globally for game.js
import * as THREE from 'three';
window.THREE = THREE;
