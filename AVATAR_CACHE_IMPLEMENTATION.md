# Avatar Cache Implementation

## Overview

This implementation provides a unified avatar caching system that ensures AI houseguest avatars are loaded and decoded before the user enters either the main game screen or opens the HousGuests modal. It addresses the reported issues of avatar pop-in and provides a smooth, predictable user experience.

## Problem Statement

### Before Implementation

1. **HOUSEGUESTS Modal**: Avatars loaded only after modal opened, resulting in visible pop-in
2. **PLAY Button**: Loading screen stuck at 0%, avatars not fully loaded when game screen appears
3. **No Caching**: Avatars re-fetched when moving between screens
4. **No Progress**: User has no feedback on actual loading progress

### After Implementation

1. **HOUSEGUESTS Modal**: Avatars preloaded in background, instant display when opened
2. **PLAY Button**: Real progress (0%→100%), strict preload ensures all avatars ready
3. **Unified Cache**: Avatars loaded once, reused across all UIs
4. **Real Progress**: Loading overlay tied to actual preload status

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Intro Hub                             │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐               │
│  │   PLAY   │  │HOUSEGUESTS│  │  Profile   │               │
│  └────┬─────┘  └─────┬─────┘  └────────────┘               │
│       │              │                                       │
└───────┼──────────────┼───────────────────────────────────────┘
        │              │
        │              │ (uses cache)
        │              ▼
        │      ┌──────────────┐
        │      │ HousGuests   │
        │      │    Modal     │
        │      └──────────────┘
        │
        │ (strict preload)
        ▼
┌──────────────────┐
│  Avatar Cache    │◄───── Background Warm-up
│   (Unified)      │       (after hub shown)
└────────┬─────────┘
         │
         │ (provides avatars)
         ▼
┌──────────────────┐
│   Main Game      │
│   Screen         │
└──────────────────┘
```

### Data Flow

```
1. Intro Hub Shown
   └─► Background Warm-up starts
       └─► AvatarCache.preloadHouseguests()
           └─► Houseguest avatars loaded to cache

2. User Presses PLAY
   └─► Loading overlay shown
       └─► AvatarCache.preloadPlayers()
           ├─► Progress: 0% → 100%
           └─► All player avatars loaded+decoded
               └─► avatars:ready event
                   └─► Main game screen shown

3. User Presses HOUSEGUESTS
   └─► Houseguests modal opens
       └─► Checks AvatarCache.has()
           ├─► If cached: instant display
           └─► If not: placeholder + background load
```

## Key Modules

### 1. `avatar-cache.js` (New)

**Location**: `/js/preload/avatar-cache.js`

**Purpose**: Unified avatar caching system

**Key Functions**:

- `preloadHouseguests(options)` - Preload all AI houseguest avatars
- `preloadPlayers(players, options)` - Preload player avatars
- `preloadAll(options)` - Preload both houseguests and players
- `get(keyOrItem)` - Get avatar from cache
- `has(keyOrItem)` - Check if avatar is cached
- `getUrl(keyOrItem)` - Get avatar URL (cached or resolved)
- `getStats()` - Get cache statistics

**Features**:

- Configurable concurrency (default: 8)
- Timeout support (default: 30s for strict mode)
- Retry logic (max 2 retries)
- Progress callbacks
- Image decode support for smoother rendering
- Strict mode (requires ALL avatars loaded+decoded)

**Configuration** (via `window.game.cfg`):

```javascript
{
  avatarPreloadRequireAll: true,      // Strict mode (default: false)
  avatarPreloadTimeoutMs: 30000,      // Timeout in ms (default: 30000)
  avatarPreloadConcurrency: 8,        // Max concurrent loads (default: 8)
  enableAvatarRetry: true             // Enable retry logic (default: true)
}
```

### 2. `IntroScreen.js` (Modified)

**Location**: `/src/ui/IntroScreen.js`

**Changes**:

1. Updated `performAvatarPreload()` to use `AvatarCache` preferentially
2. Existing overlay and progress tracking now tied to actual cache progress
3. Strict mode enforcement (prevents game entry if preload fails)

**Behavior**:

- **Play Button Click**:
  1. Shows avatar preload overlay
  2. Waits for players to be ready
  3. Calls `AvatarCache.preloadPlayers()` with progress callbacks
  4. Updates overlay progress (0% → 100%)
  5. In strict mode: waits for 100% completion
  6. Dispatches `avatars:ready` event
  7. Enters game

### 3. `flow.js` (Modified)

**Location**: `/src/startup/flow.js`

**Changes**:

1. Added `startAvatarWarmUp()` function
2. Wire up HOUSEGUESTS button handler
3. Call warm-up after Intro Hub is shown (500ms delay)

**Warm-up Process**:

```javascript
async function startAvatarWarmUp() {
  // Called 500ms after Intro Hub shown
  // Non-blocking, runs in background
  // Preloads houseguest avatars using AvatarCache
  const result = await AvatarCache.preloadHouseguests({
    strictMode: false, // Don't block on failures
    onProgress: (loaded, total) => { /* log progress */ }
  });
}
```

### 4. `houseguestsModal.js` (Modified)

**Location**: `/js/ui/houseguestsModal.js`

**Changes**:

1. List view uses `AvatarCache.has()` to check for cached avatars
2. Detail view uses `AvatarCache.has()` to check for cached avatars
3. Shows placeholders for uncached avatars
4. Loads missing avatars in background

**Behavior**:

- **Modal Open**:
  1. Check `AvatarCache.has(houseguest)` for each
  2. If cached: display immediately
  3. If not cached: show placeholder, load in background
  4. Background loads populate cache for future use

## Usage Examples

### For Testing

Use the test file: `test_avatar_cache.html`

```bash
# Open in browser
open test_avatar_cache.html
```

Test controls:
- **Preload Houseguests**: Test houseguest preloading
- **Preload Players**: Test player preloading
- **Preload All**: Test combined preloading
- **Test Cache Retrieval**: Check cache contents
- **Clear Cache**: Reset cache

### In Production

Avatar cache is automatically used when:

1. **User presses PLAY** from Intro Hub
   - Strict preload ensures all avatars ready
   - Progress overlay shows real progress
   - Game doesn't start until complete

2. **User presses HOUSEGUESTS** from Intro Hub
   - Background warm-up makes avatars available
   - Modal opens instantly with cached avatars
   - Fallback to background load if needed

### Programmatic Usage

```javascript
// Check if AvatarCache is available
const AvatarCache = window.AvatarCache;

// Preload houseguests with progress
const result = await AvatarCache.preloadHouseguests({
  onProgress: (loaded, total) => {
    console.log(`Progress: ${loaded}/${total}`);
  }
});
console.log(`Loaded: ${result.loaded}/${result.total}`);

// Check if avatar is cached
const houseguest = { name: 'Finn' };
const isCached = AvatarCache.has(houseguest);

// Get avatar URL (from cache or resolve)
const url = AvatarCache.getUrl(houseguest);

// Get cache statistics
const stats = AvatarCache.getStats();
console.log(`Total: ${stats.total}, Loaded: ${stats.loaded}`);
```

## Configuration Options

### Strict Mode

Enable strict mode to require ALL avatars loaded+decoded before proceeding:

```javascript
window.game.cfg.avatarPreloadRequireAll = true;
```

**Behavior**:
- PLAY button waits for 100% completion
- If any avatar fails, shows error overlay
- User cannot proceed until all avatars ready

### Timeout

Configure timeout for avatar preloading:

```javascript
window.game.cfg.avatarPreloadTimeoutMs = 30000; // 30 seconds
```

### Concurrency

Configure max concurrent avatar loads:

```javascript
window.game.cfg.avatarPreloadConcurrency = 8; // 8 concurrent loads
```

## Performance Characteristics

### Cache Hit Performance

- **Instant retrieval**: O(1) lookup in Map
- **No network request**: Image already in memory
- **No decode delay**: Image already decoded

### Cache Miss Performance

- **Background load**: Non-blocking for UI
- **Retry logic**: Up to 2 retries on failure
- **Progress feedback**: Real-time progress updates

### Memory Usage

- **Houseguests**: ~16 avatars @ ~50KB each = ~800KB
- **Players**: ~16 avatars @ ~50KB each = ~800KB
- **Total**: ~1.6MB (typical)

### Network Usage

- **First load**: 16 houseguests + 16 players = 32 requests
- **Subsequent**: 0 requests (all from cache)
- **Bandwidth**: ~1.6MB first load, 0 after

## Edge Cases Handled

### 1. Slow Network

- **Timeout**: Configurable timeout (default: 30s)
- **Progress**: User sees real progress
- **Fallback**: Timeout allows proceeding (non-strict mode)

### 2. Network Failure

- **Retry**: Automatic retry (up to 2 times)
- **Error UI**: Shows error message
- **Fallback**: Placeholder avatars

### 3. Cache Miss

- **Placeholder**: Shows avatar initial
- **Background Load**: Loads in background
- **Smooth Transition**: Fades in when ready

### 4. No Houseguests Data

- **Skip**: Gracefully skips preload
- **No Error**: Returns success with 0 loaded
- **No Block**: Doesn't prevent game start

## Testing

### Automated Tests

All existing tests pass:

```bash
npm run test:all
```

Tests include:
- ✅ Minigame validation
- ✅ Runtime helpers
- ✅ E2E competitions
- ✅ Social maneuvers
- ✅ POV carousel
- ✅ Background theme

### Manual Tests

Use `test_avatar_cache.html`:

1. Open in browser
2. Click "Preload Houseguests"
3. Watch progress and statistics
4. Verify avatars appear in grid
5. Test cache retrieval
6. Clear cache and repeat

### Integration Tests

Test the full flow:

1. Open `index.html`
2. Skip intro video (or wait)
3. On Intro Hub, wait 1-2 seconds (background warm-up)
4. Click HOUSEGUESTS → Should open instantly with avatars
5. Close modal
6. Click PLAY → Should show progress overlay
7. Watch progress: 0% → 100%
8. Game should start with all avatars ready

## Troubleshooting

### Avatars Still Pop In

**Check**:
1. Is `avatar-cache.js` loaded? (Check browser console)
2. Is background warm-up running? (Check console logs)
3. Are houseguests available? (`window.Houseguests.getAll()`)

**Solution**: Ensure all scripts are loaded in correct order in `index.html`

### Loading Stuck at 0%

**Check**:
1. Are players ready? (`window.game.players`)
2. Is AvatarCache available? (`window.AvatarCache`)
3. Check browser console for errors

**Solution**: Wait for players-ready event before preloading

### Strict Mode Too Strict

**Check**: Is `avatarPreloadRequireAll` set to `true`?

**Solution**: Set to `false` for non-strict mode:
```javascript
window.game.cfg.avatarPreloadRequireAll = false;
```

## Future Enhancements

### Priority Queuing

Preload critical avatars first (e.g., first 8 houseguests), then others in background.

### Progressive Enhancement

Show low-res thumbnails immediately, upgrade to full-res in background.

### Service Worker Caching

Use Service Worker to cache avatars across sessions.

### Lazy Loading

Load avatars on-demand with placeholder, similar to image lazy loading.

## Maintenance

### Adding New Avatar Sources

To add new avatar sources:

1. Update `resolveAvatarUrl()` in `avatar-cache.js`
2. Add new resolution logic
3. Test with `test_avatar_cache.html`

### Changing Cache Strategy

To change cache strategy:

1. Update cache Map structure in `avatar-cache.js`
2. Update `get()`, `has()`, `getUrl()` functions
3. Test thoroughly

## Conclusion

This implementation provides:

✅ **Strict preloading**: All avatars ready before game entry  
✅ **Background warm-up**: Houseguests preloaded opportunistically  
✅ **Unified cache**: Single source of truth, no duplicates  
✅ **Real progress**: Tied to actual loading status  
✅ **Error resilience**: Retry logic and graceful fallbacks  
✅ **Instant reuse**: Cache prevents re-fetching  
✅ **Smooth UX**: No pop-in, minimal jank  

The system is production-ready and addresses all requirements from the problem statement.
