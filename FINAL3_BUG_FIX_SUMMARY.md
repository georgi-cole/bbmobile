# Final 3 Bug Fix Summary

## Problem Statement

After recent PRs, the game started experiencing a bug in the Final 3 part where only 2 players remained instead of 3. The console showed:

```
[F3P1] Only 1 losers available (expected 2). Continuing with available players.
```

### Root Cause
Race conditions during the Final 4 → Final 3 transition, evidenced by duplicate call warnings:
- `[ff] Fast-forward already active, ignoring duplicate call`
- `[social-maneuvers] onSocialPhaseEnd already called - ignoring duplicate`
- `[social-ai-autostart] Already running - ignoring duplicate start`

Multiple event handlers were firing simultaneously, causing an unintended eviction.

## Solution

### 1. Guard Flag in `proceedAfterFinal4Eviction()` (js/veto.js)

**Before:**
```javascript
function proceedAfterFinal4Eviction(){
  var g = global.game;
  var remain = global.alivePlayers();
  
  // Clean up Final 4 state to prevent memory leaks
  delete g.__f4PleaInfluence;
  delete g.__f4EvictionResolved;
  delete g.__f4EvictionInProgress;
  // ... rest of function
}
```

**After:**
```javascript
function proceedAfterFinal4Eviction(){
  var g = global.game;
  
  // Guard to prevent duplicate transitions
  if(g.__f4ToF3TransitionStarted) {
    console.warn('[Final4] Transition to Final 3 already started, ignoring duplicate call');
    return;
  }
  g.__f4ToF3TransitionStarted = true;
  
  var remain = global.alivePlayers();
  
  // Clean up Final 4 state to prevent memory leaks
  delete g.__f4PleaInfluence;
  delete g.__f4EvictionResolved;
  delete g.__f4EvictionInProgress;
  // Note: __f4ToF3TransitionStarted is NOT deleted here to prevent duplicate transitions
  // ... rest of function
}
```

**Impact:** Prevents the function from being called multiple times during race conditions.

---

### 2. Additional Guard in `finalizeFinal4Eviction()` (js/veto.js)

**Before:**
```javascript
async function finalizeFinal4Eviction(targetId){
  var g = global.game;
  if(g.__f4EvictionResolved) return;
  if(g.__f4EvictionInProgress) return;
  
  g.__f4EvictionInProgress = true;
  // ... rest of function
}
```

**After:**
```javascript
async function finalizeFinal4Eviction(targetId){
  var g = global.game;
  if(g.__f4EvictionResolved) return;
  if(g.__f4EvictionInProgress) return;
  if(g.__f4ToF3TransitionStarted) return;  // NEW GUARD
  
  g.__f4EvictionInProgress = true;
  // ... rest of function
}
```

**Impact:** Prevents eviction from executing after the transition to Final 3 has already started.

---

### 3. Player Count Validation in `startFinal3Flow()` (js/competitions.js)

**Before:**
```javascript
function startFinal3Flow() {
  showFinalWeekAnnouncement();
}
```

**After:**
```javascript
function startFinal3Flow() {
  const g = global.game;
  const alive = global.alivePlayers();
  
  // VALIDATION: Ensure we have exactly 3 players
  if(alive.length !== 3) {
    console.error('[F3] startFinal3Flow called with wrong player count:', alive.length);
    // If only 2 players, go directly to jury vote
    if(alive.length === 2) {
      console.info('[F3] Only 2 players remaining, skipping to jury vote');
      setTimeout(() => global.startJuryVote?.(), 300);
      return;
    }
    // If more than 3, something is very wrong - log error but continue
    if(alive.length > 3) {
      console.error('[F3] More than 3 players remaining, flow should not have been triggered');
    }
    return;
  }
  
  showFinalWeekAnnouncement();
}
```

**Impact:** Validates player count and handles edge cases gracefully, providing a safety net if race conditions still occur.

---

## Flow Diagram

```
Final 4 Eviction Ceremony
         |
         v
finalizeFinal4Eviction() ←─┐
         |                  │
         | (sets __f4EvictionResolved)
         |                  │
         v                  │
proceedAfterFinal4Eviction() │
         |                  │
         | (sets __f4ToF3TransitionStarted)
         |                  │
         v                  │
  [Guard checks]            │
         |                  │
         v                  │
  Player count = 3?         │
         |                  │
     YES | NO               │
         |  |               │
         |  └─→ Error       │
         |     handling     │
         v                  │
setTimeout(startFinal3Flow, 300ms)
         |                  │
         v                  │
   startFinal3Flow()        │
         |                  │
         | Validate 3 players
         |                  │
         v                  │
   Final 3 Part 1           │
         |                  │
         └──────────────────┘
    (Guards block duplicate calls)
```

## Testing

### New Test File
Created `test_final4_guards.html` to validate:
1. Guard flag initialization
2. `proceedAfterFinal4Eviction()` guard behavior
3. `finalizeFinal4Eviction()` guard behavior
4. `startFinal3Flow()` player count validation

### Automated Tests
All existing tests pass:
- ✅ test:minigames
- ✅ test:runtime-helpers
- ✅ test:e2e
- ✅ test:social
- ✅ test:pov-carousel
- ✅ test:pause-integration
- ✅ test:background-theme

### Code Review
- ✅ Passed with no issues
- ✅ All feedback addressed
- ✅ No new linting errors

## Benefits

1. **Race Condition Protection:** Guards prevent duplicate calls even under fast-forward or multiple simultaneous events
2. **Defensive Validation:** Player count check provides safety net
3. **Clear Debugging:** Console messages help identify if guards are triggered
4. **Minimal Changes:** Surgical fixes that don't affect other game flows
5. **Backward Compatible:** No breaking changes to existing functionality

## Edge Cases Handled

1. **Duplicate Fast-Forward Clicks:** Guard blocks second transition attempt
2. **Multiple Event Handlers:** Flag prevents re-entry into critical functions
3. **Only 2 Players:** Gracefully skips to jury vote
4. **More than 3 Players:** Logs error for debugging (shouldn't happen)

## Files Modified

1. `js/veto.js` - Added 2 guards
2. `js/competitions.js` - Added player count validation
3. `test_final4_guards.html` - New test file (not included in main game)

## Conclusion

These minimal, surgical changes add defensive guards to prevent race conditions during the critical Final 4 → Final 3 transition. The implementation follows existing code patterns and maintains backward compatibility while solving the reported bug.
