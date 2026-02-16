# Zero Energy Modal - SKIP Button Fix

## Problem

The SKIP button in the zero energy modal didn't properly exhaust the timer and advance to the next phase. When clicked, it would:
- Close the modal
- Leave the timer at 0:00
- Not advance to the next phase
- The timer would continue running (redundantly at 0:00)

This was reported in PR #1276 comments.

## Root Cause

The SKIP button handler was calling `advancePhase()` directly:

```javascript
// OLD CODE - BROKEN
if (typeof global.advancePhase === 'function') {
  global.advancePhase();
} else if (typeof global.nextPhase === 'function') {
  global.nextPhase();
}
```

However, this approach had a critical flaw:

1. When `showZeroEnergyModal()` is called, it immediately stops the timer by calling `stopSocialPhaseTimer()`, which sets `game.endAt = Date.now()`
2. The timer's tick function checks if `Date.now() >= game.endAt` to trigger the timeout callback
3. Since the timer is already at 0:00 (endAt is in the past), the timeout callback won't fire again
4. Calling `advancePhase()` directly doesn't trigger the proper cleanup sequence that `onSocialPhaseEnd()` provides
5. The social phase state isn't properly cleaned up, leading to potential issues

## Solution

Use the existing `endSocialPhaseNow('skip')` function which was designed to handle this exact scenario:

```javascript
// NEW CODE - FIXED
endSocialPhaseNow('skip');
```

The `endSocialPhaseNow()` function properly:
1. **Clears any pending timers** - Removes fast-advance timeouts
2. **Stops the phase timer** - Sets `endAt` to now
3. **Calls `onSocialPhaseEnd()`** - Cleans up social phase state:
   - Stops AI social scheduler
   - Renders highlights
   - Syncs leftover energy to bank
   - Finalizes week for all players
4. **Advances to next phase** - Calls `advancePhase()` or `nextPhase()`

However, `endSocialPhaseNow()` was only configured to advance for the `'continue'` reason. We needed to also support the `'skip'` reason.

## Changes Made

### 1. SKIP Button Handler (lines ~3189-3216)

**Before:**
```javascript
// Advance to next phase
if (typeof global.advancePhase === 'function') {
  global.advancePhase();
} else if (typeof global.nextPhase === 'function') {
  global.nextPhase();
} else {
  console.warn('[sm-zero-energy] No advancePhase or nextPhase function available');
}
```

**After:**
```javascript
// End social phase properly and advance to next phase
// This calls onSocialPhaseEnd() and then advances to next phase
endSocialPhaseNow('skip');
```

### 2. endSocialPhaseNow Function (lines ~3422-3440)

**Before:**
```javascript
// 3. If reason is 'continue', advance to next phase immediately
if(reason === 'continue'){
  console.info('[social-maneuvers] ⏩ Advancing to next phase immediately after OK');
  // ... advance logic
}
```

**After:**
```javascript
// 3. If reason is 'continue' or 'skip', advance to next phase immediately
if(reason === 'continue' || reason === 'skip'){
  console.info(`[social-maneuvers] ⏩ Advancing to next phase immediately (reason: ${reason})`);
  // ... advance logic
}
```

## Behavior After Fix

### Before Fix
1. User clicks SKIP
2. Modal fades out and closes
3. Timer stays at 0:00 (already stopped)
4. Phase does NOT advance
5. User is stuck in social phase with timer at 0:00

### After Fix
1. User clicks SKIP
2. Modal fades out and closes
3. `endSocialPhaseNow('skip')` is called which:
   - Clears any pending timeouts
   - Stops the timer (sets endAt to now)
   - Calls `onSocialPhaseEnd()` for cleanup
   - Advances to the next phase
4. Game continues to next phase smoothly

## Testing

### Automated Tests
- ✅ `npm run test:social` - All social phase requirements tests pass
- ✅ Code review - No issues found
- ✅ CodeQL security scan - No vulnerabilities found

### Manual Testing
Test file: `test_zero_energy_modal.html`

To test:
1. Open `test_zero_energy_modal.html` in a browser
2. Click "Set Energy to 0 (then start social phase)"
3. The zero energy modal should appear
4. Click the SKIP button
5. Verify:
   - Modal closes
   - Console shows: `[social-maneuvers] 🛑 Ending Social phase now (reason: skip)`
   - Console shows: `[social-maneuvers] ⏩ Advancing to next phase immediately (reason: skip)`
   - Console shows: `advancePhase() called - would advance to next phase`

## Impact

This fix ensures that the SKIP button works as intended:
- ✅ Timer is properly exhausted
- ✅ Social phase state is cleaned up
- ✅ Game advances to next phase
- ✅ No stuck states or timer issues

## Related Files

- `js/social-maneuvers.js` - Main implementation
- `test_zero_energy_modal.html` - Manual test file
- `screenshot_zero_energy_modal.html` - Visual reference

## Related Issues

- PR #1276 - Original implementation of zero energy modal
- Issue comment: "the skip button does not exhaust the timer and does not move on to the next phase it just closes the modal and the timer continues to run down"
