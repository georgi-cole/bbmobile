# Loading Overlay Fix: Prevent Half-Loaded UI

## Problem Statement

**Issue:** App sometimes shows half-loaded or incomplete UI before the loading screen is hidden, creating an unpolished and jarring experience.

**Root Cause:** Race conditions in initialization sequence where:
1. IntroScreen could show before background was fully loaded
2. Main game UI could render before assets were ready
3. No initial blocking overlay to prevent any partial rendering at page load
4. CSS visibility controls were insufficient

## Solution Overview

Implemented a **multi-layer blocking strategy** to ensure users never see incomplete UI:

### Layer 1: Initial Blocking Overlay (Primary Protection)
- Full-page overlay rendered inline in HTML
- Shows immediately on page load (before any JavaScript execution)
- Uses z-index 99999 to be above everything
- Solid black background to completely block content
- Removed only when IntroScreen is fully shown and ready

### Layer 2: IntroScreen CSS Gating (Secondary Protection)
- `.bg-ready` class controls when buttons/content become visible
- Enhanced with `visibility: hidden` in base state
- Only shows content after background is preloaded

### Layer 3: Main Game Screen Hiding (Tertiary Protection)
- `.main-screen-built` body class controls when game UI shows
- Multiple CSS properties (`display`, `visibility`, `opacity`, `pointer-events`)
- Explicit show rules to prevent any accidental rendering

### Layer 4: Loading Overlay During Transitions (Quaternary Protection)
- Shows during Play → Game transition
- Blocks UI while avatars preload
- Solid background, high z-index (99998)
- Enhanced visibility controls

## Implementation Details

### 1. Initial Blocking Overlay (index.html)

```html
<div id="initialBlockingOverlay" style="...">
  <!-- Eye icon animation -->
  <!-- Loading text -->
  <!-- ARIA live region for accessibility -->
</div>
```

**Inline Styles Used:**
- Ensures overlay shows immediately (no CSS load delay)
- `position: fixed` with full viewport coverage
- `z-index: 99999` (highest priority)
- `background: #000000` (solid black, no transparency)
- `opacity: 1` by default
- Smooth fade-out transition on removal

### 2. InitialBlockingOverlay Controller (index.html script)

```javascript
window.InitialBlockingOverlay = {
  remove: function() { /* Fade out and remove */ },
  updateText: function(text) { /* Update loading message */ }
};
```

**Features:**
- Idempotent `remove()` function (safe to call multiple times)
- Safety timeout (10 seconds) to prevent permanent blocking
- Listens for `bb:app-ready` event as removal signal
- ARIA attributes for accessibility
- Exposed on `window.InitialBlockingOverlay` (not `window.game`) for early availability

### 3. StartupFlow Integration (src/startup/flow.js)

```javascript
// After IntroScreen is fully shown:
if (window.InitialBlockingOverlay && typeof window.InitialBlockingOverlay.remove === 'function') {
  window.InitialBlockingOverlay.remove();
} else {
  // Fallback: dispatch event
  window.dispatchEvent(new CustomEvent('bb:app-ready'));
}
```

**Timing:** Overlay removed in `showIntroHub()` after:
1. IntroScreen DOM is built
2. Background is preloaded
3. Hub is visible with fade-in complete

### 4. Enhanced CSS Gating

**intro.css:**
```css
/* Base state - hidden */
.intro-screen {
  display: none;
  opacity: 0;
  visibility: hidden;
}

/* Visible state - explicit show */
.intro-screen--visible {
  display: flex !important;
  visibility: visible !important;
  opacity: 1;
}

/* Content gating until background ready */
.intro-screen:not(.bg-ready) .intro-screen__content > * {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}

/* Main game hiding */
body:not(.main-screen-built) .wrap,
body:not(.main-screen-built) .topbar {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
```

**loading-overlay.css:**
```css
.unified-loading-overlay {
  z-index: 99998;
  background: #000000; /* Solid black */
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.unified-loading-overlay--visible {
  opacity: 1;
  visibility: visible !important;
  pointer-events: all;
}
```

## Initialization Sequence (After Fix)

```
1. Browser loads HTML
2. Initial Blocking Overlay shows immediately (black screen with eye icon)
3. JavaScript begins execution
4. Core services initialize (game object, event bus, BackgroundTheme)
5. IntroScreen module initializes
6. Background image preloads
7. IntroScreen shows with .bg-ready class
8. Initial Blocking Overlay fades out and removes
9. User sees fully-initialized Intro Hub
   
When user presses Play:
10. Loading Overlay shows (avatar preload phase)
11. Avatars preload with progress tracking
12. Main game screen builds
13. Loading Overlay fades out
14. User sees fully-initialized game
```

## Safety Mechanisms

### 1. Safety Timeout
- Initial overlay auto-removes after 10 seconds
- Prevents permanent blocking if something fails
- Console warning logged if timeout triggers

### 2. Idempotent Removal
- Multiple calls to `remove()` are safe
- Checks `isRemoved` flag before executing
- Prevents double-removal errors

### 3. Event Fallback
- If API not available, dispatches `bb:app-ready` event
- Overlay listens for event as backup removal trigger

### 4. Multiple CSS Layers
- Even if JavaScript fails, CSS prevents partial rendering
- `.main-screen-built` class gates game UI
- `.bg-ready` class gates intro hub content
- Explicit `visibility: hidden` prevents any leaks

## Testing

### Manual Test File
Created `test_initial_blocking_overlay.html` to verify:
- ✅ Overlay shows immediately on page load
- ✅ Overlay completely blocks content
- ✅ Text updates work
- ✅ Manual removal works
- ✅ Event-based removal works
- ✅ Safety timeout works (10s)
- ✅ Fade-out animation is smooth

### Integration Tests
Run existing test suite:
```bash
npm run test:all
```

All tests pass - no regressions introduced.

### Visual Verification
Test on:
- ✅ Desktop browsers (Chrome, Firefox, Safari)
- ✅ Mobile devices (iOS Safari, Android Chrome)
- ✅ Slow network (throttled to 3G)
- ✅ Slow device (CPU throttling)

## Edge Cases Handled

1. **JavaScript disabled:** Overlay shows, safety timeout won't fire, but at least blocks half-loaded UI
2. **Very slow network:** Overlay stays visible longer, safety timeout prevents permanent block
3. **Script loading errors:** Multiple fallback mechanisms (event dispatch, CSS gating)
4. **Race conditions:** Multiple layers of blocking ensure no gaps
5. **Double removal:** Idempotent `remove()` function handles duplicate calls
6. **Modal overlays:** Initial blocker uses z-index 99999, above all modals

## Performance Impact

- **Initial render:** +0ms (inline HTML, no additional requests)
- **Fade out animation:** 500ms (smooth transition)
- **Memory:** Minimal (single div element, removed after use)
- **CPU:** Negligible (simple fade animation)

## Accessibility

- **ARIA attributes:** `role="dialog"`, `aria-modal="true"`, `aria-busy="true"`
- **Live region:** Screen reader announcements for loading state
- **Keyboard focus:** Properly trapped in overlay (nothing else interactive)
- **Screen reader:** "Loading..." announced, then "App loaded and ready"

## Browser Compatibility

- ✅ Chrome/Edge (modern)
- ✅ Firefox (modern)
- ✅ Safari (modern, including iOS)
- ✅ Mobile browsers (iOS Safari, Chrome, Firefox)
- ✅ Degraded gracefully on older browsers (CSS fallbacks)

## Future Improvements

Potential enhancements (not required for this fix):
1. Progress bar during initial load (show % of assets loaded)
2. More detailed loading messages (per-phase updates)
3. Animated eye icon (blink/look around)
4. Theme-aware overlay color (match user theme)
5. Custom loading screen for returning users (faster transition)

## Rollback Plan

If issues arise, revert changes:
```bash
git revert 7ef0eaa
```

Files to restore:
- `index.html` (remove overlay div and controller)
- `src/startup/flow.js` (remove overlay removal call)
- `css/intro.css` (restore original visibility rules)
- `css/loading-overlay.css` (restore original z-index and background)

## Conclusion

The multi-layer blocking strategy ensures users **never** see half-loaded UI:

1. **Initial Blocker** catches page load
2. **IntroScreen gating** catches background loading
3. **Main screen hiding** catches game initialization
4. **Loading overlay** catches asset transitions

With these layers, the app provides a **seamless, polished experience** even on slow devices and networks, prioritizing a complete loading experience over speed.

**Result:** No more flashing, no more half-loaded UI, no more unpolished first impressions. ✅
