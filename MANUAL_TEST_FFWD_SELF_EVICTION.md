# Manual Test Guide: FFWD Self-Eviction Fix

## Issue
When a houseguest self-evicts and the user presses the FFWD button, the timer goes down to 0 and moves to the next phase BUT the animations and cards of the self-eviction still appear as per normal schedule (not accelerated), hence they overlap with cards and messages from the next phase.

## Fix
Modified `sleep()` function in `js/eviction-visuals.js` to respect FFWD state by using `normalizeDuration()`. This compresses animation timings proportionally when FFWD is active.

## Test Scenarios

### Scenario 1: Self-Eviction WITHOUT FFWD (Normal Behavior)
**Steps:**
1. Open `test_self_eviction.html` in a browser
2. Start a game with multiple players
3. Trigger a self-eviction (via the action menu)
4. **DO NOT** press the FFWD button
5. Observe the eviction animation sequence

**Expected Result:**
- Animation sequence takes ~1.6 seconds total:
  - Zoom in: 0.6s
  - Grayscale: 0.4s
  - Fade out: 0.6s
- Animation completes smoothly
- No overlap with next phase

### Scenario 2: Self-Eviction WITH FFWD (Fixed Behavior)
**Steps:**
1. Open `test_self_eviction.html` in a browser
2. Start a game with multiple players
3. Trigger a self-eviction
4. **Immediately press the FFWD button** (⏩ FFWD in TV header)
5. Observe the eviction animation sequence

**Expected Result:**
- Timer compresses to ~1-2 seconds
- Animation sequence is accelerated (~160ms total at 10x speed):
  - Zoom in: ~60ms
  - Grayscale: ~40ms
  - Fade out: ~60ms
- Animation completes BEFORE phase transition
- **No overlap** with cards/messages from next phase
- Phase advances smoothly after animation completes

### Scenario 3: Standard Eviction (Regression Test)
**Steps:**
1. Open `index.html` and start a normal game
2. Progress through a week to the eviction ceremony
3. Conduct a normal vote-based eviction
4. Press FFWD during the eviction sequence

**Expected Result:**
- Standard eviction animation respects FFWD
- No visual glitches or overlaps
- Phase advances smoothly

### Scenario 4: Multiple Self-Evictions
**Steps:**
1. Trigger multiple self-evictions in sequence
2. Press FFWD during each eviction
3. Verify each eviction animation is properly accelerated

**Expected Result:**
- Each eviction animation is compressed when FFWD is active
- No stacking or overlap of animations
- Clean transitions between phases

## Verification Checklist
- [ ] Normal self-eviction works (Scenario 1)
- [ ] FFWD self-eviction accelerates animations (Scenario 2)
- [ ] No overlap with next phase content (Scenario 2)
- [ ] Standard evictions still work (Scenario 3)
- [ ] Multiple self-evictions work correctly (Scenario 4)

## Technical Details

### Code Change
**File:** `js/eviction-visuals.js`

**Before:**
```javascript
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
```

**After:**
```javascript
function sleep(ms){ 
  const duration = global.normalizeDuration ? global.normalizeDuration(ms) : ms;
  return new Promise(r => setTimeout(r, duration)); 
}
```

### How It Works
- `normalizeDuration()` is defined in `js/state.js`
- When FFWD is active (`game.__ffActive === true`), it compresses durations by the multiplier (typically 0.1 = 10x speed)
- When FFWD is not active, it returns the original duration
- The function uses a fallback for backward compatibility

### Expected Compression
With default FFWD multiplier (0.1):
- 600ms → 60ms
- 400ms → 40ms
- Total animation: 1600ms → 160ms

## Browser Console Logs to Watch For

**Success indicators:**
```
[eviction-visuals] start id=X context={"reason":"self"}
[state] activateFastForward: compressing phase timer from Xs to Ys
[eviction-visuals] complete id=X
```

**Failure indicators:**
```
[eviction-visuals] animation error: ...
[CardManager] Overlapping cards detected
```

## Related Files
- `js/eviction-visuals.js` - Animation module (modified)
- `js/self-eviction.js` - Self-eviction logic
- `js/state.js` - FFWD state management and `normalizeDuration()`
- `js/ui.hud-and-router.js` - `fastForwardPhase()` function
- `js/tv-skip.js` - FFWD button UI

## Automated Tests
Run existing test suite to verify no regressions:
```bash
npm run test:all
```

All tests should pass.
