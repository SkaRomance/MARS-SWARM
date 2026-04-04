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
        this.maxHazards = 3; // Inizia con pochi ostacoli
        this.spawnInterval = 5000; // ms - primo spawn dopo 5 secondi
        this.lastSpawn = performance.now();
        this.difficultyLevel = 1;
        this.initialSpawnDone = false;
        
        // Geometrie/materiali cache
        this.geometries = new Map();
        this.materials = new Map();
        this.iconTextures = new Map(); // Cache icone
        
        // Inizializza subito con fallback per avere ostacoli immediati
        this.hazardData = this.getFallbackData();
        this.loadHazardData(); // Poi prova a caricare il JSON completo
        this.initGeometries();
        this.initIconTextures(); // Precarica icone
    }

    /**
     * Resetta il timer di spawn quando il gioco inizia
     */
    start() {
        this.lastSpawn = performance.now();
        this.clear();
        this.initialSpawnDone = false;
        console.log('[HazardManager] Ready - spawn in 2s');
    }

    /**
     * Carica i dati dei pericoli dal JSON
     */
    async loadHazardData() {
        try {
            const response = await fetch('assets/content/hazard-database.json');
            const data = await response.json();
            this.hazardData = data;
            console.log(`[HazardManager] Loaded ${data.hazards.length} hazard types`);
        } catch (error) {
            console.log('[HazardManager] Using fallback data');
            this.hazardData = this.getFallbackData();
        }
    }

    /**
     * Dati di fallback se il JSON non viene caricato
     * Completo con tutti i campi necessari per la schermata Game Over
     */
    getFallbackData() {
        return {
            hazards: [
                {
                    id: 'trailing-cables',
                    name: 'Cavi Elettrici Trailing',
                    short_name: 'Cavi Trailing',
                    icon: '⚡',
                    danger: { 
                        severity: 'high',
                        description: 'Cavi elettrici posati a pavimento. Rischio di inciampo e folgorazione.'
                    },
                    normative: {
                        reference: 'D.Lgs. 81/08',
                        article: 'Art. 71 - Installazioni elettriche'
                    },
                    prevention: [
                        'Utilizzare canaline protettive o passacavi',
                        'Verificare integrità rivestimento cavi',
                        'Evitare passaggio in aree pedonali'
                    ],
                    gameplay: { spawn_rate: 'common' }
                },
                {
                    id: 'oil-spill',
                    name: 'Pozzanghera Olio/Sostanze',
                    short_name: 'Sversamento',
                    icon: '🛢️',
                    danger: { 
                        severity: 'medium',
                        description: 'Sversamenti di oli o sostanze chimiche. Rischio di scivolamento.'
                    },
                    normative: {
                        reference: 'D.Lgs. 81/08',
                        article: 'Art. 29 - Luoghi di lavoro'
                    },
                    prevention: [
                        'Pulire immediatamente qualsiasi sversamento',
                        'Utilizzare segnaletica "Pavimento Bagnato"',
                        'Indossare scarpe antiscivolo'
                    ],
                    gameplay: { spawn_rate: 'common' }
                },
                {
                    id: 'moving-machinery',
                    name: 'Macchinario in Movimento',
                    short_name: 'Macchinario',
                    icon: '🤖',
                    danger: { 
                        severity: 'critical',
                        description: 'Bracci robotici o nastri trasportatori in movimento. Rischio di urto.'
                    },
                    normative: {
                        reference: 'D.Lgs. 81/08',
                        article: 'Art. 70 - Attrezzature di lavoro'
                    },
                    prevention: [
                        'Rispettare linee di delimitazione',
                        'Attendere arresto completo prima di intervenire',
                        'Utilizzare dispositivi LOTO'
                    ],
                    gameplay: { spawn_rate: 'rare' }
                },
                {
                    id: 'falling-objects',
                    name: 'Caduta di Oggetti',
                    short_name: 'Oggetti Cadenti',
                    icon: '📦',
                    danger: { 
                        severity: 'high',
                        description: 'Materiali stoccati in modo instabile. Rischio di caduta e impatto.'
                    },
                    normative: {
                        reference: 'D.Lgs. 81/08',
                        article: 'Art. 48 - Magazzini e depositi'
                    },
                    prevention: [
                        'Non stazionare sotto carichi sospesi',
                        'Verificare stabilità degli scaffali',
                        'Segnalare carichi instabili'
                    ],
                    gameplay: { spawn_rate: 'uncommon' }
                },
                {
                    id: 'step-ladder',
                    name: 'Scala a Pioli Instabile',
                    short_name: 'Scala',
                    icon: '🪜',
                    danger: { 
                        severity: 'high',
                        description: 'Scala senza base stabile o su superficie irregolare. Rischio di caduta.'
                    },
                    normative: {
                        reference: 'D.Lgs. 81/08',
                        article: 'Art. 119 - Lavori in quota'
                    },
                    prevention: [
                        'Verificare piedini antiscivolo',
                        'Mantenere 3 punti di appoggio',
                        'Non utilizzare scale danneggiate'
                    ],
                    gameplay: { spawn_rate: 'uncommon' }
                },
                {
                    id: 'chemical-container',
                    name: 'Contenitore Chimico Aperto',
                    short_name: 'Prodotti Chimici',
                    icon: '☠️',
                    danger: { 
                        severity: 'critical',
                        description: 'Fusti o contenitori di sostanze pericolose non sigillati. Rischio di esposizione.'
                    },
                    normative: {
                        reference: 'D.Lgs. 81/08',
                        article: 'Art. 225 - Agenti chimici'
                    },
                    prevention: [
                        'Indossare DPI specifici',
                        'Verificare etichette di pericolo',
                        'Segnalare immediatamente perdite'
                    ],
                    gameplay: { spawn_rate: 'rare' }
                },
                {
                    id: 'forklift-zone',
                    name: 'Zona Traffico Industriale',
                    short_name: 'Traffico Muletti',
                    icon: '🚧',
                    danger: { 
                        severity: 'high',
                        description: 'Area con transito di carrelli elevatori e mezzi industriali. Rischio di investimento.'
                    },
                    normative: {
                        reference: 'D.Lgs. 81/08',
                        article: 'Art. 53 - Piattaforme di carico'
                    },
                    prevention: [
                        'Rispettare i segnali acustici dei muletti',
                        'Attraversare solo nelle aree pedonali',
                        'Mantenire contatto visivo con l\'operatore'
                    ],
                    gameplay: { spawn_rate: 'uncommon' }
                },
                {
                    id: 'compressed-gas',
                    name: 'Bombola Gas compressi',
                    short_name: 'Gas Compressi',
                    icon: '🫙',
                    danger: { 
                        severity: 'high',
                        description: 'Bombole di gas ad alta pressione. Rischio di esplosione o proiezione.'
                    },
                    normative: {
                        reference: 'D.Lgs. 81/08',
                        article: 'Art. 78 - Attrezzature a pressione'
                    },
                    prevention: [
                        'Non colpire o urtare le bombole',
                        'Verificare integrità valvole',
                        'Segnalare immediatamente fughe'
                    ],
                    gameplay: { spawn_rate: 'uncommon' }
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
     * Precarica tutte le texture delle icone (ottimizzazione performance)
     */
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
            
            // Sfondo circolare
            ctx.beginPath();
            ctx.arc(64, 64, 60, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fill();
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 4;
            ctx.stroke();
            
            // Emoji
            ctx.font = '80px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, 64, 64);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            this.iconTextures.set(id, texture);
        }
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
        if (!this.hazardData || !this.hazardData.hazards) return;
        
        // Spawn immediato se nessun hazard presente (primo spawn garantito)
        if (this.hazards.length === 0 && !this.initialSpawnDone) {
            if (currentTime - this.lastSpawn > 2000) {
                this.spawnHazard(wormPosition, wormSegments);
                this.initialSpawnDone = true;
                this.lastSpawn = currentTime;
            }
            return;
        }
        
        // Spawn successivi ogni 3 secondi
        if (currentTime - this.lastSpawn > 3000) {
            if (this.hazards.length < this.maxHazards) {
                this.spawnHazard(wormPosition, wormSegments);
            }
            this.lastSpawn = currentTime;
        }
        
        // Aggiorna animazioni
        this.updateHazards(deltaTime, currentTime);
        
        // Check warning prossimita
        this.checkProximityWarning(wormPosition);
    }

    /**
     * Spawna un nuovo ostacolo
     */
    spawnHazard(wormPosition, wormSegments) {
        if (!this.hazardData || !this.hazardData.hazards || this.hazardData.hazards.length === 0) {
            return;
        }
        
        // Seleziona tipo hazard
        const hazardTypes = this.hazardData.hazards;
        const weights = hazardTypes.map(h => {
            const rate = h.gameplay?.spawn_rate || 'common';
            const weightMap = { common: 0.35, uncommon: 0.25, rare: 0.15, critical: 0.10 };
            return weightMap[rate] || 0.35;
        });
        
        const selectedIndex = this.weightedRandom(weights);
        const hazardType = hazardTypes[selectedIndex];
        
        // Trova posizione valida
        const position = this.findValidPosition(wormPosition, wormSegments);
        if (!position) return;
        
        // Crea mesh
        const geometry = this.geometries.get(hazardType.id);
        const material = this.materials.get(hazardType.id);
        
        if (!geometry || !material) {
            console.warn(`[HazardManager] Missing geometry/material for ${hazardType.id}`);
            return;
        }
        
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
        
        // Icona fluttuante
        this.createFloatingIcon(mesh, hazardType);
        
        // Log primo spawn
        console.log(`[HazardManager] Spawned: ${hazardType.name} (${this.hazards.length} total)`);
    }

    /**
     * Trova una posizione valida lontana dal verme
     */
    findValidPosition(wormPosition, wormSegments) {
        const margin = 2; // Distanza minima dal verme (ridotto per spawn più vicini)
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
     * Crea icona fluttuante 3D sopra l'hazard
     */
    createFloatingIcon(hazardMesh, hazardType) {
        // Usa texture precaricata (ottimizzato)
        const texture = this.iconTextures.get(hazardType.id);
        if (!texture) return;
        
        const material = new THREE.SpriteMaterial({ 
            map: texture, 
            transparent: true,
            opacity: 0.9
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(2, 2, 1);
        sprite.position.y = 2.5; // Sopra l'hazard
        
        hazardMesh.add(sprite);
        
        // Animazione fluttuante
        sprite.userData.floatOffset = Math.random() * Math.PI * 2;
    }

    /**
     * Controlla collisione con ostacoli
     */
    checkCollision(wormHeadPosition) {
        if (!wormHeadPosition) return null;
        
        const headBox = new THREE.Box3().setFromCenterAndSize(
            wormHeadPosition,
            new THREE.Vector3(0.8, 0.8, 0.8)
        );
        
        for (const hazard of this.hazards) {
            if (!hazard.userData.boundingBox) continue;
            
            if (hazard.userData.boundingBox.intersectsBox(headBox)) {
                // Assicurati che hazardData esista e abbia almeno name
                if (hazard.userData.hazardData && hazard.userData.hazardData.name) {
                    return hazard.userData.hazardData;
                }
            }
        }
        
        return null;
    }

    /**
     * Controlla se il worm si sta avvicinando a un pericolo (warning anticipato)
     */
    checkProximityWarning(wormHeadPosition) {
        if (!wormHeadPosition) return null;
        
        const warningDistance = 4; // Distanza di avviso
        let nearestHazard = null;
        let nearestDistance = Infinity;
        
        for (const hazard of this.hazards) {
            const distance = wormHeadPosition.distanceTo(hazard.position);
            if (distance < warningDistance && distance < nearestDistance) {
                nearestDistance = distance;
                nearestHazard = hazard.userData.hazardData;
            }
        }
        
        return nearestHazard ? { hazard: nearestHazard, distance: nearestDistance } : null;
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
