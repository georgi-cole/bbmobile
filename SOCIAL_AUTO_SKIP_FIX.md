# Social Auto-Skip Regression Fix (PR #345)

## Problem Statement

Two bugs were reported after PR #345:

1. **Auto-skip not occurring**: When the human player has 0 energy at Social phase start, the low-battery modal shows but the phase timer continues to run and the phase does not advance automatically.

2. **Layout issue**: The low-battery indicator appears offset/outside the faux TV panel instead of rendering inline and centered within it.

## Root Cause

The original implementation:
- Did not stop the phase timer when energy was 0
- Used `position: fixed` for the overlay, making it appear outside the TV container
- Lacked idempotency guards, potentially allowing double execution
- Used `.tvViewport` DOM selector without a data attribute, making targeting unreliable

## Solution

### 1. Timer Control ✅

**Added `stopSocialPhaseTimer()` function:**
```javascript
function stopSocialPhaseTimer() {
  const g = global.game;
  if(!g) return;
  
  console.info('[sm-phase-skip] Stopping Social phase timer...');
  
  // Set endAt to far future to effectively stop countdown
  const farFuture = Date.now() + (365 * 24 * 60 * 60 * 1000); // 1 year
  g.endAt = farFuture;
  g.phaseEndsAt = farFuture;
  
  console.info('[sm-phase-skip] ✓ Timer stopped (endAt set to far future)');
}
```

This is called immediately when energy ≤ 0 is detected in `onSocialPhaseStart()`, before showing the overlay.

### 2. Idempotency Guard ✅

**Added `__smSkipInProgress` flag:**
```javascript
// At start of showEmptyEnergyOverlayAndSkip()
if(g.__smSkipInProgress) {
  console.warn('[sm-phase-skip] Skip already in progress - ignoring duplicate call');
  return;
}
g.__smSkipInProgress = true;

// After phase advance
g.__smSkipInProgress = false;
```

This ensures the auto-skip logic runs exactly once and the `sm-phase-skip-empty` event is dispatched only once.

### 3. Inline Centered Layout ✅

**Updated HTML:**
```html
<div class="tvViewport" data-sm-faux-tv>
```

**JavaScript creates wrapper for centering:**
```javascript
// Find faux TV container with fallbacks
const tvContainer = document.querySelector('[data-sm-faux-tv]')
                 || document.querySelector('#fauxTv')
                 || document.querySelector('.faux-tv')
                 || document.querySelector('[data-tv-screen]')
                 || document.querySelector('.tvViewport')
                 || document.getElementById('panel')
                 || document.body;

// Create wrapper container for centering inside TV
const wrapper = document.createElement('div');
wrapper.className = 'sm-empty-energy-wrapper';
wrapper.setAttribute('data-sm-empty-battery-wrapper', '');
wrapper.style.cssText = 'position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 100;';

// Create overlay content
const overlay = document.createElement('div');
overlay.className = 'sm-empty-energy-overlay';
overlay.setAttribute('data-sm-empty-battery', '');
// ... additional attributes

wrapper.appendChild(overlay);
tvContainer.appendChild(wrapper);
```

**Updated CSS:**
```css
/* Wrapper for centering inside faux TV */
.sm-empty-energy-wrapper {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 100;
}

/* Overlay content - centered inside TV */
.sm-empty-energy-overlay {
  background: rgba(0, 0, 0, 0.85);
  border-radius: 16px;
  padding: 20px;
  pointer-events: auto;
  animation: sm-fade-in 0.3s ease-in;
  max-width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
```

The wrapper uses flexbox to center the overlay inside the TV viewport. Pointer events are managed so the wrapper is transparent to clicks but the overlay content is interactive.

### 4. Accessibility Improvements ✅

- Changed `role="alert"` to `role="status"` (less intrusive, more appropriate for status updates)
- Updated aria-label to "No Social Energy. Skipping..."
- Updated submessage text to use proper ellipsis character "Skipping…"

### 5. Event Dispatch ✅

The `sm-phase-skip-empty` event is now protected by the idempotency guard, ensuring it fires exactly once:

```javascript
window.dispatchEvent(new CustomEvent('sm-phase-skip-empty', {
  detail: { playerId, week }
}));
```

## Files Modified

1. **js/social-maneuvers.js**
   - Added `stopSocialPhaseTimer()` function
   - Updated `showEmptyEnergyOverlayAndSkip()` with idempotency guard and new layout logic
   - Timer is stopped before overlay is shown
   - Wrapper element created for proper centering

2. **css/social-maneuvers.css**
   - Removed `position: fixed` from `.sm-empty-energy-overlay`
   - Added `.sm-empty-energy-wrapper` for flexbox centering
   - Updated overlay to be inline content with responsive max-width

3. **index.html**
   - Added `data-sm-faux-tv` attribute to `.tvViewport`

4. **test_social_auto_skip.html** (new)
   - Interactive test page for manual verification
   - Simulates zero energy and normal energy scenarios
   - Event logging and visual feedback

5. **verify_auto_skip_fix.mjs** (new)
   - Automated verification script
   - 10 test cases covering all aspects of the fix
   - All tests pass ✅

## Verification

### Automated Tests

```bash
npm run test:social
```
✅ All existing social tests pass (9/9)

```bash
node verify_auto_skip_fix.mjs
```
✅ All auto-skip fix tests pass (10/10)

### Manual Test Scenarios

Using `test_social_auto_skip.html`:

**Scenario 1: Zero Energy**
```javascript
__smDebug.setBank(humanId, 0);
// Start Social phase
// Expected: Centered indicator appears for 3s, timer stops, phase advances
```

**Scenario 2: Normal Energy**
```javascript
__smDebug.setBank(humanId, 5);
// Start Social phase
// Expected: Normal behavior, timer runs, action UI available
```

## Acceptance Criteria

✅ With bank/energy = 0 at Social phase start: the indicator appears centered inside the faux TV for ~3s; the phase timer does not run; phase advances automatically.

✅ With energy > 0: nothing changes, normal behavior continues.

✅ No regressions to HUD, auto-skip bank seeding, or AI scheduler.

✅ Event `sm-phase-skip-empty` fires exactly once per auto-skip.

✅ Accessibility improved with proper ARIA attributes.

## Impact

- **No breaking changes**: Existing functionality preserved
- **Minimal code changes**: Surgical fixes to auto-skip logic
- **Improved UX**: Indicator now properly centered and less intrusive
- **Improved reliability**: Idempotency guard prevents edge cases
- **Better accessibility**: Proper ARIA roles and labels

## Testing Commands

```bash
# Run all social tests
npm run test:social

# Run auto-skip verification
node verify_auto_skip_fix.mjs

# Open interactive test page
# Open test_social_auto_skip.html in browser
```

## Debug Commands

```javascript
// Set bank to 0 to trigger auto-skip
__smDebug.setBank(1, 0);

// Check current bank
__smDebug.getBank(1);

// Start Social phase manually
SocialManeuvers.onSocialPhaseStart();
```

## References

- Problem statement: Fix regression from PR #345
- Timer stop pattern: Sets `game.endAt` and `game.phaseEndsAt` to far future
- Centering pattern: Absolute positioned wrapper with flexbox
- Event guard pattern: `__smSkipInProgress` flag for idempotency
