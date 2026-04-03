import * as THREE from 'three';

/**
 * HazardManager - Gestisce gli ostacoli di sicurezza nel gioco
 * Carica dati da hazard-database.json e spawn ostacoli
 */
export class HazardManager {
    constructor(scene, boundarySize) {
        this.scene = scene;
        this.boundarySize = boundarySize;
        this.hazards = []; // Ostacoli attivi
        this.hazardData = null;
        this.maxHazards = 5;
        this.spawnInterval = 3000; // ms
        this.lastSpawn = performance.now(); // Inizializza con tempo attuale per evitare spawn immediato
        this.difficultyLevel = 1;
        
        // Geometrie/materiali cache
        this.geometries = new Map();
        this.materials = new Map();
        
        this.loadHazardData();
        this.initGeometries();
    }

    /**
     * Resetta il timer di spawn quando il gioco inizia
     */
    start() {
        this.lastSpawn = performance.now();
        this.clear(); // Pulisce eventuali hazard residui
    }

    /**
     * Carica i dati dei pericoli dal JSON
     */
    async loadHazardData() {
        try {
            const response = await fetch('assets/content/hazard-database.json');
            const data = await response.json();
            this.hazardData = data;
            console.log(`[HazardManager] Caricati ${data.hazards.length} tipi di pericoli`);
        } catch (error) {
            console.error('[HazardManager] Errore caricamento dati:', error);
            // Fallback dati minimi
            this.hazardData = this.getFallbackData();
        }
    }

    /**
     * Dati di fallback se il JSON non viene caricato
     */
    getFallbackData() {
        return {
            hazards: [
                {
                    id: 'trailing-cables',
                    name: 'Cavi Trailing',
                    danger: { severity: 'high' },
                    gameplay: { spawn_rate: 'common' }
                },
                {
                    id: 'oil-spill',
                    name: 'Sversamento',
                    danger: { severity: 'medium' },
                    gameplay: { spawn_rate: 'common' }
                }
            ]
        };
    }

    /**
     * Inizializza geometrie procedurali per gli ostacoli
     */
    initGeometries() {
        // Cavi elettrici (serpentoni gialli)
        this.geometries.set('trailing-cables', this.createCableGeometry());
        
        // Pozzanghera (piano ondulato)
        this.geometries.set('oil-spill', new THREE.CircleGeometry(1.5, 32));
        
        // Macchinario (cubo con LED)
        this.geometries.set('moving-machinery', new THREE.BoxGeometry(2, 2, 2));
        
        // Scatole (stack)
        this.geometries.set('falling-objects', new THREE.BoxGeometry(1.5, 1.5, 1.5));
        
        // Scala
        this.geometries.set('step-ladder', this.createLadderGeometry());
        
        // Chimica (fusto)
        this.geometries.set('chemical-container', new THREE.CylinderGeometry(0.8, 0.8, 2, 16));
        
        // Traffico (cono)
        this.geometries.set('forklift-zone', new THREE.ConeGeometry(0.8, 2, 8));
        
        // Gas (bombola)
        this.geometries.set('compressed-gas', new THREE.CylinderGeometry(0.6, 0.6, 2.5, 12));

        // Materiali
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
            color: 0xFF0000,
            emissive: 0xFF0000,
            emissiveIntensity: 0.5,
            roughness: 0.4
        }));
        
        this.materials.set('falling-objects', new THREE.MeshStandardMaterial({
            color: 0xFFA500,
            roughness: 0.8
        }));
        
        this.materials.set('step-ladder', new THREE.MeshStandardMaterial({
            color: 0x9370DB,
            roughness: 0.6
        }));
        
        this.materials.set('chemical-container', new THREE.MeshStandardMaterial({
            color: 0x00FF00,
            emissive: 0x00FF00,
            emissiveIntensity: 0.4,
            roughness: 0.3
        }));
        
        this.materials.set('forklift-zone', new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            roughness: 0.5
        }));
        
        this.materials.set('compressed-gas', new THREE.MeshStandardMaterial({
            color: 0x4169E1,
            roughness: 0.4,
            metalness: 0.3
        }));
    }

    /**
     * Crea geometria per cavi (serpentone)
     */
    createCableGeometry() {
        const points = [];
        for (let i = 0; i < 10; i++) {
            points.push(new THREE.Vector3(
                Math.sin(i * 0.5) * 1.5,
                0.1,
                i * 0.4 - 2
            ));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        return new THREE.TubeGeometry(curve, 20, 0.1, 8, false);
    }

    /**
     * Crea geometria per scala
     */
    createLadderGeometry() {
        const group = new THREE.Group();
        
        // Montanti
        const sideGeo = new THREE.BoxGeometry(0.15, 2, 0.15);
        const material = new THREE.MeshStandardMaterial({ color: 0x9370DB });
        
        const left = new THREE.Mesh(sideGeo, material);
        left.position.x = -0.6;
        group.add(left);
        
        const right = new THREE.Mesh(sideGeo, material);
        right.position.x = 0.6;
        group.add(right);
        
        // Gradini
        const stepGeo = new THREE.BoxGeometry(1.2, 0.1, 0.2);
        for (let i = 0; i < 5; i++) {
            const step = new THREE.Mesh(stepGeo, material);
            step.position.y = -0.8 + i * 0.4;
            group.add(step);
        }
        
        return group;
    }

    /**
     * Aggiorna il manager (spawn nuovi ostacoli)
     */
    update(deltaTime, currentTime, wormPosition, wormSegments) {
        if (!this.hazardData) return;
        
        // Controlla se è tempo di spawnare un nuovo ostacolo
        if (currentTime - this.lastSpawn > this.spawnInterval) {
            if (this.hazards.length < this.maxHazards) {
                this.spawnHazard(wormPosition, wormSegments);
            }
            this.lastSpawn = currentTime;
        }
        
        // Aggiorna ostacoli esistenti (animazioni)
        this.updateHazards(deltaTime, currentTime);
    }

    /**
     * Spawna un nuovo ostacolo
     */
    spawnHazard(wormPosition, wormSegments) {
        // Seleziona tipo di pericolo basato su spawn_rate
        const hazardTypes = this.hazardData.hazards;
        const weights = hazardTypes.map(h => {
            const rate = h.gameplay?.spawn_rate || 'common';
            const weightMap = { common: 0.35, uncommon: 0.25, rare: 0.15, critical: 0.10 };
            return weightMap[rate] || 0.35;
        });
        
        const selectedIndex = this.weightedRandom(weights);
        const hazardType = hazardTypes[selectedIndex];
        
        // Trova posizione valida (non sul verme)
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
        mesh.position.y = 0.5; // Altezza da terra
        
        // Rotazione casuale
        mesh.rotation.y = Math.random() * Math.PI * 2;
        
        // Dati personalizzati
        mesh.userData = {
            type: 'hazard',
            hazardId: hazardType.id,
            hazardData: hazardType,
            createdAt: Date.now()
        };
        
        // Aggiungi collision box
        const box = new THREE.Box3().setFromObject(mesh);
        mesh.userData.boundingBox = box;
        
        this.scene.add(mesh);
        this.hazards.push(mesh);
        
        // Effetto spawn
        this.createSpawnEffect(position, hazardType.color);
        
        console.log(`[HazardManager] Spawnato: ${hazardType.name}`);
    }

    /**
     * Trova una posizione valida lontana dal verme
     */
    findValidPosition(wormPosition, wormSegments) {
        const margin = 3; // Distanza minima dal verme
        const maxAttempts = 20;
        
        for (let i = 0; i < maxAttempts; i++) {
            const x = (Math.random() - 0.5) * 2 * (this.boundarySize - 2);
            const z = (Math.random() - 0.5) * 2 * (this.boundarySize - 2);
            const pos = new THREE.Vector3(x, 0, z);
            
            // Controlla distanza dal verme
            let valid = true;
            
            // Distanza dalla testa
            if (pos.distanceTo(wormPosition) < margin) {
                valid = false;
            }
            
            // Distanza dai segmenti
            if (wormSegments) {
                for (const segment of wormSegments) {
                    if (pos.distanceTo(segment.position) < margin) {
                        valid = false;
                        break;
                    }
                }
            }
            
            // Controlla distanza da altri ostacoli
            for (const hazard of this.hazards) {
                if (pos.distanceTo(hazard.position) < 2) {
                    valid = false;
                    break;
                }
            }
            
            if (valid) return pos;
        }
        
        return null;
    }

    /**
     * Selezione casuale pesata
     */
    weightedRandom(weights) {
        const total = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * total;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) return i;
        }
        
        return 0;
    }

    /**
     * Aggiorna gli ostacoli (animazioni)
     */
    updateHazards(deltaTime, currentTime) {
        for (const hazard of this.hazards) {
            const id = hazard.userData.hazardId;
            
            // Animazione per macchinario
            if (id === 'moving-machinery') {
                hazard.rotation.y += deltaTime * 0.5;
                hazard.position.y = 0.5 + Math.sin(currentTime * 0.002) * 0.2;
            }
            
            // Animazione per chimica (vapori)
            if (id === 'chemical-container') {
                hazard.rotation.y += deltaTime * 0.2;
            }
            
            // Update bounding box
            hazard.userData.boundingBox.setFromObject(hazard);
        }
    }

    /**
     * Crea effetto visivo allo spawn
     */
    createSpawnEffect(position, color) {
        // Particelle o flash
        const geometry = new THREE.RingGeometry(0.5, 1, 16);
        const material = new THREE.MeshBasicMaterial({
            color: color || 0xff0000,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(geometry, material);
        ring.position.copy(position);
        ring.position.y = 0.1;
        ring.rotation.x = -Math.PI / 2;
        
        this.scene.add(ring);
        
        // Animazione fade out
        const fadeOut = () => {
            material.opacity -= 0.05;
            ring.scale.multiplyScalar(1.1);
            if (material.opacity > 0) {
                requestAnimationFrame(fadeOut);
            } else {
                this.scene.remove(ring);
            }
        };
        fadeOut();
    }

    /**
     * Controlla collisione con ostacoli
     */
    checkCollision(wormHeadPosition) {
        const headBox = new THREE.Box3().setFromCenterAndSize(
            wormHeadPosition,
            new THREE.Vector3(0.8, 0.8, 0.8)
        );
        
        for (const hazard of this.hazards) {
            if (hazard.userData.boundingBox.intersectsBox(headBox)) {
                return hazard.userData.hazardData;
            }
        }
        
        return null;
    }

    /**
     * Rimuovi tutti gli ostacoli
     */
    clear() {
        for (const hazard of this.hazards) {
            this.scene.remove(hazard);
        }
        this.hazards = [];
    }

    /**
     * Aumenta la difficoltà
     */
    increaseDifficulty() {
        this.difficultyLevel++;
        this.maxHazards = Math.min(5 + this.difficultyLevel, 10);
        this.spawnInterval = Math.max(3000 - this.difficultyLevel * 200, 1500);
    }
}
