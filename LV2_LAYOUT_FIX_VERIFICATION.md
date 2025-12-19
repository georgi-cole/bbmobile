# LV2 Layout Fix - Verification Guide

## Overview
This document provides comprehensive verification steps for the LV2 eviction faux-TV layout fix implemented in this PR.

## What Was Fixed

### Problem
- CSS Grid layout with 3 areas but 7+ DOM elements caused overlaps
- Elements not properly centered or evenly spaced
- Layout broken on live site after PR #903 reverted PR #902

### Solution
- Converted from CSS Grid to Flexbox
- Used `justify-content: space-evenly` for optical centering
- Assigned proper flex properties to all elements
- Updated cache-busting version to force fresh CSS load

## Files Changed

1. **css/livevote-compact-fullyfit.css**
   - Changed from `display: grid` to `display: flex`
   - Changed from `grid-template-rows` to flexbox properties
   - Added flex properties for all child elements
   - Maintained responsive clamp() values

2. **index.html**
   - Updated cache-busting from `v=compact-fix-1` to `v=compact-fix-2`
   - Applied to: livevote-compact.css, livevote-compact-fullyfit.css, livevote-ui.js

3. **test_compact_lv2_layout.html**
   - Fixed script loading (added script tag, removed dynamic import)
   - Added DOMContentLoaded wrapper for initialization
   - Updated CSS links with cache-busting version

## Verification Steps

### 1. Local Testing (Development)

#### A. Desktop Viewport (1440x900)
1. Open `test_compact_lv2_layout.html` in browser
2. Click "Start Live Vote"
3. **Verify:**
   - ✅ "Live Vote" header centered at top
   - ✅ Alice and Bob avatars centered horizontally in middle
   - ✅ "YOUR TURN" pill visible at top
   - ✅ Instructions visible below avatars
   - ✅ Vote counts (0) visible below each nominee
4. Click "Select Left Nominee"
5. **Verify:**
   - ✅ Alice avatar highlighted (red border)
   - ✅ Button text changed from "Alice" to "Evict Alice"
   - ✅ Instructions updated: "You are about to evict Alice. Tap again to confirm."
   - ✅ All elements remain visible (no overflow)
   - ✅ Evenly spaced vertically

#### B. Mobile Viewport (375x667)
1. Resize browser to 375x667 (or use DevTools device emulation)
2. Repeat steps from Desktop verification
3. **Additional checks:**
   - ✅ No horizontal scrolling
   - ✅ No vertical scrolling needed to see CTA
   - ✅ Touch targets sized adequately (44px+ height)
   - ✅ All text legible

#### C. Tablet Viewport (768x1024)
1. Resize browser to 768x1024
2. Repeat verification steps
3. **Verify:** Layout adapts smoothly

### 2. Live Site Testing (Production)

**After merge to main and GitHub Pages deployment:**

#### A. Open Live Site
Navigate to: https://georgi-cole.github.io/bbmobile/

#### B. Network Tab Check (DevTools F12)
1. Open DevTools → Network tab
2. Filter: `livevote`
3. **Verify these files load with 200 status:**
   - ✅ `livevote-compact.css?v=compact-fix-2`
   - ✅ `livevote-compact-fullyfit.css?v=compact-fix-2`
   - ✅ `livevote-ui.js?v=compact-fix-2`
4. Check Response Headers: `cache-control` should allow caching
5. **If seeing 304 (cached):** Do hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

#### C. Computed Styles Check (DevTools)
1. Open DevTools → Elements tab
2. Trigger Live Vote eviction in game
3. Inspect element: `#tv .lv2-panel`
4. Check Computed tab:
   - ✅ `display: flex`
   - ✅ `flex-direction: column`
   - ✅ `justify-content: space-evenly`
   - ✅ `align-items: center`
   - ✅ `height: 100%` (fills container)
   - ✅ Padding: between 16-32px (responsive)

#### D. Visual Verification
1. **Start a game** or load saved game
2. **Progress to eviction phase** (Week 1, Day 7 typically)
3. **Wait for Live Vote to trigger**
4. **Verify layout on Desktop:**
   - ✅ Panel fills faux TV area
   - ✅ Avatars centered horizontally and vertically
   - ✅ "Live Vote" header at top
   - ✅ Instructions below avatars
   - ✅ YOUR TURN indicator visible
   - ✅ No scrolling needed
5. **Select a nominee:**
   - ✅ Name button transforms to "Evict [Name]"
   - ✅ Instructions update to confirmation message
   - ✅ Button remains visible (no overflow)
6. **Resize to mobile viewport** (DevTools or actual mobile device)
7. **Repeat verification** for mobile layout

#### E. Test Page (After Deployment)
Navigate to: https://georgi-cole.github.io/bbmobile/test_compact_lv2_layout.html
- Follow Local Testing steps above
- Verify cache-busted CSS loads (check Network tab)

### 3. Cross-Browser Testing

Test on multiple browsers to ensure compatibility:

#### Desktop Browsers
- ✅ Chrome/Edge (Chromium) 90+
- ✅ Firefox 88+
- ✅ Safari 14+

#### Mobile Browsers
- ✅ Mobile Safari (iOS 14+)
- ✅ Chrome Mobile (Android)
- ✅ Samsung Internet

### 4. Regression Testing

Ensure other features still work:

1. **Minigames:** Run `npm run test:minigames` → should pass (46/46)
2. **Runtime helpers:** Run `npm run test:runtime-helpers` → should pass
3. **Other ceremonies:** Test nomination, veto, HOH ceremonies → should work
4. **Save/Load:** Save game, reload page, load game → should work

## Expected Behavior Summary

### ✅ Desktop (1440x900)
- Panel fills faux TV area (520px height typical)
- All elements visible without scrolling
- Evenly spaced vertically (space-evenly)
- Avatars centered horizontally
- CTA appears inline on nominee tile
- Instructions update on selection

### ✅ Mobile (375x667)
- Panel fits within viewport
- No horizontal scrolling
- No vertical scrolling to reach CTA
- Touch targets sized adequately
- Responsive font sizes
- Compact but readable

### ✅ Tablet (768x1024)
- Hybrid of desktop/mobile behavior
- Smooth responsive transitions
- All elements visible

## Troubleshooting

### Issue: Layout looks the same (not fixed)
**Solution:**
1. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
2. Clear browser cache
3. Check Network tab: verify `?v=compact-fix-2` in URLs
4. Wait 5 minutes for GitHub Pages cache to update

### Issue: "window.lv2 is not defined" error
**Solution:**
1. Check Console for load errors
2. Verify `livevote-ui.js?v=compact-fix-2` loaded successfully
3. Check for CORS errors or blocked resources

### Issue: Elements still overlapping
**Solution:**
1. Check Computed styles (should show flexbox, not grid)
2. Verify CSS file loaded (check Network tab)
3. Inspect for conflicting CSS rules (look for higher specificity)

### Issue: Cache-busted CSS not loading
**Solution:**
1. Check `index.html` source: verify `?v=compact-fix-2` present
2. Check Network tab: should see 200 status (not 404)
3. Verify GitHub Pages deployment completed successfully

## Rollback Plan

If issues arise, revert is simple:

1. **Revert CSS file:**
   ```bash
   git revert <commit-hash>
   ```

2. **Or manually revert version:**
   - Change `?v=compact-fix-2` back to `?v=compact-fix-1`
   - Restore old `livevote-compact-fullyfit.css` from git history

3. **Or disable compact layout entirely:**
   - Remove CSS link from `index.html`
   - Old layout will resume

## Success Criteria

✅ All checkboxes above verified
✅ Desktop layout: centered, evenly spaced, no overflow
✅ Mobile layout: fits viewport, no scrolling needed
✅ Inline CTA: transforms correctly, visible
✅ No regressions: other features work
✅ Cross-browser: works on major browsers
✅ Performance: no layout thrashing, smooth rendering

## Screenshots

Visual proof of fix (see PR description or files in repo):
- `lv2_layout_desktop.png` - Desktop initial view
- `lv2_layout_desktop_selected.png` - Desktop with nominee selected
- `lv2_layout_mobile_selected.png` - Mobile with nominee selected
- `lv2_layout_laptop_selected.png` - Laptop with nominee selected

## Contact

If verification issues persist:
- Check PR comments for updates
- Review `COMPACT_LV2_IMPLEMENTATION.md` for architecture details
- Check `LV2_COMPACT_LAYOUT_VERIFICATION.md` (original) for context
- Run `npm run test:all` to verify no breaking changes

---

**Last Updated:** 2025-12-19
**PR:** Fix LV2 eviction faux-TV layout with centered flexbox design
**Related Docs:** COMPACT_LV2_IMPLEMENTATION.md, PR_SUMMARY_LV2_COMPACT_LAYOUT_FIX.md
