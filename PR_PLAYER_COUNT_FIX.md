# Player Count Range & Randomized Cast - PR Summary

## Changes Overview
This PR implements two related features:
1. **Player Count Range Update**: Changed from 6–22 to 4–16 players
2. **Randomized Cast Selection**: AI players are now randomly sampled each season instead of always using the first N names

## Problem (Original)
Users change the players/cast total in Settings via the Cast tab, the injector logs "apply numPlayers = X" in lobby, but the season still starts with 12 players instead of the selected count (e.g., 6 or 7).

### Root Cause
The `applyPlayers()` function in `js/players-total.js` was calling:
- `g.rebuildGame()`
- `g.buildCast()`
- `g.startOpeningSequence()`

These functions may live under `window.Game` namespace in the current runtime, not directly on `window`. As a result, the rebuild never happened before starting the opening sequence, and the intro sequence would say "12 contestants" even after changing to a different count.

## Solution

### Changes Made

#### 1. js/players-total.js - applyPlayers() function
**Lines modified: 168-177**

Added namespace resolution to support both `window.Game` and direct `window` access:

```javascript
// Support both window.Game namespace and direct window access for backward compatibility
const API = g.Game || g;

if(g.game?.phase === 'lobby'){
  if(typeof API.rebuildGame === 'function'){ API.rebuildGame(false); }
  else if(typeof API.buildCast === 'function'){ API.buildCast(); }
  if(typeof API.startOpeningSequence === 'function'){ setTimeout(()=>API.startOpeningSequence(), 60); }
  g.addLog?.(`New season started with ${val} players.`,'ok');
}
```

**Key improvement:** Uses `const API = g.Game || g` pattern to:
- First check if functions exist under `window.Game` namespace
- Fall back to direct `window` access for backward compatibility
- Ensures the rebuild actually happens before the opening sequence starts

#### 2. js/bootstrap.js - buildCast() function
**Line modified: 126**

Added clarifying comment to document that the function correctly reads from config:

```javascript
// Read target cast size from config when creating players
const N = +(g.cfg?.numPlayers) || 12;
```

**Verification:** 
- ✅ `buildCast()` already correctly reads `cfg().numPlayers`
- ✅ `rebuildGame(false)` correctly calls `buildCast()` to create fresh cast with new player count
- ✅ No hardcoded player count that would prevent the new value from propagating

### Backward Compatibility
The fix maintains full backward compatibility:
- When `window.Game` namespace exists → uses it
- When functions are directly on `window` (legacy) → falls back seamlessly
- No changes required to existing code that relies on either pattern

## Testing

Created `test_player_count_fix.html` with three test scenarios:

1. **Test 1: Legacy Mode** - Verifies functions on direct `window` object still work
2. **Test 2: window.Game Namespace** - Verifies fix works with `window.Game` namespace
3. **Test 3: buildCast reads cfg().numPlayers** - Verifies config is correctly read

All tests validate:
- Correct namespace resolution
- Function calls reach the right targets
- Config values propagate correctly

## Acceptance Criteria Met

✅ **Changing numPlayers via Cast tab (#numPlayersCast) triggers real rebuild in lobby**
- The fix ensures `API.rebuildGame(false)` is called correctly
- Opening sequence shows the new count, not hardcoded 12

✅ **Mid-season change still reloads**
- Unchanged behavior: reload happens when not in lobby phase

✅ **No regressions when Game namespace is not present**
- Fallback to `g` (window) ensures legacy path still works
- `API = g.Game || g` pattern handles both cases

## New Features

### 1. Player Count Range (4–16)
All player count logic has been updated to support 4–16 players instead of 6–22:
- UI input fields now have `min="4" max="16"` attributes
- All clamping logic updated to enforce 4–16 range
- Comments updated throughout codebase

**Files Updated:**
- `js/players-total.js` - Updated min/max attributes, clamp calls, and comments
- `js/bootstrap.js` - Updated clampNum call from (12,6,22) to (12,4,16) 
- `js/settings/render.js` - Updated clamp logic from Math.max(6, Math.min(22,...)) to Math.max(4, Math.min(16,...))
- `js/settings.js` - Updated min/max attributes and clamp logic (deprecated file, updated for consistency)

**Testing:**
- 4 players: 1 human + 3 AI
- 16 players: 1 human + 15 AI
- Values below 4 clamp to 4
- Values above 16 clamp to 16

### 2. Randomized Cast Selection
AI players are now randomly sampled from the roster pool each time a new season starts:

**Implementation:**
- Added `sampleUnique()` helper function using Fisher-Yates shuffle
- Human player (index 0) is always created first
- Remaining (N-1) AI players are randomly sampled from the 26-name roster pool
- Each season restart produces a different AI cast (statistical randomness)
- `rebuildGame(false)` triggers fresh randomization
- `rebuildGame(true)` preserves existing players (no randomization)

**Roster Pool (26 names):**
Finn, Mimi, Rae, Nova, Kai, Zed, Ivy, Ash, Lux, Remy, Blue, Jax, Echo, Vee, Sol, Quinn, Aria, Dex, Rune, Bea, Nico, Pax, Noa, Kian, Lia, Rey

**User Impact:**
- Restarting a season with the same player count now produces variety in the AI cast
- No longer limited to seeing "Finn, Mimi, Rae, Nova..." every time
- Player customizations may not persist across seasons since player IDs change with new random selection (this is expected behavior for fresh seasons)

**Code Location:**
- `js/bootstrap.js` lines ~146-210: Added sampleUnique() and updated buildCastInternal()

## Files Changed
- `js/players-total.js` - Updated player range 6-22 → 4-16 (comments, attributes, clamp calls)
- `js/bootstrap.js` - Updated player range + added randomized cast selection with sampleUnique()
- `js/settings/render.js` - Updated clamp logic for 4-16 range
- `js/settings.js` - Updated min/max attributes and clamp logic (deprecated file)
- `test_player_count_fix.html` - 337 lines added (new test file from previous fix)
- `PR_PLAYER_COUNT_FIX.md` - Updated documentation to reflect both changes

## Impact
This update provides:
1. More flexible player counts (4–16 instead of 6–22), allowing smaller and more manageable game sizes
2. Improved replayability through randomized AI cast selection each season
3. Fresh gameplay experience when restarting with the same player count
4. Correct config propagation and cast building (from original fix)
