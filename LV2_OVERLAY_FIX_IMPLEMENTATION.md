# LV2 Eviction Overlay Fix - Implementation Summary

## Overview

This document describes the complete implementation of the LV2 (Live Vote 2) eviction overlay fix that centers the vote UI both vertically and horizontally inside the faux TV viewport on mobile and laptop devices.

## Problem Statement

Previous PRs (#895, #899, #903) attempted to fix the LV2 layout but issues persisted:
- Vote UI was top-anchored or bottom-anchored (not centered)
- Elements were cramped with overlapping content
- Timer/controls at the top were sometimes hidden
- Evict button was duplicated or off-screen
- Backdrop didn't fit the TV viewport properly
- Service worker cached stale versions preventing fixes from applying

## Solution Architecture

### 1. Pure CSS Grid Centering

**Key Change:** Use `place-content: center` instead of `place-items: center`

```css
.voteOverlay {
  display: grid !important;
  place-content: center !important;  /* Centers as a group, not individual items */
  grid-auto-rows: max-content !important;  /* Prevents stretching */
  justify-items: center !important;  /* Centers children horizontally */
  align-content: center !important;  /* Centers children vertically */
}
```

**Why this works:**
- `place-content: center` treats all children as a group and centers them together
- `grid-auto-rows: max-content` ensures rows only take up as much space as needed
- No conflicts with flex properties on children

### 2. Single-Column Vote Panel

**Structure:**
```
#tv (position: relative)
└── .voteOverlay (position: absolute, inset: 0, display: grid)
    └── .votePanel (display: flex, flex-direction: column)
        ├── .voteTitle (or .lv2-header)
        ├── .nomineeAvatar (or .lv2-grid with avatars)
        ├── .nomineeName (or .lv2-name-btn)
        ├── .voteHint (or .lv2-instructions)
        └── .evictBtn (or .lv2-name-btn-selected - inline CTA)
```

**Key CSS:**
```css
.votePanel {
  width: min(92%, 420px) !important;
  max-width: min(72vw, 520px) !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  gap: clamp(12px, 2.5vh, 20px) !important;
  /* CRITICAL: Remove vertical anchoring */
  top: unset !important;
  bottom: unset !important;
  transform: none !important;
  margin: 0 auto !important;
}
```

### 3. Responsive Padding for Timer Visibility

**Mobile viewports** need extra padding at the top to prevent overlapping with the timer:

```css
@media (max-width: 640px), (max-height: 700px) {
  .voteOverlay {
    padding-top: clamp(36px, 8vh, 72px) !important;
    padding-bottom: clamp(20px, 4vh, 40px) !important;
  }
}
```

### 4. JavaScript Enhancements

#### A. Remove Vertical Anchoring Styles

The app may inject inline styles that override CSS. We sanitize these:

```javascript
function removeVerticalAnchoringStyles() {
  // Remove inline styles: top, bottom, transform: translateY(), margin-top: auto
  // Remove justify-content: flex-end which pushes content to bottom
}
```

#### B. MutationObserver for Dynamic Re-renders

The app may re-render the UI dynamically. We watch for changes and re-apply fixes:

```javascript
function installLayoutObserver() {
  layoutObserver = new MutationObserver((mutations) => {
    // Detect changes to TV, overlay, or panel
    // Re-apply removeVerticalAnchoringStyles and removeDuplicateEvictButtons
  });
  layoutObserver.observe(tv, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });
}
```

#### C. Button Deduplication

Ensure only ONE evict button exists:

```javascript
function removeDuplicateEvictButtons() {
  // Find all possible evict buttons
  // Keep inline name buttons (they transform on selection)
  // Remove standalone duplicate buttons
  // Remove duplicate CTA rows
}
```

### 5. Cache Busting Strategy

**Three-layer cache busting:**

1. **Service Worker Cache Name:**
   ```javascript
   const CACHE_NAME = 'bb-pwa-v-lv2-overlay-fix';  // Changed from 'bb-pwa-v-post-pr35-enhancements'
   ```

2. **CSS/JS Query Parameters:**
   ```html
   <link rel="stylesheet" href="css/livevote-compact-fullyfit.css?v=compact-fix-5">
   <script src="js/livevote-ui.js?v=compact-fix-5"></script>
   ```

3. **User Cache Clearing Instructions:**
   - Hard reload: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Clear service worker: See audit doc for console commands

## Files Changed

### 1. `docs/AUDIT_LV2_PROD.md`
- Comprehensive audit of GitHub Pages configuration
- Documented service worker caching issues
- Added testing checklist and verification steps
- Provided cache-clearing instructions

### 2. `css/livevote-compact-fullyfit.css`
- Changed `place-items: center` to `place-content: center`
- Added `grid-auto-rows: max-content`
- Added explicit `justify-items: center` and `align-content: center`
- Increased `padding-top` on mobile viewports
- Added media query for small screens
- Removed conflicting vertical anchoring properties
- Added styling for `.nomineeName`, `.voteHint`, `.nomineeAvatar`

### 3. `js/livevote-ui.js`
- Enhanced `removeVerticalAnchoringStyles` to handle more cases:
  - `transform: translateY()`
  - `top`, `bottom` (inline styles)
  - `margin-top: auto`
  - `justify-content: flex-end`
- Added `installLayoutObserver` function with MutationObserver
- Added `layoutObserver` cleanup in `cleanup()` function
- Debounced observer callbacks to avoid excessive re-runs

### 4. `sw.js`
- Updated `CACHE_NAME` from `'bb-pwa-v-post-pr35-enhancements'` to `'bb-pwa-v-lv2-overlay-fix'`

### 5. `index.html`
- Updated cache-busting versions from `?v=compact-fix-4` to `?v=compact-fix-5`:
  - `css/livevote-compact.css`
  - `css/livevote-compact-fullyfit.css`
  - `js/livevote-ui.js`

### 6. `test_compact_lv2_layout.html`
- Updated cache-busting versions to `?v=compact-fix-5`
- Test file ready for local and production testing

## Testing Strategy

### Local Testing

1. **Open test file in browser:**
   ```
   file:///path/to/bbmobile/test_compact_lv2_layout.html
   ```

2. **Or serve with local server:**
   ```bash
   npx http-server -p 8080
   # Then open: http://localhost:8080/test_compact_lv2_layout.html
   ```

3. **Test steps:**
   - Click "Start Live Vote" to initialize
   - Click "Toggle Test Markers" to see TV boundaries
   - Click "Select Left Nominee" to test selection
   - Verify Evict button appears inline (on name button)
   - Click "Simulate Votes" to test vote animation
   - Resize browser to test mobile (375px) and laptop (1280px) viewports

### Production Testing (GitHub Pages)

After PR is merged to `main`:

1. **Clear all caches:**
   ```javascript
   // In browser console:
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(reg => reg.unregister());
   });
   caches.keys().then(keys => {
     keys.forEach(key => caches.delete(key));
   });
   location.reload(true);
   ```

2. **Hard reload:**
   - Chrome/Edge: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Firefox: `Ctrl+F5` (Windows/Linux) or `Cmd+Shift+R` (Mac)

3. **Test on live site:**
   - Main game: https://georgi-cole.github.io/bbmobile/
   - Test file: https://georgi-cole.github.io/bbmobile/test_compact_lv2_layout.html

4. **Verify with DevTools:**
   - Open DevTools (F12) → Network tab
   - Check for 200 OK responses for CSS/JS with `?v=compact-fix-5`
   - Inspect DOM structure (see below)
   - Check computed styles (see below)

### DOM Structure Verification

**Expected structure:**
```html
<div id="tv" class="fauxTv">
  <div class="lv2-overlay voteOverlay">
    <div class="lv2-panel votePanel">
      <div class="lv2-header">Live Vote</div>
      <div class="lv2-grid">
        <div class="lv2-contestant left">
          <div class="lv2-avatar"><img src="..."></div>
          <button class="lv2-name-btn">Alice</button>
          <!-- Becomes: <button class="lv2-name-btn lv2-name-btn-selected">Evict Alice</button> when selected -->
        </div>
        <div class="lv2-contestant right">
          <div class="lv2-avatar"><img src="..."></div>
          <button class="lv2-name-btn">Bob</button>
        </div>
      </div>
      <div class="lv2-instructions">Tap on the photo...</div>
      <!-- Other elements: voter feed, status, etc. -->
    </div>
  </div>
</div>
```

### Computed Styles Verification

**Overlay (`.voteOverlay`):**
- ✅ `display: grid`
- ✅ `place-content: center` (or `align-content: center` + `justify-content: center`)
- ✅ `position: absolute`
- ✅ `top: 0`, `left: 0`, `right: 0`, `bottom: 0` (or `inset: 0`)
- ✅ `overflow-y: auto`

**Panel (`.votePanel`):**
- ✅ `display: flex`
- ✅ `flex-direction: column`
- ✅ `align-items: center`
- ❌ NO `top` or `bottom` (should be unset/auto)
- ❌ NO `transform: translateY(...)`
- ❌ NO `margin-top: auto`
- ❌ NO `justify-content: flex-end`

### Visual Acceptance Criteria

**Mobile (375px x 667px - iPhone SE):**
- [ ] Vote UI is centered vertically (not at top or bottom)
- [ ] Vote UI is centered horizontally
- [ ] Elements are in single column: Title → Avatar → Name → Helper → Button
- [ ] Elements have breathing room (not cramped)
- [ ] Timer at top is visible (not overlapped)
- [ ] Only ONE evict button present
- [ ] Button is tappable (min 44px height)
- [ ] Backdrop fits TV viewport without overflow

**Laptop (1280px x 720px):**
- [ ] Vote UI is centered vertically and horizontally
- [ ] Same single-column layout as mobile
- [ ] Elements are properly scaled
- [ ] Timer/controls at top are visible
- [ ] Only ONE evict button present
- [ ] No horizontal scrolling

## Rollback Plan

If issues occur after deployment:

1. **Revert PR:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Emergency cache clear:**
   - Update service worker cache name again
   - Push to trigger deployment
   - Users will get fresh cache on next visit

3. **Fallback CSS:**
   - Can temporarily remove `livevote-compact-fullyfit.css` from index.html
   - System will fall back to `livevote-compact.css` which has less aggressive styling

## Known Limitations

1. **Service Worker Caching:**
   - Users who visited the site before this fix may need to manually clear cache
   - Service worker will auto-update eventually, but may take time

2. **Very Small Screens (<320px):**
   - Layout may be cramped on extremely narrow devices
   - Minimum viable width is 320px

3. **Very Tall Screens (>900px height):**
   - Content may appear small/distant
   - Acceptable trade-off for proper centering

## Future Improvements

1. **Dynamic Viewport Detection:**
   - Use ResizeObserver to adjust padding based on actual timer height
   - More precise spacing calculations

2. **Smooth Transitions:**
   - Add CSS transitions when layout adjusts
   - Animate selection state changes

3. **Accessibility:**
   - Enhanced screen reader announcements
   - Better keyboard navigation

## Related Documentation

- **Audit:** `docs/AUDIT_LV2_PROD.md` - Comprehensive audit and troubleshooting guide
- **Test File:** `test_compact_lv2_layout.html` - Interactive test page
- **CSS:** `css/livevote-compact-fullyfit.css` - Main styling
- **JS:** `js/livevote-ui.js` - Core logic and DOM manipulation
- **Previous PRs:** #895, #899, #903 (reverted)

## Implementation Timeline

- **2024-12-19:** Initial implementation with Grid centering and MutationObserver
- **Next:** Testing and verification phase
- **Next:** PR merge and production deployment
- **Next:** Post-deployment monitoring

## Success Metrics

- [ ] Zero reports of "can't find evict button"
- [ ] Zero reports of "timer is hidden"
- [ ] Zero reports of "UI is cramped"
- [ ] Consistent layout across mobile and laptop viewports
- [ ] Only one evict button always present
- [ ] Proper vertical and horizontal centering

## Support

For issues or questions:
1. Check `docs/AUDIT_LV2_PROD.md` for troubleshooting
2. Open test file locally: `test_compact_lv2_layout.html`
3. Inspect DOM structure and computed styles in DevTools
4. Clear cache and hard reload
5. Report issue with screenshots and browser info

---

**Last Updated:** 2024-12-19
**Author:** GitHub Copilot
**Status:** ✅ Implementation Complete - Ready for Testing
