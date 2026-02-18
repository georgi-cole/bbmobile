# HOH Winner Mismatch & Hold The Wall AFK Exploit - Fix Summary

## Overview
This PR addresses two critical bugs in the BBMobile game:
1. **HOH Winner Mismatch**: Authoritative winner from endurance minigames (Hold The Wall) not being properly applied
2. **Hold The Wall AFK Exploit**: Human players could idle and still potentially win

## Changes Made

### 1. Fix HOH Winner Mismatch (`js/competitions.js`)

**Problem**: The `finishCompPhase()` function was checking the authoritative winner AFTER determining the score-based winner, leading to mismatches where the wrong player would be assigned as HOH.

**Solution**:
- Restructured the winner determination logic to check `g.__authoritativeWinner` FIRST
- When an authoritative winner exists, use it directly instead of falling back to score-based logic
- Clear the `__authoritativeWinner` flag immediately after use to prevent stale state
- Only use score-based determination when no authoritative winner is present

**Key Code Changes** (lines 1720-1784):
```javascript
// NEW: Check authoritative winner FIRST
if (g.__authoritativeWinner && g.__authoritativeWinner.compType === 'hoh') {
  winner = g.__authoritativeWinner.playerId;
  // Clear flag immediately
  delete g.__authoritativeWinner;
} else {
  // Fallback to score-based determination
  // ... existing score logic ...
}
```

**Before**: 
- Score-based winner determined first
- Authoritative winner checked as "defensive measure" after
- Flag cleared at end of function (too late)

**After**:
- Authoritative winner checked and used first
- Score-based logic only runs if no authoritative winner
- Flag cleared immediately after use

---

### 2. Fix Hold The Wall AFK Exploit (`js/minigames/hold-wall.js`)

**Problem**: Human players could remain idle (not holding the wall) and potentially win by clicking at the last moment.

**Solution**:
1. **Increased grace period to 3 seconds** (line 29)
   - Changed from `2000ms` to `3000ms`
   
2. **Disabled wall interaction after AFK drop** (lines 403-410)
   - Set `wallPanel.style.pointerEvents = 'none'`
   - Set `cursor: not-allowed`
   - Reduced opacity to 0.5
   - Applied grayscale filter
   - Updated status message with error color

3. **Prevented interaction if already dropped** (lines 604-610)
   - Added check in `handleMouseDown()` to return early if player has `dropTimeMs !== null`
   - Logs attempt and ignores click

**Key Code Changes**:
```javascript
// Grace period increased
const GRACE_PERIOD_MS = 3000; // Was 2000

// AFK drop UI feedback
wallPanel.style.cursor = 'not-allowed';
wallPanel.style.opacity = '0.5';
wallPanel.style.filter = 'grayscale(100%)';
wallPanel.style.pointerEvents = 'none';
statusMsg.textContent = 'You were dropped for being AFK!';
statusMsg.style.color = '#ff4444';

// Prevent interaction after drop
function handleMouseDown(e){
  if(state !== 'playing' || hasEnded) return;
  
  // Check if human was already dropped
  const playerParticipant = participants.find(p => p.isPlayer);
  if(playerParticipant && playerParticipant.dropTimeMs !== null){
    console.log('[HoldWall] Ignoring click - human was already dropped for AFK');
    return;
  }
  // ... rest of function
}
```

---

## Testing

### Automated Tests

**New Test Script**: `scripts/test-hold-wall-hoh-winner.mjs`
- Static code analysis tests
- Verifies authoritative winner logic is present and correct
- Tests AFK detection implementation
- Validates grace period is 3 seconds
- Checks UI feedback mechanisms
- Integrated into npm test suite: `npm run test:hold-wall-hoh`

**Test Results**: ✅ All 5 tests passing

### Manual Testing

**New Test Page**: `test_hold_wall_hoh_winner.html`
- Interactive browser-based test harness
- Four test scenarios:
  1. **Test 1: Human Wins** - Verifies human can become HOH
  2. **Test 2: AI Wins** - Verifies AI can become HOH
  3. **Test 3: Human AFK** - Verifies AFK human is dropped and cannot win
  4. **Test 4: Full Game** - Play actual Hold The Wall minigame

### Security Check
- ✅ CodeQL analysis: No vulnerabilities found
- ✅ ESLint: No errors (warnings only in pre-existing code)

### CI Integration
- Tests added to `npm run test:all` suite
- Will run on every CI build

---

## Verification Steps

1. **Run automated tests**:
   ```bash
   npm run test:hold-wall-hoh
   ```

2. **Manual browser testing**:
   - Open `test_hold_wall_hoh_winner.html` in browser
   - Run Test 3 (Human AFK) to verify AFK prevention
   - Observe wall becomes unclickable after 3 seconds
   - Verify human is dropped and cannot win

3. **In-game testing**:
   - Start a new game
   - Play Hold The Wall as HOH competition
   - Verify winner of minigame becomes HOH in game state
   - Test AFK scenario: don't click wall within 3 seconds

---

## Impact

### Fixed Issues
1. ✅ HOH winner now correctly matches Hold The Wall minigame winner
2. ✅ Human players can no longer exploit AFK to win
3. ✅ Authoritative winner flag is properly cleaned up

### No Breaking Changes
- All existing functionality preserved
- Only affects endurance minigames with authoritative winners
- Score-based fallback still works for other minigames

### Files Modified
- `js/competitions.js` - HOH winner logic
- `js/minigames/hold-wall.js` - AFK prevention
- `package.json` - Added new test script
- `scripts/test-hold-wall-hoh-winner.mjs` - New automated tests
- `test_hold_wall_hoh_winner.html` - New manual test page

---

## Related Issues

This PR addresses the issues mentioned in PR #1271 where:
- Debug logs showed `game.hohId` being set inconsistently
- Winner mismatch occurred (user won but HOH assigned to Rey)
- The previous fix attempted to address this but didn't restructure the logic properly

**Root Cause**: The authoritative winner was being checked as a "defensive measure" after the winner was already determined, rather than being the primary source of truth.

**This Fix**: Makes the authoritative winner the PRIMARY source of truth, only falling back to score-based logic when no authoritative winner is present.

---

## Testing Checklist

- [x] Automated tests pass
- [x] CodeQL security scan clean
- [x] ESLint no errors
- [x] Manual test scenarios documented
- [x] CI integration complete
- [x] No breaking changes
- [x] All existing tests still pass

---

## Next Steps

1. Merge this PR
2. Test in production with real gameplay
3. Monitor for any edge cases
4. Consider applying same authoritative winner pattern to POV competitions if similar issues arise
