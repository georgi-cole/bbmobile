# Veto Ceremony Flow Fix Summary

## Problem Statement
When the game reaches the veto_ceremony phase, the flow halts and never activates the veto ceremony interactive elements for human POV holder. The logs show:
- Veto competition completes successfully
- Phase transitions to veto_ceremony
- Initial ceremony card renders
- Then the flow stops with no interactive decision UI appearing
- `startVetoCeremony already called - skipping duplicate` indicates a duplicate call guard is blocking continuation

## Root Cause Analysis

### Primary Issues Identified
1. **Overly Restrictive Duplicate Call Guard**: The idempotent guard `g.__vetoCeremonyStarted` was blocking ALL subsequent calls to `startVetoCeremony()`, even legitimate ones after phase transitions or ceremony completion.

2. **Missing Function Prefix**: Five calls to `openCarouselPicker()` were missing the `global.` prefix, causing potential undefined function errors during nominee selection.

3. **Phase Transition State Pollution**: Ceremony state flags were not being reset when transitioning away from veto_ceremony phase, causing stale state to persist across phases.

4. **Lack of Error Handling**: Async `startVetoCeremony()` calls had no error handling, causing silent failures that were hard to debug.

5. **Insufficient Diagnostic Logging**: Limited logging made it difficult to trace where the ceremony flow was halting.

### Flow Analysis
The intended flow is:
1. `finishVetoComp()` → `showVetoRevealSequence()` → `handlePostVetoReveal()`
2. `handlePostVetoReveal()` schedules `startVetoCeremony()` after 500ms
3. `startVetoCeremony()` is async and:
   - Shows intro card
   - Calls `setPhase('veto_ceremony')` conditionally (only if not already in that phase)
   - Renders POV use decision UI for human holder
   - Waits for user interaction with `await renderPOVUseDecision()`
4. After decision, continues to `finalizeCeremony()` and eventual phase advancement

**Note on phase transitions:** The veto_comp phase may expire and call `defaultAdvance()` which transitions to veto_ceremony. If `startVetoCeremony()` was already called and running, the conditional phase check prevents a redundant `setPhase()` call. The enhanced guard allows this legitimate flow while blocking true duplicates (e.g., multiple simultaneous calls before the first completes).

The issue was that the old guard would block ANY subsequent call, even when transitioning from a different context or after ceremony completion.

## Solution Implementation

### 1. Enhanced Duplicate Call Guard (`js/veto.js`)
**Impact**: Guard now only blocks if ceremony is ACTIVELY in progress, not if it completed or failed.

### 2. Conditional Phase Setting (`js/veto.js`)
**Impact**: Prevents redundant phase transitions that could reset state or cause UI issues.

### 3. Phase Cleanup (`js/ui.hud-and-router.js`)
**Impact**: Ensures clean state when transitioning away from veto_ceremony, preventing stale flags from affecting future phases.

### 4. Fixed Function References (`js/veto.js`)
**Impact**: Prevents "openCarouselPicker is not defined" errors during nominee selection.

### 5. Error Handling (`js/veto.js`)
**Impact**: Catches and logs async errors that would otherwise fail silently.

### 6. Comprehensive Diagnostic Logging
**Impact**: Makes debugging ceremony flow issues much easier.

## Expected Behavior After Fix

### Correct Flow (After Fix)
1. ✅ Veto competition completes successfully
2. ✅ Console: `[veto] POV Winner determined: [id] name: [name] human: true`
3. ✅ Console: `[veto] handlePostVetoReveal - aliveCount: [count]`
4. ✅ Console: `[veto] Starting veto ceremony in 500ms`
5. ✅ Console: `[veto] startVetoCeremony invoked - phase: veto_comp ...`
6. ✅ Console: `[veto] startVetoCeremony - ceremony flow beginning`
7. ✅ Intro card appears: "POV Holder will decide..."
8. ✅ Console: `[veto] Rendering POV use decision for human`
9. ✅ Console: `[veto] showTVDecision called with title: Use Power of Veto?`
10. ✅ **Decision UI appears with YES/NO buttons**
11. ✅ User clicks button
12. ✅ Console: `[veto] Button clicked: YES value: true`
13. ✅ Console: `[veto] Decision resolved: used=true`
14. ✅ Ceremony continues to completion

### Previous Buggy Behavior (Before Fix)
1. ❌ Veto competition completes
2. ❌ Phase transitions to veto_ceremony
3. ❌ Intro card appears briefly
4. ❌ Console: `[veto] startVetoCeremony already called - skipping duplicate`
5. ❌ **No decision UI appears**
6. ❌ Flow halts indefinitely
7. ❌ User cannot proceed

## Testing Instructions

### Automated Testing
```bash
# Run test suite to verify no regressions
npm run test:all
```

### Manual Testing
1. **Setup**:
   - Open `index.html` in a browser
   - Start a new game with at least one human player
   - Open browser console (F12)

2. **Play Through to Veto**:
   - Advance through phases until veto competition
   - Ensure human player wins veto (or set manually: `game.vetoHolder = [human_id]`)

3. **Verify Ceremony Flow**:
   - Watch console for logging sequence (see "Expected Behavior" above)
   - Verify decision prompt appears with YES/NO buttons
   - Click a button and verify ceremony continues
   - Check that replacement nominee selection works (if veto used)

4. **Optional: Use Test File**:
   - Open `test_veto_ceremony_flow_fix.html` in another tab
   - This captures console logs for easier review

### Key Diagnostic Logs to Look For
When the fix is working correctly, you should see these logs in order:
- `[veto] startVetoCeremony invoked` - Function called
- `[veto] startVetoCeremony - ceremony flow beginning` - Guard passed
- `[veto] Rendering POV use decision for human` - Decision UI being created
- `[veto] showTVDecision called` - Decision panel rendering
- `[veto] Decision UI fully rendered, awaiting user interaction` - UI ready
- `[veto] Button clicked: [YES/NO]` - User made choice
- `[veto] Decision resolved: used=[true/false]` - Choice processed

If you see `startVetoCeremony already called - skipping duplicate` during normal flow (not after a retry), the fix has not been applied correctly.

## Files Modified

### `js/veto.js`
- Enhanced `startVetoCeremony()` duplicate call guard
- Added conditional phase setting
- Fixed 5 `openCarouselPicker` references to use `global.` prefix
- Added comprehensive diagnostic logging throughout ceremony flow
- Added error handling in `handlePostVetoReveal()`

### `js/ui.hud-and-router.js`
- Added phase cleanup for ceremony state flags

### `test_veto_ceremony_flow_fix.html` (New)
- Comprehensive test and verification guide
- Console log capture for debugging

## Backward Compatibility
All changes are backward compatible:
- Enhanced guard logic is more permissive, not restrictive
- Phase cleanup only affects veto_ceremony transitions
- Fixed function references just add proper namespace
- Diagnostic logging is additive only
- No changes to public APIs or external interfaces
