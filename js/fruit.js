import * as THREE from 'three';

export class Fruit {
    constructor(scene, boundary) {
        this.scene = scene;
        this.boundary = boundary;
        this.mesh = null;
        this.particles = null;
        this.light = null;
        this.time = 0;
        
        this.colors = [
            { main: 0xffd700, emissive: 0xff6600 }, // Gold/Orange
            { main: 0xff00ff, emissive: 0x8b008b }, // Magenta
            { main: 0x00ff88, emissive: 0x00aa44 }, // Green
            { main: 0xff4757, emissive: 0xaa2233 }, // Red
            { main: 0x00f5ff, emissive: 0x0088aa }, // Cyan
        ];
        
        this.spawn();
    }
    
    spawn(wormPosition = null, hazards = []) {
        // Remove old if exists
        this.remove();
        
        // Random position within boundary
        const range = this.boundary - 3;
        let pos;
        let attempts = 0;
        let tooCloseToHazard = false;
        
        do {
            pos = new THREE.Vector3(
                (Math.random() - 0.5) * 2 * range,
                0.5,
                (Math.random() - 0.5) * 2 * range
            );
            attempts++;
            
            // Check distanza dai hazard (minimo 4 unità)
            tooCloseToHazard = false;
            for (const hazard of hazards) {
                if (hazard.position && pos.distanceTo(hazard.position) < 4) {
                    tooCloseToHazard = true;
                    break;
                }
            }
            
        } while ((wormPosition && pos.distanceTo(wormPosition) < 3 || tooCloseToHazard) && attempts < 20);
        
        this.position = pos;
        
        // Random color
        this.colorScheme = this.colors[Math.floor(Math.random() * this.colors.length)];
        
        // Create fruit mesh - glossy sphere
        const geometry = new THREE.SphereGeometry(0.6, 32, 32);
        const material = new THREE.MeshPhysicalMaterial({
            color: this.colorScheme.main,
            emissive: this.colorScheme.emissive,
            emissiveIntensity: 0.5,
            metalness: 0.1,
            roughness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            transmission: 0.2,
            thickness: 0.5
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);
        
        // Add glow ring
        const ringGeometry = new THREE.TorusGeometry(0.9, 0.05, 16, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: this.colorScheme.main,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
        this.ring.position.copy(this.position);
        this.ring.rotation.x = Math.PI / 2;
        this.scene.add(this.ring);
        
        // Add point light
        this.light = new THREE.PointLight(
            this.colorScheme.main,
            2,
            8
        );
        this.light.position.copy(this.position);
        this.scene.add(this.light);
        
        // Outer glow
        const glowGeometry = new THREE.SphereGeometry(1.2, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.colorScheme.main,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glow.position.copy(this.position);
        this.scene.add(this.glow);
    }
    
    update(deltaTime) {
        this.time += deltaTime;
        
        if (this.mesh) {
            // Floating animation
            this.mesh.position.y = this.position.y + Math.sin(this.time * 2) * 0.2;
            this.mesh.rotation.y += deltaTime;
            this.mesh.rotation.x = Math.sin(this.time) * 0.1;
            
            // Update ring
            this.ring.position.y = this.position.y + Math.sin(this.time * 2) * 0.2;
            this.ring.rotation.z += deltaTime * 0.5;
            
            // Update glow
            this.glow.position.y = this.position.y + Math.sin(this.time * 2) * 0.2;
            this.glow.scale.setScalar(1 + Math.sin(this.time * 3) * 0.1);
            
            // Update light
            this.light.position.y = this.position.y + Math.sin(this.time * 2) * 0.2;
            this.light.intensity = 2 + Math.sin(this.time * 4) * 0.5;
        }
    }
    
    getPosition() {
        if (this.mesh) {
            return this.mesh.position.clone();
        }
        return new THREE.Vector3();
    }
    
    remove() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }
        if (this.ring) {
            this.scene.remove(this.ring);
            this.ring.geometry.dispose();
            this.ring.material.dispose();
            this.ring = null;
        }
        if (this.glow) {
            this.scene.remove(this.glow);
            this.glow.geometry.dispose();
            this.glow.material.dispose();
            this.glow = null;
        }
        if (this.light) {
            this.scene.remove(this.light);
            this.light = null;
        }
    }
}
