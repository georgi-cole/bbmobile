# GitHub Pages Configuration Audit

**Date**: 2025-12-19  
**Repository**: georgi-cole/bbmobile  
**Live Site**: https://georgi-cole.github.io/bbmobile/

## Pages Configuration

### Source Location
- **Branch**: `main`
- **Directory**: Root (`/`)
- **Evidence**: 
  - `.nojekyll` file present (disables Jekyll processing)
  - No `docs/` folder
  - No custom domain (no CNAME file)

### Asset Serving
Assets are served directly from the repository root:
- CSS: `https://georgi-cole.github.io/bbmobile/css/`
- JS: `https://georgi-cole.github.io/bbmobile/js/`
- Images: `https://georgi-cole.github.io/bbmobile/assets/`

## LV2 Eviction Overlay Assets

### CSS Files
1. **`css/livevote-compact.css`**
   - Referenced in `index.html` line 35
   - Cache busting: `?v=compact-fix-2`
   - Status: ✅ Exists and loaded
   - Purpose: Compact layout for mobile and laptop

2. **`css/livevote-compact-fullyfit.css`**
   - Referenced in `index.html` line 36
   - Cache busting: `?v=compact-fix-2`
   - Status: ✅ Exists and loaded
   - Purpose: Full fit centering within faux TV viewport

### JS Files
1. **`js/livevote-ui.js`**
   - Status: ✅ Exists in repository
   - Loading: ⚠️ Dynamically loaded by application (not in `<script>` tag)
   - Purpose: Live Vote 2.0 UI system with inline CTA pattern

## Issues Identified

### 1. Previous Fixes Not Showing on Production
**Root Cause**: 
- PR #904 merged but focused on faux TV layout issues, not LV2 centering
- CSS cache-busting params may need incrementing
- Browser/service worker cache may be serving old assets

**Resolution**:
- Update cache-busting version from `?v=compact-fix-2` to `?v=compact-fix-3`
- Ensure CSS properly centers content with flexbox
- Add service worker cache purge instructions

### 2. Multiple Evict Buttons
**Root Cause**:
- `ensureInlineCtaGuard()` function may create duplicate buttons
- No strong deduplication logic when buttons are created

**Resolution**:
- Add guard to check for existing buttons before creating new ones
- Use `querySelector` to ensure only one selected button at a time

### 3. Centering Issues
**Root Cause**:
- Current CSS uses `justify-content: space-evenly` which distributes space unevenly
- No explicit centering for the vote panel stack

**Resolution**:
- Use `align-items: center` and `justify-content: center` on overlay
- Add flexible padding with `clamp()` for breathing room
- Ensure avatar + CTA stack doesn't overflow TV bounds

## Feature Flags
No feature flags detected that would prevent compact layout from applying.

## Verification Steps
After deployment to `main`:
1. Clear browser cache and reload https://georgi-cole.github.io/bbmobile/
2. Open Developer Tools → Network tab
3. Verify CSS files load without 404 errors
4. Navigate to Houseguests → Eviction screen
5. Confirm vote panel is centered horizontally and vertically
6. Confirm only ONE Evict button appears
7. Test on mobile (375px width) and laptop (1280px width) viewports

## Service Worker Cache
If updates don't appear immediately:
1. Open Developer Tools → Application → Service Workers
2. Click "Unregister" for the bbmobile service worker
3. Refresh the page (Cmd/Ctrl + Shift + R for hard refresh)
4. Service worker will re-register with updated assets
