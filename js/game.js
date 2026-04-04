import { Renderer } from './renderer.js';
import { Worm } from './worm.js';
import { Fruit } from './fruit.js';
import { ParticleSystem } from './particles.js';
import { HazardManager } from './hazards.js';
import { getAnalytics } from './analytics.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = null;
        this.worm = null;
        this.fruit = null;
        this.particles = null;
        this.hazardManager = null;
        this.analytics = getAnalytics();
        
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
            gameOverSafety: document.getElementById('game-over-safety'),
            pauseMenu: document.getElementById('pause-menu'),
            touchHint: document.getElementById('touch-hint'),
            // Safety screen elements
            safetyHazardName: document.getElementById('safety-hazard-name'),
            safetyIcon: document.getElementById('safety-icon'),
            safetyDanger: document.getElementById('safety-danger'),
            safetyNormative: document.getElementById('safety-normative'),
            safetyArticle: document.getElementById('safety-article'),
            safetyPrevention: document.getElementById('safety-prevention'),
            safetyScoreValue: document.getElementById('safety-score-value'),
            // Stats panel
            statsPanel: document.getElementById('stats-panel'),
            statSessions: document.getElementById('stat-sessions'),
            statIncidents: document.getElementById('stat-incidents'),
            statAvg: document.getElementById('stat-avg'),
            statBest: document.getElementById('stat-best'),
            statsHazards: document.getElementById('stats-hazards'),
            // Proximity warning
            warningOverlay: document.getElementById('warning-overlay'),
            warningText: document.getElementById('warning-text'),
            warningDistance: document.getElementById('warning-distance'),
            // Tutorial
            tutorialOverlay: document.getElementById('tutorial-overlay')
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
        
        // Initialize hazard manager (solo per modalità POV/Safety)
        this.hazardManager = new HazardManager(this.renderer.scene, this.renderer.boundarySize);
        
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
        
        // SWIPE GESTURES per mobile
        this.setupSwipeGestures();
        
        // Menu buttons
        document.getElementById('btn-start').addEventListener('click', () => this.showTutorial());
        document.getElementById('btn-restart').addEventListener('click', () => this.restart());
        document.getElementById('btn-highscores').addEventListener('click', () => this.showHighScores());
        document.getElementById('btn-stats').addEventListener('click', () => this.showStats());
        
        // Tutorial button
        document.getElementById('btn-start-game').addEventListener('click', () => this.startFromTutorial());
        document.getElementById('btn-close-stats').addEventListener('click', () => this.hideStats());
        document.getElementById('btn-export').addEventListener('click', () => this.analytics.exportData());
        document.getElementById('btn-report').addEventListener('click', () => this.analytics.generateReport());
        document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-save').addEventListener('click', () => this.saveGame());
        document.getElementById('btn-load').addEventListener('click', () => this.loadGame());
        document.getElementById('btn-quit').addEventListener('click', () => this.quitToMenu());
        document.getElementById('btn-save-gameover').addEventListener('click', () => this.saveScore());
        
        // Safety game over buttons
        document.getElementById('btn-restart-safety').addEventListener('click', () => this.restart());
        document.getElementById('btn-learn-more').addEventListener('click', () => {
            window.open('https://www.inail.it/cs/internet/comunicazione/pubblicazioni/catalogo-generale.html', '_blank');
        });
        
        // Prevent context menu
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    setupSwipeGestures() {
        const container = document.getElementById('game-container');
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        
        // Threshold per considerare uno swipe (pixel)
        const SWIPE_THRESHOLD = 30;
        // Tempo massimo per uno swipe (ms)
        const SWIPE_TIMEOUT = 300;
        
        container.addEventListener('touchstart', (e) => {
            // Ignora touch sui menu/pulsanti
            if (e.target.closest('.overlay.active') || e.target.closest('.menu-btn') || e.target.closest('.pause-btn')) {
                return;
            }
            
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartTime = Date.now();
        }, { passive: true });
        
        container.addEventListener('touchend', (e) => {
            // Ignora se menu aperti o se il target è il pulsante pause
            if (e.target.closest('.overlay.active') || e.target.closest('.pause-btn')) {
                return;
            }
            
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            const deltaTime = Date.now() - touchStartTime;
            
            // Se troppo lento, ignora
            if (deltaTime > SWIPE_TIMEOUT) {
                return;
            }
            
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);
            
            // Se il movimento è sotto il threshold, era un tap → ignora
            // La pausa è solo dal pulsante pause esplicito
            if (absX < SWIPE_THRESHOLD && absY < SWIPE_THRESHOLD) {
                return;
            }
            
            // Determina direzione dello swipe
            let direction = null;
            
            if (absX > absY) {
                // Swipe orizzontale
                if (absX > SWIPE_THRESHOLD) {
                    direction = deltaX > 0 ? 'right' : 'left';
                }
            } else {
                // Swipe verticale
                if (absY > SWIPE_THRESHOLD) {
                    direction = deltaY > 0 ? 'down' : 'up';
                }
            }
            
            if (direction) {
                this.handleTouchInput(direction);
            }
        }, { passive: true });
        
        // Prevents scrolling durante il gioco
        container.addEventListener('touchmove', (e) => {
            if (this.isPlaying && !this.isPaused) {
                e.preventDefault();
            }
        }, { passive: false });
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
        this.ui.gameOverSafety.classList.remove('active');
        
        // Start analytics session
        this.analytics.startSession(this.gameMode);
        
        // Show touch hint on mobile devices
        if (this.ui.touchHint && window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
            this.ui.touchHint.classList.add('visible');
            // Nascondi dopo 4 secondi
            setTimeout(() => {
                if (this.ui.touchHint) {
                    this.ui.touchHint.classList.remove('visible');
                }
            }, 4000);
        }
        
        // Reset worm
        this.worm.reset();
        
        // Respawn fruit
        this.fruit.remove();
        this.fruit = new Fruit(this.renderer.scene, this.renderer.boundarySize);
        
        // Start hazard manager (resetta timer di spawn)
        if (this.hazardManager) {
            this.hazardManager.start();
        }
        
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
    
    /**
     * Mostra il tutorial all'avvio
     */
    showTutorial() {
        this.ui.mainMenu.classList.remove('active');
        document.getElementById('tutorial-overlay').classList.add('active');
    }
    
    /**
     * Inizia il gioco dal tutorial
     */
    startFromTutorial() {
        document.getElementById('tutorial-overlay').classList.remove('active');
        this.start();
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
    
    showStats() {
        const stats = this.analytics.getStats();
        const distribution = this.analytics.getHazardDistribution();
        
        // Update stats numbers
        if (this.ui.statSessions) {
            this.ui.statSessions.textContent = stats.totalSessions || 0;
        }
        if (this.ui.statIncidents) {
            this.ui.statIncidents.textContent = stats.totalIncidents || 0;
        }
        if (this.ui.statAvg) {
            this.ui.statAvg.textContent = stats.avgScore || 0;
        }
        if (this.ui.statBest) {
            this.ui.statBest.textContent = stats.bestScore || 0;
        }
        
        // Update hazards list
        if (this.ui.statsHazards) {
            if (distribution.length === 0) {
                this.ui.statsHazards.innerHTML = '<li>Nessun incidente registrato</li>';
            } else {
                this.ui.statsHazards.innerHTML = distribution.map(h => 
                    `<li>${h.name} <span class="hazard-count">${h.count}</span></li>`
                ).join('');
            }
        }
        
        // Show panel
        this.ui.statsPanel.classList.add('active');
    }
    
    hideStats() {
        this.ui.statsPanel.classList.remove('active');
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
        this.ui.gameOverSafety.classList.remove('active');
        this.ui.mainMenu.classList.add('active');
        
        // Hide touch hint
        if (this.ui.touchHint) {
            this.ui.touchHint.classList.remove('visible');
        }
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
        
        // Hide touch hint
        if (this.ui.touchHint) {
            this.ui.touchHint.classList.remove('visible');
        }
        
        // Explosion effect at head position
        this.particles.createExplosionEffect(
            this.worm.getHeadPosition(),
            0xff4757
        );
        
        // End analytics session (nessun incidente specifico)
        this.analytics.endSession(this.score);
    }
    
    /**
     * Aggiorna l'UI di warning quando ci si avvicina a un pericolo
     */
    updateProximityWarning(warning) {
        if (!this.ui.warningOverlay) return;
        
        if (warning && warning.distance < 4) {
            // Mostra warning
            this.ui.warningOverlay.classList.add('active');
            if (this.ui.warningText) {
                this.ui.warningText.textContent = `⚠️ ${warning.hazard.name}`;
            }
            if (this.ui.warningDistance) {
                const meters = warning.distance.toFixed(1);
                this.ui.warningDistance.textContent = `${meters}m - RALLENTA!`;
            }
            
            // Cambia colore in base alla distanza
            if (warning.distance < 2) {
                this.ui.warningOverlay.style.background = 'rgba(255, 0, 0, 0.3)';
            } else {
                this.ui.warningOverlay.style.background = 'rgba(255, 165, 0, 0.2)';
            }
        } else {
            // Nascondi warning
            this.ui.warningOverlay.classList.remove('active');
        }
    }
    
    gameOverSafety(hazardData) {
        console.log('[Game] Game Over Safety:', hazardData?.name);
        
        // Fallback se hazardData non è valido
        if (!hazardData) {
            hazardData = {
                name: 'Pericolo Sconosciuto',
                icon: '⚠️',
                danger: { description: 'Hai colpito un ostacolo.' },
                normative: { reference: 'D.Lgs. 81/08', article: '' },
                prevention: ['Segnalare il pericolo al responsabile']
            };
        }
        
        this.isPlaying = false;
        this.isGameOver = true;
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('swarm_highscore', this.highScore);
            this.ui.highScore.textContent = this.highScore;
        }
        
        // Populate safety screen with hazard data
        if (this.ui.safetyHazardName) {
            this.ui.safetyHazardName.textContent = hazardData.name || 'Pericolo';
        }
        if (this.ui.safetyIcon) {
            this.ui.safetyIcon.textContent = hazardData.icon || '⚠️';
        }
        if (this.ui.safetyDanger) {
            this.ui.safetyDanger.textContent = hazardData.danger?.description || 'Pericolo non specificato';
        }
        if (this.ui.safetyNormative) {
            this.ui.safetyNormative.textContent = hazardData.normative?.reference || 'D.Lgs. 81/08';
        }
        if (this.ui.safetyArticle) {
            this.ui.safetyArticle.textContent = hazardData.normative?.article || '';
        }
        if (this.ui.safetyPrevention) {
            const preventionList = hazardData.prevention || ['Segnalare il pericolo al responsabile'];
            this.ui.safetyPrevention.innerHTML = preventionList.map(p => `<li>${p}</li>`).join('');
        }
        if (this.ui.safetyScoreValue) {
            this.ui.safetyScoreValue.textContent = this.score;
        }
        
        // Show safety game over screen
        this.ui.gameOverSafety.classList.add('active');
        
        // Hide touch hint
        if (this.ui.touchHint) {
            this.ui.touchHint.classList.remove('visible');
        }
        
        // Explosion effect
        this.particles.createExplosionEffect(
            this.worm.getHeadPosition(),
            0xff4757
        );
        
        // End analytics session
        this.analytics.endSession(this.score);
    }
    
    logIncident(hazardData) {
        // Log to analytics
        const headPos = this.worm.getHeadPosition();
        this.analytics.logIncident(hazardData, this.score, { x: headPos.x, z: headPos.z });
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
        
        // Update hazards (sempre attivi in modalità Safety)
        if (this.hazardManager) {
            try {
                const headPos = this.worm.getHeadPosition();
                const currentTime = performance.now();
                this.hazardManager.update(deltaTime * 1000, currentTime, headPos, this.worm.segments);
                
                // Check hazard collision
                const collision = this.hazardManager.checkCollision(headPos);
                if (collision) {
                    this.gameOverSafety(collision);
                    return;
                }
                
                // Check proximity warning (pericolo imminente)
                const warning = this.hazardManager.checkProximityWarning(headPos);
                this.updateProximityWarning(warning);
            } catch (err) {
                console.error('[Game] Errore hazard update:', err);
            }
        }
        
        // Update particles
        this.particles.update();
        
        // Occasionally create sparkles around fruit
        if (Math.random() < 0.02) {
            this.particles.createSparkle(
                this.fruit.getPosition(),
                this.fruit.colorScheme.main
            );
        }
        
        // Camera: vista dall'alto
        if (!this.renderer.isMobile) {
            // Desktop: camera leggermente dinamica
            const headPos = this.worm.getHeadPosition();
            const targetCamPos = new THREE.Vector3(
                headPos.x * 0.3,
                25,
                headPos.z * 0.3 + 25
            );
            this.renderer.camera.position.lerp(targetCamPos, deltaTime * 2);
            this.renderer.camera.lookAt(headPos.x * 0.5, 0, headPos.z * 0.5);
        }
        // Mobile: camera statica impostata in initCamera
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
