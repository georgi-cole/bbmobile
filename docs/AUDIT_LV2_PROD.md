# LV2 Production Audit

## Overview

This document explains why previous LV2 (Live Vote 2) layout changes may not have been applied on GitHub Pages and provides instructions for verifying that assets are correctly loaded in production.

## Common Issues

### 1. GitHub Pages Source Configuration

GitHub Pages may be configured to serve from:
- The `/docs` directory
- The root directory (`/`)
- A specific branch (e.g., `gh-pages`)

**Verification Steps:**
1. Go to repository Settings → Pages
2. Check the "Source" setting to see which directory is being served
3. If serving from `/docs`, ensure all CSS/JS assets are copied there or paths are adjusted

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
