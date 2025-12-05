# Loading Overlay Implementation

## Overview

This document describes the unified loading overlay system that replaces the previous fragmented approach to handling the Play → main hub transition. The new implementation provides a single, cohesive loading experience with proper progress tracking, error handling, and retry capabilities.

## Problem Statement

The previous implementation had several critical issues:

1. **Multiple Overlapping Gates**: Avatar preload logic in `IntroScreen.js` competed with startup flow guards, causing race conditions
2. **Non-Advancing Progress Indicators**: Loading overlay showed spinner, bar, and percentage, but they often didn't update properly
3. **Flash Back to Intro Hub**: Competing transitions caused the screen to flash back to the Intro Hub before showing main hub
4. **Incomplete Avatar Loading**: Some avatar images were not fully loaded on arrival at main screen, appearing late or as placeholders

## Solution Architecture

### Single Entry Point

The new system provides a **single entry point** for the entire Play → main hub transition:

```
User clicks Play
      ↓
IntroScreen.js button handler
      ↓
StartupFlow.enterGameFromIntro()  ← SINGLE ENTRY POINT
      ↓
  ┌───────────────────────────────┐
  │ 1. Show LoadingOverlay        │
  │ 2. Build cast (get players)   │
  │ 3. Preload all avatars        │
  │    (with progress updates)    │
  │ 4. Apply profile/guest mode   │
  │ 5. Hide overlay               │
  │ 6. Build main screen          │
  │ 7. Start game sequence        │
  └───────────────────────────────┘
```

### Three-Module Architecture

The implementation is cleanly separated into three focused modules:

1. **LoadingOverlay.js** - UI Component
2. **avatar-queue.js** - Asset Preloading (existing, unchanged)
3. **flow.js** - Orchestration Logic

## Module Details

### 1. LoadingOverlay.js

**Location**: `src/ui/LoadingOverlay.js`

**Purpose**: Provide a unified, full-screen loading overlay with progress tracking and error handling.

**Public API**:

```javascript
window.LoadingOverlay = {
  showOverlay(),              // Show overlay with fade-in
  hideOverlay(),              // Hide overlay with fade-out (returns Promise)
  updateProgress({ loaded, total }), // Update progress indicator
  showError(message, options),       // Show error state with optional retry
  isVisible()                 // Check if overlay is currently visible
}
```

**Features**:
- Animated eye with blinking lid
- Progress bar with smooth fill animation
- Percentage text display
- Screen reader support with ARIA attributes and live regions
- Error state with customizable retry button
- Mobile-first responsive design
- Light/dark mode support
- Reduced motion support

**Visual Design**:

```
┌─────────────────────────────────────┐
│                                     │
│          ◉  ← Animated eye         │
│         / \    (blinks, moves)     │
│                                     │
│   Loading houseguest profiles...   │
│                                     │
│   ▓▓▓▓▓▓▓░░░░░░░░  ← Progress bar  │
│                                     │
│            50%                      │
│                                     │
└─────────────────────────────────────┘

Error State:
┌─────────────────────────────────────┐
│                                     │
│   Failed to load all profiles.     │
│                                     │
│   Loaded: 8/16                      │
│   Failed: 8                         │
│                                     │
│          [Retry]  ← Optional       │
│                                     │
└─────────────────────────────────────┘
```

### 2. avatar-queue.js

**Location**: `js/preload/avatar-queue.js`

**Purpose**: Batched parallel avatar preloading with decode() support (existing module, unchanged).

**Key Function**:

```javascript
AvatarQueue.preloadAvatarsQueued(players, {
  concurrency: 8,        // Max parallel loads
  timeout: 30000,        // Timeout in ms
  strictMode: true,      // Require all to succeed
  onProgress: (loaded, total) => {
    // Called after each avatar loads
    LoadingOverlay.updateProgress({ loaded, total });
  }
})
```

**Returns**:
```javascript
{
  total: 16,           // Total avatars to load
  loaded: 16,          // Successfully loaded
  failed: 0,           // Failed to load
  decoded: 16,         // Successfully decoded
  decodeSupported: true,
  timedOut: false,
  elapsedMs: 3421,
  strictMode: true,
  isReady: true        // true only if all succeeded in strict mode
}
```

### 3. flow.js (StartupFlow)

**Location**: `src/startup/flow.js`

**Purpose**: Orchestrate the entire Play → main hub transition.

**Key Functions**:

#### `enterGameFromIntro()`

The new unified entry point that:
1. Shows loading overlay immediately
2. Builds game cast (creates players)
3. Preloads all avatars with progress tracking
4. Checks for strict mode failures
5. Applies profile or enables guest mode
6. Hides overlay on success
7. Builds main screen
8. Starts game sequence

**Error Handling**:
- On avatar preload failure (strict mode): Shows error on overlay with Retry button
- On exception: Shows error on overlay with Retry button
- Never proceeds to main hub if assets aren't ready

#### `legacyEnterGame()`

Fallback function for when LoadingOverlay is not available. Maintains backward compatibility with existing code.

#### `enterGame()`

Alias that delegates to `enterGameFromIntro()` for backward compatibility.

## Workflow Diagrams

### Success Path

```
User Clicks Play
       ↓
IntroScreen detects click
       ↓
Call StartupFlow.enterGameFromIntro()
       ↓
┌──────────────────────────────────────┐
│ LoadingOverlay.showOverlay()         │
│   • Overlay fades in                 │
│   • Progress: 0%                     │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│ Build game cast                      │
│   • buildCast() called               │
│   • Players array populated          │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│ Preload avatars                      │
│   • For each avatar (0→16):          │
│     - Fetch image                    │
│     - Decode image                   │
│     - Update progress: N/16          │
│   • Progress bar fills: 0%→100%      │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│ Check result                         │
│   • loaded === total?  ✅            │
│   • failed === 0?      ✅            │
│   • timedOut === false? ✅           │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│ Apply profile or guest mode          │
│   • Load last profile (if exists)    │
│   • OR enable guest mode             │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│ LoadingOverlay.hideOverlay()         │
│   • Overlay fades out                │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│ Build main screen                    │
│   • buildMainScreen() called         │
│   • Main UI becomes visible          │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│ Start game sequence                  │
│   • startOpeningSequence() called    │
└──────────────────────────────────────┘
               ↓
          Game Running
    (all avatars loaded ✅)
```

### Error Path (Strict Mode)

```
User Clicks Play
       ↓
LoadingOverlay.showOverlay()
       ↓
Preload avatars
  0% → 25% → 50% → TIMEOUT ❌
       ↓
┌──────────────────────────────────────┐
│ Check result                         │
│   • loaded = 8                       │
│   • total = 16                       │
│   • failed = 8                       │
│   • timedOut = true                  │
│   • isReady = false ❌               │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│ LoadingOverlay.showError()           │
│   • Hide progress elements           │
│   • Show error message:              │
│     "Failed to load all profiles"    │
│     "Loaded: 8/16"                   │
│     "Failed: 8"                      │
│   • Show [Retry] button              │
└──────────────────────────────────────┘
               ↓
      Overlay remains visible
      User must click Retry
               ↓
      (Retry calls enterGameFromIntro again)
```

## CSS Structure

**File**: `css/loading-overlay.css`

### Key Components

1. **Base Overlay**
   - Full-screen fixed positioning
   - Dark semi-transparent background
   - Backdrop blur effect
   - Fade in/out transitions

2. **Eye Animation**
   - Circular outer eye (100×100px)
   - Blue pupil with gradient (40×40px)
   - Blinking lid animation
   - Pupil movement animation
   - Pulsing scale animation

3. **Progress Bar**
   - Container with subtle background
   - Animated fill with gradient
   - Smooth width transitions
   - Glow effect

4. **Error State**
   - Red color scheme
   - Error text container with border
   - Retry button with hover/active states

5. **Responsive Design**
   - Mobile breakpoint at 640px
   - Smaller eye on mobile (80×80px)
   - Reduced padding and font sizes

6. **Accessibility**
   - Screen reader only class (`.sr-only`)
   - Live region for progress updates
   - Focus indicators on buttons
   - Reduced motion support

## Configuration

The system respects existing avatar preload configuration:

```javascript
window.game.cfg = {
  // Strict mode: require ALL avatars to load+decode
  avatarPreloadRequireAll: false,  // default: false
  
  // Timeout in milliseconds
  avatarPreloadTimeoutMs: 7000,    // default: 7000 (30000 in strict mode)
  
  // Max concurrent avatar loads
  avatarPreloadConcurrency: 8,     // default: 8
  
  // Show "Proceed Anyway" button on error (QA only)
  enableProceedAnyway: false,      // default: false
};
```

## Integration Points

### 1. index.html

```html
<!-- CSS -->
<link rel="stylesheet" href="css/loading-overlay.css">

<!-- JavaScript (before IntroScreen.js) -->
<script defer src="src/ui/LoadingOverlay.js"></script>
<script defer src="src/ui/IntroScreen.js"></script>
```

### 2. IntroScreen.js

```javascript
// Play button handler (simplified)
if (action === 'intro:play') {
  const StartupFlow = g.StartupFlow || window.StartupFlow;
  if (StartupFlow && typeof StartupFlow.enterGameFromIntro === 'function') {
    await StartupFlow.enterGameFromIntro();
  } else {
    // Fallback
    handleButtonAction(action, label);
  }
}
```

### 3. StartupFlow Event Wiring

```javascript
// Existing event wire-up still works
bus.on('intro:play', async function() {
  console.info('[StartupFlow] Play button clicked');
  await enterGame();  // Delegates to enterGameFromIntro()
});
```

## Testing

### Manual Testing

Open `test_loading_overlay.html` in a browser to test:

1. **Test 1**: Show overlay
2. **Test 2**: Progress updates (0% → 100%)
3. **Test 3**: Simulated 5-second load
4. **Test 4**: Error state with retry button
5. **Test 5**: Error state without retry button
6. **Test 6**: Hide overlay
7. **Test 7**: Full cycle (load → success → hide)
8. **Test 8**: Full cycle (load → error → retry)

### Integration Testing

Test the full game flow:

1. Open `index.html` in browser
2. Wait for intro video (or skip)
3. Click "Play" button
4. Observe:
   - ✅ Loading overlay appears immediately
   - ✅ Progress bar fills smoothly
   - ✅ Percentage updates: 0% → 100%
   - ✅ No flash back to Intro Hub
   - ✅ Main hub appears with all avatars loaded
   - ✅ No late-appearing avatars

### Mobile Testing

1. Open Chrome DevTools
2. Toggle device emulation
3. Select iPhone/Android device
4. Test Play button flow
5. Verify:
   - Overlay is full-screen
   - Eye animation is smooth
   - Touch interactions work
   - Retry button is tappable

## Error Scenarios

### Scenario 1: Partial Avatar Load Failure

**Trigger**: Some avatars return 404 or network error

**Behavior** (non-strict mode):
- Progress updates for successful loads
- Final state: loaded < total
- Overlay hides, game proceeds

**Behavior** (strict mode):
- Progress stops at partial completion
- Error message shown on overlay
- Retry button appears (if enabled)
- Game does NOT proceed

### Scenario 2: Timeout

**Trigger**: Avatars take too long to load

**Behavior** (non-strict mode):
- Timeout after 7 seconds (default)
- Overlay hides, game proceeds with partial load

**Behavior** (strict mode):
- Timeout after 30 seconds (default)
- Error message shown on overlay
- Retry button appears (if enabled)
- Game does NOT proceed

### Scenario 3: Network Offline

**Trigger**: No network connection

**Behavior**:
- All avatar loads fail immediately
- Error message shown on overlay
- Retry button appears
- User can retry when network restored

### Scenario 4: JavaScript Exception

**Trigger**: Unexpected error in flow

**Behavior**:
- Exception caught in try/catch
- Error message shown on overlay with exception details
- Retry button appears
- Game does NOT proceed

## Performance Considerations

1. **Animations**:
   - CSS animations are hardware-accelerated (transform, opacity)
   - No layout thrashing or reflows
   - Smooth 60fps on most devices

2. **Progress Updates**:
   - Uses `requestAnimationFrame` for smooth UI updates
   - Avoids excessive DOM manipulation
   - Progress bar uses CSS transform for performance

3. **Memory**:
   - Overlay is removed from DOM when hidden
   - No memory leaks from event listeners
   - Avatar images are cached by browser

4. **Mobile Optimization**:
   - Reduced animation complexity on mobile
   - Smaller eye size to reduce render cost
   - Touch-optimized button sizes

## Browser Compatibility

- ✅ Chrome/Edge (Chromium) 90+
- ✅ Firefox 88+
- ✅ Safari 14+ (Desktop)
- ✅ iOS Safari 14+
- ✅ Chrome Mobile 90+
- ✅ Android WebView 90+

**Required Features**:
- CSS Custom Properties
- CSS Grid/Flexbox
- CSS Animations
- Promise API
- async/await
- Image.decode() (optional, has fallback)

## Accessibility

1. **ARIA Attributes**:
   - `role="dialog"` on overlay
   - `aria-modal="true"` to indicate modal behavior
   - `aria-busy="true"` while loading
   - `aria-live="polite"` for progress updates
   - `aria-label` on interactive elements

2. **Screen Readers**:
   - Live region announces progress at 0%, 25%, 50%, 75%, 100%
   - Error messages are announced immediately
   - Button labels are descriptive

3. **Keyboard Navigation**:
   - Retry button is focusable
   - Tab key works as expected
   - Enter/Space activate buttons

4. **Reduced Motion**:
   - Animations are disabled with `prefers-reduced-motion: reduce`
   - Progress bar still updates, but without transition
   - Eye animations are removed

## Migration Guide

### For Developers

If you have custom code that relies on the old avatar preload overlay:

**Before**:
```javascript
// Old approach - multiple overlays
await performAvatarPreload();  // IntroScreen method
handleButtonAction('intro:play', 'Play');
```

**After**:
```javascript
// New approach - single entry point
await StartupFlow.enterGameFromIntro();
```

### For Custom Themes/Mods

If your custom theme modifies avatar loading:

1. Remove custom overlay CSS (now centralized)
2. Configure via `window.game.cfg` instead
3. Use `LoadingOverlay` API for custom loading screens

## Telemetry Events

The system logs telemetry for monitoring:

- `loading_overlay_shown` - Overlay appeared
- `loading_overlay_hidden` - Overlay removed
- `loading_overlay_progress` - Progress milestone (25%, 50%, 75%, 100%)
- `loading_overlay_error` - Error shown
- `loading_overlay_retry` - User clicked retry
- `startup_enter_game_from_intro_start` - Flow started
- `startup_enter_game_from_intro_success` - Flow completed successfully
- `startup_enter_game_from_intro_error` - Flow encountered error

## Troubleshooting

### Issue: Overlay doesn't appear

**Causes**:
- LoadingOverlay.js not loaded
- CSS not loaded
- JavaScript error before overlay shown

**Solution**:
- Check browser console for errors
- Verify `<script>` and `<link>` tags in index.html
- Ensure LoadingOverlay.js loads before IntroScreen.js

### Issue: Progress stuck at 0%

**Causes**:
- No players available
- Avatar URLs are invalid
- Network offline

**Solution**:
- Check `g.game.players` in console
- Verify avatar URLs are accessible
- Check network connection

### Issue: Overlay shows but game never starts

**Causes**:
- Strict mode enabled with failed avatars
- Retry button not clicked
- JavaScript exception in flow

**Solution**:
- Check browser console for errors
- Click retry button if shown
- Disable strict mode: `cfg.avatarPreloadRequireAll = false`

### Issue: Flash back to Intro Hub

**Causes**:
- Using old enterGame path instead of enterGameFromIntro
- Multiple Play button clicks

**Solution**:
- Ensure using `StartupFlow.enterGameFromIntro()`
- Check for duplicate button event handlers
- Verify idempotence guards are working

## Future Enhancements

Potential improvements:

- [ ] Customizable eye animations (different styles)
- [ ] Progress bar color themes
- [ ] Estimated time remaining
- [ ] Individual avatar loading indicators
- [ ] Automatic retry on network restore
- [ ] ServiceWorker caching for avatars
- [ ] WebP/AVIF format support
- [ ] Progressive avatar loading (low-res → high-res)

## References

- Original PR: #715 (UX gating and resource preloading)
- Related PRs: #718, #722, #727, #742, #749, #752
- Avatar Queue Module: `js/preload/avatar-queue.js`
- Startup Flow Module: `src/startup/flow.js`
- Intro Screen Module: `src/ui/IntroScreen.js`

## Conclusion

The unified loading overlay system provides a robust, user-friendly solution to the Play → main hub transition. By consolidating multiple competing systems into a single entry point with proper progress tracking and error handling, we've eliminated race conditions, improved user experience, and made the codebase more maintainable.

The system is designed to be:
- **Reliable**: Single source of truth, no race conditions
- **User-Friendly**: Clear progress indication and error messages
- **Accessible**: ARIA support, screen reader friendly, reduced motion
- **Mobile-First**: Optimized for touch devices
- **Maintainable**: Clean separation of concerns, well-documented

---

**Last Updated**: 2025-12-05  
**Version**: 1.0.0  
**Authors**: GitHub Copilot
