# Mobile Roster Auto-Initialization Changes

## Overview
This document explains the changes made to ensure the Mobile Roster UI activates automatically on iPhone devices (both portrait and landscape) without manual intervention.

## Problem Statement
The mobile roster was not automatically activating on iPhone devices because:
1. `MobileRoster.init()` was never called automatically
2. iOS Safari cached assets could serve old UI
3. CSS rule `@media (min-width: 769px)` was hiding the roster on iPhone landscape (e.g., iPhone 14 Pro Max landscape = 932px)

## Solution Architecture

### 1. Auto-Initialization Block (`js/ui/mobileRoster.js`)

Added a self-executing auto-init function that:

```javascript
// Auto-initialize MobileRoster for mobile devices and ensure activation on iPhone
(function MobileRosterAutoInit(){
  function onReady(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }
  onReady(() => {
    try {
      const ua = navigator.userAgent || '';
      // Force activation on mobile/touch UAs (iPhone/Android); safe because init is idempotent
      if (/iPhone|iPod|Android|Mobile/i.test(ua)) {
        window.FORCE_MOBILE_ROSTER = true;
      }
      if (window.MobileRoster && typeof window.MobileRoster.init === 'function') {
        window.MobileRoster.init();
        // Retry activation briefly to handle late data/DOM availability
        const start = Date.now();
        const iv = setInterval(() => {
          const activeAttr = document.body.getAttribute('data-mobile-roster-active') === 'true';
          const container = document.querySelector('.mobile-roster-container');
          if ((activeAttr && container) || (Date.now() - start) > 3000) {
            clearInterval(iv);
          } else {
            try { window.MobileRoster.refresh(); } catch(e) { /* no-op */ }
          }
        }, 300);
      } else {
        console.warn('[MobileRoster] Auto-init: MobileRoster not found on window');
      }
    } catch (e) {
      console.error('[MobileRoster] Auto-init error:', e);
    }
  });
})();
```

**Key Features:**
- **UA Detection**: Detects iPhone/iPod/Android/Mobile UAs
- **Force Flag**: Sets `window.FORCE_MOBILE_ROSTER = true` to guarantee activation
- **DOM Ready**: Waits for DOM to be ready before initializing
- **Retry Loop**: Polls every 300ms for up to 3 seconds to handle late data/DOM availability
- **Idempotent**: Safe to call multiple times (init is guarded by `state.initialized`)
- **Error Handling**: Gracefully handles errors without breaking page

### 2. CSS Landscape Support (`css/mobileRoster.css`)

**Removed:**
```css
@media (min-width: 769px) {
  body[data-mobile-roster-active="true"] .mobile-roster-container {
    display: none;
  }
  
  body[data-mobile-roster-active="true"] #rosterBar {
    display: flex;
  }
}
```

**Reason:** This rule was hiding the mobile roster on devices wider than 769px, which includes:
- iPhone 14 Pro Max landscape: 932px
- iPhone 14 Plus landscape: 932px
- iPad Mini landscape: 1024px

**Result:** Activation logic now controls visibility, not viewport width. If the activation logic decides to enable mobile roster (based on mobile UA + FORCE flag), it remains visible in both portrait and landscape.

### 3. Cache-Busting (`index.html`)

Updated query parameters to force fresh asset downloads:

**Before:**
```html
<link rel="stylesheet" href="css/mobileRoster.css?v=roster-ui-1">
<script defer src="js/ui/mobileRoster.js?v=roster-ui-1"></script>
```

**After:**
```html
<link rel="stylesheet" href="css/mobileRoster.css?v=roster-ui-2">
<script defer src="js/ui/mobileRoster.js?v=roster-ui-2"></script>
```

**Result:** iOS Safari will fetch the latest CSS/JS files instead of using cached versions.

### 4. Safety Net (`index.html`)

Added inline fallback script before `</body>`:

```html
<!-- Mobile Roster: Safety net for initialization -->
<script>
  window.addEventListener('load', function(){
    try {
      if (window.MobileRoster && typeof window.MobileRoster.init === 'function') {
        const active = document.body.getAttribute('data-mobile-roster-active') === 'true';
        if (!active) { window.MobileRoster.init(); }
      }
    } catch(e) { console.error('[MobileRoster] window.onload init fallback error:', e); }
  });
</script>
```

**Purpose:** If auto-init misses for any reason (race condition, slow script loading), this ensures init is called on window.load.

## Activation Flow

```
┌─────────────────────────────────────────────┐
│ Page Load                                   │
└─────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ Auto-Init Block Executes                    │
│ - Detects iPhone/Android UA                 │
│ - Sets window.FORCE_MOBILE_ROSTER = true    │
└─────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ DOM Ready Event                             │
│ - MobileRoster.init() called                │
└─────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ isMobileViewport() Check                    │
│ - Checks FORCE_MOBILE_ROSTER flag          │
│ - Returns true immediately                  │
└─────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ activateMobileRoster()                      │
│ - Sets body[data-mobile-roster-active]     │
│ - Renders mobile roster UI                  │
└─────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ Retry Loop (300ms × 10 iterations)         │
│ - Calls refresh() until activation         │
│ - Handles late DOM/data availability       │
└─────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ Mobile Roster Active                        │
│ - Badges visible at bottom of avatars      │
│ - Long-press opens profile sheet           │
│ - Works in portrait and landscape          │
└─────────────────────────────────────────────┘
```

## Testing

### Automated Test
Open `test_mobile_roster_auto_init.html` in a browser:
- Runs 8 test cases
- Checks UA detection
- Verifies initialization
- Confirms DOM structure
- Validates activation state

### Manual Testing on iPhone
1. **Portrait Mode**:
   - Open `index.html` in Safari/Chrome
   - Verify mobile roster appears with player tiles
   - Check badges are at bottom of avatars
   - Long-press tile → profile sheet should appear

2. **Landscape Mode**:
   - Rotate device to landscape
   - Verify roster remains visible (not hidden)
   - Check that badges still work
   - Long-press still opens profile sheet

3. **Cache-Busting**:
   - Hard refresh (pull-down-to-refresh on iOS)
   - Should load updated CSS/JS (v=roster-ui-2)
   - Verify in Network tab of Safari DevTools

### Desktop Regression Test
1. Open `index.html` on desktop
2. Resize viewport to < 768px → mobile roster activates
3. Resize viewport to > 768px → default roster shows
4. Mobile roster should not activate on desktop UA

## Console Logs to Expect

On iPhone Safari/Chrome:
```
[MobileRoster] Module loaded
[MobileRoster] Initializing...
[MobileRoster] DOM structure created
[MobileRoster] Updated: 0 active, 0 evicted (all 0 in main grid)
[MobileRoster] Desktop viewport, mobile roster inactive
[MobileRoster] Subscribed to game events
[MobileRoster] Subscribed to PlayerService
[MobileRoster] Chip bar suppression observer active
[MobileRoster] Initialization complete
[MobileRoster] Activated mobile roster view
```

## Backwards Compatibility

- Desktop behavior unchanged (uses default roster)
- Existing test files continue to work
- No breaking changes to public API
- `init()` is idempotent (safe to call multiple times)

## Future Considerations

1. **Do not add viewport-width-based hiding rules** that affect > 769px, as this breaks iPhone landscape
2. **Preserve the FORCE_MOBILE_ROSTER flag** in future updates
3. **Keep the retry loop** to handle late data/DOM availability
4. **Maintain cache-busting version** when updating mobile roster code
5. **Test on physical iPhone devices** after any mobile roster changes

## Files Changed

1. `js/ui/mobileRoster.js` - Added auto-init block (33 lines)
2. `css/mobileRoster.css` - Removed min-width: 769px hide rule
3. `index.html` - Updated cache-busting versions + added safety net
4. `test_mobile_roster_auto_init.html` - Created automated test file

## Acceptance Criteria ✅

- [x] Mobile roster activates automatically on iPhone (Safari/Chrome)
- [x] Works in both portrait and landscape orientations
- [x] Badges render at bottom of avatars
- [x] Long-press opens profile sheet
- [x] Cache-busting forces fresh asset load
- [x] Desktop layout remains unaffected
- [x] Console logs show initialization messages
- [x] Retry loop handles late data availability
- [x] Safety net provides fallback on window.load
