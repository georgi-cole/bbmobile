# Avatar Preload Strict Mode (Option B)

## Overview

Strict avatar preload mode ensures that **ALL houseguest avatars successfully load and decode** before the application transitions from the Intro Hub to the Main Game screen. This prevents visual glitches, missing avatars, and provides a more polished user experience.

## Features

### 🔒 Strict Enforcement
- **All-or-nothing loading**: Every avatar must complete both `load` and `decode()` successfully
- **No auto-proceed on timeout**: If timeout occurs, the overlay remains visible with an error message
- **No auto-proceed on failure**: If any avatar fails (404, network error, decode error), the overlay shows an error

### ⏱️ Enhanced Timeout
- **Default timeout**: 30 seconds in strict mode (vs 7 seconds in normal mode)
- **Configurable**: Set `cfg.avatarPreloadTimeoutMs` to customize

### 🎯 Progress Feedback
- **Live progress updates**: Shows percentage (0% → 100%) as avatars load
- **Smooth UI updates**: Uses `requestAnimationFrame` for fluid progress bar
- **Accessibility**: Screen reader support with `aria-live` regions

### 🔧 QA Override
- **"Proceed Anyway" button**: Optional manual override for QA/testing
- **Disabled by default**: Must explicitly enable with `cfg.enableProceedAnyway = true`
- **Telemetry tracking**: All manual proceeds are logged

### 🌐 GitHub Pages Optimization
- **Auto-detection**: Detects GitHub Pages deployment by hostname
- **404 prevention**: Disables local `./avatars/*` folder lookups by default on GitHub Pages
- **Configurable**: Override with `cfg.avatarLocalFolderEnabled`

## Configuration

All configuration is done via `window.game.cfg`:

```javascript
window.game.cfg = {
  // === Strict Mode ===
  // Enable strict mode (require all avatars to load+decode)
  avatarPreloadRequireAll: true,  // default: false
  
  // === Timeout ===
  // Timeout in milliseconds
  // In strict mode: defaults to 30000ms (30s)
  // In normal mode: defaults to 7000ms (7s)
  avatarPreloadTimeoutMs: 30000,
  
  // === Concurrency ===
  // Max number of simultaneous avatar loads
  avatarPreloadConcurrency: 8,  // default: 8
  
  // === QA Override ===
  // Show "Proceed Anyway" button on error (QA/testing only)
  enableProceedAnyway: false,  // default: false
  
  // === Local Avatars ===
  // Enable local ./avatars/* folder lookups
  // Auto-disabled on GitHub Pages to prevent 404s
  avatarLocalFolderEnabled: false,  // default: false on github.io
  
  // === Load Mode ===
  // 'batch' = gate roster until ready
  // 'skeleton' = show placeholders, progressive load
  avatarLoadMode: 'batch'  // default: 'batch'
};
```

## Usage

### Normal Deployment (GitHub Pages)
No configuration needed - strict mode is opt-in:

```javascript
// Avatars load in background with best-effort
// Game proceeds even if some avatars fail
```

### Strict Mode for Production
Enable strict mode for a polished experience:

```javascript
window.game.cfg = {
  avatarPreloadRequireAll: true  // Enforce strict mode
};
```

### QA/Testing with Override
Enable manual override for testing:

```javascript
window.game.cfg = {
  avatarPreloadRequireAll: true,
  enableProceedAnyway: true  // Show "Proceed Anyway" button on error
};
```

### Local Development with Local Avatars
Enable local avatar folder for development:

```javascript
window.game.cfg = {
  avatarPreloadRequireAll: true,
  avatarLocalFolderEnabled: true,  // Use ./avatars/* folder
  avatarPreloadTimeoutMs: 10000    // Shorter timeout for local files
};
```

## Workflow

### Success Path
1. User presses **Play** button in Intro Hub
2. Overlay appears: "Loading houseguest profiles..."
3. Progress updates: 0% → 100%
4. All avatars load + decode successfully
5. `avatars:ready` event dispatched
6. Overlay fades out
7. Game screen appears with all avatars loaded

### Failure Path (Strict Mode)
1. User presses **Play** button in Intro Hub
2. Overlay appears: "Loading houseguest profiles..."
3. Progress updates: 0% → 50%
4. Some avatars fail to load (404, network error, etc.)
5. Overlay shows error message:
   ```
   Failed to load all houseguest profiles.
   
   Loaded: 8/16
   Failed: 8
   ```
6. `avatars:ready` event **NOT dispatched**
7. Overlay remains visible
8. **"Proceed Anyway" button** shown (if `enableProceedAnyway = true`)
9. User must manually proceed or fix the issue

### Timeout Path (Strict Mode)
1. User presses **Play** button in Intro Hub
2. Overlay appears: "Loading houseguest profiles..."
3. Progress updates slowly...
4. Timeout occurs after 30s
5. Overlay shows error message:
   ```
   Failed to load all houseguest profiles.
   
   Timeout after 30s
   Loaded: 12/16
   Failed: 4
   ```
6. `avatars:ready` event **NOT dispatched**
7. Overlay remains visible
8. User must manually proceed (if enabled) or refresh

## Events

### `avatars:ready`
Dispatched when avatars are ready for use.

**Detail payload:**
```javascript
{
  total: 16,           // Total avatars to load
  loaded: 16,          // Successfully loaded
  failed: 0,           // Failed to load
  decoded: 16,         // Successfully decoded
  decodeSupported: true, // Browser supports Image.decode()
  timedOut: false,     // Whether timeout occurred
  elapsedMs: 3421,     // Time taken in milliseconds
  strictMode: true,    // Strict mode enabled
  isReady: true        // Ready flag (true only if success in strict mode)
}
```

**In strict mode:**
- Only dispatched if `loaded === total && failed === 0 && !timedOut`
- Never dispatched on timeout or failure

**In normal mode:**
- Always dispatched (even on timeout/failure)
- `isReady` indicates readiness

## Telemetry Events

All telemetry events are tracked via `window.Telemetry.log()`:

- `avatar_preload_start`: Preload initiated
- `avatar_preload_workflow_start`: Workflow started with config
- `avatar_preload_progress`: Progress update (optional)
- `avatar_preload_batch_done`: Batch preload completed
- `avatar_preload_timeout`: Timeout occurred
- `avatar_preload_strict_failure`: Strict mode failure
- `avatars_ready_event`: avatars:ready event dispatched
- `avatar_preload_workflow_error`: Workflow error

## Testing

### Test Page
Open `test_avatar_preload_strict.html` in a browser to test:

- ✅ **Success scenario**: All avatars load successfully
- ❌ **Partial failure**: Some avatars fail (404s)
- ⏱️ **Timeout scenario**: Forced timeout with short timeout value
- 🔧 **Decode failure**: Test decode() errors

### Manual Testing
1. Open `test_avatar_preload_strict.html`
2. Configure test parameters (strict mode, timeout, etc.)
3. Click test buttons to simulate scenarios
4. Observe overlay behavior and console logs
5. Verify "Proceed Anyway" button appears when enabled

### CI/CD Integration
```bash
# Run existing test suite
npm run test:all

# Syntax validation
node test_avatar_preload_node.mjs
```

## Browser Support

- **Modern browsers**: Full support (Chrome, Firefox, Safari, Edge)
- **Image.decode()**: Supported in all modern browsers
- **Fallback**: If `decode()` not available, uses load-only check
- **Mobile**: Fully supported (tested on iOS Safari and Chrome Mobile)

## Performance

### Typical Load Times
- **Local avatars** (./avatars/): 100-500ms
- **Dicebear SVG**: 1-3 seconds per avatar
- **With concurrency=8**: 16 avatars in 3-5 seconds

### Optimization Tips
1. **Use local avatars** for production (faster, no network dependency)
2. **Increase concurrency** for faster parallel loading: `avatarPreloadConcurrency: 16`
3. **Adjust timeout** based on deployment: `avatarPreloadTimeoutMs: 15000`
4. **Preconnect to Dicebear** (already in index.html):
   ```html
   <link rel="preconnect" href="https://api.dicebear.com" crossorigin>
   ```

## Troubleshooting

### Issue: Overlay never disappears
**Cause**: Strict mode enabled, some avatars failed
**Solution**: 
- Check browser console for errors
- Verify avatar URLs are valid
- Enable `enableProceedAnyway` for testing
- Disable strict mode if not needed

### Issue: "Proceed Anyway" button not showing
**Cause**: `enableProceedAnyway` not enabled
**Solution**: Set `window.game.cfg.enableProceedAnyway = true`

### Issue: 404 errors on GitHub Pages
**Cause**: Local avatars not deployed
**Solution**: 
- Ensure `avatarLocalFolderEnabled = false` (auto-detected)
- Or deploy avatars to ./avatars/ folder

### Issue: Timeout too short
**Cause**: Slow network or many avatars
**Solution**: Increase timeout:
```javascript
window.game.cfg.avatarPreloadTimeoutMs = 60000;  // 60s
```

### Issue: Progress stuck at 0%
**Cause**: Players not ready
**Solution**: Check `players_ready` event is dispatched

## Architecture

### Files Modified
- `js/preload/avatar-queue.js`: Core preloader with strict mode
- `src/ui/IntroScreen.js`: Overlay UI and workflow
- `js/avatar.js`: GitHub Pages detection
- `src/startup/flow.js`: Hub showing guard
- `css/intro.css`: Overlay and error UI styles
- `index.html`: Preconnect for Dicebear (already present)

### Key Functions
- `preloadAvatarsQueued()`: Main preloader with concurrency
- `performAvatarPreload()`: Workflow orchestrator
- `showAvatarPreloadError()`: Error UI display
- `shouldSkipLocalFolderLookups()`: GitHub Pages detection

## Migration Guide

### From Normal Mode to Strict Mode
1. Enable strict mode:
   ```javascript
   window.game.cfg.avatarPreloadRequireAll = true;
   ```

2. Test thoroughly with all scenarios

3. Deploy avatars to ./avatars/ or ensure Dicebear reliability

4. Monitor telemetry for failures

### From Strict Mode Back to Normal Mode
1. Disable strict mode:
   ```javascript
   window.game.cfg.avatarPreloadRequireAll = false;
   ```

2. No other changes needed - system is backward compatible

## Future Enhancements

Potential improvements:
- [ ] Retry failed avatars automatically
- [ ] Parallel decode() for better performance
- [ ] Progressive JPEG/WebP support
- [ ] CDN integration for avatars
- [ ] Avatar caching strategy (ServiceWorker)
- [ ] Graceful degradation to silhouettes

## References

- [MDN: Image.decode()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode)
- [GitHub Pages Deployment](https://pages.github.com/)
- [Dicebear Avatar API](https://avatars.dicebear.com/)
