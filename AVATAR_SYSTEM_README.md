# Avatar System Integration

## Overview

A centralized avatar resolution system has been implemented to provide consistent avatar handling across the application using the `./avatars/` folder.

## Implementation

### Core Module: `js/avatar.js`

The avatar system provides two main functions:

#### `resolveAvatar(playerIdOrObject)`

Resolves the best avatar for a player with the following priority:

1. **player.avatar** - If defined in player object
2. **player.img** - Legacy property support
3. **player.photo** - Legacy property support  
4. **./avatars/{playerId}.jpg** - Local avatar folder
5. **Dicebear API fallback** - `https://api.dicebear.com/6.x/bottts/svg?seed={name}`

**Usage:**
```javascript
// With player ID
const avatarUrl = window.Game.resolveAvatar(playerId);

// With player object
const avatarUrl = window.Game.resolveAvatar(playerObject);
```

#### `getAvatarFallback(name)`

Returns a Dicebear API fallback URL for use in `onerror` handlers.

**Usage:**
```javascript
const fallbackUrl = window.Game.getAvatarFallback(playerName);

// In HTML
<img src="${resolveAvatar(player)}" 
     onerror="this.onerror=null;this.src='${getAvatarFallback(player.name)}'">
```

## Integration Points

### Files Updated

1. **index.html**
   - Added `<script src="js/avatar.js"></script>` after state.js

2. **js/state.js**
   - New players created with avatar path: `./avatars/{id}.jpg`
   - Allows automatic resolution via resolveAvatar

3. **js/ui.hud-and-router.js**
   - Roster rendering uses `g.resolveAvatar?.(p)` with fallback

4. **js/ui.config-and-settings.js**
   - Cast editor chips use `resolveAvatar?.(p)`
   - Preview images use `resolveAvatar?.(p)`
   - Fallback integration for onerror handlers

5. **js/ui.overlay-and-logs.js**
   - Card overlay faces use `resolveAvatar?.(p||id)`

### Compatibility

- **Backward compatible**: All integrations include fallbacks to original logic
- **Non-breaking**: Uses optional chaining (`?.`) to prevent errors if avatar.js isn't loaded
- **Existing code preserved**: jury.js maintains its own getAvatar implementation with [jury] logging

## Avatar Folder Structure

```
avatars/
├── .gitkeep
├── 1.jpg         # Player ID 1's avatar
├── 2.jpg         # Player ID 2's avatar
├── 3.jpg         # Player ID 3's avatar
└── ...
```

Place player avatar images in the `avatars/` folder with the naming convention `{playerId}.jpg`.

## Testing

### Test Files

- **test_avatar_resolver.html** - Unit tests for resolveAvatar function
- **test_avatar_integration.html** - Full integration test suite

### Running Tests

Open either test file in a browser to verify:
- Core function availability
- Priority order correctness
- Fallback behavior
- Edge case handling
- Integration points

### Manual Testing

1. Add an image to `avatars/` folder (e.g., `avatars/1.jpg`)
2. Start a new game
3. Player with ID 1 will use `avatars/1.jpg`
4. Players without matching files fall back to Dicebear

## Console Logging

The system integrates with existing logging:

- **[jury] context**: jury.js maintains its own logging
  - `[jury] avatar: player not found id=<id>`
  - `[jury] avatar fallback for <name>`
  
- **No new logs added**: avatar.js resolves silently, relying on onerror handlers for fallback logging

## Priority Order Flow

```
Player ID or Object
    ↓
Check player.avatar?
    ↓ NO
Check player.img?
    ↓ NO
Check player.photo?
    ↓ NO
./avatars/{playerId}.jpg
    ↓ HTTP 404
Dicebear API (onerror handler)
```

## Benefits

1. **Centralized Logic**: Single source of truth for avatar resolution
2. **Local Assets**: Reduced external API calls when avatars exist locally
3. **Flexible Input**: Accepts both player IDs and player objects
4. **Backward Compatible**: Preserves all existing functionality
5. **Graceful Fallbacks**: Multiple fallback layers ensure avatars always display
6. **Easy Maintenance**: Updates to avatar logic only need to happen in one place

## Future Enhancements

Potential improvements:
- Support for multiple image formats (png, gif, webp)
- Avatar caching system
- Lazy loading for performance
- Avatar upload UI integration
- Cloud storage support

## Files Changed

- `js/avatar.js` (new)
- `index.html` (1 line added)
- `js/state.js` (1 line modified)
- `js/ui.hud-and-router.js` (1 line modified)
- `js/ui.config-and-settings.js` (3 lines modified)
- `js/ui.overlay-and-logs.js` (2 lines modified)

Total: Minimal surgical changes for maximum compatibility
