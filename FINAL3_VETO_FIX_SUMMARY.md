# Final 3 Veto Ceremony Bug Fix

## Problem Statement

After many evictions in a game (starting with 9 players), a self-evict brought the active player count down to 3, but the system did not immediately cancel the ongoing veto ceremony. Instead, the veto flow continued to run against a mutated player roster and threw a runtime TypeError:

```
veto.js:3829  Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'id')
at veto.js:3829:116
at Array.map
```

## Root Cause Analysis

### Issue 1: Missing Final 3 Check
The `finalizeCeremony` function in `veto.js` had logic to handle Final 4 scenarios (line 3948) but **no check for Final 3**. When the player count dropped to 3 during a veto ceremony, the ceremony continued instead of being cancelled and transitioning to the Final 3 flow.

### Issue 2: Null HOH Access
In the `pickReplacementByHOH` function (line 3829), the code accessed `hoh.id` without checking if `hoh` was null/undefined. This could happen when:
- HOH self-evicted (setting `g.hohId = null`)
- The veto ceremony was still in progress
- A replacement nominee needed to be selected

The problematic line:
```javascript
var inAl = (global.inSameAlliance && typeof global.inSameAlliance==='function') 
  ? (global.inSameAlliance(hoh.id, id) ? 1 : 0)  // ❌ hoh.id crashes if hoh is null
  : 0;
```

## Solution

### Fix 1: Add Final 3 Check (lines 3884-3896)
Added an early return in `finalizeCeremony` that checks for Final 3 **before** any veto processing occurs:

```javascript
var aliveCount = alivePlayers().length;

// Final 3 check: Cancel ceremony and transition to Final 3 flow
if(aliveCount === 3){
  console.info('[veto] Final 3 reached - cancelling veto ceremony and transitioning to Final 3');
  g.__vetoCeremonyResolved = true;
  g.__vetoDecisionInProgress = false;
  try{ if(global.addLog) global.addLog('Final 3 reached. Veto ceremony cancelled.','info'); }catch(e){}
  setTimeout(function(){
    if(typeof global.startFinal3Flow === 'function'){
      global.startFinal3Flow();
    }
  }, 300);
  return;
}
```

This follows the same pattern as the existing Final 4 check at line 3948.

### Fix 2: Add HOH Null Guard (line 3829)
Modified the alliance check to verify `hoh` exists before accessing `hoh.id`:

```javascript
var inAl = (hoh && global.inSameAlliance && typeof global.inSameAlliance==='function') 
  ? (global.inSameAlliance(hoh.id, id) ? 1 : 0)  // ✅ Safe - hoh checked first
  : 0;
```

This prevents the TypeError when HOH is null.

## Testing

### Validation Tests Passed
- ✅ `npm run test:runtime` - All runtime validation tests pass
- ✅ `npm run test:minigames` - All minigame validation tests pass
- ✅ `npm run test:e2e` - E2E competition tests pass
- ✅ `npm run test:runtime-helpers` - Runtime helpers tests pass
- ✅ JavaScript syntax validation passes
- ✅ CodeQL security scan - No vulnerabilities found

### Test File Created
Created `test_final3_veto_cancellation.html` with comprehensive tests:
1. Final 3 veto cancellation logic
2. HOH null guard verification
3. Self-eviction to Final 3 scenario simulation
4. Code changes presence verification

## Impact

### Before Fix
1. Player count reaches 3 during veto ceremony
2. Veto ceremony continues
3. Attempts to select replacement nominee
4. Crashes with TypeError if HOH is null
5. Game becomes unplayable

### After Fix
1. Player count reaches 3 during veto ceremony
2. Veto ceremony is **immediately cancelled**
3. Game **transitions to Final 3 flow**
4. No crash, no error
5. Game continues normally

## Edge Cases Handled

1. **Self-eviction during veto**: When a player self-evicts during veto ceremony and count drops to 3, the ceremony is cancelled
2. **HOH self-eviction**: When HOH self-evicts (making `g.hohId = null`), the replacement selection doesn't crash
3. **Normal evictions to Final 3**: Regular evictions that bring count to 3 also trigger the cancellation
4. **Final 4 still works**: The existing Final 4 logic at line 3948 is unchanged and still functions correctly

## Code Review Notes

- Code follows existing patterns (mirrors Final 4 check)
- Uses British spelling "cancelled" consistent with codebase
- Minimal changes - only 16 lines added
- No breaking changes to existing functionality
- All guard clauses follow defensive programming best practices

## Related Files
- `js/veto.js` - Main fix location
- `js/self-eviction.js` - Related self-eviction logic
- `js/competitions.js` - Final 3 flow function (`startFinal3Flow`)
- `test_final3_veto_cancellation.html` - Test file
