# Fast-Forward (FFWD) Functional Wiring Implementation

## Overview
This implementation fixes the FFWD button to actually accelerate gameplay instead of just draining and canceling cards. The FFWD feature now properly compresses time while preserving all ceremony steps and callbacks.

## Problem Statement
Previously, the FFWD button had the label and infrastructure in place, but:
- ❌ Still ran the legacy drain loop which canceled cards
- ❌ Toggled FFWD off immediately after activation
- ❌ Logged incorrect phase values (hardcoded 'lobby')
- ❌ Cleared cards instead of compressing their durations

## Solution
The implementation adds a proper "acceleration path" that:
- ✅ Replays all pending timeouts with compressed durations
- ✅ Keeps FFWD active for the entire phase (auto-resets on phase change)
- ✅ Accurately reports the active phase in logs
- ✅ Preserves all queued operations, just executes them faster

## Key Changes

### 1. SkipController (js/runtime/skip-controller.js)
**Before:**
```javascript
async function drainLoop() {
  // Always ran drain loop which canceled everything
  draining = true;
  console.info('[SkipController] Starting drain loop');
  // ... cancel all timeouts and cards
}
```

**After:**
```javascript
async function drainLoop() {
  const isFastForward = game.__ffActive === true;
  
  if (isFastForward) {
    // Acceleration path: compress timeouts instead of canceling
    await CardManager.acceleratePendingTimeouts();
    fastForwardGsapTimelines();
    return; // Skip the legacy drain loop entirely
  }
  
  // Legacy drain mode for backward compatibility
  draining = true;
  console.info('[SkipController] Starting drain loop (legacy mode)');
  // ... run normal drain
}
```

### 2. State Management (js/tv-skip.js)
**Before:**
```javascript
const originalSetPhase = g.setPhase;
g.setPhase = function(...args){
  const result = originalSetPhase.apply(this, args);
  setTimeout(() => updateState(), 0);
  return result;
};
```

**After:**
```javascript
const originalSetPhase = g.setPhase;
g.setPhase = function(...args){
  const result = originalSetPhase.apply(this, args);
  
  // Deactivate fast-forward on phase change (auto-reset)
  if(g.game && g.game.__ffActive){
    g.deactivateFastForward();
  }
  
  setTimeout(() => updateState(), 0);
  return result;
};
```

### 3. Fast-Forward Entry Point (js/ui.hud-and-router.js)
**Before:**
```javascript
async function fastForwardPhase(){
  g.activateFastForward({ multiplier: 0.1, reason: 'user' });
  g.SkipController.enable();
  
  // These killed the point of acceleration:
  flushPhaseCards();  // ❌ Cleared all cards
  
  // For social:
  g.SocialManeuvers.endSocialPhaseNow('skip');  // ❌ Immediate end
  
  await g.SkipController.drainLoop();
  
  // These prevented FFWD from persisting:
  g.deactivateFastForward();  // ❌ Immediate deactivation
  g.SkipController.complete(); // ❌ Immediate completion
}
```

**After:**
```javascript
async function fastForwardPhase(){
  g.activateFastForward({ multiplier: 0.1, reason: 'user' });
  g.SkipController.enable();
  
  // Stop audio only (preserve cards)
  cancelAllPhaseAudio();
  
  // For social: Let it run accelerated (don't end immediately)
  if(game.phase === 'social' || game.phase === 'social_intermission'){
    console.info('[ff] Social phase detected - allowing accelerated execution');
    return;
  }
  
  // Execute acceleration/drain loop
  await g.SkipController.drainLoop();
  
  // Don't deactivate or complete - let FFWD persist until phase change
  // The setPhase wrapper will deactivate on phase boundary
}
```

### 4. Social AI Scheduler (js/social-ai-scheduler.js)
**Before:**
```javascript
function scheduleNextTick() {
  // Always used normal random interval
  const delay = config.tickIntervalMin + 
                Math.random() * (config.tickIntervalMax - config.tickIntervalMin);
  schedulerTimer = setTimeout(() => {
    performTick();
    scheduleNextTick();
  }, delay);
}
```

**After:**
```javascript
function scheduleNextTick() {
  const isFastForward = game.__ffActive === true;
  let delay;
  
  if (isFastForward) {
    // Use compressed interval (200ms default)
    delay = game.cfg?.fastForwardSocialActionInterval || 200;
    console.debug(`[ai-scheduler] Fast-forward active - using compressed interval: ${delay}ms`);
  } else {
    // Normal random interval (1200-1800ms)
    delay = config.tickIntervalMin + 
            Math.random() * (config.tickIntervalMax - config.tickIntervalMin);
  }
  
  schedulerTimer = setTimeout(() => {
    performTick();
    scheduleNextTick();
  }, delay);
}
```

## Flow Diagram

### Before (Drain Mode)
```
User clicks FFWD
  ↓
activateFastForward() called
  ↓
SkipController.enable()
  ↓
flushPhaseCards() ❌ (clears all cards)
  ↓
drainLoop() runs
  ↓
  → Cancels all timeouts ❌
  → Clears all cards ❌
  → Fast-forwards GSAP
  ↓
deactivateFastForward() ❌ (immediate)
  ↓
SkipController.complete() ❌ (immediate)
  ↓
Phase continues normally
```

### After (Acceleration Mode)
```
User clicks FFWD
  ↓
activateFastForward() called
  ↓
SkipController.enable()
  ↓
cancelAllPhaseAudio() (audio only)
  ↓
drainLoop() checks for FFWD
  ↓
  → CardManager.acceleratePendingTimeouts() ✅
  →   → Replays all callbacks with compressed durations
  →   → Preserves all cards and operations
  → Fast-forwards GSAP
  ↓
FFWD persists for entire phase ✅
  ↓
Social AI uses compressed intervals ✅
  ↓
Cards display with compressed durations ✅
  ↓
Phase naturally completes
  ↓
setPhase() wrapper detects phase change
  ↓
deactivateFastForward() called ✅ (at boundary)
```

## Configuration

All fast-forward behavior is configurable via `game.cfg`:

```javascript
{
  fastForwardEnabled: true,           // Master toggle
  fastForwardMultiplier: 0.1,         // Speed multiplier (0.1 = 10x speed)
  fastForwardMinDuration: 40,         // Min compressed duration (ms)
  fastForwardMaxDuration: 300,        // Max compressed duration (ms)
  fastForwardSocialActionInterval: 200 // AI tick interval during social FFWD (ms)
}
```

## Testing

### Automated Tests
```bash
# Verify fast-forward implementation
node scripts/verify-fast-forward.mjs
# Result: ✅ 20/20 checks pass

# Run full test suite
npm run test:all
# Result: ✅ All tests pass

# Security scan
# Result: ✅ 0 alerts
```

### Manual Testing
Open `test_fast_forward_sequences.html` in a browser to:
- Test card sequence preservation during FFWD
- Test normalizeDuration() function
- Test activateFastForward() behavior
- Verify phase persistence

### Expected Behavior

#### Nominations Phase
1. User clicks FFWD during nomination ceremony
2. HOH's speech card appears briefly (compressed duration)
3. First nominee reveal card appears briefly
4. Second nominee reveal card appears briefly
5. Ceremony concludes card appears briefly
6. Phase advances to next phase
7. FFWD auto-resets

**Logs should show:**
```
[fast-forward] activated (mult=0.1, phase=nominations, reason=user)
[SkipController] Fast-forward active - using acceleration path
[CardManager] Accelerating 4 pending timeout(s)
[fast-forward] duration 2400ms -> 240ms
[fast-forward] duration 2400ms -> 240ms
[fast-forward] duration 2400ms -> 240ms
[fast-forward] duration 2000ms -> 200ms
[CardManager] ✓ All timeouts accelerated
[fast-forward] deactivated (normal speed restored)
```

#### Social Phase
1. User clicks FFWD during social phase
2. AI interactions occur at compressed intervals (200ms instead of 1200-1800ms)
3. Summary card appears after compressed duration
4. Phase advances to nominations
5. FFWD auto-resets

**Logs should show:**
```
[fast-forward] activated (mult=0.1, phase=social, reason=user)
[ff] Social phase detected - allowing accelerated execution
[ai-scheduler] Fast-forward active - using compressed interval: 200ms
[ai-scheduler] Fast-forward active - using compressed interval: 200ms
[ai-scheduler] Fast-forward active - using compressed interval: 200ms
[social-maneuvers] ✓ Social phase complete - generating summary
[fast-forward] deactivated (normal speed restored)
```

## Acceptance Criteria - All Met ✅

1. ✅ **Nominations**: Pressing FFWD compresses the entire nomination speech + any interstitial cards without clearing them; after completion, the phase advances and FFWD resets

2. ✅ **HOH Competition**: Pressing FFWD during HOH competition instructions does not cancel the competition; it either accelerates the instruction card or leaves gameplay unaffected

3. ✅ **Social Phase**: Pressing FFWD during social accelerates AI ticks and still shows a short summary; no immediate hard end unless configured

4. ✅ **Logging**: Logs show `activated` once per phase and `deactivated` only on phase change; no more immediate deactivate right after the drain loop

5. ✅ **Card Preservation**: No `CardManager Clearing all cards` when FFWD path is taken

## Backward Compatibility

The implementation maintains backward compatibility:
- Legacy drain mode is preserved when `fastForwardEnabled: false`
- Existing skip behavior works unchanged
- All existing phases continue to function normally
- Config defaults ensure FFWD is enabled by default

## Files Modified

1. `js/runtime/skip-controller.js` - Added acceleration branch
2. `js/tv-skip.js` - Added FFWD deactivation on phase change
3. `js/ui.hud-and-router.js` - Removed immediate deactivation and card clearing
4. `js/social-ai-scheduler.js` - Added FFWD interval compression
5. `scripts/verify-fast-forward.mjs` - Updated validation checks

## Security Summary

CodeQL security scan completed with **0 alerts**. No vulnerabilities introduced.

## Notes

- This change is intentionally minimal to wiring: we do not change minigame internals except instruction pacing and AI scheduling
- Active gameplay remains manual by default for fairness
- Config defaults remain `fastForwardEnabled: true`, `fastForwardMultiplier: 0.1`
- The acceleration path ensures all callbacks execute, just in compressed time windows
- GSAP timelines are still fast-forwarded in both modes for immediate visual completion
