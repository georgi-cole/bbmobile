# Loading Overlay - Quick Reference

## TL;DR

Fixed mobile Play button transition issues by implementing a unified loading overlay with proper avatar preloading, progress tracking, and error handling.

## Key Changes

### Before ❌
- Multiple competing transitions
- Progress indicators didn't update
- Flashed back to Intro Hub
- Avatars loaded late/incomplete

### After ✅
- Single entry point: `StartupFlow.enterGameFromIntro()`
- Smooth progress: 0% → 100%
- No flash/flicker
- All avatars loaded on first paint

## Usage

### Basic Usage

```javascript
// Play button handler
await StartupFlow.enterGameFromIntro();
```

### With Custom Progress

```javascript
// If you need to show loading for other operations
LoadingOverlay.showOverlay();
LoadingOverlay.updateProgress({ loaded: 5, total: 10 });  // 50%
await someOperation();
await LoadingOverlay.hideOverlay();
```

### With Error Handling

```javascript
try {
  await someOperation();
} catch (err) {
  LoadingOverlay.showError(err.message, {
    showRetry: true,
    onRetry: () => someOperation()
  });
}
```

## API Reference

### LoadingOverlay

```javascript
window.LoadingOverlay = {
  showOverlay()                      // Show full-screen overlay
  hideOverlay()                      // Hide (returns Promise)
  updateProgress({ loaded, total })  // Update progress (0-100%)
  showError(message, options)        // Show error with optional retry
  isVisible()                        // Check if overlay is visible
}
```

### StartupFlow

```javascript
window.StartupFlow = {
  enterGameFromIntro()  // NEW: Unified Play transition
  enterGame()           // Alias to enterGameFromIntro()
  legacyEnterGame()     // Fallback (no overlay)
  // ... other existing methods
}
```

## Configuration

```javascript
window.game.cfg = {
  // Strict mode: require ALL avatars to load
  avatarPreloadRequireAll: false,  // default: false
  
  // Timeout (7s normal, 30s strict)
  avatarPreloadTimeoutMs: 7000,
  
  // Parallel loads
  avatarPreloadConcurrency: 8,
  
  // QA: show "Proceed Anyway" on error
  enableProceedAnyway: false,
};
```

## Files

### New Files
- `src/ui/LoadingOverlay.js` - Overlay module
- `css/loading-overlay.css` - Styles
- `test_loading_overlay.html` - Test suite
- `LOADING_OVERLAY_IMPLEMENTATION.md` - Full docs

### Modified Files
- `src/startup/flow.js` - Added `enterGameFromIntro()`
- `src/ui/IntroScreen.js` - Simplified Play button
- `index.html` - Added script/css tags

## Testing

```bash
# Automated tests
npm run test:all

# Manual testing
open test_loading_overlay.html
# Or visit: http://localhost:8080/test_loading_overlay.html
```

## Flow

```
User → Play Button
  ↓
StartupFlow.enterGameFromIntro()
  ↓
LoadingOverlay.showOverlay()
  ↓
Build cast (create players)
  ↓
Preload avatars (with progress)
  ↓
  ├─ Success → Hide overlay → Show main hub ✅
  └─ Failure → Show error → Retry or stay ⚠️
```

## Common Patterns

### Show Loading for Async Operation

```javascript
LoadingOverlay.showOverlay();
try {
  await longRunningOperation();
  await LoadingOverlay.hideOverlay();
} catch (err) {
  LoadingOverlay.showError(err.message);
}
```

### Progress Updates

```javascript
LoadingOverlay.showOverlay();
const total = items.length;
for (let i = 0; i < total; i++) {
  await processItem(items[i]);
  LoadingOverlay.updateProgress({ loaded: i + 1, total });
}
await LoadingOverlay.hideOverlay();
```

### Retry on Failure

```javascript
async function loadResources() {
  LoadingOverlay.showOverlay();
  try {
    await fetchResources();
    await LoadingOverlay.hideOverlay();
  } catch (err) {
    LoadingOverlay.showError('Failed to load resources', {
      showRetry: true,
      onRetry: loadResources  // Retry entire function
    });
  }
}
```

## Troubleshooting

### Overlay doesn't appear
- Check LoadingOverlay.js is loaded
- Check CSS is loaded
- Look for JS errors in console

### Progress stuck at 0%
- Check players are available
- Verify avatar URLs are valid
- Check network connection

### Game doesn't start after loading
- Check strict mode settings
- Look for errors in console
- Try disabling strict mode: `cfg.avatarPreloadRequireAll = false`

### Flash back to Intro Hub
- Ensure using `enterGameFromIntro()` not old paths
- Check for duplicate button handlers
- Verify no competing transitions

## ESLint

```bash
# Check syntax
ESLINT_USE_FLAT_CONFIG=false npx eslint src/ui/LoadingOverlay.js src/startup/flow.js

# Expected: 0 errors, 5 warnings (unused exception vars - OK)
```

## Related Docs

- `LOADING_OVERLAY_IMPLEMENTATION.md` - Full documentation
- `AVATAR_PRELOAD_STRICT_MODE.md` - Avatar preloading details
- `STARTUP_FLOW_VISUAL_SUMMARY.md` - Startup flow overview

## Support

**Version**: 1.0.0  
**Status**: Production Ready ✅  
**Tested**: Chrome, Firefox, Safari, iOS, Android ✅

---

For detailed information, see: `LOADING_OVERLAY_IMPLEMENTATION.md`
