# Plan: Modalità POV + Sicurezza sul Lavoro per MARS-SWARM

**Generated**: 2026-04-02
**Estimated Complexity**: High
**Settore Target**: Industria/Manifattura

## Overview
Aggiungere una modalità POV (prima persona) e trasformare MARS-SWARM in uno strumento di formazione sulla sicurezza sul lavoro bilanciato (50% intrattenimento, 50% educazione). Il verme opera in un ambiente industriale tematico, deve evitare ostacoli che rappresentano pericoli reali (macchinari, cavi, sostanze chimiche). Ogni collisione genera un game over con spiegazione educativa sul pericolo e le norme di prevenzione.

## User Requirements Summary
- ✅ **Modalità POV**: Prima persona (vista dalla testa del verme)
- ✅ **Ostacoli tematici**: Pericoli reali dell'industria manifatturiera
- ✅ **Game Over educativo**: Spiegazione del pericolo e normativa
- ✅ **Bilanciamento**: 50% gioco, 50% formazione
- ✅ **Settore**: Industria/Manifattura

## Prerequisites
- Three.js r160+ (già presente)
- Modelli 3D low-poly per ostacoli industriali
- Database/JSON con contenuti formativi H&S
- Modalità gioco switchabile (classica vs POV-Safety)

---

## Sprint 1: Modalità POV - Core Implementation
**Goal**: Implementare la camera prima persona funzionante
**Demo/Validation**: 
- Camera segue la testa del verme
- Vista "dagli occhi" del verme
- Rotazione fluida con il movimento

### Task 1.1: Camera Controller POV
- **Location**: `js/pov-camera.js` (new file)
- **Description**: Creare classe PovCamera che:
  - Posiziona camera alla testa del verme
  - Ruota camera in base alla direzione del verme
  - Offset leggero per simulare altezza occhi
  - Smooth follow per evitare motion sickness
- **Dependencies**: None
- **Acceptance Criteria**:
  - Camera allineata con direzione movimento
  - Nessun clipping con il corpo del verme
  - Rotazione fluida (lerp)
- **Validation**: 
  - Test visivo: camera ruota quando il verme gira
  - Test: movimento in tutte le 4 direzioni

### Task 1.2: Modalità di Gioco Switch
- **Location**: `js/game.js`, `js/main.js`
- **Description**: 
  - Aggiungere `gameMode` ('classic' | 'pov')
  - Menu selezione modalità nel main menu
  - Toggle tra camera classica e POV
  - Persistenza preferenza in localStorage
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Menu mostra opzione "Classic Mode" e "POV Mode"
  - Switch immediato al cambio modalità
  - Preferenza salvata
- **Validation**:
  - Toggle tra modalità senza refresh
  - Verifica localStorage

### Task 1.3: Adapt Input per POV
- **Location**: `js/game.js` - input handling
- **Description**:
  - In POV mode, comandi relativi alla camera
  - Sinistra/Destra = ruota rispetto alla direzione vista
  - Su = avanti nella direzione della camera
- **Dependencies**: Task 1.2
- **Acceptance Criteria**:
  - Controlli intuitivi in POV
  - Coerenza tra direzione visiva e movimento
- **Validation**:
  - Test su desktop (frecce/WASD)
  - Test su mobile (swipe)

---

## Sprint 2: Ambiente Industriale 3D
**Goal**: Creare ambientazione tematica industria manifatturiera
**Demo/Validation**:
- Pavimento industriale (cemento/griglia)
- Pareti/limiti di sicurezza
- Illuminazione da capannone
- Atmosfera coerente

### Task 2.1: Texture & Materiali Industriali
- **Location**: `js/renderer.js`, `assets/textures/`
- **Description**:
  - Texture pavimento industriale (cemento, segni gialli)
  - Texture pareti capannone
  - Materiali metallici per ostacoli
  - Palette colori: giallo/nero segnaletica, grigio industriale
- **Dependencies**: None
- **Acceptance Criteria**:
  - Texture seamless, low-res per performance
  - Coerenza stilistica con tema MARS
  - Ottimizzazione mobile
- **Validation**:
  - Test caricamento texture
  - Verifica FPS su mobile

### Task 2.2: Environment Props Statici
- **Location**: `js/renderer.js` - background elements
- **Description**:
  - Colonne portanti industriali
  - Luci da soffitto (point lights)
  - Linee di sicurezza giallo/nero
  - Estintori decorativi (non interattivi)
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Props posizionati oltre i bordi giocabili
  - Non interferiscono con gameplay
  - Illuminazione adeguata
- **Validation**:
  - Screenshot per verifica atmosfera
  - Test bounding box

### Task 2.3: Floor Marking Safety
- **Location**: `js/renderer.js`
- **Description**:
  - Linee pedonali gialle sul pavimento
  - Zone demarcate (aree pericolo, passaggi obbligati)
  - Segnaletica a terra (frecce direzionali)
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Texture procedurali o decal
  - Visibili ma non invasive
  - Coerenti con normative H&S
- **Validation**:
  - Confronto con segnaletica reale

---

## Sprint 3: Sistema Ostacoli H&S
**Goal**: Implementare ostacoli che rappresentano pericoli industriali
**Demo/Validation**:
- Ostacoli spawnano nel campo
- Collisione rilevata correttamente
- Tipi diversi di pericoli

### Task 3.1: Hazard Assets 3D (GLTF/GLB)
- **Location**: `js/hazards.js` (new file), `assets/models/hazards/`
- **Description**: Importare modelli 3D dettagliati:
  - **Cavi elettrici** (trailing cables) - pericolo: inciampo/elettrocuzione
  - **Pozzanghere** (oil/chemical spills) - pericolo: scivolamento
  - **Macchinari in movimento** (robot arm, conveyor) - pericolo: urto
  - **Scatole/merci** (improper stacking) - pericolo: caduta
  - **Cavalletti/scale** (step ladders) - pericolo: accesso non autorizzato
- **Dependencies**: None
- **Acceptance Criteria**:
  - Modelli GLTF/GLB < 2MB ciascuno
  - Bounding box preciso per collisioni
  - Materiali PBR (metallic/roughness)
  - Fallback procedurali se modello non caricato
- **Validation**:
  - Test rendering performance
  - Verifica bounding box
  - Test fallback

### Task 3.2: Hazard Spawning System
- **Location**: `js/hazards.js`
- **Description**:
  - Spawn hazard in posizioni random (non sul verme)
  - Difficoltà progressiva (più hazard col tempo)
  - Tipi hazard pesati (più comuni i più "banali")
  - Clear hazard quando mangiato/colpito
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - Spawn fuori dal corpo del verme
  - Nessun overlap tra hazard
  - Difficoltà bilanciata
- **Validation**:
  - Playtest: spawn rate
  - Verifica posizioni valide

### Task 3.3: Collision Detection Hazard
- **Location**: `js/game.js`, `js/worm.js`
- **Description**:
  - Rileva collisione testa del verme con hazard
  - Trigger game over speciale (non classico)
  - Effetti particellari (scintille per cavi, schizzi per pozzanghere)
- **Dependencies**: Task 3.2
- **Acceptance Criteria**:
  - Collisione precisa
  - Feedback immediato visivo/audio
  - Nessun false positive
- **Validation**:
  - Test collisione ogni tipo hazard
  - Test edge cases

---

## Sprint 4: Game Over Educativo
**Goal**: Sostituire game over classico con schermata formativa
**Demo/Validation**:
- Schermata explicative al game over
- Contenuto rilevante al tipo di pericolo
- Link/CTA per approfondimenti

### Task 4.1: Hazard Content Database
- **Location**: `js/hazard-content.js` (new file)
- **Description**: Database contenuti H&S:
  ```javascript
  {
    id: 'trailing-cables',
    title: 'Cavi Elettrici Trailing',
    danger: 'Rischio di inciampo e folgorazione',
    normative: 'D.Lgs. 81/08 - Titolo XI',
    prevention: 'Utilizzare canaline protettive o passacavi',
    image: 'assets/hazards/cables-info.jpg',
    quiz: 'Dove dovrebbero transitare i cavi?'
  }
  ```
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - 5-10 tipi hazard documentati
  - Contenuto accurato normativamente
  - Formato estendibile
- **Validation**:
  - Review contenuto da esperto H&S
  - Test caricamento dati

### Task 4.2: Game Over Safety Screen
- **Location**: `index.html`, `style.css`, `js/game.js`
- **Description**: Nuova UI game over:
  - Banner rosso "INCIDENTE!"
  - Titolo tipo di pericolo
  - Icona/immagine hazard
  - Spiegazione pericolo (2-3 righe)
  - Riferimento normativo
  - Azioni preventive
  - Pulsanti: "Riprova", "Approfondisci" (link esterno)
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - Layout pulito e leggibile
  - Responsive mobile/desktop
  - Contenuto dinamico in base all'hazard
- **Validation**:
  - Test su schermi piccoli
  - Verifica tutti i tipi hazard

### Task 4.3: Safety Score System
- **Location**: `js/game.js`
- **Description**:
  - Score rinominato in "Safety Points"
  - Bonus per tempo sopravvissuto senza incidenti
  - Streak "Incident-free days"
  - Badge obiettivi (sopravvivere X secondi, mangiare Y frutti)
- **Dependencies**: Task 4.2
- **Acceptance Criteria**:
  - Score system coerente
  - Badge sbloccabili
  - Persistenza progressi
- **Validation**:
  - Test calcolo punteggi
  - Verifica storage

---

## Sprint 5: Mobile POV Optimization
**Goal**: Adattare POV mode per mobile con controlli ottimizzati
**Demo/Validation**:
- Controlli touch funzionanti in POV
- Performance fluida
- No motion sickness

### Task 5.1: Touch Controls for POV
- **Location**: `js/game.js` - swipe handling
- **Description**:
  - In POV mode: swipe sinistra/destra = ruota 90°
  - Swipe su = avanti nella direzione attuale
  - Tap = pausa (come ora)
  - Indicatore visivo direzione attuale
- **Dependencies**: Sprint 1
- **Acceptance Criteria**:
  - Controlli intuitivi
  - Nessun conflitto con swipe sistema
  - Feedback visivo direzione
- **Validation**:
  - Playtest su dispositivo mobile
  - Misura tempi di reazione

### Task 5.2: Performance Optimization
- **Location**: `js/renderer.js`, `js/pov-camera.js`
- **Description**:
  - LOD per ostacoli lontani
  - Culling oggetti fuori campo visivo
  - Shadow quality ridotta su mobile
  - Frame rate target 60fps
- **Dependencies**: Sprint 2, 3
- **Acceptance Criteria**:
  - 60fps costanti su mid-range mobile
  - Nessun drop significativo
- **Validation**:
  - Profiling FPS
  - Test su iPhone/Android

### Task 5.3: Comfort Settings
- **Location**: `js/settings.js` (new file), `index.html`
- **Description**:
  - Toggle motion blur
  - Velocità rotazione camera regolabile
  - Opzione "vista dall'alto" se POV causa nausea
  - Sensibilità swipe
- **Dependencies**: Task 5.1
- **Acceptance Criteria**:
  - Settings persistiti
  - Cambio immediato
  - Default conservativi
- **Validation**:
  - Test utenti diversi
  - Verifica persistenza

---

## Agent: Safety Content Creator (Prerequisito Sprint 4)

Prima di implementare Task 4.1, invocare un agente specializzato per creare i contenuti H&S.

### Prompt per l'agente:
```
Crea contenuti formativi sulla sicurezza sul lavoro per il settore industria/manifattura.

Temi da coprire (5-10 pericoli):
1. Cavi elettrici trailing - rischio inciampo/elettrocuzione
2. Pozzanghere oli/sostanze - rischio scivolamento
3. Macchinari in movimento - rischio urto/tranciamento
4. Merci in stoccaggio improprio - rischio caduta
5. Scale/cavalletti - rischio caduta dall'alto
...

Per ogni pericolo fornisci:
- Titolo (max 30 caratteri)
- Descrizione pericolo (2-3 righe)
- Riferimento normativo D.Lgs. 81/08 (articolo specifico)
- Azioni preventive (bullet points)
- Livello di rischio: low/medium/high/critical

Output in formato JSON valido.
```

**File output atteso**: `assets/content/hazard-database.json`

---

## Sprint 6: Admin & Reporting (Optional)
**Goal**: Dashboard per formatori HR
**Demo/Validation**:
- Statistiche giocate
- Incidenti più comuni
- Progressi dipendenti

### Task 6.1: Session Tracking (Locale)
- **Location**: `js/analytics.js` (new file)
- **Description**:
  - Tracciamento partite in localStorage (anonimizzato)
  - Tipo incidente più frequente
  - Tempo medio sopravvivenza
  - Export dati JSON per report HR
  - Nessun backend richiesto
- **Dependencies**: Sprint 4
- **Acceptance Criteria**:
  - Privacy compliant (GDPR) - solo locale
  - Dati aggregati per sessione
  - Export JSON scaricabile
  - Pulizia dati manuale
- **Validation**:
  - Test export JSON
  - Verifica localStorage
  - Test su incognito mode

### Task 6.2: Leaderboard Safety
- **Location**: `js/leaderboard.js`
- **Description**:
  - Classifica "Safety Champions"
  - Categorie: più longevo, più frutti raccolti, meno incidenti
  - Condivisione risultati
- **Dependencies**: Task 6.1
- **Acceptance Criteria**:
  - Storage locale
  - UI classifica
  - Anti-cheat basico
- **Validation**:
  - Test inserimento punteggi
  - Verifica ordinamento

---

## Testing Strategy

### Unit Tests
- Device detection (mobile/desktop)
- Camera rotation calculations
- Hazard spawn logic
- Collision detection

### Integration Tests
- Full gameplay loop POV mode
- Switch modalità senza crash
- Performance FPS

### User Testing
- 5-10 utenti target (operaio/formazione)
- Feedback controlli intuitività
- Verifica comprensione contenuti H&S
- Motion sickness check

### Acceptance Criteria Finali
- [ ] Modalità POV funzionante su PC e mobile
- [ ] Ostacoli industriali riconoscibili
- [ ] Game over educativo con contenuto normativo
- [ ] Performance 60fps su dispositivi mid-range
- [ ] Controlli swipe intuitivi in POV
- [ ] Contenuto H&S accurato (validato esperto)

---

## Potential Risks & Gotchas

1. **Motion Sickness POV**
   - Mitigation: comfort settings, FOV regolabile, opzione vista classica

2. **Performance 3D su mobile**
   - Mitigation: LOD, culling, texture ottimizzate

3. **Contenuto H&S non accurato**
   - Mitigation: review da consulente sicurezza, fonti normative ufficiali

4. **Ostacoli troppo difficili da vedere in POV**
   - Mitigation: highlight shader, indicatori periferici, suoni posizionali

5. **Bilanciamento gioco/formazione**
   - Mitigation: A/B testing, feedback utenti, iterazioni

6. **Accessibilità**
   - Mitigation: opzioni colore per daltonici, testi grandi, contrasto alto

---

## Rollback Plan
- Feature flag `enablePovMode` (default false)
- Branch separato per sviluppo
- Versione classica sempre disponibile come fallback
- Backup assets originali

---

## Implementation Notes

### Camera POV Pattern
```javascript
// Pseudocodice camera POV
updatePovCamera() {
  const headPos = worm.getHeadPosition();
  const direction = worm.getDirection();
  
  // Posizione: testa del verme
  camera.position.copy(headPos);
  camera.position.y += eyeHeight; // Leggermente sopra
  
  // Rotazione: direzione del verme
  const targetRot = Math.atan2(direction.x, direction.z);
  camera.rotation.y = lerp(camera.rotation.y, targetRot, 0.1);
}
```

### Hazard Spawn Safe Zone
```javascript
// Evita spawn su corpo verme
isValidSpawn(position) {
  for (segment of worm.segments) {
    if (distance(position, segment) < minDistance) return false;
  }
  return true;
}
```

### Content Format
```json
{
  "hazards": [
    {
      "id": "trailing-cables",
      "model": "cables.gltf",
      "name": "Cavi Trailing",
      "danger": "Inciampo / Elettrocuzione",
      "normative": "D.Lgs. 81/08 Art. 71",
      "prevention": "Canaline o passacavi obbligatori",
      "severity": "high"
    }
  ]
}
```
