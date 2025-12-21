# POV Ceremony Timer Fix - Implementation Summary

## Problem Statement

Users observed an idle waiting period between POV competition results and the veto ceremony. In some fast-forward paths where `g.__vetoResultsShown` was set earlier, `finishVetoComp()` returned early without:
- Clearing background timers (`g.__vetoAutoTimer`)
- Shortening the canonical phase countdown

This left existing phase timers running and caused the UI to show an extra "X will now decide…" / idle timer before the actual decision UI.

## Root Cause

The early-return branch in `finishVetoComp()` (lines 1043-1052) was introduced to avoid redundant result display when results were already shown via fast-forward. However, this branch only called `handlePostVetoReveal()` after a minimal 100ms delay without performing necessary cleanup:

```javascript
// OLD CODE (lines 1043-1052)
if(g.__vetoResultsShown){
  console.info('[veto] Results already shown via fast-forward, skipping redundant display');
  setTimeout(function(){
    handlePostVetoReveal();
  }, 100); // Minimal delay to allow any pending operations to complete
  return;
}
```

This meant:
1. `g.__vetoAutoTimer` was never cleared → background timer kept running
2. Phase countdown was never shortened → canonical timer continued with original duration
3. Result: Multi-second idle period before ceremony started

## Solution Implemented

Replaced the early-return branch with timer cleanup and countdown shortening logic:

```javascript
// NEW CODE (lines 1043-1069)
if (g.__vetoResultsShown) {
  console.info('[veto] Results already shown via fast-forward - ensuring timers cleared and countdown shortened');

  // Clear any active veto auto-timers
  if (g.__vetoAutoTimer) {
    try { clearTimeout(g.__vetoAutoTimer); } catch (e) {}
    g.__vetoAutoTimer = null;
  }

  // Ensure the canonical phase countdown is shortened to the results→winner value
  if (typeof global.setPhase === 'function') {
    try {
      var timeToWinner = Math.ceil(POV_RESULTS_TO_WINNER_DELAY_MS / 1000);
      console.info('[veto] Forcing phase countdown to ' + timeToWinner + 's for fast-forwarded results');
      global.setPhase(g.phase, timeToWinner, null);
    } catch (e) {
      console.warn('[veto] Failed to force phase countdown:', e);
    }
  }

  // Proceed to post-reveal flow with a very small buffer to let UI settle
  setTimeout(function () { handlePostVetoReveal(); }, 50);
  return;
}
```

## Key Changes

1. **Timer Cleanup**: Explicitly clear `g.__vetoAutoTimer` to remove background auto-timers
2. **Phase Countdown Shortening**: Force phase timer to `POV_RESULTS_TO_WINNER_DELAY_MS` (1s) using `global.setPhase()`
3. **Reduced Delay**: Decrease delay before `handlePostVetoReveal()` from 100ms to 50ms
4. **Preserved Semantics**: Still skip re-rendering results (fast-forward behavior intact)

## Why This is Safe

- **Preserves fast-forward behavior**: We still skip re-rendering results
- **Uses existing constants**: `POV_RESULTS_TO_WINNER_DELAY_MS` is already defined (1000ms)
- **Uses existing APIs**: `global.setPhase()` is the canonical way to set phase timers
- **Minimally invasive**: Only changes the early-return branch in `finishVetoComp()`
- **Does not alter other ceremony logic**: All other paths remain unchanged

## Expected Behavior After Fix

1. Results shown (or fast-forwarded result)
2. Main countdown displays ~1s
3. Winner reveal occurs ~1s later
4. No separate multi-second idle card saying "X will now decide"
5. Decision UI appears immediately after reveal

## Testing Steps

1. Enable auto-fast-advance (cfg flag) or trigger fast-forward code path
2. Complete a POV competition
3. Observe:
   - Results should show then countdown should display ~1s
   - Winner reveal should occur ~1s later
   - No separate idle wait card should appear
   - Decision UI should appear immediately after reveal
4. Verify console logs show:
   - `[veto] Results already shown via fast-forward - ensuring timers cleared and countdown shortened`
   - `[veto] Forcing phase countdown to 1s for fast-forwarded results`

## Files Modified

- `js/veto.js` (lines 1043-1069)

## Verification

Automated verification confirms:
- ✓ Timer cleanup logic present
- ✓ Phase shortening logic present
- ✓ Reduced delay (50ms) present
- ✓ Old early return (100ms) removed

## Related Constants

```javascript
const POV_RESULTS_TO_WINNER_DELAY_MS = 1000; // 1s delay from results to winner display
const VETO_CEREMONY_START_DELAY_MS = 0;      // 0ms - start ceremony immediately (no wait)
```

These constants are defined at the top of `veto.js` (lines 14-15).

## Impact

This fix eliminates the redundant idle period between POV results and veto ceremony in fast-forward scenarios, creating a smooth, uninterrupted flow consistent with non-fast-forward paths.
