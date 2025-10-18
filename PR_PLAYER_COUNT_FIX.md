# Player Count Fix - PR Summary

## Problem
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

## Files Changed
- `js/players-total.js` - 9 lines changed (4 additions, 5 modifications)
- `js/bootstrap.js` - 3 lines changed (1 addition, 2 modifications) 
- `test_player_count_fix.html` - 337 lines added (new test file)

## Impact
This fix resolves the mismatch where the intro sequence announces "12 contestants" after the user has changed the player count to 6, 7, or any other value via Settings. The game will now correctly:
1. Read the updated `numPlayers` from config
2. Rebuild the cast with the correct number of players
3. Start the opening sequence with the updated player count
