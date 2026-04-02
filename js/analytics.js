/**
 * SafetyAnalytics - Tracciamento dati formazione H&S
 * Dati salvati in localStorage (privacy-compliant, nessun server)
 */

export class SafetyAnalytics {
    constructor() {
        this.storageKey = 'swarm_safety_analytics';
        this.sessionStart = null;
        this.currentSession = null;
        this.incidents = [];
        this.scores = [];
        
        this.loadData();
    }

    /**
     * Inizia una nuova sessione di gioco
     */
    startSession(gameMode) {
        this.sessionStart = Date.now();
        this.currentSession = {
            id: this.generateId(),
            startTime: this.sessionStart,
            gameMode: gameMode,
            incidents: [],
            finalScore: 0,
            duration: 0,
            device: this.getDeviceInfo()
        };
        
        this.incidents = [];
    }

    /**
     * Registra un incidente
     */
    logIncident(hazardData, score, position) {
        const incident = {
            timestamp: Date.now(),
            hazardId: hazardData.id,
            hazardName: hazardData.name,
            hazardSeverity: hazardData.danger?.severity || 'unknown',
            score: score,
            position: position,
            timeFromStart: Date.now() - this.sessionStart
        };
        
        this.incidents.push(incident);
        
        if (this.currentSession) {
            this.currentSession.incidents.push(incident);
        }
        
        // Salva immediatamente per persistenza
        this.saveIncident(incident);
    }

    /**
     * Registra il punteggio finale
     */
    endSession(finalScore) {
        if (!this.currentSession) return;
        
        this.currentSession.endTime = Date.now();
        this.currentSession.duration = this.currentSession.endTime - this.sessionStart;
        this.currentSession.finalScore = finalScore;
        this.currentSession.incidentCount = this.incidents.length;
        
        // Salva sessione
        this.saveSession(this.currentSession);
        
        // Aggiorna statistiche globali
        this.updateGlobalStats();
        
        this.currentSession = null;
        this.incidents = [];
    }

    /**
     * Salva un singolo incidente nel log storico
     */
    saveIncident(incident) {
        const data = this.loadData();
        data.incidents.unshift(incident);
        
        // Mantieni solo ultimi 100 incidenti
        if (data.incidents.length > 100) {
            data.incidents = data.incidents.slice(0, 100);
        }
        
        this.saveData(data);
    }

    /**
     * Salva una sessione completa
     */
    saveSession(session) {
        const data = this.loadData();
        data.sessions.unshift(session);
        
        // Mantieni solo ultime 50 sessioni
        if (data.sessions.length > 50) {
            data.sessions = data.sessions.slice(0, 50);
        }
        
        this.saveData(data);
    }

    /**
     * Aggiorna statistiche globali
     */
    updateGlobalStats() {
        const data = this.loadData();
        const sessions = data.sessions;
        
        if (sessions.length === 0) return;
        
        data.stats = {
            totalSessions: sessions.length,
            totalIncidents: data.incidents.length,
            avgScore: Math.round(sessions.reduce((a, s) => a + s.finalScore, 0) / sessions.length),
            avgDuration: Math.round(sessions.reduce((a, s) => a + s.duration, 0) / sessions.length),
            mostCommonHazard: this.getMostCommonHazard(data.incidents),
            bestScore: Math.max(...sessions.map(s => s.finalScore)),
            totalPlayTime: sessions.reduce((a, s) => a + s.duration, 0),
            lastUpdated: Date.now()
        };
        
        this.saveData(data);
    }

    /**
     * Trova il pericolo più comune
     */
    getMostCommonHazard(incidents) {
        const counts = {};
        incidents.forEach(i => {
            counts[i.hazardId] = (counts[i.hazardId] || 0) + 1;
        });
        
        let maxCount = 0;
        let mostCommon = null;
        
        for (const [hazardId, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = hazardId;
            }
        }
        
        return mostCommon;
    }

    /**
     * Ottieni tutte le statistiche
     */
    getStats() {
        const data = this.loadData();
        return data.stats || this.calculateStats();
    }

    /**
     * Calcola statistiche da zero
     */
    calculateStats() {
        const data = this.loadData();
        this.updateGlobalStats();
        return data.stats;
    }

    /**
     * Ottieni trend incidenti (ultime 10 sessioni)
     */
    getIncidentTrend() {
        const data = this.loadData();
        const sessions = data.sessions.slice(0, 10);
        
        return sessions.map(s => ({
            date: new Date(s.startTime).toLocaleDateString(),
            incidents: s.incidentCount,
            score: s.finalScore,
            duration: Math.round(s.duration / 1000)
        })).reverse();
    }

    /**
     * Ottieni distribuzione pericoli
     */
    getHazardDistribution() {
        const data = this.loadData();
        const distribution = {};
        
        data.incidents.forEach(i => {
            distribution[i.hazardName] = (distribution[i.hazardName] || 0) + 1;
        });
        
        return Object.entries(distribution)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Esporta dati in formato JSON
     */
    exportData() {
        const data = this.loadData();
        const exportObj = {
            exportDate: new Date().toISOString(),
            summary: data.stats,
            sessions: data.sessions,
            incidents: data.incidents,
            hazardDistribution: this.getHazardDistribution()
        };
        
        const jsonStr = JSON.stringify(exportObj, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `safety-analytics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return exportObj;
    }

    /**
     * Genera report HTML
     */
    generateReport() {
        const stats = this.getStats();
        const distribution = this.getHazardDistribution();
        
        const reportHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Report Safety Training</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #00C851; }
        .stat-box { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #00C851; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #00C851; color: white; }
    </style>
</head>
<body>
    <h1>📊 Report Formazione Sicurezza</h1>
    <p>Generato: ${new Date().toLocaleString()}</p>
    
    <div class="stat-box">
        <h3>Sessioni Totali</h3>
        <div class="stat-value">${stats.totalSessions}</div>
    </div>
    
    <div class="stat-box">
        <h3>Incidenti Totali</h3>
        <div class="stat-value">${stats.totalIncidents}</div>
    </div>
    
    <div class="stat-box">
        <h3>Punteggio Medio</h3>
        <div class="stat-value">${stats.avgScore}</div>
    </div>
    
    <div class="stat-box">
        <h3>Durata Media Sessione</h3>
        <div class="stat-value">${Math.round(stats.avgDuration / 1000)}s</div>
    </div>
    
    <h2>🎯 Distribuzione Pericoli</h2>
    <table>
        <tr><th>Pericolo</th><th>Incidenti</th></tr>
        ${distribution.map(h => `<tr><td>${h.name}</td><td>${h.count}</td></tr>`).join('')}
    </table>
</body>
</html>`;
        
        const blob = new Blob([reportHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `safety-report-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Pulisci tutti i dati
     */
    clearAll() {
        localStorage.removeItem(this.storageKey);
        this.incidents = [];
        this.currentSession = null;
    }

    /**
     * Carica dati da localStorage
     */
    loadData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('[Analytics] Errore caricamento dati:', e);
        }
        
        return {
            sessions: [],
            incidents: [],
            stats: {},
            firstRun: Date.now()
        };
    }

    /**
     * Salva dati su localStorage
     */
    saveData(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (e) {
            console.error('[Analytics] Errore salvataggio dati:', e);
            // Se storage pieno, rimuovi dati vecchi
            if (e.name === 'QuotaExceededError') {
                this.cleanupOldData();
            }
        }
    }

    /**
     * Pulisci dati vecchi se storage pieno
     */
    cleanupOldData() {
        const data = this.loadData();
        // Mantieni solo ultime 20 sessioni
        data.sessions = data.sessions.slice(0, 20);
        data.incidents = data.incidents.slice(0, 50);
        this.saveData(data);
    }

    /**
     * Genera ID univoco
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Ottieni info dispositivo
     */
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent.substring(0, 50),
            screen: `${window.screen.width}x${window.screen.height}`,
            isMobile: /mobile|android|iphone|ipad/i.test(navigator.userAgent)
        };
    }
}

// Singleton
let analyticsInstance = null;

export function getAnalytics() {
    if (!analyticsInstance) {
        analyticsInstance = new SafetyAnalytics();
    }
    return analyticsInstance;
}
