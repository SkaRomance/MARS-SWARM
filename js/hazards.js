import * as THREE from 'three';

/**
 * HazardManager - Gestisce gli ostacoli di sicurezza
 * SEMPLIFICATO: spawn garantito, performance ottimizzata
 */
export class HazardManager {
    constructor(scene, boundarySize) {
        this.scene = scene;
        this.boundarySize = boundarySize;
        this.hazards = [];
        this.hazardData = this.getFallbackData();
        
        // Spawn timing
        this.maxHazards = 3;
        this.timeSinceLastSpawn = 0;
        this.spawnDelay = 3000; // 3 secondi
        
        // Cache
        this.geometries = new Map();
        this.materials = new Map();
        this.iconTextures = new Map();
        
        // Inizializzazione
        this.initGeometries();
        this.initMaterials();
        this.initIconTextures();
        
        console.log('[HazardManager] Initialized');
    }
    
    /**
     * Reset quando il gioco inizia
     */
    start() {
        this.clear();
        this.timeSinceLastSpawn = 0;
        console.log('[HazardManager] Started');
    }
    
    /**
     * Update chiamato ogni frame
     */
    update(deltaTime, wormPosition, wormSegments) {
        // Rimuovi hazard scaduti
        this.removeExpiredHazards();
        
        // Incrementa timer spawn
        this.timeSinceLastSpawn += deltaTime;
        
        // Spawn se necessario
        if (this.timeSinceLastSpawn >= this.spawnDelay) {
            if (this.hazards.length < this.maxHazards) {
                this.spawnHazard(wormPosition, wormSegments);
            }
            this.timeSinceLastSpawn = 0;
        }
        
        // Aggiorna animazioni icone
        this.updateFloatingIcons(deltaTime);
    }
    
    /**
     * Rimuovi hazard con lifetime scaduto
     */
    removeExpiredHazards() {
        const now = performance.now();
        for (let i = this.hazards.length - 1; i >= 0; i--) {
            const hazard = this.hazards[i];
            const age = now - hazard.userData.createdAt;
            const lifetime = hazard.userData.lifetime;
            
            if (age > lifetime) {
                this.removeHazard(i);
            }
        }
    }
    
    /**
     * Rimuovi singolo hazard
     */
    removeHazard(index) {
        if (index < 0 || index >= this.hazards.length) return;
        
        const hazard = this.hazards[index];
        
        // Rimuovi icona e anello
        if (hazard.userData.groundRing) {
            this.scene.remove(hazard.userData.groundRing);
        }
        
        this.scene.remove(hazard);
        this.hazards.splice(index, 1);
    }
    
    /**
     * Spawna un singolo hazard
     */
    spawnHazard(wormPosition, wormSegments) {
        if (!this.hazardData || !this.hazardData.hazards) return;
        
        // Seleziona hazard random
        const hazardTypes = this.hazardData.hazards;
        const hazardType = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
        
        // Trova posizione valida
        const position = this.findValidPosition(wormPosition, wormSegments);
        if (!position) return;
        
        // Crea mesh
        const geometry = this.geometries.get(hazardType.id);
        const material = this.materials.get(hazardType.id);
        if (!geometry || !material) return;
        
        let mesh;
        if (geometry instanceof THREE.Group) {
            mesh = geometry.clone();
        } else {
            mesh = new THREE.Mesh(geometry, material.clone());
        }
        
        mesh.position.copy(position);
        mesh.position.y = 0.5;
        mesh.rotation.y = Math.random() * Math.PI * 2;
        
        // Dati con lifetime
        mesh.userData = {
            type: 'hazard',
            hazardId: hazardType.id,
            hazardData: hazardType,
            createdAt: performance.now(),
            lifetime: 10000 + Math.random() * 5000 // 10-15 secondi
        };
        
        // Aggiungi icona fluttuante
        this.addFloatingIcon(mesh, hazardType);
        
        // Aggiungi anello al suolo
        this.addGroundRing(position);
        
        // Aggiungi a scena
        this.scene.add(mesh);
        this.hazards.push(mesh);
        
        // Solo primo hazard log
        if (this.hazards.length === 1) {
            console.log(`[HazardManager] Active: ${hazardType.name}`);
        }
    }
    
    /**
     * Trova posizione valida (lontana dal verme)
     */
    findValidPosition(wormPosition, wormSegments) {
        const margin = 3; // Distanza minima dal verme
        const maxAttempts = 30;
        
        for (let i = 0; i < maxAttempts; i++) {
            const x = (Math.random() - 0.5) * 2 * (this.boundarySize - 2);
            const z = (Math.random() - 0.5) * 2 * (this.boundarySize - 2);
            const pos = new THREE.Vector3(x, 0, z);
            
            // Controlla distanza dalla testa
            if (wormPosition && pos.distanceTo(wormPosition) < margin) {
                continue;
            }
            
            // Controlla distanza dai segmenti
            if (wormSegments) {
                let tooClose = false;
                for (const segment of wormSegments) {
                    if (segment.position && pos.distanceTo(segment.position) < margin) {
                        tooClose = true;
                        break;
                    }
                }
                if (tooClose) continue;
            }
            
            // Controlla distanza da altri hazard
            let tooCloseToHazard = false;
            for (const hazard of this.hazards) {
                if (pos.distanceTo(hazard.position) < 3) {
                    tooCloseToHazard = true;
                    break;
                }
            }
            if (tooCloseToHazard) continue;
            
            return pos;
        }
        
        return null;
    }
    
    /**
     * Aggiungi icona fluttuante
     */
    addFloatingIcon(hazardMesh, hazardType) {
        const texture = this.iconTextures.get(hazardType.id);
        if (!texture) return;
        
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.95
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(2.5, 2.5, 1);
        sprite.position.y = 3;
        
        hazardMesh.add(sprite);
        hazardMesh.userData.icon = sprite;
        hazardMesh.userData.floatOffset = Math.random() * Math.PI * 2;
    }
    
    /**
     * Aggiungi anello rosso al suolo
     */
    addGroundRing(position) {
        const geometry = new THREE.RingGeometry(1.2, 1.5, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(geometry, material);
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(position);
        ring.position.y = 0.05;
        
        this.scene.add(ring);
        
        // Link per rimozione
        const hazard = this.hazards[this.hazards.length - 1];
        if (hazard) {
            hazard.userData.groundRing = ring;
        }
    }
    
    /**
     * Aggiorna animazioni icone
     */
    updateFloatingIcons(deltaTime) {
        // Ottimizzazione: update solo a 30fps invece di 60fps
        this._iconAnimTimer = (this._iconAnimTimer || 0) + deltaTime;
        if (this._iconAnimTimer < 33) return; // 30fps
        this._iconAnimTimer = 0;
        
        const time = performance.now() * 0.002;
        
        for (const hazard of this.hazards) {
            if (hazard.userData.icon) {
                const offset = hazard.userData.floatOffset || 0;
                hazard.userData.icon.position.y = 3 + Math.sin(time + offset) * 0.3;
            }
        }
    }
    
    /**
     * Controlla collisione con verme
     */
    checkCollision(wormHeadPosition) {
        if (!wormHeadPosition) return null;
        
        // Throttle a 60fps
        const now = performance.now();
        if (this._lastCollisionTime && now - this._lastCollisionTime < 16) {
            return this._lastCollisionResult;
        }
        this._lastCollisionTime = now;
        
        const headPos = wormHeadPosition;
        const collisionDistance = 1.2;
        
        for (const hazard of this.hazards) {
            const distance = headPos.distanceTo(hazard.position);
            if (distance < collisionDistance) {
                this._lastCollisionResult = hazard.userData.hazardData;
                return this._lastCollisionResult;
            }
        }
        
        this._lastCollisionResult = null;
        return null;
    }
    
    /**
     * Controlla prossimità per warning UI
     */
    checkProximity(wormHeadPosition) {
        if (!wormHeadPosition) return null;
        
        // Throttle a 10 volte al secondo
        const now = performance.now();
        if (this._lastProximityTime && now - this._lastProximityTime < 100) {
            return this._lastProximityResult;
        }
        this._lastProximityTime = now;
        
        const warningDistance = 4;
        let nearest = null;
        let nearestDist = Infinity;
        
        for (const hazard of this.hazards) {
            const dist = wormHeadPosition.distanceTo(hazard.position);
            if (dist < warningDistance && dist < nearestDist) {
                nearestDist = dist;
                nearest = hazard.userData.hazardData;
            }
        }
        
        this._lastProximityResult = nearest ? { hazard: nearest, distance: nearestDist } : null;
        return this._lastProximityResult;
    }
    
    /**
     * Rimuovi tutti gli hazard
     */
    clear() {
        for (const hazard of this.hazards) {
            // Rimuovi anello
            if (hazard.userData.groundRing) {
                this.scene.remove(hazard.userData.groundRing);
            }
            this.scene.remove(hazard);
        }
        this.hazards = [];
    }
    
    // ==========================================
    // INIZIALIZZAZIONE GEOMETRIE E MATERIALI
    // ==========================================
    
    initGeometries() {
        // Cavi (serpentone)
        this.geometries.set('trailing-cables', this.createCableGeometry());
        
        // Pozzanghera
        this.geometries.set('oil-spill', new THREE.CircleGeometry(1.2, 32));
        
        // Macchinario
        this.geometries.set('moving-machinery', new THREE.BoxGeometry(2, 2, 2));
        
        // Scatole
        this.geometries.set('falling-objects', new THREE.BoxGeometry(1.5, 1.5, 1.5));
        
        // Scala
        this.geometries.set('step-ladder', this.createLadderGeometry());
        
        // Chimico
        this.geometries.set('chemical-container', new THREE.CylinderGeometry(0.8, 0.8, 1.8, 16));
        
        // Traffico
        this.geometries.set('forklift-zone', new THREE.ConeGeometry(0.8, 2, 8));
        
        // Gas
        this.geometries.set('compressed-gas', new THREE.CylinderGeometry(0.6, 0.6, 2.2, 12));
    }
    
    initMaterials() {
        this.materials.set('trailing-cables', new THREE.MeshStandardMaterial({
            color: 0xFF6B35,
            emissive: 0xFF4500,
            emissiveIntensity: 0.3,
            roughness: 0.7
        }));
        
        this.materials.set('oil-spill', new THREE.MeshStandardMaterial({
            color: 0x2F1810,
            roughness: 0.1,
            metalness: 0.5,
            transparent: true,
            opacity: 0.9
        }));
        
        this.materials.set('moving-machinery', new THREE.MeshStandardMaterial({
            color: 0xCC0000,
            emissive: 0xFF0000,
            emissiveIntensity: 0.3,
            roughness: 0.4
        }));
        
        this.materials.set('falling-objects', new THREE.MeshStandardMaterial({
            color: 0xFF8800,
            roughness: 0.8
        }));
        
        this.materials.set('step-ladder', new THREE.MeshStandardMaterial({
            color: 0x9370DB,
            roughness: 0.6
        }));
        
        this.materials.set('chemical-container', new THREE.MeshStandardMaterial({
            color: 0x00CC00,
            emissive: 0x00FF00,
            emissiveIntensity: 0.3,
            roughness: 0.3
        }));
        
        this.materials.set('forklift-zone', new THREE.MeshStandardMaterial({
            color: 0xFFCC00,
            roughness: 0.5
        }));
        
        this.materials.set('compressed-gas', new THREE.MeshStandardMaterial({
            color: 0x3366CC,
            roughness: 0.4,
            metalness: 0.3
        }));
    }
    
    initIconTextures() {
        const icons = {
            'trailing-cables': '⚡',
            'oil-spill': '🛢️',
            'moving-machinery': '🤖',
            'falling-objects': '📦',
            'step-ladder': '🪜',
            'chemical-container': '☠️',
            'forklift-zone': '🚧',
            'compressed-gas': '🫙'
        };
        
        for (const [id, icon] of Object.entries(icons)) {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            // Sfondo
            ctx.beginPath();
            ctx.arc(64, 64, 60, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fill();
            ctx.strokeStyle = '#ff3333';
            ctx.lineWidth = 6;
            ctx.stroke();
            
            // Emoji
            ctx.font = 'bold 72px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, 64, 64);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.LinearFilter;
            this.iconTextures.set(id, texture);
        }
    }
    
    createCableGeometry() {
        const points = [];
        for (let i = 0; i < 8; i++) {
            points.push(new THREE.Vector3(
                Math.sin(i * 0.6) * 1.2,
                0.15,
                i * 0.5 - 1.8
            ));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        return new THREE.TubeGeometry(curve, 16, 0.12, 6, false);
    }
    
    createLadderGeometry() {
        const group = new THREE.Group();
        const material = new THREE.MeshStandardMaterial({ color: 0x9370DB });
        
        // Montanti
        const sideGeo = new THREE.BoxGeometry(0.15, 2, 0.15);
        const left = new THREE.Mesh(sideGeo, material);
        left.position.x = -0.5;
        group.add(left);
        
        const right = new THREE.Mesh(sideGeo, material);
        right.position.x = 0.5;
        group.add(right);
        
        // Gradini
        const stepGeo = new THREE.BoxGeometry(1.1, 0.08, 0.2);
        for (let i = 0; i < 5; i++) {
            const step = new THREE.Mesh(stepGeo, material);
            step.position.y = -0.8 + i * 0.4;
            group.add(step);
        }
        
        return group;
    }
    
    /**
     * Fallback data (8 hazard types)
     */
    getFallbackData() {
        return {
            hazards: [
                {
                    id: 'trailing-cables',
                    name: 'Cavi Elettrici',
                    icon: '⚡',
                    danger: { description: 'Rischio di inciampo e folgorazione' },
                    normative: { reference: 'D.Lgs. 81/08', article: 'Art. 71' },
                    prevention: ['Usare canaline', 'Segnalare cavi danneggiati'],
                    gameplay: { spawn_rate: 'common' }
                },
                {
                    id: 'oil-spill',
                    name: 'Sversamento',
                    icon: '🛢️',
                    danger: { description: 'Rischio di scivolamento' },
                    normative: { reference: 'D.Lgs. 81/08', article: 'Art. 29' },
                    prevention: ['Pulire immediatamente', 'Usare segnaletica'],
                    gameplay: { spawn_rate: 'common' }
                },
                {
                    id: 'moving-machinery',
                    name: 'Macchinario',
                    icon: '🤖',
                    danger: { description: 'Rischio di urto e tranciamento' },
                    normative: { reference: 'D.Lgs. 81/08', article: 'Art. 70' },
                    prevention: ['Rispettare delimitazioni', 'Attendere arresto'],
                    gameplay: { spawn_rate: 'rare' }
                },
                {
                    id: 'falling-objects',
                    name: 'Caduta Oggetti',
                    icon: '📦',
                    danger: { description: 'Rischio di impatto' },
                    normative: { reference: 'D.Lgs. 81/08', article: 'Art. 48' },
                    prevention: ['Non stazionare sotto', 'Verificare scaffali'],
                    gameplay: { spawn_rate: 'uncommon' }
                },
                {
                    id: 'step-ladder',
                    name: 'Scala',
                    icon: '🪜',
                    danger: { description: 'Rischio di caduta' },
                    normative: { reference: 'D.Lgs. 81/08', article: 'Art. 119' },
                    prevention: ['3 punti di appoggio', 'Superficie stabile'],
                    gameplay: { spawn_rate: 'uncommon' }
                },
                {
                    id: 'chemical-container',
                    name: 'Prodotti Chimici',
                    icon: '☠️',
                    danger: { description: 'Rischio di esposizione' },
                    normative: { reference: 'D.Lgs. 81/08', article: 'Art. 225' },
                    prevention: ['DPI specifici', 'Ventilazione'],
                    gameplay: { spawn_rate: 'rare' }
                },
                {
                    id: 'forklift-zone',
                    name: 'Traffico Muletti',
                    icon: '🚧',
                    danger: { description: 'Rischio di investimento' },
                    normative: { reference: 'D.Lgs. 81/08', article: 'Art. 53' },
                    prevention: ['Percorsi pedonali', 'Contatto visivo'],
                    gameplay: { spawn_rate: 'common' }
                },
                {
                    id: 'compressed-gas',
                    name: 'Gas Compressi',
                    icon: '🫙',
                    danger: { description: 'Rischio di esplosione' },
                    normative: { reference: 'D.Lgs. 81/08', article: 'Art. 78' },
                    prevention: ['Ancorare bombole', 'No fonti calore'],
                    gameplay: { spawn_rate: 'uncommon' }
                }
            ]
        };
    }
}
