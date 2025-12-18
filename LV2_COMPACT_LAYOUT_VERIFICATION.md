# LV2 Compact Layout Verification Guide

## Changes Made

### 1. CSS Loading (index.html) - Cache-Busting Fix
**Problem**: The compact LV2 layout CSS files were loaded without version query parameters, causing GitHub Pages to serve cached versions. This prevented the optical centering fixes from PR #899 from appearing on the live site.

**Solution**: Added cache-busting version parameters to direct `<link>` tags in `index.html` (lines 35-36):
```html
<link rel="stylesheet" href="css/livevote-compact.css?v=compact-fix-1">
<link rel="stylesheet" href="css/livevote-compact-fullyfit.css?v=compact-fix-1">
```

And to the JS file (line 519):
```html
<script defer src="js/livevote-ui.js?v=compact-fix-1"></script>
```

**Benefits**:
- Forces browsers and GitHub Pages to fetch fresh versions of the files
- More reliable loading on GitHub Pages
- Consistent with how other critical CSS files are versioned (e.g., `styles.css?v=fixes-5`)
- Proper load order maintained (after base styles, before other components)
- Ensures the optical centering fixes are actually deployed

### 2. Cache-Busting Strategy
**Problem**: GitHub Pages was serving cached versions of the compact layout files, preventing users from seeing the optical centering fixes from PR #899.

**Solution**: Added version query parameters (`?v=compact-fix-1`) to force browsers and CDN to fetch fresh versions:
- Consistent with existing cache-busting strategy used for `styles.css?v=fixes-5`
- Will increment version number for future updates (e.g., `?v=compact-fix-2`)
- Simple and effective way to bypass browser and CDN caches

## Verification Steps for Production

### Visual Verification on Production Site (https://georgi-cole.github.io/bbmobile/)

1. **Load the game** and start a new season
2. **Progress to an eviction phase** where Live Vote is triggered
3. **Check the LV2 layout**:
   - ✅ LV2 panel should fill exactly the faux TV area
   - ✅ Avatars should be centered horizontally
   - ✅ Stage area should be bounded (not expanding off-screen)
   - ✅ When you select a nominee, the "Evict" CTA button should appear **inside** the visible panel
   - ✅ No scrolling should be needed to see the CTA button
   - ✅ Layout should work on mobile portrait and laptop widths

### Quick Test URLs

1. **Test HTML file (in repo)**:
   - Open: `test_compact_lv2_layout.html`
   - Click "Start Live Vote"
   - Click "Select Left Nominee" or "Select Right Nominee"
   - Verify CTA appears inside visible panel

2. **Production test** (after merge):
   - URL: https://georgi-cole.github.io/bbmobile/test_compact_lv2_layout.html
   - Follow same steps as above

### Browser DevTools Verification

1. **Open DevTools** (F12) on the production site
2. **Check Network tab**:
   - Look for `livevote-compact.css?v=compact-fix-1` - should load with 200 status (not 304 or 404)
   - Look for `livevote-compact-fullyfit.css?v=compact-fix-1` - should load with 200 status (not 304 or 404)
   - Look for `livevote-ui.js?v=compact-fix-1` - should load with 200 status (not 304 or 404)
   - **NOTE**: The version parameter `?v=compact-fix-1` is critical - if you see these files loading WITHOUT the version parameter, clear browser cache or do a hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

3. **Check Computed styles** on the LV2 panel:
   - Find element: `#tv .lv2-panel` or `#tv .lv2-overlay`
   - Verify styles from `livevote-compact-fullyfit.css` are applied:
     - `position: absolute`
     - `inset: 0` (or equivalent top/left/right/bottom: 0)
     - `display: grid`
     - `grid-template-rows: auto 1fr auto` (with clamp() for gap)
     - `padding: clamp(16px, 4vh, 32px) clamp(12px, 3vw, 24px)`

4. **Check Console**:
   - Should not see 404 errors for compact CSS files
   - LV2 initialization logs should appear
   - Look for messages like `[lv2] Entering...` or similar debug output

## Expected Behavior

### Before This Fix
- ❌ Compact CSS loaded via `@import`, which could fail on GitHub Pages
- ❌ CTA button could be hidden/off-screen on mobile
- ❌ Users had to scroll to see the Evict button
- ❌ Stage could expand and push CTA below visible area

### After This Fix
- ✅ Compact CSS loads directly via `<link>` tags (reliable)
- ✅ CTA button always visible inside faux TV area
- ✅ No scrolling needed to access Evict button
- ✅ Stage is bounded with max-height, can't push content out
- ✅ Layout works on all viewport sizes

## Rollback Instructions

If issues are found, rollback is simple:

1. **Remove lines 35-36 from index.html**:
   ```html
   <!-- REMOVE THESE -->
   <link rel="stylesheet" href="css/livevote-compact.css">
   <link rel="stylesheet" href="css/livevote-compact-fullyfit.css">
   ```

2. **Restore @import in styles.css** (or just leave it without compact styles)

3. The old layout behavior will resume immediately.

## Technical Details

### CSS Files
1. **css/livevote-compact.css** (3.5 KB)
   - Provides compact and centered layout for LV2
   - Uses responsive sizing with clamp() functions
   - Media queries for mobile and laptop widths

2. **css/livevote-compact-fullyfit.css** (3.4 KB)
   - Ensures panel fills exactly the #tv area
   - Uses CSS Grid: 3 rows (avatars | stage | CTA)
   - Bounds stage with max-height to prevent CTA overflow
   - All rules use `!important` for precedence

### JavaScript Helpers (Already in livevote-ui.js)
- `ensureInlineCtaGuard()` - Creates/ensures CTA button exists
- `revealCtaInView()` - Ensures CTA is visible after selection
- Called automatically during LV2 initialization

### Load Order
```
1. styles.css (base styles)
2. overrides-fixes.css
3. mobile_version3.css
4. ... other CSS ...
5. livevote-choice-card.css (base LV2 card styles)
6. livevote-voteoverlay.css (overlay styles)
7. livevote-rollout.css
8. livevote-overrides.css
9. livevote-compact.css ← NEW (compact layout)
10. livevote-compact-fullyfit.css ← NEW (fully-fit override)
11. compact-hud.css (other compact UI)
```

This order ensures compact styles override earlier LV2 styles correctly.

## Related Files

- **index.html** - Added direct CSS links (lines 35-36)
- **styles.css** - Removed @import statements
- **css/livevote-compact.css** - Compact layout CSS
- **css/livevote-compact-fullyfit.css** - Fully-fit override CSS
- **js/livevote-ui.js** - LV2 UI system with helpers (unchanged)
- **test_compact_lv2_layout.html** - Test page for manual verification
- **COMPACT_LV2_IMPLEMENTATION.md** - Original implementation details

## Known Issues (Unrelated)

The following 404 errors mentioned in the problem statement are unrelated to the compact layout:
- `assets/skins/skins.json` - Actually exists at this path, not a real issue
- `tvscreen.jpg` - Should be `assets/videos/tvscreen.jpg` (already correct in code)
- `avatars/1.jpg` - Legacy reference, avatars use PNG files now

These don't affect the compact layout functionality.
