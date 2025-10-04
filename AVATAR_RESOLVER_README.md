# Avatar Resolver Module

## Overview

The `avatar-resolver.js` module provides two key functions for managing player avatars in the game:

1. **`resolveAvatar(playerIdOrObject)`** - Resolves the avatar URL for a player
2. **`preloadAllAvatars()`** - Preloads all player avatars for improved performance

## Implementation

### Module Location
- **File:** `js/avatar-resolver.js`
- **Loaded in:** `index.html` (after `state.js` and `avatar.js`)

### API Reference

#### `resolveAvatar(playerIdOrObject)`

Resolves the avatar URL/path for a player with the following priority order:

**Priority Order:**
1. `./avatars/{playerId}.jpg` - Local avatar folder (PRIMARY)
2. `player.avatar` - Custom avatar property
3. `player.img` - Legacy img property
4. `player.photo` - Legacy photo property
5. Dicebear API - Fallback URL

**Parameters:**
- `playerIdOrObject` (string|number|object) - Player ID or player object

**Returns:**
- `string` - Avatar URL/path

**Usage Examples:**
```javascript
// With player ID
const avatarUrl = window.Game.resolveAvatar(1);
// Returns: "./avatars/1.jpg"

// With player object
const player = { id: 5, name: 'Alice' };
const avatarUrl = window.Game.resolveAvatar(player);
// Returns: "./avatars/5.jpg"

// Also available directly on window
const avatarUrl = window.resolveAvatar(1);
```

#### `preloadAllAvatars()`

Preloads avatar images for all players in the game to improve performance by caching images before they're displayed.

**Returns:**
- `Promise<Array<Object>>` - Promise that resolves with array of results

**Result Object:**
```javascript
{
  success: boolean,  // Whether the image loaded successfully
  playerId: number,  // The player ID
  url: string        // The avatar URL that was attempted
}
```

**Usage Examples:**
```javascript
// Preload all avatars
window.Game.preloadAllAvatars().then(results => {
  console.log('Preloading complete!');
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
});

// Or with async/await
async function loadAvatars() {
  const results = await window.preloadAllAvatars();
  console.log('All avatars preloaded:', results);
}

// Call at game start
document.addEventListener('DOMContentLoaded', () => {
  // Wait for game to initialize, then preload
  setTimeout(() => {
    window.Game.preloadAllAvatars();
  }, 1000);
});
```

## Avatar Folder Structure

Place avatar images in the `./avatars/` folder:

```
avatars/
├── .gitkeep
├── 1.jpg         # Player ID 1's avatar
├── 2.jpg         # Player ID 2's avatar
├── 3.jpg         # Player ID 3's avatar
└── ...
```

**Important Notes:**
- Avatar files must be named `{playerId}.jpg`
- The module checks `./avatars/` as the FIRST priority
- If the file doesn't exist (404), the browser will fall back to Dicebear API via `onerror` handlers

## Console Logging

The module provides informative console logging:

```javascript
[avatar-resolver] Preloading avatars for 12 players...
[avatar-resolver] Preloaded avatar for player 1: ./avatars/1.jpg
[avatar-resolver] Failed to preload avatar for player 2: ./avatars/2.jpg
[avatar-resolver] Preloading complete: 8 successful, 4 failed
```

## Integration with Existing Code

The module is **fully compatible** with existing code:

- Works alongside `js/avatar.js` (avatar-resolver.js overrides the functions)
- Uses the same function names, so existing code continues to work
- Optional chaining in UI code ensures no errors if module isn't loaded
- Maintains backward compatibility with all existing avatar properties

### Example Integration

```javascript
// In UI code (already implemented in ui.hud-and-router.js)
const avatarUrl = (window.Game || window).resolveAvatar?.(player) 
  || player.avatar 
  || player.img 
  || `https://api.dicebear.com/6.x/bottts/svg?seed=${player.name}`;
```

## Testing

### Test File
- **test_avatar_resolver_new.html** - Comprehensive test suite

### Manual Testing
1. Open `test_avatar_resolver_new.html` in a browser
2. Verify all tests pass
3. Click "Run preloadAllAvatars()" to test preloading

### Console Testing
```javascript
// In browser console after game loads
window.Game.resolveAvatar(1)  // Test resolution
window.Game.preloadAllAvatars()  // Test preloading
```

## Benefits

1. **Performance** - Preloading avatars reduces load time during gameplay
2. **Local-First** - Prioritizes local `./avatars/` folder before external APIs
3. **Flexible** - Accepts both player IDs and player objects
4. **Robust** - Graceful fallback chain ensures avatars always display
5. **Efficient** - Asynchronous preloading doesn't block game initialization

## Differences from avatar.js

The key difference between `avatar.js` and `avatar-resolver.js`:

**avatar.js priority:**
1. player.avatar
2. player.img
3. player.photo
4. ./avatars/{id}.jpg
5. Dicebear API

**avatar-resolver.js priority (THIS MODULE):**
1. **./avatars/{id}.jpg** ← PRIMARY
2. player.avatar
3. player.img
4. player.photo
5. Dicebear API

**Result:** avatar-resolver.js ALWAYS checks the `./avatars/` folder first, making it the preferred module for local avatar management.

## When to Call preloadAllAvatars()

**Recommended times to call:**

1. **After game initialization:**
```javascript
// In bootstrap.js or after game.players is populated
if (window.game?.players?.length > 0) {
  window.Game.preloadAllAvatars();
}
```

2. **On new game start:**
```javascript
// After starting a new game
function startNewGame() {
  initializePlayers();
  window.Game.preloadAllAvatars();  // Preload after players created
}
```

3. **Manually via console:**
```javascript
// For testing or manual trigger
window.Game.preloadAllAvatars()
```

**Not required but improves performance** - The function is optional and avatars will still load on-demand if not preloaded.

## Future Enhancements

Potential improvements:
- Support for multiple image formats (.png, .gif, .webp)
- Selective preloading (only active players)
- Progress callbacks during preloading
- Cache management and invalidation
- Integration with service worker for offline support

---

**Module Version:** 1.0  
**Last Updated:** 2024  
**Compatibility:** Modern browsers with ES6+ support
