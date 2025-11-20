# Badge Synchronization Guide

## Overview

This document explains the badge synchronization system in BBMobile and provides guidelines for maintaining it to prevent visual desynchronization bugs.

## What Are Badges?

Badges are visual indicators displayed on player avatars that show their current game status:
- **HOH Badge** (👑): Displayed on the current Head of Household
- **POV Badge** (🔑): Displayed on the Power of Veto holder
- **NOM Badge** (🎯): Displayed on nominated houseguests
- **Combined Badge**: When a player is both HOH and POV holder

## The Badge State System

### Data Model

Badge states are maintained in two places:

1. **Game State** (Source of Truth):
   - `game.hohId` - Current HOH player ID
   - `game.vetoHolder` - Current POV holder ID
   - `game.nominees` - Array of nominated player IDs

2. **Player Objects** (Derived State):
   - `player.hoh` - Boolean flag for HOH badge
   - `player.nominated` - Boolean flag for NOM badge
   - `player.nominationState` - String: 'nominated', 'saved', 'replacement', 'none'

### Synchronization Function

The `syncPlayerBadgeStates()` function (defined in `js/state.js`) ensures that player objects match the game state:

```javascript
function syncPlayerBadgeStates() {
  const g = game;
  const nominees = Array.isArray(g.nominees) ? g.nominees : [];
  const nomineeSet = new Set(nominees);
  
  for(const p of g.players){
    // Sync HOH badge
    p.hoh = (p.id === g.hohId);
    
    // Sync nomination badge and state
    const isNominated = nomineeSet.has(p.id);
    p.nominated = isNominated;
    
    // Only update nominationState if not in transition
    if(p.nominationState !== 'pendingSave' && 
       p.nominationState !== 'saved' && 
       p.nominationState !== 'replacement'){
      p.nominationState = isNominated ? 'nominated' : 'none';
    }
  }
}
```

## Critical Pattern: Sync + Render

**ALWAYS use this two-step pattern after any game state change:**

```javascript
// Step 1: Synchronize badge states
if (typeof global.syncPlayerBadgeStates === 'function') {
  global.syncPlayerBadgeStates();
}

// Step 2: Update the UI to render changes
if (typeof global.updateHud === 'function') {
  global.updateHud();
}
```

### Why Both Calls Are Required

1. **`syncPlayerBadgeStates()`** - Updates player objects to match game state (data layer)
2. **`updateHud()`** - Renders the updated badge states to the UI (visual layer)

If you only call `syncPlayerBadgeStates()`, the data will be correct but the UI won't update.
If you only call `updateHud()`, it will sync internally but the explicit call ensures proper timing.

## Critical Synchronization Points

You **MUST** call the sync+render pattern at these points:

### 1. After HOH Competition Finishes
**Location:** `js/competitions.js` (~line 1234)

```javascript
// After setting g.hohId = winner
if (typeof global.syncPlayerBadgeStates === 'function') global.syncPlayerBadgeStates();
if (typeof global.updateHud === 'function') global.updateHud();
```

**Why:** The new HOH needs their badge immediately visible, and the previous HOH's badge must be removed.

### 2. After POV Competition Finishes
**Location:** `js/veto.js` (~line 773)

```javascript
// After setting game.vetoHolder = winner
if (typeof global.syncPlayerBadgeStates === 'function') global.syncPlayerBadgeStates();
if (typeof global.updateHud === 'function') global.updateHud();
```

**Why:** The POV holder's badge must appear immediately after the competition result.

### 3. After Nominations Are Finalized
**Location:** `js/nominations.js` (~line 503)

```javascript
// After g.nominees array is populated
if (typeof global.syncPlayerBadgeStates === 'function') global.syncPlayerBadgeStates();
```

**Note:** In nominations.js, `updateHud()` is called later after the ceremony completes (line 653, 665).

### 4. After Veto Replacement Is Applied
**Location:** `js/veto.js` - `commitBadgeTransferState()` function

```javascript
// After updating nominee array with replacement
if (typeof global.syncPlayerBadgeStates === 'function') global.syncPlayerBadgeStates();
if (typeof global.updateHud === 'function') global.updateHud();
```

**Why:** When a nominee is saved and replaced, both players' badges must update immediately.

### 5. After Eviction Completes
**Location:** `js/self-eviction.js` (~line 500)

```javascript
// After clearing nominees and evicting player
if (typeof global.syncPlayerBadgeStates === 'function') global.syncPlayerBadgeStates();
if (typeof global.updateHud === 'function') global.updateHud();
```

**Why:** All nomination badges must be cleared, and evicted players shouldn't show badges.

### 6. Before HUD Rendering
**Location:** `js/ui.hud-and-router.js` - `updateHud()` function

```javascript
function updateHud() {
  // ALWAYS sync badges before rendering
  if (typeof g.syncPlayerBadgeStates === 'function') {
    g.syncPlayerBadgeStates();
  }
  // ... render HUD elements
}
```

**Why:** Ensures badges are always in sync whenever the HUD is rendered.

## Special Cases

### Veto Ceremony Transitions

During veto ceremonies, special nomination states are used:
- `pendingSave` - Player is about to be saved
- `saved` - Player has been saved (temporarily)
- `replacement` - Player is being added as replacement

The `syncPlayerBadgeStates()` function respects these transition states and won't overwrite them.

### Final 3 Competition

When the Final 3 HOH is determined:
- Line 1759 in `js/competitions.js`
- Both HOH and nominees are updated
- Must sync+render to show final HOH badge and nominee badges

### Suppressed Badges

During nomination ceremonies, badges can be temporarily suppressed:
```javascript
g.__suppressNomBadges = true;  // Hide badges during ceremony
global.updateHud();
// ... ceremony animations ...
g.__suppressNomBadges = false; // Show badges after ceremony
global.updateHud();
```

## Common Mistakes to Avoid

### ❌ Don't: Manually Set Badge Properties Without Syncing

```javascript
// BAD - Will desynchronize
player.hoh = true;
game.hohId = player.id;
// Missing sync+render!
```

### ✅ Do: Always Use the Sync Pattern

```javascript
// GOOD - Stays synchronized
game.hohId = player.id;
if (typeof global.syncPlayerBadgeStates === 'function') global.syncPlayerBadgeStates();
if (typeof global.updateHud === 'function') global.updateHud();
```

### ❌ Don't: Assume updateHud() Is Enough

```javascript
// BAD - Timing issues possible
game.nominees = [id1, id2];
global.updateHud(); // May render before state propagates
```

### ✅ Do: Explicit Sync Before Render

```javascript
// GOOD - Guaranteed synchronization
game.nominees = [id1, id2];
if (typeof global.syncPlayerBadgeStates === 'function') global.syncPlayerBadgeStates();
if (typeof global.updateHud === 'function') global.updateHud();
```

### ❌ Don't: Forget to Sync After State Changes

```javascript
// BAD - Badges won't update
game.vetoHolder = winnerId;
// Missing sync+render!
// User sees outdated badges
```

### ✅ Do: Always Sync After State Changes

```javascript
// GOOD - Immediate visual feedback
game.vetoHolder = winnerId;
if (typeof global.syncPlayerBadgeStates === 'function') global.syncPlayerBadgeStates();
if (typeof global.updateHud === 'function') global.updateHud();
```

## Testing Badge Synchronization

Use the test file `test_badge_sync.html` to verify badge synchronization:

```bash
# Open in browser
open test_badge_sync.html
```

Test scenarios:
1. Set HOH - verify badge appears immediately
2. Nominate players - verify NOM badges appear
3. Award POV - verify POV badge appears
4. Use veto - verify saved player's badge disappears, replacement badge appears
5. Multiple rapid changes - verify no visual lag or desync

## Debugging Badge Issues

If badges aren't updating correctly:

1. **Check Console Logs:**
   ```javascript
   console.log('[DEBUG] Badge sync check:', {
     hohId: game.hohId,
     vetoHolder: game.vetoHolder,
     nominees: game.nominees,
     playerBadges: game.players.map(p => ({
       id: p.id,
       hoh: p.hoh,
       nominated: p.nominated,
       nominationState: p.nominationState
     }))
   });
   ```

2. **Verify Sync Was Called:**
   - Add temporary logging in `syncPlayerBadgeStates()`
   - Check if it's called after state changes

3. **Verify Render Was Called:**
   - Add temporary logging in `updateHud()`
   - Check if it follows sync calls

4. **Check for Race Conditions:**
   - Are state changes happening asynchronously?
   - Is sync+render being called too early?
   - Add delays if needed: `setTimeout(() => { sync+render }, 10)`

## Maintenance Guidelines

When adding new features:

1. **Identify State Changes:**
   - Does your feature change `hohId`, `vetoHolder`, or `nominees`?
   - If yes, you need sync+render

2. **Add Sync+Render Pattern:**
   - Immediately after state change
   - Use the standard pattern (defensive with type checks)

3. **Test Thoroughly:**
   - Use `test_badge_sync.html`
   - Manually verify in gameplay
   - Check edge cases (Final 3, multiple evictions, etc.)

4. **Document:**
   - Add comments explaining why sync+render is needed
   - Reference this guide in code comments

## Performance Considerations

The sync+render pattern is lightweight:
- `syncPlayerBadgeStates()` - O(n) where n = number of players (~12)
- `updateHud()` - Only updates visible HUD elements
- Combined execution: < 1ms in most cases

**Don't optimize prematurely** - correctness is more important than micro-optimizations.

## References

- Badge sync implementation: `js/state.js` - `syncPlayerBadgeStates()`
- HUD rendering: `js/ui.hud-and-router.js` - `updateHud()`
- Test file: `test_badge_sync.html`

## Version History

- **2025-11-20**: Initial documentation created
- Fixed missing sync+render calls in competitions.js and veto.js
- Established standard pattern for badge synchronization

---

**Remember:** When in doubt, sync+render. It's better to be redundant than to have desynchronized badges!
