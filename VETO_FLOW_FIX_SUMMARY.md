# Veto Flow Regression Fix - Summary

## Related Documentation

**⚠️ CRITICAL**: See [FORENSIC_HOH_SELF_NOMINATION.md](./FORENSIC_HOH_SELF_NOMINATION.md) for HOH self-nomination regression fix (2025-11-21).

## Problem Statement

After social module tweaks on the "social manuevers" branch, the veto flow regressed with the following symptoms:
- On reaching veto phase, the human's competition is skipped
- Logs show AIs "completed the Veto competition" but no winner is selected
- The game stalls with no winner, no ceremony, and no progress
- The same flow on main branch works correctly

## Root Cause

The regression was caused by **ID type mismatches** (string vs number) introduced by social module changes:

1. **Human participation check fails**: `humanIn` evaluates to `false` incorrectly because `g.__vetoPlayers.indexOf(you.id)` fails when IDs have mixed types
2. **Score filtering drops all scores**: In `finishVetoComp`, filtering in `lastCompScores` fails because eligible IDs and score keys have different types
3. **Missing fallbacks**: No robust fallback when `runHumanMinigameWithGuards` is unavailable, and no safety net when score filtering produces an empty array

## Solution Implemented

### 1. ID Normalization Throughout Veto Flow

**Location: `computeVetoParticipants()` (line 91)**
```javascript
// OLD: return unique;
// NEW: 
return unique.map(function(x){ return +x; });
```
- Ensures all veto participant IDs are numeric from the start

**Location: `startVetoComp()` (lines 141-143)**
```javascript
g.__vetoPlayers = computeVetoParticipants();
// Normalize to numeric again in case upstream changed shape
if(Array.isArray(g.__vetoPlayers)){
  g.__vetoPlayers = g.__vetoPlayers.map(function(x){ return +x; }); }
```
- Double-checks normalization in case upstream code modified the array

**Location: `submitGuarded()` (lines 97-100)**
```javascript
// Normalize inputs to numeric and guard duplicate submissions
id = +id;
base = +base;
mult = (mult==null ? 1 : +mult) || 1;
```
- Normalizes all inputs to numbers before processing
- Handles null/undefined multiplier gracefully (defaults to 1)

**Location: AI submission in `startVetoComp()` (line 222)**
```javascript
submitGuarded(+id, baseScore, aiMultiplier, 'Veto/AI');
```
- Explicitly converts AI player IDs to numeric

### 2. Human Minigame Fallback

**Location: `startVetoComp()` (lines 191-195)**
```javascript
else {
  // Last-resort fallback: if no modern or legacy renderer is available,
  // auto-submit a zero so the flow cannot stall.
  setTimeout(function(){ submitGuarded(you.id, 0, 1, 'Veto/AutoFallback'); }, 200);
}
```
- Provides a safety net when neither `runHumanMinigameWithGuards` nor `renderMinigame` are available
- Prevents the game from stalling if human minigame fails to render
- Auto-submits score of 0 after 200ms delay

### 3. Robust Winner Selection in `finishVetoComp()`

**Location: `finishVetoComp()` (lines 340-382)**

**A. Normalize eligible IDs (lines 340-342)**
```javascript
var eligible = (Array.isArray(g.__vetoPlayers) && g.__vetoPlayers.length)
  ? g.__vetoPlayers.map(function(x){ return +x; })
  : alivePlayers().map(function(p){ return +p.id; });
```

**B. Migrate string keys to numeric (lines 345-358)**
```javascript
(function ensureScores(){
  for(var i=0;i<eligible.length;i++){
    var id = +eligible[i];
    // Some branches may have stored string keys; migrate them to numeric
    if(g.lastCompScores.has(String(id)) && !g.lastCompScores.has(id)){
      var v = g.lastCompScores.get(String(id));
      g.lastCompScores.delete(String(id));
      g.lastCompScores.set(id, +v);
    }
    if(!g.lastCompScores.has(id)){
      g.lastCompScores.set(id, 5 + rng()*5);
    }
  }
})();
```
- Detects and migrates any string keys to numeric keys
- Synthesizes scores for missing participants

**C. Filter scores with numeric comparison (lines 360-364)**
```javascript
var arr = [];
g.lastCompScores.forEach(function(score, pid){
  var pidNum = +pid;
  if(eligible.indexOf(pidNum)!==-1){ arr.push([pidNum, +score]); }
});
```
- Ensures comparison uses numeric types

**D. Repopulate if empty (lines 365-373)**
```javascript
// Absolute fallback: if filtering ended up empty (e.g., ID type drift), repopulate
if(arr.length === 0 && eligible.length){
  for(var j=0;j<eligible.length;j++){
    var eid = +eligible[j];
    var s = g.lastCompScores.has(eid) ? +g.lastCompScores.get(eid) : (5 + rng()*5);
    g.lastCompScores.set(eid, s);
    arr.push([eid, s]);
  }
}
```
- If filtering produces empty array, repopulates from eligible players

**E. Final guard (lines 376-380)**
```javascript
// Final guard: if still no scores, pick a random eligible to avoid deadlock
if(!arr.length && eligible.length){
  var pick = eligible[Math.floor(rng()*eligible.length)];
  arr = [[pick, 0]];
}
```
- As a last resort, picks a random eligible player to avoid complete deadlock

**F. Safe winner assignment (line 382)**
```javascript
global.game.vetoHolder = arr[0] && arr[0][0];
```
- Uses safe navigation to avoid errors if arr is unexpectedly empty

### 4. Defensive Top-3 Reveal Sequence

**Location: `finishVetoComp()` (lines 400-403)**
```javascript
var top3 = arr.slice(0, Math.min(3, arr.length));
// Defensive: ensure shape is [id, score]
top3 = top3.filter(function(x){ return x && typeof x[0] !== 'undefined'; });
if(!top3.length && eligible.length){ top3 = [[eligible[0], 0]]; }
```
- Filters out any malformed entries in top3
- Ensures at least one entry exists for reveal sequence

## Testing

### Created Test Suite
- **File**: `test_veto_id_normalization.html`
- **Tests**: 10 comprehensive test cases covering:
  1. ID normalization in computeVetoParticipants
  2. ID normalization in submitGuarded
  3. Score normalization (base and mult)
  4. Null/undefined mult handling
  5. String key migration
  6. Missing score synthesis
  7. Empty array fallback
  8. Final guard random selection
  9. Top-3 defensive filtering
  10. Full integration test with mixed ID types

### Existing Tests
- ✅ Runtime validation tests pass
- ✅ E2E competition tests pass
- ✅ Syntax validation passes
- ✅ All code patterns verified present

## Changes Made

### Files Modified
1. **js/veto.js** (53 insertions, 11 deletions)
   - Lines changed: 91, 97-100, 141-143, 155, 191-195, 222, 340-382, 400-403

### Files Added
1. **test_veto_id_normalization.html** (415 lines)
   - Comprehensive test suite for all fixes

## Impact

### Fixes
- ✅ Human participation correctly detected
- ✅ Winner always selected (no stalling)
- ✅ Reveal sequence always shows
- ✅ Ceremony progression guaranteed
- ✅ Final 4 and Final 3 flows preserved

### Preserved Functionality
- ✅ HOH competition flow unchanged
- ✅ Nomination flow unchanged
- ✅ Eviction flow unchanged
- ✅ Final 4 special eviction preserved
- ✅ HUD updates and progression hooks preserved
- ✅ All existing logs and ceremony routing preserved

## Edge Cases Handled

1. **Human not drawn**: Already handled by original code
2. **Human drawn but AFK**: Auto-submit 0 after timer expires (existing + new fallback)
3. **No minigame renderer**: Auto-submit 0 with AutoFallback label (NEW)
4. **String IDs from upstream**: Normalized to numeric throughout (NEW)
5. **Mixed type IDs**: String keys migrated to numeric (NEW)
6. **Empty score array**: Repopulated from eligible players (NEW)
7. **Still empty after repopulation**: Random eligible picked (NEW)
8. **Malformed top3 entries**: Filtered out defensively (NEW)

## Verification Checklist

- [x] All ID normalizations applied
- [x] Human minigame fallback added
- [x] Winner selection hardened with multiple fallbacks
- [x] Top-3 reveal defensive checks added
- [x] Syntax validated (node -c)
- [x] Existing tests pass
- [x] New test suite created
- [x] All fix patterns verified in code
- [x] Changes are minimal and surgical
- [x] No unrelated code modified
- [x] Documentation complete

## How to Test Manually

1. Open `test_veto_id_normalization.html` in a browser
2. Click "Run All Tests" button
3. Verify all 10 tests pass
4. Check detailed logs for any issues

For full game testing:
1. Load the game normally
2. Advance to veto phase (week 2+)
3. Verify human minigame appears (if drawn)
4. Complete or wait for timeout
5. Verify winner is selected and announced
6. Verify reveal sequence shows
7. Verify ceremony proceeds to live vote

## Conclusion

This fix addresses the veto flow regression by systematically normalizing all IDs to numbers throughout the veto flow, adding robust fallbacks at every potential failure point, and ensuring the game can never stall during veto competition. The changes are minimal, surgical, and fully backwards-compatible with the main branch while fixing the issues introduced by social module changes.
