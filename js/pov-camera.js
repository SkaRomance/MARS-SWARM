import * as THREE from 'three';

/**
 * PovCamera - Camera in prima persona (POV mode)
 * Posiziona la camera alla testa del verme con rotazione fluida
 */
export class PovCamera {
    constructor(camera) {
        this.camera = camera;
        this.targetRotation = 0;
        this.currentRotation = 0;
        this.smoothFactor = 0.12; // Più basso = rotazione più fluida
        
        // Offset altezza occhi dal centro della testa
        this.eyeHeight = 0.8;
        
        // Distanza dietro la testa (per vedere meglio davanti)
        this.followDistance = 2.5;
        this.followHeight = 1.5;
    }

    /**
     * Aggiorna la camera in base alla posizione e direzione del verme
     * @param {Vector3} headPos - Posizione testa del verme
     * @param {Vector3} direction - Direzione del verme (normalizzata)
     * @param {number} deltaTime - Tempo trascorso
     */
    update(headPos, direction, deltaTime) {
        // Calcola rotazione target basata sulla direzione del verme
        // In Three.js: Z è negativo = avanti, X positivo = destra
        this.targetRotation = Math.atan2(direction.x, direction.z);
        
        // Smooth rotation (lerp angle)
        this.currentRotation = this.lerpAngle(
            this.currentRotation, 
            this.targetRotation, 
            this.smoothFactor
        );
        
        // Posizione camera: dietro e sopra la testa del verme
        const offsetX = Math.sin(this.currentRotation) * -this.followDistance;
        const offsetZ = Math.cos(this.currentRotation) * -this.followDistance;
        
        const targetPos = new THREE.Vector3(
            headPos.x + offsetX,
            headPos.y + this.followHeight,
            headPos.z + offsetZ
        );
        
        // Smooth position
        this.camera.position.lerp(targetPos, 0.15);
        
        // Look at: punto davanti alla testa del verme
        const lookAtDistance = 8;
        const lookAtX = headPos.x + Math.sin(this.currentRotation) * lookAtDistance;
        const lookAtZ = headPos.z + Math.cos(this.currentRotation) * lookAtDistance;
        
        this.camera.lookAt(lookAtX, headPos.y, lookAtZ);
    }

    /**
     * Interpolazione angolare che gestisce il wrap-around
     */
    lerpAngle(current, target, factor) {
        let diff = target - current;
        
        // Gestisce il wrap-around (es: da 350° a 10°)
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        
        return current + diff * factor;
    }

    /**
     * Forza la camera a una posizione/orientamento specifico (per init)
     */
    setInitialPosition(headPos, direction) {
        this.targetRotation = Math.atan2(direction.x, direction.z);
        this.currentRotation = this.targetRotation;
        
        const offsetX = Math.sin(this.currentRotation) * -this.followDistance;
        const offsetZ = Math.cos(this.currentRotation) * -this.followDistance;
        
        this.camera.position.set(
            headPos.x + offsetX,
            headPos.y + this.followHeight,
            headPos.z + offsetZ
        );
        
        const lookAtDistance = 8;
        const lookAtX = headPos.x + Math.sin(this.currentRotation) * lookAtDistance;
        const lookAtZ = headPos.z + Math.cos(this.currentRotation) * lookAtDistance;
        
        this.camera.lookAt(lookAtX, headPos.y, lookAtZ);
    }

    /**
     * Disattiva la camera POV (ripristina camera normale)
     */
    disable() {
        // La camera verrà riposizionata dal renderer
    }
}
