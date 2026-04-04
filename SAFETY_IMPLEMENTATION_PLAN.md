# Piano Implementazione MARS-SWARM Safety Mode

## Stato Attuale (Analisi Post-Mortem)

### Cosa è stato implementato:
- ✅ Tutorial iniziale con leggenda hazard
- ✅ Schermata Game Over educativa con normativa
- ✅ Database hazard JSON completo (8 tipi)
- ✅ HazardManager con geometrie procedurali
- ✅ Warning prossimità (UI)
- ✅ Icone precaricate (ottimizzazione)

### Cosa NON funziona:
- ❌ Hazard NON spawnano nel mondo 3D
- ❌ Lag mostruoso durante il gioco
- ❌ Nessun elemento educativo visibile durante gameplay
- ❌ Gioco rimane "verme che mangia palline"

### Root Cause Analysis:
1. **Spawn logic troppo complessa** - timer, flag, condizioni multiple
2. **Fallback data sovrascritto da fetch async** - race condition
3. **Texture icone create runtime** (parzialmente fixato)
4. **Nessuna verifica che hazard siano in scena**
5. **Mancanza di test visivo prima di ogni deploy**

---

## FASE 1: Foundation - Riscrittura HazardManager (2h)

### Goal: Sistema di spawn semplice e affidabile

#### Task 1.1: Semplificazione Architettura
**File:** `js/hazards.js`

**Problema:** Il costruttore fa troppe cose:
- Inizializza geometrie
- Carica JSON async
- Precarica texture
- Setta timers

**Soluzione:** Separare inizializzazione da runtime
```javascript
constructor() {
  // Solo setup base, NO spawn
  this.hazards = [];
  this.hazardData = this.getFallbackData(); // Fallback IMMEDIATO
}

init() {
  // Chiamato quando gioco è pronto
  this.initGeometries();
  this.initMaterials();
  this.initIconTextures();
}
```

**Acceptance Criteria:**
- [ ] HazardManager inizializza senza errori
- [ ] Fallback data sempre disponibile (8 hazard)
- [ ] Nessun log di errore in console

#### Task 1.2: Spawn Semplificato - "One Shot"
**File:** `js/hazards.js`

**Problema:** Timer complicati con `initialSpawnDone`, `lastSpawn`, etc.

**Soluzione:** Spawn garantito ad intervalli fissi
```javascript
update(deltaTime) {
  // Spawn semplice: ogni 3 secondi se < maxHazards
  this.timeSinceLastSpawn += deltaTime;
  
  if (this.timeSinceLastSpawn > 3000 && this.hazards.length < this.maxHazards) {
    this.spawnOneHazard();
    this.timeSinceLastSpawn = 0;
  }
}
```

**Acceptance Criteria:**
- [ ] Primo hazard entro 3 secondi dall'avvio
- [ ] Hazard successivi ogni 3 secondi
- [ ] Max 3 hazard contemporanei
- [ ] Log chiaro: "[HazardManager] Spawned: {nome} (#{count})"

#### Task 1.3: Verifica Visiva Hazard
**File:** `js/hazards.js`, `js/game.js`

**Problema:** Non sappiamo se gli hazard sono nella scena

**Soluzione:** Aggiungere debug visivo opzionale
```javascript
// In spawnHazard()
console.log(`[HazardManager] ADDED to scene: ${hazardType.name} at ${position.x}, ${position.z}`);
console.log(`[HazardManager] Scene children: ${this.scene.children.length}`);

// Shortcut tasto 'H' per log stato hazard
if (key === 'h') {
  console.log(`Active hazards: ${this.hazards.length}`);
  this.hazards.forEach((h, i) => {
    console.log(`  ${i}: ${h.userData.hazardData.name} at ${h.position.x.toFixed(1)}, ${h.position.z.toFixed(1)}`);
  });
}
```

**Acceptance Criteria:**
- [ ] Log posizione esatta di ogni hazard spawnato
- [ ] Tasto 'H' mostra stato hazard
- [ ] Verifica che hazard siano in `scene.children`

---

## FASE 2: Performance - Elimination Lag (1h)

### Goal: 60fps stabili

#### Task 2.1: Profiling e Ottimizzazione
**File:** `js/hazards.js`, `js/game.js`

**Problemi noti:**
1. `checkProximityWarning()` chiamato ogni frame
2. Canvas texture create runtime (parzialmente fixato)
3. Log eccessivi
4. `updateHazards()` anche se vuoto

**Soluzioni:**
```javascript
// 1. Throttle warning check
this._warningCheckInterval = 0;
update() {
  this._warningCheckInterval += deltaTime;
  if (this._warningCheckInterval > 200) { // 5 volte al secondo
    this.checkProximityWarning();
    this._warningCheckInterval = 0;
  }
}

// 2. Skip update se nessun hazard
updateHazards() {
  if (this.hazards.length === 0) return;
  // ... resto codice
}

// 3. Rimuovi TUTTI i log di debug (solo errore critici)
```

**Acceptance Criteria:**
- [ ] 60fps costanti (verificare con F12 > Performance)
- [ ] Nessun lag spike ogni 3 secondi (spawn)
- [ ] Memoria stabile (no memory leak)

---

## FASE 3: Visual Feedback - Educational Elements (2h)

### Goal: Giocatore vede e impara durante il gameplay

#### Task 3.1: Icone 3D Fluttuanti (Ottimizzato)
**File:** `js/hazards.js`

**Stato attuale:** Texture precaricate ma forse non renderizzate

**Verifica e fix:**
```javascript
// Debug: verifica che sprite sia visibile
const sprite = new THREE.Sprite(material);
sprite.scale.set(2, 2, 1);
sprite.position.y = 3; // Più alto per visibilità

// Debug geometry: aggiungi wireframe se necessario
if (this.debugMode) {
  const box = new THREE.BoxHelper(mesh, 0xffff00);
  this.scene.add(box);
}
```

**Acceptance Criteria:**
- [ ] Icona visibile sopra ogni hazard
- [ ] Icona fluttua (animazione semplice)
- [ ] Colore icona contrasta con background

#### Task 3.2: Anelli di Pericolo al Suolo
**File:** `js/hazards.js`

**Soluzione semplice:**
```javascript
// Ring sotto ogni hazard
const ringGeo = new THREE.RingGeometry(1.5, 1.8, 16);
const ringMat = new THREE.MeshBasicMaterial({ 
  color: 0xff0000, 
  transparent: true, 
  opacity: 0.3,
  side: THREE.DoubleSide
});
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = -Math.PI / 2;
ring.position.copy(position);
this.scene.add(ring);
// Link per pulizia
hazard.userData.ring = ring;
```

**Acceptance Criteria:**
- [ ] Cerchio rosso visibile sotto ogni hazard
- [ ] Ring rimosso quando hazard rimosso

#### Task 3.3: Warning System Funzionante
**File:** `js/game.js`, `index.html`

**Problema:** Warning UI presente ma forse non aggiornata

**Verifica:**
```javascript
// Log quando warning cambia stato
updateProximityWarning(warning) {
  const isActive = warning && warning.distance < 4;
  
  if (isActive !== this._lastWarningState) {
    console.log(`[Game] Warning ${isActive ? 'ON' : 'OFF'}: ${warning?.hazard?.name}`);
    this._lastWarningState = isActive;
  }
  
  // UI update...
}
```

**Acceptance Criteria:**
- [ ] Warning appare quando < 4m da hazard
- [ ] Testo mostra nome hazard
- [ ] Overlay rosso lampeggiante
- [ ] Warning scompare quando > 4m

---

## FASE 4: Integration - Test End-to-End (1h)

### Goal: Tutto funziona insieme

#### Task 4.1: Test Scenario Completo
**Checklist manuale:**
1. [ ] Apri gioco, vedi tutorial
2. [ ] Premi "INIZIA", attendi 3 secondi
3. [ ] Verifica in console: "[HazardManager] Spawned: ..."
4. [ ] Guarda nel mondo 3D: vedi hazard? (icona + anello)
5. [ ] Muovi verme verso hazard
6. [ ] Vedi warning quando vicino?
7. [ ] Collisione triggera game over educativo?
8. [ ] Schermata mostra normativa e prevenzione?

#### Task 4.2: Fallback Testing
**Scenario:** JSON non carica (network error)
1. [ ] Blocca file JSON in DevTools
2. [ ] Ricarica gioco
3. [ ] Verifica che fallback data funzioni
4. [ ] Spawn hazard comunque?

---

## FASE 5: Deployment (30m)

### Task 5.1: Commit e Push
```bash
git add -A
git commit -m "feat: Safety Mode - hazard spawn, visual feedback, performance optimized"
git push origin main
```

### Task 5.2: Vercel Deploy
- Verifica build passi
- Test live su mars-swarm.marscompliance.com
- Test da mobile

---

## Testing Checklist Finale

| Test | Expected | Pass |
|------|----------|------|
| Primo hazard spawn | < 3s | ☐ |
| Icona visibile | Sì, fluttuante | ☐ |
| Anello rosso | Sì, sotto hazard | ☐ |
| Warning prossimità | Sì, quando < 4m | ☐ |
| Game over educativo | Sì, con normativa | ☐ |
| 60fps stabili | Sì | ☐ |
| No lag spike | Sì | ☐ |
| Tutorial leggibile | Sì | ☐ |
| Mobile funzionante | Sì | ☐ |

---

## Note per Developer

### Prima di ogni commit:
1. Testare in locale con `python -m http.server`
2. Verificare console: nessun errore rosso
3. Verificare performance: F12 > Performance > Record 10s
4. Controllare che hazard siano visibili nel mondo 3D

### Debug Keys:
- `H` = Log stato hazard
- `P` = Log performance (FPS, memoria)
- `D` = Toggle debug mode (wireframe, etc)

### Rollback:
Se qualcosa va storto, branch `main-backup` con ultima versione stabile.
