import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { isMobile } from './device-detector.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.isMobile = isMobile();
        
        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initLights();
        this.initPostProcessing();
        this.initEnvironment();
        this.initCyberpunkBackground();
        
        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }
    
    initScene() {
        this.scene = new THREE.Scene();
        // Background verde scuro MARS (lontano)
        this.scene.background = new THREE.Color(0x0a1a0f);
        // Fog molto leggero per non tingere il tavolo
        this.scene.fog = new THREE.FogExp2(0x1a1a1a, 0.003);
    }
    
    initCamera() {
        const settings = this.getCameraSettings();
        
        this.camera = new THREE.PerspectiveCamera(
            settings.fov, 
            settings.aspect, 
            0.1, 
            1000
        );
        
        this.camera.position.set(0, settings.y, settings.z);
        this.camera.lookAt(0, 0, 0);
        
        // Salva i limiti della camera per il clamping
        this.cameraBounds = settings.bounds;
    }
    
    /**
     * Calcola le impostazioni ottimali della camera in base al dispositivo
     * Camera in modalità "bird's eye" dall'alto per comandi swipe coerenti
     */
    getCameraSettings() {
        const aspect = this.width / this.height;
        const boundarySize = this.boundarySize || 27;
        
        if (this.isMobile) {
            // Mobile: camera dall'alto (TOP-DOWN) per comandi swipe perfetti
            // Molto alta, FOV basso, guarda verticalmente verso il basso
            if (aspect < 1) {
                // Portrait
                return {
                    fov: 45,    // FOV stretto = meno distorsione
                    aspect: aspect,
                    y: 80,      // Molto in alto
                    z: 0.1,     // Quasi esattamente sopra il centro
                    bounds: 0   // Camera statica
                };
            } else {
                // Landscape
                return {
                    fov: 40,
                    aspect: aspect,
                    y: 70,
                    z: 0.1,
                    bounds: 0
                };
            }
        }
        
        // Desktop: impostazioni standard
        return {
            fov: 60,
            aspect: aspect,
            y: 25,
            z: 25,
            bounds: boundarySize * 0.8
        };
    }
    
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
    }
    
    initLights() {
        // Ambient light - bianca per tavolo neutrale
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Main directional light - bianca per illuminare correttamente il tavolo
        this.mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.mainLight.position.set(10, 20, 10);
        this.mainLight.castShadow = true;
        this.mainLight.shadow.mapSize.width = 2048;
        this.mainLight.shadow.mapSize.height = 2048;
        this.mainLight.shadow.camera.near = 0.5;
        this.mainLight.shadow.camera.far = 100;
        this.mainLight.shadow.camera.left = -30;
        this.mainLight.shadow.camera.right = 30;
        this.mainLight.shadow.camera.top = 30;
        this.mainLight.shadow.camera.bottom = -30;
        this.mainLight.shadow.bias = -0.001;
        this.scene.add(this.mainLight);
        
        // Rim light - verde chiaro
        this.rimLight = new THREE.DirectionalLight(0x00ff88, 0.5);
        this.rimLight.position.set(-10, 10, -10);
        this.scene.add(this.rimLight);
        
        // Accent light verde
        this.accentLight = new THREE.PointLight(0x00C851, 0.6, 50);
        this.accentLight.position.set(0, 5, 0);
        this.scene.add(this.accentLight);
        
        // Luci decorative in lontananza - palette MARS verde
        this.neonLights = [];
        const positions = [
            { x: -35, z: 0 },
            { x: 35, z: 0 },
            { x: 0, z: -35 },
            { x: 0, z: 35 }
        ];
        const colors = [0x00C851, 0x00ff88, 0x00C851, 0x00ff88];
        
        positions.forEach((pos, i) => {
            const light = new THREE.PointLight(colors[i], 0.8, 40);
            light.position.set(pos.x, 2, pos.z);
            this.scene.add(light);
            this.neonLights.push(light);
        });
        
        // Dynamic lights array for fruit effects
        this.dynamicLights = [];
    }
    
    initPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        
        // Render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        
        // Bloom pass - moderato per non coprire il tavolo
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(this.width, this.height),
            1.0,  // strength
            0.4,  // radius
            0.85  // threshold
        );
        this.composer.addPass(bloomPass);
        
        this.bloomPass = bloomPass;
    }
    
    initEnvironment() {
        // Griglia verde MARS sotto il tavolo (BACKGROUND)
        const gridHelper = new THREE.GridHelper(120, 60, 0x00C851, 0x1a3d1a);
        gridHelper.position.y = -4;
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
        this.neonGrid = gridHelper;
        
        // White floor plane - TAVOLO BIANCO ORIGINALE (non toccato)
        const planeGeometry = new THREE.PlaneGeometry(60, 60);
        const planeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.4,
            metalness: 0.1
        });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -0.6;
        plane.receiveShadow = true;
        this.scene.add(plane);
        
        // Logo MARS grande e visibile
        this.createLogoPlatform();
        
        // Boundary walls - muri grigi semplici (non verdi)
        this.createBoundary();
    }
    
    createLogoPlatform() {
        // Carica texture logo MARS (logo con testo, dimensioni 1201x705)
        const textureLoader = new THREE.TextureLoader();
        const logoTexture = textureLoader.load('assets/logo.png');
        
        // Logo GRANDE e visibile - ratio 1201:705 ≈ 1.7
        const logoGeo = new THREE.PlaneGeometry(10, 5.9);
        const logoMat = new THREE.MeshStandardMaterial({
            map: logoTexture,
            transparent: true,
            opacity: 1.0,
            alphaTest: 0.5,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const logoMesh = new THREE.Mesh(logoGeo, logoMat);
        logoMesh.rotation.x = -Math.PI / 2;
        logoMesh.position.set(0, -0.58, 0);
        this.scene.add(logoMesh);
        
        this.logoMesh = logoMesh;
    }
    
    createBoundary() {
        // Dimensione boundary: più piccola su mobile per migliore visibilità
        const boundarySize = this.isMobile ? 22 : 28;
        const wallGeometry = new THREE.BoxGeometry(1, 2, boundarySize * 2);
        // Muri grigi semplici - sul tavolo non cambia
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            transparent: true,
            opacity: 0.6
        });
        
        // Four walls
        const positions = [
            { x: -boundarySize, z: 0 },
            { x: boundarySize, z: 0 },
            { x: 0, z: -boundarySize },
            { x: 0, z: boundarySize }
        ];
        
        positions.forEach((pos, i) => {
            const wall = new THREE.Mesh(
                i < 2 ? wallGeometry : new THREE.BoxGeometry(boundarySize * 2, 2, 1),
                wallMaterial.clone()
            );
            wall.position.set(pos.x, 0.5, pos.z);
            this.scene.add(wall);
        });
        
        this.boundarySize = boundarySize - 1;
    }
    
    initCyberpunkBackground() {
        // Particelle verdi MARS che fluttuano
        const particlesGeo = new THREE.BufferGeometry();
        const particleCount = 200;
        const posArray = new Float32Array(particleCount * 3);
        const colorArray = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i += 3) {
            // Posizioni casuali nello spazio
            posArray[i] = (Math.random() - 0.5) * 100;
            posArray[i + 1] = Math.random() * 30 - 5;
            posArray[i + 2] = (Math.random() - 0.5) * 100;
            
            // Colori verdi MARS
            const isBright = Math.random() > 0.5;
            colorArray[i] = 0;
            colorArray[i + 1] = isBright ? 0.78 : 0.5;  // Verde smeraldo
            colorArray[i + 2] = isBright ? 0.32 : 0.2;
        }
        
        particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        particlesGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
        
        const particlesMat = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        this.particles = new THREE.Points(particlesGeo, particlesMat);
        this.scene.add(this.particles);
        
        // Edifici low-poly in lontananza
        this.createCyberpunkBuildings();
    }
    
    createCyberpunkBuildings() {
        this.buildings = [];
        const buildingCount = 20;
        
        for (let i = 0; i < buildingCount; i++) {
            const height = 10 + Math.random() * 30;
            const width = 2 + Math.random() * 4;
            const depth = 2 + Math.random() * 4;
            
            const geo = new THREE.BoxGeometry(width, height, depth);
            const mat = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0x00C851 : 0x00ff88,
                transparent: true,
                opacity: 0.1 + Math.random() * 0.1
            });
            
            const building = new THREE.Mesh(geo, mat);
            
            // Posiziona in cerchio attorno al tavolo, lontano
            const angle = (i / buildingCount) * Math.PI * 2;
            const radius = 40 + Math.random() * 20;
            building.position.set(
                Math.cos(angle) * radius,
                height / 2 - 10,
                Math.sin(angle) * radius
            );
            
            this.scene.add(building);
            this.buildings.push({
                mesh: building,
                speed: 0.2 + Math.random() * 0.3,
                offset: Math.random() * Math.PI * 2
            });
            
            // Luci verdi sulle finestre
            const windowsCount = Math.floor(height / 3);
            for (let w = 0; w < windowsCount; w++) {
                if (Math.random() > 0.5) {
                    const lightGeo = new THREE.BoxGeometry(width + 0.1, 0.2, depth + 0.1);
                    const lightMat = new THREE.MeshBasicMaterial({
                        color: Math.random() > 0.5 ? 0x00C851 : 0x00ff88,
                        transparent: true,
                        opacity: 0.5
                    });
                    const light = new THREE.Mesh(lightGeo, lightMat);
                    light.position.y = -height / 2 + (w + 1) * 3;
                    building.add(light);
                }
            }
        }
    }
    
    addDynamicLight(position, color, intensity = 1, distance = 10) {
        const light = new THREE.PointLight(color, intensity, distance);
        light.position.copy(position);
        this.scene.add(light);
        this.dynamicLights.push(light);
        return light;
    }
    
    removeDynamicLight(light) {
        const index = this.dynamicLights.indexOf(light);
        if (index > -1) {
            this.dynamicLights.splice(index, 1);
            this.scene.remove(light);
        }
    }
    
    updateLights(time) {
        // Anima luci decorative in background
        this.neonLights.forEach((light, i) => {
            const pulse = Math.sin(time * 1.5 + i * Math.PI / 2) * 0.2 + 0.6;
            light.intensity = pulse;
        });
        
        // Anima accent light
        this.accentLight.intensity = 0.4 + Math.sin(time * 1.5) * 0.1;
        this.accentLight.position.x = Math.sin(time * 0.5) * 10;
        this.accentLight.position.z = Math.cos(time * 0.5) * 10;
        
        // Anima rim light
        this.rimLight.position.x = Math.sin(time * 0.3) * -15;
        this.rimLight.position.z = Math.cos(time * 0.3) * -15;
        
        // Anima griglia neon in background (scrolling effect)
        if (this.neonGrid) {
            this.neonGrid.position.z = (time * 1) % 2;
        }
        
        // Anima particelle in background
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] += 0.015;
                if (positions[i] > 20) positions[i] = -10;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
            this.particles.rotation.y = time * 0.03;
        }
        
        // Anima edifici in background
        this.buildings.forEach((b, i) => {
            b.mesh.position.y += Math.sin(time * b.speed + b.offset) * 0.008;
        });
    }
    
    onResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        // Aggiorna stato mobile in caso di cambio dispositivo/emulazione
        const newIsMobile = isMobile();
        const deviceChanged = this.isMobile !== newIsMobile;
        this.isMobile = newIsMobile;
        
        // Se il dispositivo è cambiato o è mobile (dove l'orientamento conta di più),
        // ricalcola completamente le impostazioni della camera
        if (deviceChanged || this.isMobile) {
            const settings = this.getCameraSettings();
            this.camera.fov = settings.fov;
            this.camera.position.y = settings.y;
            this.camera.position.z = settings.z;
            this.cameraBounds = settings.bounds;
        }
        
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(this.width, this.height);
        this.composer.setSize(this.width, this.height);
    }
    
    render() {
        this.composer.render();
    }
    
    dispose() {
        this.renderer.dispose();
        this.composer.dispose();
    }
}
