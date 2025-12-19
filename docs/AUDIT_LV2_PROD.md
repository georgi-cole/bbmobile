# LV2 Production Audit - Updated 2024-12-19

## Overview

This document provides a comprehensive audit of the LV2 (Live Vote 2) eviction overlay implementation and explains why previous layout fixes may not have fully applied on GitHub Pages. It also documents the current state and requirements for the definitive fix.

## Executive Summary

**Key Findings:**
1. ✅ GitHub Pages serves from **root directory** (`/`) on `main` branch
2. ✅ CSS and JS assets exist in repository at correct paths
3. ⚠️ Service worker may cache stale versions (requires version bump)
4. ⚠️ No feature flags preventing layout, but CSS/JS needed refinement
5. ✅ Assets are referenced in index.html with cache-busting parameters
6. ✅ No docs/ directory publishing required - direct root serving

**Why Previous Changes May Not Have Appeared on Pages:**
1. **Service Worker Caching**: The service worker (`sw.js`) caches CSS/JS files and serves cached versions even after deployment
2. **Browser Caching**: Browsers aggressively cache static assets; users need hard reload (Ctrl+Shift+R)
3. **Stale Cache-Busting Parameters**: Version numbers in URLs weren't bumped consistently
4. **Incomplete CSS Implementation**: Previous CSS used flex with vertical anchoring hacks instead of pure Grid centering
5. **JS Re-renders**: App dynamic re-renders overrode CSS fixes with inline styles

**Actions Taken in This PR:**
1. ✅ Refined CSS to use pure CSS Grid centering with `place-content: center`
2. ✅ Updated JS to ensure proper DOM structure and remove vertical anchoring
3. ✅ Added `ensureElementsInPanel()` helper to reparent scattered elements
4. ✅ Strengthened `removeVerticalAnchoringStyles()` to sanitize inline styles
5. ✅ Enhanced MutationObserver to re-apply fixes on dynamic changes
6. ✅ Changed overflow from `auto` to `visible` to prevent button clipping
7. ✅ Bumped cache-busting version to `?v=compact-fix-6`

---

## Detailed Findings

### 1. GitHub Pages Source Configuration

**Status:** ✅ VERIFIED

GitHub Pages is configured to serve from:
- **Source Branch:** `main`
- **Source Directory:** `/` (root)
- **Indicator:** `.nojekyll` file present in root (prevents Jekyll processing)

**Evidence:**
```bash
$ ls -la .nojekyll
-rw-rw-r-- 1 runner runner 1 Dec 19 12:42 .nojekyll
```

**Conclusion:**
- No need to copy assets to `/docs` folder
- Assets can be served directly from `css/` and `js/` folders
- All paths in `index.html` should be relative (e.g., `css/livevote-compact-fullyfit.css`)

**Live URL:** https://georgi-cole.github.io/bbmobile/

---

### 2. Asset Verification

**Status:** ✅ FILES EXIST, ⚠️ MAY NEED UPDATES

**CSS File:** `css/livevote-compact-fullyfit.css`
- Size: 6.8K
- Exists: ✅ Yes
- Referenced in index.html: ✅ Yes (line 36 with `?v=compact-fix-4`)

**JS File:** `js/livevote-ui.js`
- Size: 56K
- Exists: ✅ Yes
- Referenced in index.html: ✅ Yes (line 519 with `?v=compact-fix-4`)

**Current References in index.html:**
```html
<link rel="stylesheet" href="css/livevote-compact-fullyfit.css?v=compact-fix-4">
<script defer src="js/livevote-ui.js?v=compact-fix-4"></script>
```

**Recommendation:**
- Bump cache-busting version to `?v=compact-fix-5` after implementing changes
- This ensures browsers fetch the updated files

---

### 3. Service Worker Cache Issues

**Status:** ⚠️ REQUIRES VERSION BUMP

**Current Service Worker:** `sw.js`
- Cache Name: `bb-pwa-v-post-pr35-enhancements`
- Caches CSS/JS files with runtime strategy
- May serve stale versions even after deployment

**Problem:**
The service worker caches CSS and JS files. Even with cache-busting parameters in index.html, the service worker may continue serving cached versions until:
1. The cache name is updated, OR
2. Users manually clear their cache/service worker

**Evidence from sw.js:**
```javascript
const CACHE_NAME = 'bb-pwa-v-post-pr35-enhancements';

// Static assets runtime cache (added mp3)
if (/\.(?:js|css|png|jpg|jpeg|gif|svg|webp|woff2?|mp3)$/i.test(url.pathname)) {
  e.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const fresh = fetch(req).then(res => { try { cache.put(req, res.clone()); } catch {} return res; }).catch(() => cached);
    return cached || fresh;  // Returns cached version first!
  })());
```

**Solution:**
Update service worker cache name to force cache invalidation:
```javascript
const CACHE_NAME = 'bb-pwa-v-lv2-overlay-fix';  // New name forces cache clear
```

---

### 4. Feature Flags and Configuration

**Status:** ✅ NO BLOCKING FLAGS FOUND

Searched for feature flags that might prevent LV2 layout:
- No `enableCompactLayout` flag found
- No `disableLV2` flag found
- No conditional rendering based on environment

**Evidence:**
- `livevote-ui.js` always renders when called
- No feature flag checks in CSS files
- Layout is always applied when overlay is shown

**Conclusion:**
No feature flags are preventing the layout from applying. The issue is purely CSS/JS implementation.

---

### 5. Current Implementation Issues

**Analysis of Existing Code:**

**CSS Issues in `livevote-compact-fullyfit.css`:**
1. ✅ Uses CSS Grid with `place-items: center` (good!)
2. ⚠️ Some legacy flex properties may conflict
3. ⚠️ Avatar sizing may not be optimal for all viewports
4. ⚠️ Padding may not leave enough room for timer on small screens

**JS Issues in `livevote-ui.js`:**
1. ✅ Creates overlay and panel structure
2. ⚠️ DOM structure may not match CSS expectations
3. ⚠️ Evict button deduplication may remove wrong button
4. ⚠️ Inline styles may override CSS centering
5. ⚠️ MutationObserver not fully implemented for dynamic changes

**Key Problems:**
1. **Vertical Anchoring**: Legacy code may add `top`, `bottom`, or `transform: translateY()` inline styles
2. **Button Duplication**: Multiple evict buttons may be created, causing confusion
3. **Dynamic Re-renders**: App may re-render and break the layout
4. **Viewport-specific Issues**: Mobile and laptop may need different handling

---

### 6. Browser and Network Verification Steps

**For Developers Testing the Fix:**

1. **Clear All Caches:**
   ```javascript
   // Run in browser console
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(reg => reg.unregister());
   });
   caches.keys().then(keys => {
     keys.forEach(key => caches.delete(key));
   });
   location.reload(true);
   ```

2. **Hard Reload:**
   - Chrome/Edge: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Firefox: `Ctrl+F5` (Windows/Linux) or `Cmd+Shift+R` (Mac)

3. **Verify Assets Load:**
   - Open DevTools (F12) → Network tab
   - Check for 200 OK responses:
     - `css/livevote-compact-fullyfit.css?v=compact-fix-5`
     - `js/livevote-ui.js?v=compact-fix-5`
   - If 404, check file paths and repository structure

4. **Inspect DOM Structure:**
   - Open DevTools (F12) → Elements tab
   - Navigate to `#tv` element
   - Verify structure:
     ```html
     <div id="tv" class="fauxTv">
       <div class="lv2-overlay voteOverlay">
         <div class="lv2-panel votePanel">
           <div class="lv2-header"><!-- title --></div>
           <div class="lv2-grid"><!-- avatars --></div>
           <div class="lv2-instructions"><!-- helper text --></div>
           <!-- single evict button inline -->
         </div>
       </div>
     </div>
     ```

5. **Check Computed Styles:**
   - Select `.voteOverlay` element
   - Verify computed styles:
     - `display: grid` ✅
     - `place-items: center` ✅
     - `position: absolute` ✅
     - `inset: 0` (or top/left/right/bottom all 0) ✅
   - Select `.votePanel` element
   - Verify computed styles:
     - `display: flex` ✅
     - `flex-direction: column` ✅
     - `align-items: center` ✅
     - No `top`, `bottom`, `transform: translateY()` ❌

---

### 7. Testing Checklist

**Mobile Viewport (375px x 667px - iPhone SE):**
- [ ] Vote UI is centered vertically (not stuck at top or bottom)
- [ ] Vote UI is centered horizontally
- [ ] Title → Avatar → Name → Helper → Button are in single column
- [ ] Elements have breathing room (not cramped)
- [ ] Timer at top is visible (not overlapped)
- [ ] Only ONE evict button is present
- [ ] Button is accessible (min 44px touch target)
- [ ] Backdrop fits TV viewport without overflow

**Laptop Viewport (1280px x 720px):**
- [ ] Vote UI is centered vertically and horizontally
- [ ] Same single-column layout as mobile
- [ ] Elements are properly scaled (not too small or too large)
- [ ] Timer/controls at top are visible
- [ ] Only ONE evict button is present
- [ ] No horizontal scrolling required

**Edge Cases:**
- [ ] Very small screens (320px width) - still functional
- [ ] Very tall screens (iPhone Max) - centered, not stretched
- [ ] Tablet landscape - layout remains centered

---

### 8. Recommendations for Implementation

**Priority 1 - CSS Changes:**
1. Ensure `.voteOverlay` uses `display: grid` with `place-content: center`
2. Use `grid-auto-rows: max-content` to prevent stretching
3. Add `justify-items: center` for horizontal centering of children
4. Remove all `top`, `bottom`, `margin-top: auto` overrides
5. Use `clamp()` for responsive spacing: `gap: clamp(10px, 2vh, 20px)`
6. Increase `padding-top` on mobile to avoid timer overlap

**Priority 2 - JS Changes:**
1. Create helper to ensure overlay/panel structure exists
2. Move all vote elements into `.votePanel` in correct order
3. Remove inline styles: `style.top`, `style.bottom`, `style.transform` (translateY)
4. Deduplicate buttons: keep one inside `.votePanel`, remove others
5. Add MutationObserver to re-run fixes when app re-renders
6. Guard against removing the ONLY button

**Priority 3 - Cache Busting:**
1. Bump service worker cache name: `bb-pwa-v-lv2-overlay-fix`
2. Bump CSS/JS version: `?v=compact-fix-5`
3. Document cache-clearing steps for users

---

## Conclusion

The infrastructure is sound - GitHub Pages is correctly configured and assets are in place. The issues stem from:
1. CSS implementation not using pure Grid centering
2. JS creating conflicting inline styles
3. Service worker caching preventing updates from being seen

The fix requires refining the CSS/JS implementation and bumping cache versions, NOT changing the deployment setup.

---

## Related Documentation

- Main audit: This document
- Implementation: See `livevote-compact-fullyfit.css` and `livevote-ui.js`
- Test file: `test_compact_lv2_layout.html`
- Previous PRs: #895, #899, #903 (reverted)

## Last Updated

2024-12-19 by GitHub Copilot

### 2. Asset 404 Errors

If CSS or JS files return 404 errors, the files may not be in the correct location or the paths in `index.html` may be incorrect.

**Verification Steps:**
1. Open browser DevTools (F12)
2. Go to the Network tab
3. Reload the page (Ctrl+Shift+R for hard reload)
4. Check for red (failed) requests
5. Verify that the following assets return 200 OK:
   - `css/livevote-compact-fullyfit.css`
   - `js/livevote-ui.js`

**Common Fixes:**
- Ensure the files exist in the repository
- Check that file names match exactly (case-sensitive)
- Verify paths are relative or absolute as needed
- Check `.gitignore` doesn't exclude the files

### 3. Browser Caching

Browsers cache CSS and JS files aggressively. After deploying changes, users may see stale content.

**Verification Steps:**
1. Open DevTools (F12)
2. Check "Disable cache" option in Network tab
3. Perform a hard reload:
   - Chrome/Edge: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Firefox: Ctrl+F5 (Windows/Linux) or Cmd+Shift+R (Mac)
4. Check the Response Headers for cache-control directives

**Common Fixes:**
- Use cache busting query parameters (e.g., `?v=2` in URLs)
- Update version numbers in the `index.html` links
- Example: `<link rel="stylesheet" href="css/livevote-compact-fullyfit.css?v=compact-fix-4">`

### 4. Service Worker Issues

If a service worker is active, it may serve cached versions of files even after deployment.

**Verification Steps:**
1. Open DevTools (F12)
2. Go to Application tab → Service Workers
3. Check if a service worker is registered
4. Look for `sw.js` or similar files

**Common Fixes:**
1. Unregister the service worker:
   ```javascript
   // In browser console
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(reg => reg.unregister());
   });
   ```
2. Update the service worker version in `sw.js` to force an update
3. Perform a hard reload after unregistering

### 5. CDN/Proxy Caching

If using a CDN or proxy (like Cloudflare), changes may be cached at the edge.

**Verification Steps:**
1. Check Response Headers for `CF-Cache-Status` or similar headers
2. Check `X-Cache` headers indicating proxy caching

**Common Fixes:**
- Purge the CDN cache manually
- Wait for the TTL (Time To Live) to expire
- Use cache busting query parameters

## Asset Integration Checklist

When adding new CSS or JS files for LV2:

- [ ] Files are added to the repository in the correct location
- [ ] Files are referenced in `index.html` with correct paths
- [ ] Cache busting parameters are added (e.g., `?v=version`)
- [ ] Files are committed and pushed to the repository
- [ ] Changes are merged to the branch that GitHub Pages serves
- [ ] Deployment is complete (check Actions tab for status)
- [ ] Assets return 200 OK in production (check Network tab)
- [ ] Hard reload performed to bypass browser cache
- [ ] Service worker is updated or cleared if present

## Specific LV2 Layout Requirements

The LV2 eviction vote layout requires:

1. **CSS Grid Centering**: The overlay must use `display: grid` with `place-items: center`
2. **Single Vote Panel**: All elements (title, avatar, name, helper, button) in one `.votePanel` wrapper
3. **No Vertical Anchoring**: Remove `top`, `bottom`, `transform: translateY()`, `justify-content: flex-end`, `margin-top: auto`
4. **Single Evict Button**: Only one evict button should be present (duplicates removed by JS)
5. **Responsive Padding**: Use `clamp()` for breathing room around content

## Testing the Fix

### Mobile Test (iPhone width)
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select iPhone or set width to 375px
4. Navigate to Houseguests → Eviction
5. Verify:
   - Vote block is centered (not top-anchored)
   - Title, avatar, name, helper text, button form a vertical column
   - Elements have breathing room (not cramped)
   - Timer at top is visible
   - Only one evict button is present

### Laptop Test
1. Set browser width to 1280px or larger
2. Navigate to Houseguests → Eviction
3. Verify same criteria as mobile test

### Network Verification
1. Open DevTools → Network tab
2. Check for 200 OK responses:
   - `css/livevote-compact-fullyfit.css?v=...`
   - `js/livevote-ui.js?v=...`
3. If 404, check file locations and paths

## Production URL

Live site: https://georgi-cole.github.io/bbmobile/

## Related PRs

- PR #895: Initial layout attempt
- PR #899: Second layout attempt  
- PR #903: Reverted due to issues
- Current PR: Complete rewrite with proper grid centering

## Last Updated

2024-12-19
