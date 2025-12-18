# LV2 Compact Layout - Deployment Verification Guide

## Summary of Fix

**Problem**: GitHub Pages was serving cached versions of the compact layout CSS/JS files, preventing the optical centering fixes from PR #899 from appearing on the live site (https://georgi-cole.github.io/bbmobile/).

**Solution**: Added cache-busting version parameters (`?v=compact-fix-1`) to force fresh file loads.

## What Changed

### Files Modified
1. **index.html** - Added version parameters to 3 files:
   - `css/livevote-compact.css?v=compact-fix-1` (line 35)
   - `css/livevote-compact-fullyfit.css?v=compact-fix-1` (line 36)
   - `js/livevote-ui.js?v=compact-fix-1` (line 519)

2. **LV2_COMPACT_LAYOUT_VERIFICATION.md** - Updated documentation

### CSS Files Content (No Changes - Just Cache Busting)
The CSS files themselves were NOT modified. They already contain the optical centering fixes from PR #899:

#### `css/livevote-compact-fullyfit.css`
- Uses CSS Grid with 3 rows: header | avatars | cta
- Balanced spacing with `gap: clamp(12px, 3vh, 24px)`
- Responsive padding: `clamp(16px, 4vh, 32px) clamp(12px, 3vw, 24px)`
- Avatar sizing: `clamp(80px, 16vmin, 160px)`
- Stage bounded with max-height to prevent overflow

#### `css/livevote-compact.css`
- Compact layout for mobile/laptop widths
- Avatar sizing: `clamp(80px, 13dvw, 140px)`
- CTA sticky positioning with safe-area insets
- Centered grid with `max-width: min(72vw, 520px)`

## Expected Visual Result

### Before Fix (Cached Old Version)
❌ **Crowded Layout**:
- Headlines/text cramped together
- Avatars not centered
- CTA button pushed below visible area (covered by timer/controls)
- User must scroll to see "Evict" button
- Uneven spacing between elements

### After Fix (Fresh Version with Cache Busting)
✅ **Optical Centering**:
- Headlines have breathing room with clamp() spacing
- Avatars centered horizontally in middle of faux TV
- CTA button always visible inside TV panel
- No scrolling needed
- Balanced top/middle/bottom padding
- Timer/controls NOT overlapped

## Verification Steps

### Step 1: Check Network Tab (Critical)
1. Open production site: https://georgi-cole.github.io/bbmobile/
2. Open DevTools (F12) → Network tab
3. Clear browser cache: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
4. Reload page and check these files load:
   - `livevote-compact.css?v=compact-fix-1` ✅ Status 200 (not 304)
   - `livevote-compact-fullyfit.css?v=compact-fix-1` ✅ Status 200 (not 304)
   - `livevote-ui.js?v=compact-fix-1` ✅ Status 200 (not 304)

**Important**: If you see these files loading WITHOUT the `?v=compact-fix-1` parameter, it means the HTML hasn't been updated yet on GitHub Pages. Wait a few minutes and try again.

### Step 2: Visual Verification
1. Start a new game
2. Progress to eviction phase (Live Vote)
3. Check the layout:
   - [ ] LV2 panel fills exactly the faux TV area
   - [ ] Bottom edge of LV2 matches TV bottom
   - [ ] Avatars are centered horizontally
   - [ ] Headlines have clamp() spacing (not cramped)
   - [ ] When you select a nominee, "Evict" button appears INSIDE visible panel
   - [ ] No scrolling needed to see CTA button
   - [ ] Timer/controls are NOT covered

### Step 3: Computed Styles Check
1. In DevTools, select the LV2 panel: `#tv .lv2-panel`
2. Check Computed tab shows:
   - `display: grid` ✅
   - `grid-template-rows: auto 1fr auto` ✅
   - `padding: [value from clamp()]` ✅
   - `gap: [value from clamp()]` ✅
3. Select avatar element: `.lv2-avatar`
4. Check size uses clamp():
   - `width: [value from clamp(80px, 16vmin, 160px)]` ✅
   - `height: [value from clamp(80px, 16vmin, 160px)]` ✅

## Mobile Testing

Test on mobile viewports (portrait):
1. Open DevTools → Device toolbar (Ctrl+Shift+M)
2. Select "iPhone 12 Pro" or similar
3. Rotate to portrait mode
4. Follow Step 2 visual verification above
5. Verify carousel mode works (if applicable)

## Rollback Instructions

If issues occur, rollback is simple:

1. Edit `index.html` lines 35-36 and 519:
   ```html
   <!-- Remove version parameters -->
   <link rel="stylesheet" href="css/livevote-compact.css">
   <link rel="stylesheet" href="css/livevote-compact-fullyfit.css">
   <script defer src="js/livevote-ui.js"></script>
   ```

2. Commit and push to main
3. Wait for GitHub Pages to redeploy (~1-2 minutes)

## Deployment Timeline

GitHub Pages typically takes **1-3 minutes** to reflect changes after a push to the main branch. If changes don't appear immediately:
1. Wait 3-5 minutes
2. Do a hard refresh: Ctrl+Shift+R / Cmd+Shift+R
3. Check Network tab to confirm version parameters are present
4. If still not working after 10 minutes, check GitHub Actions tab for deployment status

## Future Updates

When making future changes to these files, increment the version number:
- Current: `?v=compact-fix-1`
- Next: `?v=compact-fix-2`
- Pattern: `compact-fix-N` where N increments

This ensures users always get the latest version without having to manually clear their cache.

## Related Documentation

- **LV2_COMPACT_LAYOUT_VERIFICATION.md** - Original implementation details
- **COMPACT_LV2_IMPLEMENTATION.md** - Technical implementation summary
- **test_compact_lv2_layout.html** - Manual test file for local verification

## Contact

If you encounter issues with the deployment:
1. Check the Network tab first (most common issue is cached HTML)
2. Verify the version parameters are present in the loaded files
3. Try a hard refresh or incognito/private browsing mode
4. Report issues with screenshots showing the Network tab
