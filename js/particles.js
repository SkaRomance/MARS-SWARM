import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.maxParticles = 1000;
    }
    
    // Create explosion effect when fruit is eaten
    createEatEffect(position, color = 0x00ff88) {
        const particleCount = 20;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        const colors = new Float32Array(particleCount * 3);
        
        const colorObj = new THREE.Color(color);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;
            
            // Random velocity
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = 0.1 + Math.random() * 0.3;
            
            velocities.push({
                x: Math.sin(phi) * Math.cos(theta) * speed,
                y: Math.sin(phi) * Math.sin(theta) * speed + 0.2,
                z: Math.cos(phi) * speed
            });
            
            colors[i * 3] = colorObj.r;
            colors[i * 3 + 1] = colorObj.g;
            colors[i * 3 + 2] = colorObj.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.3,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });
        
        const points = new THREE.Points(geometry, material);
        this.scene.add(points);
        
        this.particles.push({
            mesh: points,
            velocities: velocities,
            life: 1.0,
            decay: 0.02
        });
    }
    
    // Create explosion effect on game over
    createExplosionEffect(position, color = 0xff4757) {
        const particleCount = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        const colors = new Float32Array(particleCount * 3);
        
        const colorObj = new THREE.Color(color);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;
            
            // Explosive velocity
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = 0.3 + Math.random() * 0.5;
            
            velocities.push({
                x: Math.sin(phi) * Math.cos(theta) * speed,
                y: Math.sin(phi) * Math.sin(theta) * speed + 0.3,
                z: Math.cos(phi) * speed
            });
            
            // Color variation
            const variation = (Math.random() - 0.5) * 0.3;
            colors[i * 3] = Math.min(1, colorObj.r + variation);
            colors[i * 3 + 1] = Math.min(1, colorObj.g + variation);
            colors[i * 3 + 2] = Math.min(1, colorObj.b + variation);
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.4,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });
        
        const points = new THREE.Points(geometry, material);
        this.scene.add(points);
        
        this.particles.push({
            mesh: points,
            velocities: velocities,
            life: 1.5,
            decay: 0.015
        });
    }
    
    // Create trail effect behind worm
    createTrailEffect(position, color = 0x00f5ff) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(3);
        positions[0] = position.x;
        positions[1] = position.y;
        positions[2] = position.z;
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.2,
            color: color,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        const points = new THREE.Points(geometry, material);
        this.scene.add(points);
        
        this.particles.push({
            mesh: points,
            velocities: [{ x: 0, y: 0.02, z: 0 }],
            life: 0.5,
            decay: 0.05,
            isTrail: true
        });
    }
    
    // Create sparkle effect for fruit
    createSparkle(position, color = 0xffd700) {
        const particleCount = 8;
        
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(3);
            positions[0] = position.x + (Math.random() - 0.5) * 1.5;
            positions[1] = position.y + (Math.random() - 0.5) * 1.5;
            positions[2] = position.z + (Math.random() - 0.5) * 1.5;
            
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            const material = new THREE.PointsMaterial({
                size: 0.15,
                color: color,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });
            
            const points = new THREE.Points(geometry, material);
            this.scene.add(points);
            
            this.particles.push({
                mesh: points,
                velocities: [{
                    x: (Math.random() - 0.5) * 0.02,
                    y: (Math.random() - 0.5) * 0.02,
                    z: (Math.random() - 0.5) * 0.02
                }],
                life: 1.0 + Math.random() * 0.5,
                decay: 0.02,
                isSparkle: true,
                baseY: positions[1]
            });
        }
    }
    
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= p.decay;
            
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
                continue;
            }
            
            // Update positions
            const positions = p.mesh.geometry.attributes.position.array;
            
            if (p.isSparkle) {
                // Sparkle floating motion
                positions[1] = p.baseY + Math.sin(Date.now() * 0.003) * 0.2;
                p.mesh.material.opacity = p.life * 0.8;
            } else {
                for (let j = 0; j < p.velocities.length; j++) {
                    positions[j * 3] += p.velocities[j].x;
                    positions[j * 3 + 1] += p.velocities[j].y;
                    positions[j * 3 + 2] += p.velocities[j].z;
                    
                    // Gravity for non-trail particles
                    if (!p.isTrail) {
                        p.velocities[j].y -= 0.01;
                    }
                }
                
                p.mesh.geometry.attributes.position.needsUpdate = true;
                p.mesh.material.opacity = p.life;
            }
            
            // Scale down
            if (!p.isTrail && !p.isSparkle) {
                p.mesh.material.size = 0.4 * p.life;
            }
        }
    }
    
    clear() {
        this.particles.forEach(p => {
            this.scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
        });
        this.particles = [];
    }
}
