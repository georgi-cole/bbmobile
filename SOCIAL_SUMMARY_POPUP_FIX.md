# Social Summary Popup Bug Fix

## Problem Statement

The social summary popup kept reappearing again and again, causing the game flow to halt. The summary should appear only once; once closed with OK, the flow should advance to the next phase.

## Root Cause Analysis

### Bug 1: `onDone` in `js/social.js` advances the phase TWICE

In the `onDone` async function (around lines 554–666 of `js/social.js`), when a summary is shown:

1. `showSummaryPanel()` is called and `summaryShown` is set to `true`
2. The code does `return` to exit early — but this `return` only exits the inner `try` block's flow
3. The fallback advancement code at the bottom of `onDone` (lines ~658-665) **still executes**, calling `callback()` or `startNominations()` immediately
4. This means the phase advances immediately AND the summary's OK button will also try to advance via `__socialPhaseAdvanceCallback`
5. The double-advance causes `setPhase` to re-trigger social phase logic, which resets guards and shows the summary again

### Bug 2: `socialSummaryOpen` guard resets on phase restart

In `onSocialPhaseStart()` (line ~3145 of `js/social-maneuvers.js`), `socialSummaryOpen = false` resets the guard. When Bug 1 causes a phase cycle, this guard resets and allows the summary to appear again.

## Solution Implemented

### 1. Add idempotency guard to `onDone` (js/social.js)

**Lines 558-563:**
```javascript
// Idempotency guard: prevent onDone from executing twice
if(global.game?.__socialOnDoneFired) {
  console.warn('[social.js] onDone already fired this phase - ignoring duplicate call');
  return;
}
global.game.__socialOnDoneFired = true;
```

This prevents `onDone` from executing more than once per phase, even if called multiple times.

### 2. Clear guard on phase start (js/social.js)

**Line 501:**
```javascript
// Clear idempotency guard for new phase
if(g) g.__socialOnDoneFired = false;
```

The guard is reset at the start of each social phase in `startSocialIntermission()` so that `onDone` can execute again in the next phase.

### 3. Fix variable scope (js/social.js)

**Line 565:**
```javascript
// Track if summary was shown to determine fallback advancement
let summaryShown = false;
```

Moved `summaryShown` declaration to function scope (before try block) so it's accessible in both the try block and the fallback code.

### 4. Conditional fallback advancement (js/social.js)

**Lines 672-679:**
```javascript
// Fallback: Only advance phase if no summary was shown successfully
// (If summary was shown, phase advancement is handled by the OK button callback)
if(!summaryShown){
  if(typeof callback === 'function'){
    try{ callback(); }catch(e){ console.error(e); }
  } else {
    const startNoms = resolveStartNominations();
    try{ startNoms(); }catch(e){ console.error(e); }
  }
}
```

Wrapped the fallback advancement code in `if(!summaryShown)` to ensure it only runs when no summary was shown. When a summary IS shown, the phase advancement is handled by the OK button via `__socialPhaseAdvanceCallback`.

### 5. Existing guard in social-maneuvers.js (no changes needed)

The `showSummaryPanel` function in `js/social-maneuvers.js` already has a proper guard:

**Lines 3605-3608:**
```javascript
// Singleton guard: only show summary once per phase end
if(socialSummaryOpen){
  console.warn('[social-maneuvers] Summary already open - ignoring duplicate call');
  return;
}
socialSummaryOpen = true;
```

This guard was already correct and prevents duplicate popups at the UI level.

## Testing

### Automated Test

Created `test_social_summary_fix.html` - an interactive test page that:
1. Sets up test environment
2. Starts social phase (clears guard)
3. Triggers `onDone` (first call - should execute)
4. Triggers `onDone` again (second call - should be blocked)
5. Verifies counters:
   - onDone calls: 1 (expected: 1) ✅
   - Summary shown: 1 time (expected: 1) ✅
   - Phase advanced: 1 time (expected: 1) ✅

### Test Results

![Test Results](https://github.com/user-attachments/assets/d8aec042-4d81-4941-a205-b13d8d0ac022)

**Status: PASS** ✅
- Idempotency guard prevented duplicate onDone execution
- All checks passed - Bug is fixed!

### Social Phase Tests

```bash
npm run test:social
```

All existing social phase tests pass ✅

### Security Scan

```bash
CodeQL Analysis: 0 alerts ✅
```

## Code Changes Summary

- **Files Modified**: 1 (`js/social.js`)
- **Files Added**: 1 (`test_social_summary_fix.html`)
- **Lines Changed**: 26 lines in `js/social.js`
- **Scope**: Minimal - only fixes the specific bug

## Expected Behavior After Fix

1. ✅ Social summary popup appears exactly ONCE when the social phase ends
2. ✅ User clicks OK to dismiss the summary
3. ✅ The game flow advances to the next phase (nominations) without the summary reappearing
4. ✅ No game halt occurs

## Technical Details

### Flow Before Fix (Broken)

```
1. Social phase ends
2. onDone() called
3. showSummaryPanel() called, summaryShown = true, return statement
4. Fallback code STILL EXECUTES → callback() → phase advances
5. User clicks OK → __socialPhaseAdvanceCallback() → phase advances AGAIN
6. Double advancement re-triggers social phase
7. onSocialPhaseStart() resets socialSummaryOpen = false
8. Summary shows again → INFINITE LOOP
```

### Flow After Fix (Correct)

```
1. Social phase ends
2. onDone() called (guard not set)
3. Set __socialOnDoneFired = true (guard now active)
4. showSummaryPanel() called, summaryShown = true, return statement
5. Fallback code DOES NOT EXECUTE (because summaryShown = true)
6. User clicks OK → __socialPhaseAdvanceCallback() → phase advances ONCE
7. Next social phase starts
8. startSocialIntermission() clears __socialOnDoneFired = false
9. Process repeats correctly next time
```

### Guard Lifecycle

```
Phase Start:
  __socialOnDoneFired = false (cleared)
  
Phase End (onDone called):
  Check: __socialOnDoneFired? No → Continue
  Set: __socialOnDoneFired = true
  Execute: onDone logic
  
Phase End (onDone called AGAIN - shouldn't happen but guarded):
  Check: __socialOnDoneFired? Yes → BLOCK and return early
  Result: Duplicate execution prevented
```

## Verification Checklist

- [x] Bug analysis completed
- [x] Fix implemented with minimal changes
- [x] Idempotency guard added
- [x] Guard reset on phase start
- [x] Fallback conditional implemented
- [x] Variable scoping fixed
- [x] Test file created
- [x] Manual testing completed
- [x] All social tests pass
- [x] CodeQL security scan passed (0 alerts)
- [x] Code review completed
- [x] Documentation updated

## Related Files

- `js/social.js` - Main fix location
- `js/social-maneuvers.js` - Contains existing guard (no changes)
- `test_social_summary_fix.html` - Test file for verification

## Maintenance Notes

- The `__socialOnDoneFired` guard must be cleared at the start of each social phase
- If adding new phase end logic, ensure it respects the idempotency guard
- The `summaryShown` variable must remain in function scope for proper fallback behavior
