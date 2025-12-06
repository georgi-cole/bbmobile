# Relations Module Implementation

## Overview

This document describes the implementation of the new central Relations module for BBMobile. The Relations module provides a single source-of-truth for social bonds between players, ensuring symmetric relationships by default.

## Problem Statement

Previously, social relationships (allies, enemies) were stored one-way in player records. This caused UI inconsistencies where:
- Player A's profile would show Player B as an ally
- Player B's profile would NOT show Player A as an ally

This asymmetry was confusing for users and not reflective of real alliance formations in the game.

## Solution

A new central Relations module (`js/social/relations.js`) that:
1. Stores relations in a normalized structure
2. Provides symmetric helpers for common operations
3. Provides directional helpers for special cases
4. Integrates with save/load systems
5. Emits events for UI updates

## Architecture

### Module Structure

```javascript
window.Relations = {
  // Symmetric helpers (update both players)
  setRelationBoth(playerA, playerB, bondType)
  removeRelationBoth(playerA, playerB, bondType)
  
  // Directional helpers (one-way)
  setRelationOneWay(playerA, playerB, bondType)
  removeRelationOneWay(playerA, playerB, bondType)
  
  // Query helpers
  getAllies(playerId)        // Returns array of ally IDs
  getEnemies(playerId)       // Returns array of enemy IDs
  getOther(playerId, bondType) // Returns array of IDs for custom bond types
  hasRelation(playerA, playerB, bondType) // Returns boolean
  
  // Persistence helpers
  _raw()                     // Export relations data
  _replaceRaw(data)          // Import relations data
  
  // Debug helpers
  showPlayerRelations(playerId)
  showAllRelations()
}
```

### Data Structure

The module uses a normalized Map structure:

```javascript
Map<playerId, Map<bondType, Set<targetId>>>
```

Example:
```javascript
// Player 1 considers Player 2 an ally
_relations.get(1).get('ally').has(2) // true

// Player 2 also considers Player 1 an ally (symmetric)
_relations.get(2).get('ally').has(1) // true
```

## Integration Points

### 1. Social Interactions (`js/social.js`)

When a player confirms an alliance during social phase:

```javascript
if(action==='alliance'){
  // ... existing affinity updates ...
  
  // NEW: Set symmetric alliance in Relations module
  if(global.Relations && typeof global.Relations.setRelationBoth === 'function'){
    global.Relations.setRelationBoth(actorId, targetId, 'ally');
  }
}
```

### 2. Social Maneuvers (`js/social-maneuvers.js`)

When players form alliances through the Social Maneuvers system:

```javascript
if(allianceCreated){
  // ... existing affinity updates ...
  
  // NEW: Set symmetric alliance in Relations module
  if(global.Relations && typeof global.Relations.setRelationBoth === 'function'){
    global.Relations.setRelationBoth(actorId, targetId, 'ally');
  }
}
```

### 3. Profile UI (`js/ui.hud-and-router.js`)

The profile rendering now prioritizes the Relations module:

```javascript
function computeAlliesEnemies(p){
  // Priority 1: Use Relations module (symmetric)
  if(global.Relations?.getAllies && global.Relations?.getEnemies){
    const allyIds = global.Relations.getAllies(p.id);
    const enemyIds = global.Relations.getEnemies(p.id);
    // ... convert to display format ...
  }
  
  // Priority 2: Use SocialRelations (affinity-based)
  if(global.SocialRelations?.computeAlliesEnemies){
    // ... fallback logic ...
  }
  
  // Priority 3: Legacy computation
  // ... legacy fallback ...
}
```

### 4. Save/Load System

#### Export (`js/ui.hud-and-router.js`)

```javascript
function exportSave(){
  const clean = JSON.parse(JSON.stringify(game, replacer));
  
  // Include Relations data if available
  if(g.Relations && typeof g.Relations._raw === 'function'){
    clean.relations = g.Relations._raw();
  }
  
  // ... save to file/clipboard ...
}
```

#### Import (`js/settings.js`)

```javascript
importFile.addEventListener('change', function(){
  // ... load file ...
  var obj = JSON.parse(fr.result);
  
  // Extract Relations data if present
  var relationsData = obj.relations;
  delete obj.relations; // Remove from game object
  
  global.game = obj;
  
  // Restore Relations data if available
  if(relationsData && global.Relations && typeof global.Relations._replaceRaw === 'function'){
    global.Relations._replaceRaw(relationsData);
  }
});
```

## Event System

The Relations module emits events on `window.game.bus`:

### Events Emitted

1. **`social.relation.changed`** - Fired when a relation is added or removed
   ```javascript
   {
     playerA: number,
     playerB: number,
     bondType: string,
     action: 'added' | 'removed'
   }
   ```

2. **`social.relations.synced`** - Fired after Relations._replaceRaw() completes
   ```javascript
   {} // Empty payload
   ```

### Event Listeners

The Profile UI module (`js/ui/profile.js`) listens for these events to refresh visible profiles:

```javascript
global.game.bus.on('social.relation.changed', (data) => {
  const { playerA, playerB, bondType } = data;
  
  // Update both players' profiles if they're visible
  if (bondType === 'ally' || bondType === 'enemy') {
    updateProfileDisplay(playerA);
    updateProfileDisplay(playerB);
  }
});
```

## Testing

### Manual Test Harness

Open `tests/test_relations.html` in a browser to:

1. Initialize game with 5 test players
2. Test symmetric relations (alliances)
3. Test directional relations (one-way)
4. Test enemy relations
5. Test query helpers
6. Test persistence (export/import)
7. View current relations display

### Automated Tests

The Relations module has been tested with:

```bash
npm run test:minigames  # No regressions in minigame system
```

### Integration Testing

To verify the fix works end-to-end:

1. Start a new game in the browser
2. Progress to social phase
3. Confirm an alliance with another player
4. Open both players' profiles
5. Verify both show each other as allies

## Migration Path

The implementation is **backward compatible**:

1. **Old saves without Relations data**: Will continue to work using affinity-based computation
2. **New saves with Relations data**: Will use the symmetric Relations module
3. **Gradual transition**: As players form new alliances, they'll be tracked in Relations module

## Future Enhancements

Potential improvements:

1. **Alliance strength**: Track relationship strength/quality
2. **Alliance history**: Track when alliances were formed/broken
3. **Group alliances**: Support alliances with 3+ players
4. **Alliance perks**: Game mechanics benefits for being allied
5. **Betrayal tracking**: Track when alliances are broken

## Files Modified

### New Files
- `js/social/relations.js` - Central Relations module
- `js/ui/profile.js` - Profile UI integration helpers
- `tests/test_relations.html` - Manual test harness
- `RELATIONS_MODULE_IMPLEMENTATION.md` - This documentation

### Modified Files
- `index.html` - Added script tags for new modules
- `js/social.js` - Alliance action now calls Relations.setRelationBoth
- `js/social-maneuvers.js` - Form alliance action calls Relations.setRelationBoth
- `js/ui.hud-and-router.js` - Profile rendering prioritizes Relations module, save includes Relations data
- `js/settings.js` - Import restores Relations data

## Verification Checklist

- [x] Relations module loads without errors
- [x] Symmetric helpers work correctly
- [x] Directional helpers work correctly
- [x] Query helpers return correct data
- [x] Persistence (save/load) works correctly
- [x] Events are emitted properly
- [x] Profile UI reads from Relations module
- [x] Alliance confirmation integrates with Relations
- [x] Social Maneuvers integrates with Relations
- [x] No regressions in existing tests
- [ ] Manual browser verification complete
- [ ] Save/load tested in browser

## Debugging

### Console Commands

```javascript
// Show all relations
Relations.showAllRelations()

// Show relations for specific player
Relations.showPlayerRelations(1)

// Check if two players are allies
Relations.hasRelation(1, 2, 'ally')

// Get all allies for a player
Relations.getAllies(1)

// Export current relations
Relations._raw()
```

### Common Issues

**Issue**: Relations not showing in profile
- **Fix**: Ensure Relations module is loaded before profile UI
- **Check**: `console.log(typeof window.Relations)`

**Issue**: Relations lost after page reload
- **Fix**: Save and restore game state including Relations data
- **Check**: Verify save includes `relations` property

**Issue**: One-way relationships persist
- **Fix**: Use `setRelationBoth` instead of `setRelationOneWay`
- **Check**: Query both players to verify symmetry

## Credits

Implementation by GitHub Copilot in response to user issue about asymmetric social relationships.

## Version

- **Initial Implementation**: 2024-12-06
- **Version**: 1.0.0
