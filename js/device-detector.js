/**
 * Device Detector Utility
 * Rileva se l'app è in esecuzione su mobile o desktop
 */

export class DeviceDetector {
    constructor() {
        this._isMobile = this._detectMobile();
        this._isTouch = this._detectTouch();
        this._setupListeners();
    }

    /**
     * Rileva se il dispositivo è mobile basandosi su:
     * - User Agent
     * - Feature detection (pointer: coarse)
     * - Dimensione schermo
     */
    _detectMobile() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        const isSmallScreen = window.innerWidth < 768;
        
        // Considera mobile se:
        // - UA indica mobile, O
        // - È un dispositivo touch CON schermo piccolo
        return isMobileUA || (isTouch && isSmallScreen);
    }

    /**
     * Rileva se il dispositivo supporta il touch
     */
    _detectTouch() {
        return window.matchMedia('(pointer: coarse)').matches || 
               'ontouchstart' in window ||
               navigator.maxTouchPoints > 0;
    }

    /**
     * Setup listeners per cambiamenti (resize, orientation)
     */
    _setupListeners() {
        window.addEventListener('resize', () => {
            this._isMobile = this._detectMobile();
            this._updateBodyClass();
        });

        window.addEventListener('orientationchange', () => {
            // Ritardo per permettere al browser di aggiornare le dimensioni
            setTimeout(() => {
                this._isMobile = this._detectMobile();
                this._updateBodyClass();
            }, 100);
        });
    }

    /**
     * Aggiorna la classe del body in base al dispositivo
     */
    _updateBodyClass() {
        const body = document.body;
        if (this._isMobile) {
            body.classList.remove('device-desktop');
            body.classList.add('device-mobile');
        } else {
            body.classList.remove('device-mobile');
            body.classList.add('device-desktop');
        }
    }

    /**
     * Inizializza il detector (chiama questa all'avvio)
     */
    init() {
        this._updateBodyClass();
        console.log(`[DeviceDetector] Dispositivo rilevato: ${this._isMobile ? 'MOBILE' : 'DESKTOP'}`);
        console.log(`[DeviceDetector] Touch support: ${this._isTouch ? 'SÌ' : 'NO'}`);
        console.log(`[DeviceDetector] Screen: ${window.innerWidth}x${window.innerHeight}`);
    }

    /**
     * Restituisce true se il dispositivo è mobile
     */
    isMobile() {
        return this._isMobile;
    }

    /**
     * Restituisce true se il dispositivo supporta il touch
     */
    isTouchDevice() {
        return this._isTouch;
    }

    /**
     * Restituisce l'aspect ratio dello schermo
     */
    getAspectRatio() {
        return window.innerWidth / window.innerHeight;
    }

    /**
     * Restituisce true se l'orientamento è portrait
     */
    isPortrait() {
        return this.getAspectRatio() < 1;
    }

    /**
     * Restituisce true se l'orientamento è landscape
     */
    isLandscape() {
        return this.getAspectRatio() >= 1;
    }
}

// Singleton instance
let detectorInstance = null;

export function getDeviceDetector() {
    if (!detectorInstance) {
        detectorInstance = new DeviceDetector();
    }
    return detectorInstance;
}

export function isMobile() {
    return getDeviceDetector().isMobile();
}

export function isTouchDevice() {
    return getDeviceDetector().isTouchDevice();
}
