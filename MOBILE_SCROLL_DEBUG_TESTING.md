# Mobile Scroll Debug - Testing Guide

## Overview
This document provides comprehensive testing instructions for the mobile scroll debug patch.

## Quick Start

### Enable Debug Mode
Add `?scroll_debug=1` to any URL:
- Local: `http://localhost:8080/?scroll_debug=1`
- Production: `https://georgi-cole.github.io/bbmobile/?scroll_debug=1`

### What Gets Loaded
When `?scroll_debug=1` is present:
1. **css/mobile-scroll-fix.css** - CSS overrides for scroll issues
2. **js/debug/mobile-scroll-debug.js** - Diagnostic and logging script

## Mobile Device Testing

### iOS (Safari)

#### Setup:
1. Open Safari on iPhone
2. Navigate to: `https://georgi-cole.github.io/bbmobile/?scroll_debug=1`
3. Clear cache: Settings → Safari → Clear History and Website Data

#### Tests:
1. **Initial Load**
   - Check for orange debug banner at top: "🔧 SCROLL DEBUG MODE ACTIVE"
   - Page should load normally

2. **Navigate to Live Vote**
   - Start a new game
   - Advance to eviction phase (livevote)
   - Live vote UI should appear

3. **Scroll Test**
   - ✓ Page should scroll vertically
   - ✓ Touch gestures should work smoothly
   - ✓ Vote buttons should be accessible (not hidden under browser chrome)
   - ✓ No "rubber band" bounce at top/bottom (overscroll contained)

4. **Rotation Test**
   - Rotate device to landscape
   - Verify UI still scrolls
   - Rotate back to portrait
   - Verify UI still scrolls

5. **Browser Chrome Test**
   - Scroll down to hide Safari's bottom toolbar
   - Scroll up to show Safari's bottom toolbar
   - ✓ UI content should NOT be hidden under toolbar
   - ✓ Safe area padding should be visible at bottom

#### Remote Debugging (Optional):
1. Enable Web Inspector on iPhone: Settings → Safari → Advanced → Web Inspector
2. Connect iPhone to Mac via USB
3. Open Safari on Mac → Develop → [Your iPhone] → [Page]
4. Check Console for `[Mobile Scroll Debug]` messages

### Android (Chrome)

#### Setup:
1. Open Chrome on Android
2. Navigate to: `https://georgi-cole.github.io/bbmobile/?scroll_debug=1`
3. Clear cache: Chrome Menu → History → Clear browsing data

#### Tests:
Same as iOS tests above

#### Remote Debugging (Optional):
1. Enable USB debugging on Android: Settings → Developer Options → USB Debugging
2. Connect Android to computer via USB
3. Open Chrome on computer → `chrome://inspect`
4. Click "inspect" on your device
5. Check Console for `[Mobile Scroll Debug]` messages

## Desktop Testing (Chrome DevTools)

### Setup:
1. Open Chrome DevTools (F12)
2. Enable device emulation (Ctrl+Shift+M or Cmd+Option+M)
3. Select device: iPhone 12 Pro or similar
4. Navigate to: `http://localhost:8080/?scroll_debug=1` (or production URL)

### Tests:

#### 1. Console Diagnostics
After page loads, console should show:
```
[Mobile Scroll Debug] Initializing...
[Mobile Scroll Debug] Initializing diagnostics...
========================================================
[Mobile Scroll Debug] Running diagnostics...
========================================================
[Mobile Scroll Debug] Added passive touchmove listener to: wrap
[Mobile Scroll Debug] Scanning for problematic touch handlers...
[Mobile Scroll Debug] Found elements with inline touch handlers:
  - ... (may be empty or show found handlers)
[Mobile Scroll Debug] Checking for scroll-blocking CSS...
[Mobile Scroll Debug] To inspect touch event listeners:
  ...
========================================================
[Mobile Scroll Debug] Diagnostics complete
  - Found X elements with inline touch handlers
  - Found Y elements with scroll-blocking CSS
========================================================
```

#### 2. Manual API Testing
Open Console and run:

```javascript
// Get current state
MobileScrollDebug.getState()

// Run full diagnostics
MobileScrollDebug.runDiagnostics()

// Toggle debug mode (outlines scrollable containers)
MobileScrollDebug.toggleDebugMode()
// Toggle again to disable
MobileScrollDebug.toggleDebugMode()

// Scan for problematic handlers only
MobileScrollDebug.scanForProblematicHandlers()

// Check for scroll-blocking CSS only
MobileScrollDebug.scanForScrollBlockingCSS()
```

#### 3. Visual Inspection
1. Run `MobileScrollDebug.toggleDebugMode()` in console
2. Scrollable containers should have green dashed outline
3. Navigate to live vote
4. Live vote containers should be outlined
5. Try scrolling - should work smoothly

#### 4. CSS Override Test
1. Open Elements tab in DevTools
2. Select `<html>` element
3. Check Computed styles:
   - `overflow` should be `auto` (not `hidden`)
   - Look for `-webkit-overflow-scrolling: touch`
4. Select `.lv2-overlay` or `.lv-overlay` if present
5. Check Computed styles:
   - `overflow-y` should be `auto`
   - `padding-bottom` should include safe-area-inset

## Expected Results

### Success Indicators:
✓ Orange debug banner appears at top of page
✓ Console shows diagnostic messages
✓ `MobileScrollDebug` API is available in console
✓ Page scrolls smoothly on mobile
✓ Vote buttons are accessible (not hidden)
✓ No scroll lock or frozen UI
✓ Safe area padding visible at bottom

### Failure Indicators:
✗ No debug banner (check URL has `?scroll_debug=1`)
✗ Console shows no `[Mobile Scroll Debug]` messages
✗ `MobileScrollDebug` is undefined
✗ Page still won't scroll
✗ Vote buttons still hidden under browser chrome

## Troubleshooting

### Problem: Debug assets not loading
**Check:**
- URL includes `?scroll_debug=1`
- Files exist: `css/mobile-scroll-fix.css`, `js/debug/mobile-scroll-debug.js`
- No console errors
- Clear browser cache

### Problem: Still can't scroll
**Check Console for:**
- Warnings about `overflow:hidden` on html/body
- Warnings about touch handlers with `preventDefault`
- Elements with inline touch handlers

**Try:**
1. Run `MobileScrollDebug.toggleDebugMode()` to see which containers are scrollable
2. Inspect containers with DevTools
3. Check if other CSS is overriding the debug styles
4. Look for JavaScript errors preventing script execution

### Problem: API not available
**Check:**
- JavaScript file loaded: Check Network tab
- No syntax errors in console
- Query parameter is correct: `?scroll_debug=1` (not `?debug=1` or other)

## Comparing Before/After

### Without Debug Patch (Before):
1. Visit site without `?scroll_debug=1`
2. Navigate to live vote
3. ❌ Page may not scroll
4. ❌ Vote buttons may be hidden
5. ❌ Browser chrome overlaps content

### With Debug Patch (After):
1. Visit site with `?scroll_debug=1`
2. Navigate to live vote
3. ✓ Page scrolls smoothly
4. ✓ Vote buttons accessible
5. ✓ Safe area padding prevents overlap

## Performance Testing

### Load Time Impact:
- CSS file: ~3.3 KB (minuscule impact)
- JS file: ~8.3 KB (minuscule impact)
- Total: ~11.6 KB additional load when debug mode enabled
- **Impact: Negligible** - only loads when explicitly requested

### Runtime Impact:
- Passive touch listener: No performance impact (passive)
- MutationObserver: Minimal impact (only scans when DOM changes)
- Diagnostics: Runs once on load + when DOM mutates
- **Impact: Minimal to none**

## Next Steps After Testing

### If scrolling works:
1. Document which specific diagnostics identified the root cause
2. Create permanent fix based on findings
3. Remove this debug patch

### If scrolling still doesn't work:
1. Capture console output
2. Note any warnings/errors
3. Check for other blocking CSS/JS
4. May need deeper investigation

## Cleanup

### To disable debug mode:
Simply remove `?scroll_debug=1` from URL and reload

### To completely remove patch:
See "How to Revert" section in main PR description

## Support

If issues persist:
1. Capture full console output
2. Take screenshots showing the issue
3. Note device/browser version
4. Document reproduction steps
5. Share findings with development team

---

**Remember:** This is a temporary debug patch. Once the root cause is identified and fixed permanently, this patch should be removed.
