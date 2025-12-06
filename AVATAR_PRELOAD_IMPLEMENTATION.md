# Avatar Preloading System Implementation

## Overview

The avatar preloading system ensures houseguest avatar images are downloaded and cached early in the intro flow, so they appear immediately when the user opens the Houseguests panel or clicks Play, rather than showing initials first.

## Architecture

### Components

1. **AvatarPreloader Module** (`js/ui/avatarPreloader.js`)
   - Promise-based API for avatar preloading
   - Progress tracking via callbacks and events
   - Graceful fallback handling
   - Config flag support

2. **Configuration Flag** (`js/bootstrap.js`)
   - `window.game.cfg.preloadAvatars` (default: `true`)
   - Allows users to disable preloading if needed

3. **Startup Flow Integration** (`src/startup/flow.js`)
   - Starts avatar preload when intro hub is shown
   - Waits for preload before opening Houseguests panel
   - Shows loading overlay with progress during wait

4. **Test Suite** (`test_preload_avatars.html`)
   - Comprehensive manual testing interface
   - 6 test scenarios covering all edge cases
   - Real-time event logging and progress visualization

## API Reference

### AvatarPreloader

```javascript
// Initialize with houseguests list
AvatarPreloader.init(houseguests);

// Start preloading (returns Promise)
const result = await AvatarPreloader.start();
// result: { loaded: number, total: number, timedOut: boolean }

// Register progress callback
AvatarPreloader.onProgress((loaded, total) => {
  console.log(`Progress: ${loaded}/${total}`);
});

// Get a promise that resolves when done
await AvatarPreloader.whenDone();

// Check if preload is complete
const done = AvatarPreloader.isDone();

// Get current progress
const progress = AvatarPreloader.getProgress();
// progress: { loaded: number, total: number, isDone: boolean } | null

// Reset state (for testing)
AvatarPreloader.reset();
```

### Events

The preloader emits events via `window.game.bus`:

- `avatars:preload:start` - Preload started `{ total: number }`
- `avatars:preload:progress` - Progress update `{ loaded: number, total: number }`
- `avatars:preload:done` - Preload complete `{ loaded: number, total: number, timedOut: boolean }`
- `avatars:preload:error` - Error occurred `{ error: string }`

## Integration Flow

### 1. Intro Hub Load

When the intro hub is displayed:

```
showIntroHub()
  → startAvatarWarmUp()
    → AvatarPreloader.init(houseguests)
    → AvatarPreloader.start()
      → Preloads avatars in background
      → Emits progress events
```

### 2. Houseguests Button Click

When user clicks Houseguests button:

```
intro:open:houseguests event
  → Check if AvatarPreloader.isDone()
  → If not done:
      → Show LoadingOverlay
      → await AvatarPreloader.whenDone()
      → Hide LoadingOverlay
  → Open HouseguestsModal
```

### 3. Play Button Click

When user clicks Play:

```
intro:play event
  → enterGameFromIntro()
    → Show LoadingOverlay
    → AvatarQueue.preloadAvatarsQueued()
      → Updates LoadingOverlay progress
    → Hide LoadingOverlay
    → buildMainScreen()
```

## Configuration

### Enable/Disable Preloading

```javascript
// In bootstrap or settings
window.game.cfg.preloadAvatars = false; // Disable
window.game.cfg.preloadAvatars = true;  // Enable (default)
```

### Adjust Timeout

```javascript
// Timeout in milliseconds (default: 8000ms)
window.game.cfg.avatarPreloadTimeoutMs = 10000; // 10 seconds
```

## Testing

### Automated Tests

Run the existing test suite to ensure no regressions:

```bash
npm run test:all
```

All tests should pass. The new implementation is compatible with existing modules.

### Manual Testing

Open `test_preload_avatars.html` in a browser to run the interactive test suite.

#### Test Case 1: Normal Flow (Preload Enabled)
1. Open test page
2. Click "Initialize Game & Modules"
3. Click "Show Intro Hub"
4. Wait ~1-2 seconds
5. Click "Open Houseguests Panel"
6. **Expected**: Panel opens immediately with photos (no loading overlay)

#### Test Case 2: Early Click (Preload Not Complete)
1. Refresh page
2. Initialize and show intro hub
3. **IMMEDIATELY** click "Open Houseguests Panel"
4. **Expected**: Loading overlay appears with progress bar
5. **Expected**: Once complete, panel opens with photos visible

#### Test Case 3: Disabled Config
1. Refresh page
2. Uncheck "Enable Avatar Preloading"
3. Initialize and show intro hub
4. **Expected**: No background preload
5. Click "Open Houseguests Panel"
6. **Expected**: Panel opens immediately (avatars load individually)

#### Test Case 4: Play Button Flow
1. Refresh page
2. Initialize and show intro hub
3. Click "Click Play Button"
4. **Expected**: Loading overlay, preloads avatars, enters game

#### Test Case 5: Direct API Test
1. Refresh page
2. Initialize modules
3. Click "Test Preloader Directly"
4. **Expected**: Progress bar shows loading, completes successfully

#### Test Case 6: Slow Network
1. Refresh page
2. Check "Simulate Slow Network"
3. Follow Test Case 2 flow
4. **Expected**: Loading overlay visible longer

## Fallback Behavior

The system has multiple fallback layers:

1. **Config disabled**: Preload skips, avatars load on-demand
2. **Preload timeout**: Proceeds with partial load, missing avatars use fallback
3. **Preloader unavailable**: Falls back to existing AvatarCache system
4. **Network failure**: Shows initials for failed avatars, doesn't block UI

## Performance Considerations

- **Non-blocking**: Preload runs in background after intro hub loads
- **Timeout**: Default 8s timeout prevents indefinite waiting
- **Caching**: Uses browser's native image caching (no re-downloads)
- **Progress**: Real-time progress tracking for user feedback
- **Graceful degradation**: Works even with slow/failing network

## Browser Compatibility

- **Modern browsers**: Full support (Chrome, Firefox, Safari, Edge)
- **Image.decode()**: Used when available for smoother rendering
- **Promise-based**: Requires ES6 Promise support (all modern browsers)
- **Event bus**: Uses existing bbGameBus system

## Known Limitations

1. **Houseguests data required**: Must have `window.Houseguests.getAll()` available
2. **Avatar resolution**: Relies on existing `resolveAvatar()` fallback chain
3. **Single preload**: Only preloads once per session (unless reset)
4. **No retry**: Failed avatars don't auto-retry (shows fallback instead)

## Future Enhancements

Possible improvements for future versions:

- [ ] Add retry logic for failed avatars
- [ ] Support multiple preload batches (lazy loading)
- [ ] Add service worker caching for offline support
- [ ] Implement progressive image loading (blur-up effect)
- [ ] Add preload priority (HOH/nominees first)
- [ ] Track and optimize preload performance metrics

## Troubleshooting

### Preload not starting

Check console for:
- `[AvatarPreloader] Preloading disabled by config flag`
- `[StartupFlow] No houseguests to preload`

Solution: Ensure `preloadAvatars: true` in config and houseguests data loaded

### Loading overlay stuck

Check console for:
- `[AvatarPreloader] Preload error:`
- Network errors in Network tab

Solution: Check network connectivity and avatar URL resolution

### Avatars not caching

Check:
- Browser cache settings (disable cache may be on)
- Avatar URLs are consistent across calls
- No query parameters changing on URLs

Solution: Ensure stable avatar URLs and browser cache enabled

### Progress not updating

Check:
- `avatars:preload:progress` events being emitted
- LoadingOverlay progress callbacks registered

Solution: Ensure event bus wired correctly and callbacks registered before preload

## Code Quality

- ✅ ESLint: No linting errors
- ✅ Tests: All existing tests pass
- ✅ Minimal changes: Only 4 files modified
- ✅ Backward compatible: No breaking changes
- ✅ Well documented: Inline comments and this guide

## Support

For issues or questions:
1. Check browser console for detailed logs
2. Review test page (`test_preload_avatars.html`) 
3. Verify config flags are set correctly
4. Test with preload disabled to isolate issue
