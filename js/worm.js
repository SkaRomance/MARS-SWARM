import * as THREE from 'three';

export class Worm {
    constructor(scene) {
        this.scene = scene;
        this.segments = [];
        this.segmentMeshes = [];
        this.segmentSize = 0.5;
        this.segmentDistance = 0.5;  // Aumentato per più spazio tra segmenti
        this.baseSpeed = 5;          // Ridotto per inizio più controllato
        this.speed = this.baseSpeed;
        this.direction = new THREE.Vector3(1, 0, 0);
        this.targetDirection = new THREE.Vector3(1, 0, 0);
        
        // Per movimento smooth
        this.headBobOffset = 0;
        this.accumulatedDistance = 0;
        
        // Initialize with 3 segments
        this.initialLength = 3;
        this.init();
    }
    
    init() {
        // Create head
        const headGeometry = new THREE.SphereGeometry(this.segmentSize * 1.2, 32, 32);
        const headMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x9d00ff,
            metalness: 0.7,
            roughness: 0.2,
            clearcoat: 1.0,
            emissive: 0x9d00ff,
            emissiveIntensity: 0.4
        });
        
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.castShadow = true;
        this.head.position.set(0, 0.5, 0);
        this.scene.add(this.head);
        
        // Create eyes
        this.createEyes();
        
        // Create initial body segments
        for (let i = 0; i < this.initialLength; i++) {
            this.addSegment();
        }
        
        // Head light
        this.headLight = new THREE.PointLight(0x9d00ff, 1.2, 8);
        this.head.add(this.headLight);
    }
    
    createEyes() {
        const eyeGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pupilGeometry = new THREE.SphereGeometry(0.08, 16, 16);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        // Left eye
        this.leftEye = new THREE.Group();
        const leftEyeBall = new THREE.Mesh(eyeGeometry, eyeMaterial);
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.z = 0.12;
        this.leftEye.add(leftEyeBall);
        this.leftEye.add(leftPupil);
        this.leftEye.position.set(-0.25, 0.3, 0.4);
        this.head.add(this.leftEye);
        
        // Right eye
        this.rightEye = new THREE.Group();
        const rightEyeBall = new THREE.Mesh(eyeGeometry, eyeMaterial);
        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.z = 0.12;
        this.rightEye.add(rightEyeBall);
        this.rightEye.add(rightPupil);
        this.rightEye.position.set(0.25, 0.3, 0.4);
        this.head.add(this.rightEye);
    }
    
    addSegment() {
        const geometry = new THREE.SphereGeometry(
            this.segmentSize * (0.85 + Math.random() * 0.15), 
            24, 
            24
        );
        
        // Gradient from bright purple to pink
        const ratio = this.segmentMeshes.length / 20;
        const color = new THREE.Color().lerpColors(
            new THREE.Color(0x9d00ff),
            new THREE.Color(0xff00d4),
            Math.min(ratio, 1)
        );
        
        const material = new THREE.MeshPhysicalMaterial({
            color: color,
            metalness: 0.6,
            roughness: 0.3,
            clearcoat: 0.8,
            emissive: color,
            emissiveIntensity: 0.15
        });
        
        const segment = new THREE.Mesh(geometry, material);
        segment.castShadow = true;
        
        // Position iniziale dietro l'ultimo segmento
        if (this.segmentMeshes.length === 0) {
            segment.position.copy(this.head.position);
            segment.position.x -= this.segmentDistance;
        } else {
            const lastSegment = this.segmentMeshes[this.segmentMeshes.length - 1];
            segment.position.copy(lastSegment.position);
            segment.position.x -= this.segmentDistance;
        }
        
        this.scene.add(segment);
        this.segmentMeshes.push(segment);
        
        // Store segment data con history per smooth follow
        this.segments.push({
            positionHistory: [segment.position.clone()],
            maxHistory: 3
        });
    }
    
    setDirection(direction) {
        // Prevent 180 degree turns
        const dot = this.direction.dot(direction);
        if (dot > -0.5) {  // Più permissivo
            this.targetDirection.copy(direction);
        }
    }
    
    update(deltaTime, boundary) {
        // FIX: Limit deltaTime per evitare salti quando il framerate crolla
        const dt = Math.min(deltaTime, 0.033);
        
        // Smooth direction change
        this.direction.lerp(this.targetDirection, dt * 12);
        this.direction.normalize();
        
        // Rotate head to face direction
        const targetRotation = Math.atan2(this.direction.x, this.direction.z);
        // Smooth rotation
        let rotDiff = targetRotation - this.head.rotation.y;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        this.head.rotation.y += rotDiff * dt * 10;
        
        this.headBobOffset += dt * 3;
        
        // Calculate head movement
        const moveDistance = this.speed * dt;
        
        // Move head
        const newHeadPos = this.head.position.clone();
        newHeadPos.add(this.direction.clone().multiplyScalar(moveDistance));
        
        // Vertical bobbing
        newHeadPos.y = 0.5 + Math.sin(this.headBobOffset) * 0.08;
        
        // FIX: Boundary collision - margine più ampio
        const limit = boundary - 0.8;
        if (Math.abs(newHeadPos.x) > limit || Math.abs(newHeadPos.z) > limit) {
            return 'collision';
        }
        
        // Update head position
        this.head.position.copy(newHeadPos);
        
        // Animate eyes
        this.leftEye.rotation.y = Math.sin(this.headBobOffset * 0.5) * 0.1;
        this.rightEye.rotation.y = Math.sin(this.headBobOffset * 0.5) * 0.1;
        
        // Update body segments with smooth follow usando history
        for (let i = 0; i < this.segmentMeshes.length; i++) {
            const segment = this.segmentMeshes[i];
            const prevObj = i === 0 ? this.head : this.segmentMeshes[i - 1];
            const prevPos = prevObj.position;
            
            // Calcola posizione target dietro il precedente
            const toPrev = prevPos.clone().sub(segment.position);
            const dist = toPrev.length();
            
            if (dist > 0) {
                toPrev.normalize();
                
                // Posizione ideale: segmentDistance dietro
                let targetPos;
                if (dist > this.segmentDistance) {
                    // Se troppo lontano, avvicina
                    targetPos = prevPos.clone().sub(toPrev.multiplyScalar(this.segmentDistance));
                } else {
                    // Se troppo vicino, mantieni distanza ma lerp smooth
                    targetPos = segment.position.clone().lerp(
                        prevPos.clone().sub(toPrev.multiplyScalar(this.segmentDistance)),
                        0.1
                    );
                }
                
                // FIX: Lerp con fattore costante per movimento fluido
                segment.position.lerp(targetPos, 0.15);
                
                // Vertical wave
                const phase = i * 0.4;
                segment.position.y = 0.3 + Math.sin(this.headBobOffset - phase) * 0.06;
                
                // Rotate to face previous
                segment.lookAt(prevPos);
            }
        }
        
        // FIX: Self collision check - più conservativo
        // Skip primi 6 segmenti (testa + 5) per evitare false collisioni
        const collisionThreshold = this.segmentSize * 0.6;  // Ridotto da 0.8
        for (let i = 6; i < this.segmentMeshes.length; i++) {
            const segment = this.segmentMeshes[i];
            const dist = this.head.position.distanceTo(segment.position);
            if (dist < collisionThreshold) {
                console.log('Self collision detected at segment', i, 'distance:', dist);
                return 'collision';
            }
        }
        
        return 'ok';
    }
    
    grow() {
        this.addSegment();
        // FIX: Velocità aumenta più gradualmente
        const speedIncrease = 0.08;
        this.speed = Math.min(this.baseSpeed + this.segmentMeshes.length * speedIncrease, 10);
    }
    
    getHeadPosition() {
        return this.head.position.clone();
    }
    
    getLength() {
        return this.segmentMeshes.length;
    }
    
    reset() {
        // Remove all segments
        this.segmentMeshes.forEach(segment => {
            this.scene.remove(segment);
            segment.geometry.dispose();
            segment.material.dispose();
        });
        this.segmentMeshes = [];
        this.segments = [];
        
        // Reset head
        this.head.position.set(0, 0.5, 0);
        this.direction.set(1, 0, 0);
        this.targetDirection.set(1, 0, 0);
        this.speed = this.baseSpeed;
        this.headBobOffset = 0;
        this.accumulatedDistance = 0;
        
        // Recreate segments
        for (let i = 0; i < this.initialLength; i++) {
            this.addSegment();
        }
    }
    
    remove() {
        this.segmentMeshes.forEach(segment => {
            this.scene.remove(segment);
            segment.geometry.dispose();
            segment.material.dispose();
        });
        this.scene.remove(this.head);
        this.head.geometry.dispose();
        this.head.material.dispose();
    }
}
