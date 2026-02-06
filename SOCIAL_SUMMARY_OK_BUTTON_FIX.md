# Social Summary OK Button Fix - Summary

## Problem Statement

When a player in the BBMobile game spends all their energy in the socialize module:
1. ✅ Module auto-closes correctly
2. ✅ Social summary appears at main screen with "More" and "OK" buttons
3. ❌ **BUG**: Clicking "OK" starts a new 30-second timer (WRONG!)
4. ❌ **BUG**: After timer expires, social summary appears AGAIN (redundant)

**Expected behavior:** Clicking "OK" should immediately advance to the next phase (nominations)

## Root Cause

The `showSocialSummary()` function in `js/socialize-mobile.js` was showing the summary panel but NOT setting the phase advancement callback (`game.__socialPhaseAdvanceCallback`).

When the OK button in `social-maneuvers.js` is clicked, it checks for this callback:
```javascript
if (typeof g?.__socialPhaseAdvanceCallback === 'function') {
  // Execute callback to advance phase
} else {
  console.warn('[social-maneuvers] ⚠ No phase advancement callback found');
  // Timer resumes instead (BUG!)
}
```

## Solution

Updated `showSocialSummary()` in `js/socialize-mobile.js` to:

1. **Define a phase advancement function** that finds and calls `startNominations`:
   ```javascript
   const advanceToNextPhase = () => {
     // Try to find startNominations function
     const startNomsCandidates = [
       'startNominations', 'startNomination', 'startNoms',
       'startNominationsPhase', 'startNomsPhase', 'startNominationsFlow'
     ];
     // ... find and call the function
   };
   ```

2. **Store the callback** before showing the summary:
   ```javascript
   window.game.__socialPhaseAdvanceCallback = advanceToNextPhase;
   ```

3. **Show the summary** as before:
   ```javascript
   SocialManeuvers.showSummaryPanel(summary);
   ```

This pattern matches the existing `resolveStartNominations()` function in `social.js` for consistency.

## Code Changes

### File: `js/socialize-mobile.js`

**Before (lines 656-693):**
```javascript
function showSocialSummary() {
  // Just show the summary - NO callback set
  if (global.SocialManeuvers?.generatePhaseSummary && ...) {
    const summary = global.SocialManeuvers.generatePhaseSummary();
    global.SocialManeuvers.showSummaryPanel(summary);
    return;
  }
  // ... other fallback methods
}
```

**After (lines 656-751):**
```javascript
function showSocialSummary() {
  console.info('[socialize-mobile] 📊 Showing social summary with phase advancement callback');
  
  // Define phase advancement function (NEW!)
  const advanceToNextPhase = () => {
    // Find and call startNominations or use setPhase fallback
  };
  
  // Store the callback for OK button (NEW!)
  if (global.game) {
    global.game.__socialPhaseAdvanceCallback = advanceToNextPhase;
    console.info('[socialize-mobile] ✓ Phase advancement callback stored for OK button');
  }
  
  // Show the summary (same as before)
  if (global.SocialManeuvers?.generatePhaseSummary && ...) {
    const summary = global.SocialManeuvers.generatePhaseSummary();
    global.SocialManeuvers.showSummaryPanel(summary);
    return;
  }
}
```

## Flow Comparison

### Before (Broken):
```
1. Player opens socialize module
2. Player spends all energy
3. Module auto-closes ✓
4. showSocialSummary() called
5. Summary shown WITHOUT callback ❌
6. Player clicks "OK"
7. OK button finds NO callback ❌
8. Timer resumes (30 seconds) ❌
9. Timer expires
10. Summary shown AGAIN ❌
```

### After (Fixed):
```
1. Player opens socialize module
2. Player spends all energy
3. Module auto-closes ✓
4. showSocialSummary() called
5. Callback stored ✓
6. Summary shown ✓
7. Player clicks "OK"
8. OK button executes callback ✓
9. Phase advances to nominations ✓
10. No redundant summary ✓
```

## Testing

### Automated Tests
- ✅ All social tests pass: `npm run test:social`
- ✅ No linting errors introduced
- ✅ CodeQL security scan: 0 alerts
- ✅ No regression in existing functionality

### Manual Test File
Created `test_social_summary_ok_button_fix.html` to verify:
1. Callback is properly set when `showSocialSummary()` is called
2. OK button finds and executes the callback
3. Phase advances to nominations
4. No redundant timer or summary

### Coverage
The fix works for **both** paths that lead to showing the summary:

**Path 1: Energy depletion**
```
Energy = 0 → auto-close → showSocialSummary() → callback set ✓
```

**Path 2: User chooses to view summary**
```
"No" button → close → showSocialSummary() → callback set ✓
```

## Success Criteria

All criteria met:
- ✅ Clicking "OK" on social summary immediately advances to next phase
- ✅ No 30-second timer starts after clicking OK
- ✅ No redundant/duplicate social summary appears
- ✅ Clean transition from social phase to nominations phase

## Related Context

This fix addresses the issue mentioned in the problem statement referencing PR #1151, which fixed other timer/summary flows. The OK button handler now has proper phase advancement logic instead of just hiding the UI.

## Files Modified

1. `js/socialize-mobile.js` - Fixed `showSocialSummary()` to set phase advancement callback
2. `test_social_summary_ok_button_fix.html` - Test file to verify the fix

## Backward Compatibility

✅ No breaking changes - the fix only adds the missing callback that the OK button was already checking for.
