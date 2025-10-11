# Weekly Submission Locks Implementation Summary

## Overview
Implemented weekly submission locks for minigames in competitions to ensure one-and-done gameplay per week/phase. The system persists across page reloads using localStorage and is fully backwards compatible.

## Changes Made

### 1. New Module: js/comp-locks.js
Created a new module that provides submission lock functionality:

**Key Methods:**
- `hasSubmittedThisWeek(week, phase, gameKey, playerId)` - Check if a player has already submitted
- `lockSubmission(week, phase, gameKey, playerId)` - Lock submission for a player
- `clearWeekLocks(week)` - Clear all locks for a specific week (debugging)
- `clearAllLocks()` - Clear all competition locks (debugging)

**Features:**
- Uses localStorage with keys formatted as: `bb_comp_lock_w${week}_${phase}_${gameKey}_p${playerId}`
- Fails gracefully if localStorage is unavailable (returns false to allow play)
- Provides safe fallback with mock storage if localStorage is not available

### 2. Modified: js/competitions.js

**Defensive Loader:**
Added a fallback loader that provides no-op implementations if comp-locks.js is not loaded:
```javascript
if(!global.CompLocks){
  console.warn('[Competition] CompLocks module not found, loading inline fallback');
  global.CompLocks = {
    hasSubmittedThisWeek(){ return false; },
    lockSubmission(){ /* no-op fallback */ }
  };
}
```

**Integration in submitScore:**
After a successful score submission, the system now locks the submission:
```javascript
// Lock submission for this week/phase/game to prevent replay
if(global.CompLocks && label){
  const gameKey = label.split('/')[1] || 'unknown';
  global.CompLocks.lockSubmission(g.week, g.phase, gameKey, id);
}
```

**Integration in Competition Renderers:**
Modified four competition rendering functions to check for locks before rendering minigames:

1. **renderHOH** - HOH Competition
2. **renderF3P1** - Final 3 Part 1
3. **beginF3P2Competition** - Final 3 Part 2 (human player path)
4. **beginF3P3Competition** - Final 3 Part 3 (human player path)

Each function now checks:
```javascript
// Check if player has already submitted this week/phase/game
if(global.CompLocks && global.CompLocks.hasSubmittedThisWeek(g.week, g.phase, mg, playerId)){
  wrap.innerHTML='<div class="tiny muted">You have already submitted for this competition.</div>';
  return;
}
```

### 3. Modified: index.html
Added script tag to load comp-locks.js before competitions.js:
```html
<script defer src="js/comp-locks.js"></script>
<script defer src="js/competitions.js"></script>
```

### 4. Test Files

**test_comp_locks.html**
- Browser-based test suite with manual testing UI
- Tests module loading, lock/unlock functionality, persistence, and integration
- Includes cleanup utilities for testing

**scripts/test-comp-locks.mjs**
- Node.js runtime test suite (16 tests, all passing)
- Tests module structure, functionality, and integration scenarios
- Validates backwards compatibility with localStorage failures

## Key Features

### 1. One-and-Done Gameplay
- Players can only submit once per week/phase/game combination
- Prevents accidental replay or score manipulation
- Clear feedback message when submission is blocked

### 2. Persistence
- Locks persist across page reloads using localStorage
- Keys include week, phase, gameKey, and playerId for precise tracking
- Can be cleared manually using debug methods

### 3. Backwards Compatibility
- Defensive loading ensures the game works even if comp-locks.js is not loaded
- Fails gracefully if localStorage is unavailable
- Does not affect legacy games or existing functionality
- AI players are not affected (only human players are locked)

### 4. Phase-Specific Locking
Each phase is tracked independently:
- HOH competitions (week-based)
- Final 3 Part 1, 2, and 3 (separate phases)
- Different games within same phase are tracked separately

## Testing

### Automated Tests
```bash
npm run test:comp-locks  # (if added to package.json)
# or
node scripts/test-comp-locks.mjs
```

All 16 tests pass:
✅ Module structure tests (5/5)
✅ Functionality tests (8/8)
✅ Integration tests (3/3)

### Manual Testing
Open `test_comp_locks.html` in a browser to:
- Test module loading
- Test lock/unlock operations
- Verify persistence across page reloads
- Test integration scenarios
- Clean up test data

## Usage Example

### Normal Game Flow
1. Player enters HOH competition phase
2. System checks: `CompLocks.hasSubmittedThisWeek(week, 'hoh', 'quickTap', playerId)`
3. If false, minigame renders
4. Player completes minigame
5. Score is submitted via `submitScore()`
6. System calls: `CompLocks.lockSubmission(week, 'hoh', 'quickTap', playerId)`
7. If player tries to play again (e.g., page reload), lock check returns true
8. Message displayed: "You have already submitted for this competition."

### Debug/Testing
```javascript
// Clear all locks for week 1
CompLocks.clearWeekLocks(1);

// Clear all locks
CompLocks.clearAllLocks();
```

## Security Considerations

1. **Client-side only**: This is a UX feature, not a security measure
2. **Can be bypassed**: Players can clear localStorage manually
3. **Purpose**: Prevent accidental replays and improve game flow
4. **Server-side validation**: Would be needed for competitive/multiplayer versions

## Future Enhancements (Not Included)

The following features were explicitly excluded per requirements:
- Anti-cheat mechanisms
- Opponent synthesis
- Server-side validation
- Score verification

## Files Changed

- ✅ `js/comp-locks.js` (new)
- ✅ `js/competitions.js` (modified)
- ✅ `index.html` (modified)
- ✅ `test_comp_locks.html` (new)
- ✅ `scripts/test-comp-locks.mjs` (new)

## Backwards Compatibility

✅ All changes are backwards compatible:
- Works with or without comp-locks.js loaded
- Fails gracefully if localStorage is unavailable
- Does not affect AI players
- Does not modify existing game logic
- Legacy games continue to work normally

## Verification Checklist

- [x] Module loads without errors
- [x] Locks prevent replay of minigames
- [x] Locks persist across page reloads
- [x] Different weeks/phases/games are tracked independently
- [x] Multiple players can be locked independently
- [x] Fails gracefully without localStorage
- [x] Defensive loader works if module not included
- [x] No impact on AI players
- [x] All automated tests pass
- [x] Manual tests work correctly
- [x] No syntax errors
- [x] Backwards compatible with existing code
