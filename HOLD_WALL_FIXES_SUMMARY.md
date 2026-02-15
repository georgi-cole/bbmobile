# Hold the Wall Challenge - Critical Fixes

## Issue Summary

This PR addresses two critical bugs in the Hold the Wall minigame that were causing incorrect game behavior:

1. **Wrong Player Count for HOH Competitions** 
2. **Incorrect Winner Determination When Player Releases Early**

---

## Issue 1: Wrong Player Count for HOH

### Problem

HOH competitions were starting with **all non-evicted players**, but according to Big Brother rules, the **previous HOH winner should be excluded** from competing (with exceptions for Week 1 and Final 3).

### Example of Bug

```
Week 2, 8 players alive, Player 3 was HOH in Week 1
Bug: All 8 players compete in HOH ❌
Expected: 7 players compete (Player 3 excluded) ✅
```

### Root Cause

In `js/minigames/hold-wall.js`, the `getEligibleParticipants()` function (line 100-140) was returning:

```javascript
// OLD CODE (BUGGY)
// HOH or unknown: All non-evicted players
return players.filter(p => !p.evicted);
```

This didn't check for previous HOH exclusion.

### Solution

Added proper HOH eligibility logic matching the rules in `competitions.js`:

```javascript
// NEW CODE (FIXED)
// For HOH competitions, apply previous HOH exclusion rule
if (compType === 'hoh') {
  const alive = eligible;
  const week = g.game.week || 1;
  const lastHOHId = g.game.lastHOHId;
  const lastHOHWeek = g.game.lastHOHWeek;
  
  // Exclude previous HOH unless:
  // 1. It's Week 1 (everyone competes)
  // 2. It's Final 3 (alive.length === 3, everyone competes)
  // 3. The lastHOH was not from the previous week
  const shouldExcludePreviousHOH = 
    alive.length > 3 &&           // Not Final 3
    week > 1 &&                   // Not Week 1
    lastHOHId &&                  // Previous HOH exists
    lastHOHWeek === (week - 1);   // Previous HOH was from last week
  
  if (shouldExcludePreviousHOH) {
    eligible = eligible.filter(p => p.id !== lastHOHId);
    console.log(`[HoldWall] Excluding previous HOH (id: ${lastHOHId}) from competition`);
  }
}
```

### Verification

When an HOH competition starts in Week 2+, check the console for:
```
[HoldWall] Excluding previous HOH (id: X) from competition
```

---

## Issue 2: Incorrect Winner Determination

### Problem

When the player released early (before AI participants finished dropping), any AI participants who **hadn't dropped yet** were placed **ahead of the player** in the final standings, even though:
- The player was the last one still holding when they released
- The AI participants never actually outlasted the player
- The game ended immediately when the player dropped

### Example of Bug

```
Scenario:
- Player holds for 45 seconds, then releases
- AI Participant 1 dropped at 20s
- AI Participant 2 dropped at 30s  
- AI Participants 3, 4, 5 haven't dropped yet (still "holding")

Bug (Final Standings):
1st: AI Participant 3 (never dropped) ❌
2nd: AI Participant 4 (never dropped) ❌
3rd: AI Participant 5 (never dropped) ❌
4th: Player (45s) ❌
5th: AI Participant 2 (30s)
6th: AI Participant 1 (20s)

Expected (Final Standings):
1st: Player (45s) ✅
2nd: AI Participant 3 (45s - marked as dropped when game ended) ✅
3rd: AI Participant 4 (45s - marked as dropped when game ended) ✅
4th: AI Participant 5 (45s - marked as dropped when game ended) ✅
5th: AI Participant 2 (30s)
6th: AI Participant 1 (20s)
```

### Root Cause

In the "lose path" (lines 1208-1246), when the player dropped:

1. Any AI participants who hadn't been processed to drop yet were still considered "holding"
2. These "still holding" participants were placed **first** in the final standings
3. The player (who actually was the last to drop) was ranked **behind** them

```javascript
// OLD CODE (BUGGY)
const stillHolding = participants.filter(p => p.dropTimeMs == null && !p.isPlayer);

// Still-holding players get credited as winners
const holdingStandings = stillHolding.map(p => ({
  name: p.name,
  timeMs: holdDuration // Same time as player
}));

// Combine: winners first, then eliminated players
const finalStandings = [...holdingStandings, ...eliminatedStandings]; ❌
```

### Solution

Changed the logic to:
1. Mark all "still holding" AI participants as dropped at the same time as the player
2. Sort **all** participants by drop time (descending = later is better)
3. Participants who dropped at the same time are sorted by their original participant index

```javascript
// NEW CODE (FIXED)
// Get all participants who are still holding (haven't dropped yet)
const stillHolding = participants.filter(p => p.dropTimeMs == null && !p.isPlayer);

// Mark all still-holding AI participants as dropped at the same time as the player
// This ensures they're ranked equally with the player (they all "dropped" when game ended)
stillHolding.forEach(p => {
  p.dropTimeMs = holdDuration;
  eliminationLog.push({ name: p.name, timeMs: holdDuration });
});

// Now all participants have drop times, sort elimination log by time (descending = later is better)
eliminationLog.sort((a, b) => {
  // First sort by time (descending - later is better)
  if (b.timeMs !== a.timeMs) return b.timeMs - a.timeMs;
  
  // If tied on time, maintain original order from participant array
  const pA = participants.find(p => p.name === a.name);
  const pB = participants.find(p => p.name === b.name);
  if (pA && pB) {
    return participants.indexOf(pA) - participants.indexOf(pB);
  }
  return 0;
});

// Final standings is just the sorted elimination log
const finalStandings = eliminationLog; ✅
```

### Verification

When playing Hold the Wall and releasing early:
1. Check the console for final standings log
2. Verify player is ranked by their actual drop time
3. Verify no AI participants who "never dropped" are ahead of the player

---

## Testing

### Automated Tests

All existing test suites pass:
```bash
npm run test:all
```

Results:
- ✅ Minigames validation: PASS
- ✅ Runtime validation: PASS
- ✅ E2E tests: PASS
- ✅ Code review: All feedback addressed
- ✅ CodeQL security scan: 0 vulnerabilities

### Manual Testing

Created new test file: `manual_verify_hold_wall_fixes.html`

Test scenarios:
1. **HOH Eligibility - Normal Week**: Verify previous HOH is excluded
2. **HOH Eligibility - Week 1**: Verify all players can compete
3. **HOH Eligibility - Final 3**: Verify all players can compete
4. **Winner Determination**: Verify correct ranking when player releases early

### Manual Verification Steps

1. **Test HOH Eligibility:**
   - Start a new game
   - Progress to Week 2+
   - Note who won HOH in the previous week
   - Start a new HOH competition
   - Verify the previous HOH is NOT participating

2. **Test Winner Determination:**
   - Open `test_hold_wall_fixes.html` or play the actual game
   - Start Hold the Wall competition
   - Release early (before other participants drop)
   - Check final standings
   - Verify you're ranked correctly (not behind AI participants who never dropped)

---

## Files Changed

- `js/minigames/hold-wall.js` - Core fixes
- `manual_verify_hold_wall_fixes.html` - Manual verification guide

## Security Summary

**No security vulnerabilities introduced.** CodeQL scan returned 0 alerts.

---

## Related Documentation

See also:
- `HOLD_WALL_PR_SUMMARY.md` - Previous fixes (timer and simultaneous drops)
- `HOLD_WALL_FIX_TESTING.md` - Testing guide for previous fixes
- `docs/minigames.md` - Minigame system documentation
