# Plan: Responsive Mobile Adaptation for MARS-SWARM

**Generated**: 2026-04-02
**Estimated Complexity**: Medium

## Overview
Implement device detection (mobile vs desktop) and responsive adaptation of the game area. On desktop, keep current behavior. On mobile, adjust camera FOV, zoom level, and boundaries visibility to ensure the entire game area is always visible, preventing unseen obstacles/fruit.

## Prerequisites
- Three.js r160+ (already installed)
- CSS media queries for UI scaling
- User-Agent detection or feature detection for device type

## Sprint 1: Device Detection Infrastructure
**Goal**: Create reliable mobile/desktop detection system
**Demo/Validation**: 
- Console logs show correct device type on load
- CSS classes applied correctly to body element

### Task 1.1: Create Device Detector Utility
- **Location**: `js/device-detector.js` (new file)
- **Description**: Create utility class that detects device type using:
  - `navigator.userAgent` analysis
  - Feature detection (`window.matchMedia('(pointer: coarse)')`)
  - Screen size heuristic (width < 768px)
- **Dependencies**: None
- **Acceptance Criteria**:
  - Correctly identifies iOS/Android as mobile
  - Correctly identifies desktop browsers
  - Exports `isMobile()` function
  - Provides `isTouchDevice()` helper
- **Validation**:
  - Test on actual mobile device
  - Test on desktop browser
  - Test on desktop with mobile emulation

### Task 1.2: Add Device CSS Classes
- **Location**: `js/main.js`
- **Description**: On app startup, detect device and add CSS class to body
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Body has `device-mobile` or `device-desktop` class
  - Class updates on resize (orientation change)
- **Validation**:
  - Inspect element shows correct class
  - Resize browser window updates class

## Sprint 2: Camera & Viewport Adaptation
**Goal**: Adjust camera FOV and position for mobile to show entire game area
**Demo/Validation**:
- On mobile, entire boundary/walls are visible
- Worm and fruit never go off-screen
- Camera follows worm smoothly without losing boundaries

### Task 2.1: Calculate Optimal Mobile Camera Settings
- **Location**: `js/renderer.js`
- **Description**: 
  - Add method `calculateOptimalCameraDistance()`
  - For mobile: calculate FOV/distance to fit `boundarySize * 1.2` in view
  - For desktop: keep current settings
  - Store `isMobile` flag in renderer
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Mobile camera shows 20% extra space around boundaries
  - Aspect ratio handled correctly (portrait/landscape)
  - No stretching or distortion
- **Validation**:
  - Visual check: boundaries fully visible
  - Console log: mobile camera position logged

### Task 2.2: Implement Dynamic Camera FOV
- **Location**: `js/renderer.js` - `initCamera()` and `onResize()`
- **Description**:
  - If mobile, use wider FOV (e.g., 75° instead of 60°)
  - Position camera higher/closer to show more area
  - Adjust based on aspect ratio (portrait needs more height)
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Portrait mobile: FOV 75°, camera Y=35, Z=20
  - Landscape mobile: FOV 70°, camera Y=30, Z=25
  - Desktop: FOV 60°, camera Y=25, Z=25 (current)
- **Validation**:
  - Test on phone in portrait
  - Test on phone in landscape
  - Verify no clipping of boundaries

### Task 2.3: Add Camera Bounds Constraint
- **Location**: `js/game.js` - camera follow logic in `update()`
- **Description**:
  - Calculate max camera offset based on boundary size
  - Clamp camera position so boundaries always visible
  - Smooth interpolation to boundaries when worm approaches edge
- **Dependencies**: Task 2.2
- **Acceptance Criteria**:
  - Camera never moves beyond boundary visibility
  - Smooth transition when worm moves to edges
  - Fruit always visible when spawned
- **Validation**:
  - Move worm to all 4 corners
  - Verify fruit visibility at boundaries

## Sprint 3: Game Area Boundary Adjustments
**Goal**: Optionally reduce game area on mobile for better visibility
**Demo/Validation**:
- Mobile has slightly smaller boundary size
- Gameplay feels balanced (not too cramped)

### Task 3.1: Mobile Boundary Size
- **Location**: `js/renderer.js` - `boundarySize` property
- **Description**:
  - Desktop: keep current boundarySize (e.g., 30)
  - Mobile: reduce to 24 (20% smaller)
  - Update environment/plane to match
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Mobile boundary visually proportional to screen
  - Worm can still navigate comfortably
  - Fruit spawns correctly within bounds
- **Validation**:
  - Check boundary wall positions
  - Verify fruit spawn logic

## Sprint 4: UI Scaling & Positioning
**Goal**: Scale and reposition UI elements for mobile screens
**Demo/Validation**:
- All UI elements readable on mobile
- Touch targets large enough (44px min)
- No overlapping elements

### Task 4.1: Mobile CSS Media Queries
- **Location**: `style.css`
- **Description**:
  - Add `.device-mobile` scoped styles
  - Larger pause button (70px → 90px)
  - Larger score text
  - Adjusted HUD padding for safe areas
- **Dependencies**: Task 1.2
- **Acceptance Criteria**:
  - Pause button min 90px on mobile
  - Score text 20% larger
  - Padding accounts for notches/safe areas
- **Validation**:
  - Chrome DevTools mobile emulation
  - Actual device testing

### Task 4.2: Safe Area Support
- **Location**: `style.css` - `env(safe-area-inset-*)`
- **Description**:
  - Add CSS for iPhone notch/dynamic island
  - Ensure HUD not obscured by system UI
  - Use `env(safe-area-inset-top)` etc.
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - UI respects notch on iPhone
  - No content under system bars
- **Validation**:
  - iOS Simulator or actual iPhone

## Sprint 5: Testing & Polish
**Goal**: Ensure smooth experience across all devices
**Demo/Validation**:
- Playable on iOS Safari
- Playable on Android Chrome
- Playable on desktop

### Task 5.1: Cross-Device Testing
- **Location**: All files
- **Description**:
  - Test on iPhone (Safari, Chrome)
  - Test on Android (Chrome)
  - Test on iPad (tablet mode)
  - Test on desktop (Chrome, Firefox, Safari)
- **Acceptance Criteria**:
  - All boundaries visible on all mobile devices
  - No UI overflow or clipping
  - Touch/swipe controls work
  - Performance 60fps
- **Validation**:
  - Device lab testing
  - BrowserStack if available

### Task 5.2: Orientation Change Handling
- **Location**: `js/renderer.js` - `onResize()`
- **Description**:
  - Ensure smooth transition portrait ↔ landscape
  - Recalculate camera on orientation change
  - Debounce resize events
- **Dependencies**: Task 2.2
- **Acceptance Criteria**:
  - Game continues after rotation
  - Camera adjusts within 500ms
  - No stretched/distorted rendering
- **Validation**:
  - Rotate device during gameplay
  - Verify smooth transition

## Testing Strategy
- **Unit**: Device detection returns correct type
- **Visual**: Screenshot comparison mobile vs desktop
- **Functional**: Fruit always visible when spawned at edges
- **Performance**: 60fps maintained on mid-range mobile

## User Requirements Clarified

1. **Adattamento automatico**: Il sistema sceglie le impostazioni ottimali
2. **Bordi sempre visibili**: L'intero campo di gioco deve essere sempre visibile
3. **UI proporzionata**: Scala tutta l'interfaccia mantenendo le proporzioni
4. **Camera fissa**: Mostra sempre tutto il campo, anche quando il verme cresce (il verme diventerà più piccolo visivamente ma i bordi sono sempre visibili)

## Potential Risks & Gotchas

1. **Camera too far on mobile**: May make worm/fruit too small to see
   - Mitigation: Don't zoom out too much, use minimum scale
   - **User preference**: Acceptable - bordi sempre visibili è prioritario

2. **Different aspect ratios**: Tablets vs phones vs foldables
   - Mitigation: Use aspect-ratio-based calculations, not just width

3. **Performance impact**: Larger FOV renders more objects
   - Mitigation: Consider reducing particle count on mobile

4. **iOS Safari quirks**: WebGL context loss on resize
   - Mitigation: Save game state before orientation change

5. **Touch target overlap**: Larger buttons may overlap game area
   - Mitigation: Position pause button in corner, use transparency

## Rollback Plan
- Keep original camera settings as defaults
- Feature flag mobile adaptation (can disable via CSS class)
- Version control: tag before merge for easy revert

## Implementation Notes

### Device Detection Code Pattern
```javascript
// device-detector.js
export function isMobile() {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const isSmallScreen = window.innerWidth < 768;
  
  return isMobileUA || (isTouch && isSmallScreen);
}
```

### Camera Calculation Pattern
```javascript
// renderer.js
getCameraSettings() {
  const aspect = this.width / this.height;
  const isMobile = detectMobile();
  
  if (isMobile) {
    return {
      fov: aspect < 1 ? 75 : 70,  // Portrait vs landscape
      y: aspect < 1 ? 35 : 30,
      z: aspect < 1 ? 20 : 25
    };
  }
  
  return { fov: 60, y: 25, z: 25 };  // Desktop
}
```
