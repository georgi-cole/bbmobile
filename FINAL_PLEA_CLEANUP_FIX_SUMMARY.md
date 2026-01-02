# Final Plea Modal Cleanup Fix - Summary

## Problem Statement

During Final 3 flow with optimized pacing enabled, the Final Plea modal was sticking on screen and blocking the UI. This occurred because:

1. **Modal only cleaned up on explicit user action**: The FinalPlea modal was designed to clean up only when users clicked "Submit" or "Skip" buttons
2. **Fast auto-advance didn't guarantee cleanup**: Optimized F3 pacing transitions quickly from `final3_plea` → `final3_decision` without waiting for user interaction
3. **No phase-change listener**: The FinalPlea module didn't subscribe to phase-change events to auto-dismiss when the game moved to a different phase

## Root Cause Analysis

The issue manifested in three scenarios:
- **Human nominee scenario**: After plea submission, the modal remained visible during the 1.5s delay before advancing to decision phase
- **Human HOH scenario**: Modal stuck during the 2s auto-advance delay
- **AI-only scenario**: Modal stuck during the 3s auto-advance delay for AI players

In all cases, the phase change from `final3_plea` to `final3_decision` happened programmatically without calling `FinalPlea.cleanup()`.

## Solution

Implemented a **defense-in-depth** approach with cleanup at multiple layers:

### Layer 1: Phase-Change Event Listener (Primary Fix)

Added an IIFE in `js/final-plea.js` that attaches phase-change event listeners when the module loads:

```javascript
// Auto-cleanup on phase change to prevent modal sticking during fast transitions
(function attachPhaseCleanup() {
  let isCleaningUp = false; // Guard against simultaneous cleanup calls
  
  function safeCleanup() {
    if (isCleaningUp) return; // Already cleaning up
    if (!currentModal) return; // Nothing to clean
    
    isCleaningUp = true;
    console.info('[FinalPlea] Phase changed, auto-cleaning up modal');
    try {
      cleanup();
    } catch (e) {
      console.warn('[FinalPlea] cleanup on phase change failed', e);
    } finally {
      isCleaningUp = false;
    }
  }
  
  try {
    // Listen to window CustomEvent (dispatched by setPhase in ui.hud-and-router.js)
    global.addEventListener('bb:phase:changed', safeCleanup);
    
    // Also listen to game.bus if available (defensive dual-binding)
    if (global.game?.bus?.on) {
      global.game.bus.on('bb:phase:changed', safeCleanup);
    }
  } catch (e) {
    console.warn('[FinalPlea] phase-change listener attach failed', e);
  }
})();
```

**Key features:**
- **Dual event binding**: Listens to both `window` CustomEvent and `game.bus` for maximum reliability
- **Race condition guard**: `isCleaningUp` flag prevents multiple simultaneous cleanup calls
- **Defensive checks**: Verifies modal exists before attempting cleanup
- **Error handling**: Try-catch with finally block ensures the guard flag is always reset

### Layer 2: Explicit Cleanup Calls (Defensive Redundancy)

Added explicit `FinalPlea.cleanup()` calls before all phase transitions from `final3_plea` to `final3_decision` in `js/competitions.js`:

#### Location 1: finishF3P3() - Legacy Path
```javascript
global.tv.say('Final 3 Eviction Ceremony');
// Cleanup FinalPlea modal before advancing (defensive, in case it was shown)
try { global.FinalPlea?.cleanup?.(); } catch (e) { /* non-critical cleanup error */ }
global.setPhase('final3_decision', Math.max(16, Math.floor(g.cfg.tVote * 0.8)), () => global.finalizeFinal3Decision?.());
```

#### Location 2: renderFinal3PleaPanel() - Human Nominee Path
```javascript
setTimeout(() => {
  if (g.phase === 'final3_plea') {
    console.info('[F3Plea] Human nominee plea submitted, proceeding to decision');
    // Cleanup FinalPlea modal before advancing
    try { global.FinalPlea?.cleanup?.(); } catch (e) { /* non-critical cleanup error */ }
    global.setPhase('final3_decision', Math.max(16, Math.floor(g.cfg.tVote * 0.8)), () => global.finalizeFinal3Decision?.());
    global.renderFinal3DecisionPanel?.();
  }
}, 1500);
```

#### Location 3: renderFinal3PleaPanel() - Human HOH Path
```javascript
setTimeout(() => {
  if (g.phase === 'final3_plea') {
    // Cleanup FinalPlea modal before advancing
    try { global.FinalPlea?.cleanup?.(); } catch (e) { /* non-critical cleanup error */ }
    global.setPhase('final3_decision', Math.max(16, Math.floor(g.cfg.tVote * 0.8)), () => global.finalizeFinal3Decision?.());
    global.renderFinal3DecisionPanel?.();
  }
}, 2000);
```

#### Location 4: renderFinal3PleaPanel() - AI-Only Scenario
```javascript
setTimeout(() => {
  if (g.phase === 'final3_plea') {
    // Cleanup FinalPlea modal before advancing
    try { global.FinalPlea?.cleanup?.(); } catch (e) { /* non-critical cleanup error */ }
    global.setPhase('final3_decision', Math.max(16, Math.floor(g.cfg.tVote * 0.8)), () => global.finalizeFinal3Decision?.());
    global.renderFinal3DecisionPanel?.();
  }
}, 3000);
```

**Key features:**
- **Optional chaining**: Uses `?.` to safely call cleanup even if module not loaded
- **Try-catch**: Prevents cleanup errors from blocking phase transitions
- **Empty catch with comment**: Satisfies ESLint no-empty-block rule

## Testing Strategy

### Automated Validation
- ✅ **ESLint**: 0 errors, only pre-existing warnings
- ✅ **CodeQL**: 0 security vulnerabilities
- ✅ **npm run test:all**: All existing tests pass

### Manual Testing
Created `test_final_plea_cleanup.html` for comprehensive manual verification:

1. **Modal Display Test**: Verify modal can be shown
2. **Manual Cleanup Test**: Verify cleanup() function works
3. **Phase Change Auto-Cleanup Test**: Verify modal auto-dismisses on phase change
4. **Race Condition Test**: Verify rapid phase changes don't cause errors

### Integration Testing Checklist
- [ ] Reproduce Final 3 flow with optimized pacing (`skipIdleTimersF3 = true`)
- [ ] As nominee, wait for auto-advance without submitting plea
- [ ] Verify modal is removed when phase changes to `final3_decision`
- [ ] As human HOH during plea, verify modal removal after 2s
- [ ] In AI-only scenario, verify modal removal after 3s
- [ ] Verify Submit and Skip buttons still work correctly
- [ ] Check other overlays (results modals, spectator views) still clean correctly

## Files Changed

### js/final-plea.js
- Added IIFE for phase-change event listener setup
- Implemented race condition guard
- Dual-binding to window CustomEvent and game.bus

### js/competitions.js
- Added cleanup call in `finishF3P3()` legacy path (line ~2777)
- Added cleanup call in human nominee path (line ~2908)
- Added cleanup call in human HOH path (line ~2926)
- Added cleanup call in AI-only path (line ~2947)

### test_final_plea_cleanup.html (new file)
- Interactive test page for validation
- Tests modal display, cleanup, and phase change behavior

## Benefits

1. **Prevents UI blocking**: Modal no longer sticks during fast phase transitions
2. **Defensive architecture**: Multiple layers of cleanup ensure reliability
3. **Race condition safe**: Guard flag prevents simultaneous cleanup calls
4. **Backwards compatible**: Existing Submit/Skip behavior unchanged
5. **No breaking changes**: Graceful degradation if modules not loaded

## Technical Notes

### Event System Architecture
The codebase uses two parallel event systems:
- **window CustomEvent**: Dispatched by `setPhase()` in `ui.hud-and-router.js`
- **game.bus**: Simple event emitter created in `index.html`

The fix listens to both to ensure maximum reliability across different code paths.

### Cleanup Function Idempotency
The `cleanup()` function is idempotent:
```javascript
function cleanup() {
  if (currentModal) {
    currentModal.remove();
    currentModal = null;
  }
}
```
Multiple calls are safe, but the race guard prevents unnecessary checks.

## Future Considerations

1. **Event listener cleanup**: Consider providing a mechanism to remove event listeners in long-running applications (noted in code review but not critical for this use case)
2. **Unified event system**: Consider consolidating the dual event system into a single approach
3. **Phase transition framework**: Consider a more general phase-aware cleanup framework for other modals

## References

- Issue: Final Plea modal sticks during Final 3 flow
- Related files: `js/final-plea.js`, `js/competitions.js`, `js/ui.hud-and-router.js`
- Similar patterns: `js/spectator-view.js`, `js/spectator-view-part3.js` (also use phase-change cleanup)
