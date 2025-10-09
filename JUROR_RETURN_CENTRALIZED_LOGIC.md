# Juror Return Centralized Logic Implementation

## Problem Statement
Previously, juror return announcement modals appeared at week transitions even when the twist should not activate under the new rules (alive < 5, insufficient jurors, or odds not met). PR #140 gated the execution flows (twists.js and jury_return_vote.js) but the announcement path in the week intro flow still used looser checks. This caused perceived misalignment: users saw a Juror Return modal even if the twist wouldn't run.

## Solution
Centralized the juror return gating logic in `js/twists.js` and reused it across all announcement and execution paths to ensure consistency.

## Implementation Details

### 1. Centralized Helper Functions (js/twists.js)

Added 6 helper functions at the top of the IIFE:

#### `getInitialPlayersCount(g)`
- Determines initial player count for the season
- Prefers `g.__initialPlayers` if already set
- Falls back to `g.cfg.numPlayers` or calculates from current roster
- Caches result in `g.__initialPlayers` for future calls

#### `getJurorReturnRequiredJurors(initialPlayers)`
- Returns 5 if initial players > 10
- Returns 4 if initial players ≤ 10
- Simple, pure function with no side effects

#### `hasJurorReturnRun(g)`
- Returns true if either `g.__jurorReturnDone` OR `g.__americaReturnDone` is set
- Unified check for both flag variants

#### `isJurorReturnEligible(g)`
- Checks all non-RNG eligibility criteria:
  - Jury house enabled (`g.cfg.enableJuryHouse`)
  - Twist hasn't already run (`hasJurorReturnRun()`)
  - At least 5 alive players
  - Sufficient jurors (based on `getJurorReturnRequiredJurors()`)
  - At least 1 juror exists
- Does NOT roll RNG - pure eligibility check

#### `getJurorReturnChance(cfg)`
- Parses chance from multiple config keys:
  - `cfg.juryReturnChance`
  - `cfg.jurorReturnChance`
  - `cfg.returnChance`
  - `cfg.pJuryReturn`
- Normalizes to 0-100 percentage:
  - Values > 1 treated as 0-100
  - Values ≤ 1 treated as 0-1 (e.g., 0.5 = 50%)

#### `decideJurorReturnThisWeek(g)` ⭐ KEY FUNCTION
- **Cached Decision**: Checks if decision already made for current week
- If cached for this week, returns cached result immediately
- Otherwise:
  1. Checks eligibility via `isJurorReturnEligible()`
  2. If not eligible, caches `{week, pass: false}` and returns false
  3. If eligible, rolls RNG using `rand()` (respects global.rng if available)
  4. Caches result as `{week, pass: true/false}`
- **Critical**: RNG is rolled ONCE per week, preventing double-rolling

### 2. Global Exposure
```javascript
global.isJurorReturnEligible = isJurorReturnEligible;
global.decideJurorReturnThisWeek = decideJurorReturnThisWeek;
```

### 3. Updated Call Sites

#### js/twists.js - `startAmericaReturnVote()`
**Before**: 50+ lines of duplicate eligibility checks
**After**: Single call to `decideJurorReturnThisWeek(g)`

```javascript
async function startAmericaReturnVote(){
  const g=global.game||{};
  
  // Use centralized decision logic (includes eligibility + RNG, cached per week)
  if(!decideJurorReturnThisWeek(g)){
    return resumeWeekAfterReturn();
  }

  // ======= TWIST ACTIVATED - SET FLAGS =======
  g.__americaReturnDone=true;
  g.__jurorReturnDone=true;
  
  const jurors=Array.isArray(g.juryHouse)?g.juryHouse.slice():[];
  // ... rest of activation logic
}
```

#### js/jury_return_vote.js - `runJurorReturnTwist()`
**Strategy**: Use centralized helpers if available, fallback to local checks

```javascript
async function runJurorReturnTwist() {
  const g=global.game||{};
  
  // Use centralized decision logic (includes eligibility + RNG, cached per week)
  if(typeof global.decideJurorReturnThisWeek === 'function'){
    if(!global.decideJurorReturnThisWeek(g)) return;
  } else {
    // Fallback: local eligibility checks (mirrors old behavior)
    // ... 20 lines of fallback checks
  }

  // ======= TWIST ACTIVATED - SET FLAGS =======
  g.__americaReturnDone=true;
  g.__jurorReturnDone=true;
  
  // ... rest of twist logic
}
```

#### js/ui.week-intro.js - `showTwistAnnouncementIfNeeded()`
**Critical Change**: Modal only shows if twist will actually activate

```javascript
// Check for juror return (based on centralized decision logic)
else if (typeof global.decideJurorReturnThisWeek === 'function') {
  // Use centralized helper if available (includes eligibility + RNG)
  if (global.decideJurorReturnThisWeek(g) && !g.__jurorReturnModalShown) {
    twistConfig = {
      title: 'House Shock!',
      emojis: '👁️⚖️🔙',
      subtitle: 'A jury member re-enters the house!',
      tone: 'special',
      duration: 4000
    };
    g.__jurorReturnModalShown = true;
  }
}
// Fallback for legacy behavior (if helpers not loaded)
else if (g.__jurorReturnPending || ...) {
  // ... old logic
}
```

### 4. Flag Normalization

#### js/jury_return.js - `finalize()`
```javascript
async function finalize(){
  const g=global.game||{};
  const st=ensureState();
  if(st.finished) return;

  // Normalize once-per-season flags: set both to ensure consistency
  g.__jurorReturnDone=true;
  g.__americaReturnDone=true;

  // ... rest of finalize logic
}
```

## Key Benefits

### 1. Single Source of Truth
All code paths use the same eligibility and decision logic, eliminating inconsistencies.

### 2. RNG Rolled Once Per Week
The cached decision prevents double-rolling, ensuring the same week always gets the same result.

### 3. Announcement Matches Execution
The week intro modal now uses `decideJurorReturnThisWeek()`, so it only appears when the twist will actually activate.

### 4. Backward Compatible
All changes include fallbacks, so if `twists.js` loads after `jury_return_vote.js`, the local checks still work.

### 5. Flag Consistency
Both `__jurorReturnDone` and `__americaReturnDone` are set together, preventing edge cases.

## Test Coverage

### Manual Test Scenarios (test_juror_return_manual.html)

1. **Scenario 1: Insufficient Alive Players**
   - 6 players initially, 5 evicted → 1 alive (need 5+)
   - Result: ❌ Not eligible, does not activate

2. **Scenario 2: Insufficient Jurors**
   - 12 players, 3 jurors (need 5 for >10 players)
   - Result: ❌ Not eligible, does not activate

3. **Scenario 3: All Conditions Met, 100% Chance**
   - 10 players, 4 jurors, 6 alive, 100% chance
   - Result: ✅ Eligible, activates

4. **Scenario 4: All Conditions Met, 20% Chance**
   - Same as #3 but 20% chance
   - Result: ✅ Eligible, RNG-based activation (cached)

5. **Scenario 5: Already Run (Flag Check)**
   - Same as #3 but `__jurorReturnDone=true`
   - Result: ❌ Not eligible (already ran), does not activate

6. **Scenario 6: Decision Caching**
   - Call twice in week 1, then once in week 2
   - Result: ✅ Same result for same week, recalculated for new week

## Edge Cases Handled

1. **No Config**: Falls back to default values (12 players, 0% chance)
2. **Missing Global Functions**: Fallback logic in `jury_return_vote.js`
3. **Legacy Scripts**: `ui.week-intro.js` has fallback for old behavior
4. **Multiple Flag Variants**: Both `__jurorReturnDone` and `__americaReturnDone` checked/set
5. **RNG Source**: Uses `global.rng()` if available, else `Math.random()`
6. **Initial Player Count**: Multiple fallbacks (config → cached → calculated)

## Files Modified

1. **js/twists.js** (+126 lines): Added centralized helpers and updated `startAmericaReturnVote()`
2. **js/jury_return_vote.js** (~20 lines modified): Updated `runJurorReturnTwist()` to use helpers
3. **js/ui.week-intro.js** (+13 lines): Updated `showTwistAnnouncementIfNeeded()` to use helpers
4. **js/jury_return.js** (+3 lines): Normalized flags in `finalize()`
5. **test_juror_return_manual.html** (new): Manual test page for validation
6. **test_juror_return_centralized.html** (new): Automated test suite

## Validation

Run manual tests:
```bash
# Start local server
python3 -m http.server 8080

# Open in browser
http://localhost:8080/test_juror_return_manual.html
```

All 6 scenarios should pass with correct eligibility and activation results.

## Future Considerations

1. **TypeScript Definitions**: Consider adding type definitions for the helper functions
2. **Unit Tests**: Could add Jest/Mocha tests for the helper functions
3. **Telemetry**: Could log decision outcomes for analytics
4. **Configuration UI**: Could expose required juror thresholds in settings

## Conclusion

This implementation successfully centralizes juror return logic, ensuring announcements only appear when the twist will actually activate. The cached per-week decision prevents RNG double-rolling, and the comprehensive fallbacks maintain backward compatibility.
