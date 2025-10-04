# Avatar Resolver + Finale Enhancements - Retry Implementation Summary

## Overview
This document describes the retry implementation of PR #53 enhancements, which addresses issues with avatar resolution, jury reveal mobile layout, and Public Favourite winner card display.

## Key Issues Addressed

### 1. Avatar Format Mismatch ✅
**Problem:** Existing implementation only tried `.jpg` extension, but avatar files are `.png`
**Solution:** Multi-format permutation system tries multiple variants:
- `./avatars/{Name}.png` (case-sensitive)
- `./avatars/{name}.png` (lowercase)
- `./avatars/{id}.png` (numeric ID)
- `./avatars/{Name}.jpg` (singular fallback)
- `./avatars/{name}.jpg` (lowercase singular)
- `./avatars/{id}.jpg` (numeric ID jpg)

### 2. 404 Storm Prevention ✅
**Problem:** Repeated failed avatar requests caused console spam
**Solution:** Negative caching system tracks failed URLs and skips retry attempts

### 3. Strict Avatar Mode ✅
**Problem:** Need option to avoid external (dicebear) API calls
**Solution:** 
- Added `game.cfg.strictAvatars` flag
- When true, uses local SVG silhouette instead of external API
- Logs `[avatar] strict-miss player=<id>` for missing avatars
- Added settings UI toggle: "Strict local avatars"

### 4. Avatar Diagnostics ✅
**Problem:** No visibility into avatar resolution status
**Solution:**
- Implemented `window.__dumpAvatarStatus()` function
- Returns JSON with: players, counts, strict mode flag, failed URLs
- Console logging includes:
  - `console.table(playerDetails)` for visual summary
  - Resolution counts (resolved/fallback/strictMiss/total)
  - Failed URL list

### 5. High Fallback Warning ✅
**Problem:** No early detection of missing avatar files
**Solution:**
- Auto-checks fallback ratio after 3-second delay
- Shows one-time warning card if >30% fallback rate
- Warning: "Avatars Missing - Some avatar images were not found. Using placeholders."
- Only shown in normal mode (not strict mode)

### 6. PF Winner Card - Single Winner ✅
**Problem:** Winner card showed all 4 candidates (runners-up list)
**Solution:**
- Removed runners-up list completely
- Shows only winner with large avatar
- Displays percentage with one decimal place: `toFixed(1)`
- Added title: "Public's Favourite Player"
- Enhanced logging: `[publicFav] winner finalRaw=<raw> display=<display>`

### 7. Enhanced Jury Reveal Logging ✅
**Problem:** Insufficient diagnostic logging for pacing and votes
**Solution:**
- Pacing summary: `[jury] pacing totalPlannedMs=<ms> cap=180000 compressed=<bool>`
- Vote reveals: `[jury] voteReveal juror=<id> finalist=<id> scoreA=<a> scoreB=<b>`
- Public Favourite: `[publicFav] winner finalRaw=<raw> display=<display>`

### 8. Mobile Layout Fixes ✅
**Problem:** Jury reveal stage could overlay vote buttons on small screens
**Solution:**
- Added mobile-specific CSS (@media max-width: 768px)
- `#juryGraphBox`: relative positioning, max-height with dvh, overflow-y auto
- `#humanJuryVote`: z-index 11, clear spacing from graph
- `.tvViewport`: overflow-y auto, max-height constraint
- Ensures scrolling works and interactive elements remain accessible

## Implementation Details

### Files Modified

#### `js/avatar.js`
- Added negative cache (`failedAvatars` Set)
- Added resolution stats tracking
- Multi-format candidate generation
- Strict mode with local silhouette SVG
- `getAvatarFallback()` now accepts `failedUrl` parameter for caching
- `dumpAvatarStatus()` diagnostic function
- `checkAvatarFallbackWarning()` with 30% threshold
- Exports `window.__dumpAvatarStatus()`

#### `js/jury.js`
- `getAvatar()` now uses global `g.resolveAvatar` if available
- `getAvatarFallback()` uses global version, passes failedUrl
- PF winner card simplified to single winner only
- Winner percentage stored as `winnerPctRaw` and displayed with `toFixed(1)`
- Enhanced logging for pacing, vote reveals, and winner
- Updated onerror handlers to pass failedUrl parameter

#### `js/settings.js`
- Added `strictAvatars: false` to `DEFAULT_CFG`
- Added toggle in `buildVisualPaneHTML()`: "Strict local avatars (no external fallback)"

#### `styles.css`
- Added mobile jury reveal fixes section
- `#juryGraphBox` mobile constraints
- `#humanJuryVote` mobile visibility
- `.tvViewport` mobile overflow handling
- `.pfWinnerTitle` styling for winner card

#### New Files
- `test_avatar_resolver_enhanced.html` - Comprehensive test suite with:
  - Basic function tests
  - Multi-format resolution tests
  - Strict mode tests
  - Diagnostic function tests

## Console Logging Reference

### Avatar System
- `[avatar] strict-miss player=<id>` - Strict mode miss (no external fallback)
- High fallback warning shown via card (not console)
- Diagnostic output via `window.__dumpAvatarStatus()`

### Jury Reveal
- `[jury] pacing totalPlannedMs=<ms> cap=<cap> compressed=<bool>`
- `[jury] voteReveal juror=<id> finalist=<id> scoreA=<a> scoreB=<b>`

### Public Favourite
- `[publicFav] winner finalRaw=<raw> display=<display>`
- `[publicFav] winnerCard shown id=<id> pct=<display>`

## Testing Instructions

### Manual Testing
1. Open `test_avatar_resolver_enhanced.html` in browser
2. Click "Run All Tests" to verify all functionality
3. Open browser console and run: `window.__dumpAvatarStatus()`
4. Check that existing PNG avatars load (Aria, Bea, Blue, Echo, etc.)
5. Check that missing avatars fallback gracefully

### Strict Mode Testing
1. Open Settings in game
2. Navigate to "Visual" tab
3. Enable "Strict local avatars"
4. Start game and verify local silhouettes appear for missing avatars
5. Check console for `[avatar] strict-miss player=<id>` logs

### Mobile Testing
1. Open game on mobile device or use browser DevTools mobile emulation
2. Progress to jury reveal phase
3. Verify jury graph box scrolls and doesn't cover vote buttons
4. Cast human jury vote (if applicable) - buttons should be accessible

### PF Winner Card Testing
1. Progress game to finale
2. Let Public Favourite sequence complete
3. Verify winner card shows:
   - Single winner only (no runners-up list)
   - One decimal percentage (e.g., "32.4%")
   - Title: "Public's Favourite Player"
   - Large avatar

## Acceptance Criteria

✅ **No 404 storm:** Negative caching prevents repeated failed requests  
✅ **Multi-format support:** Tries PNG first, then JPG variants  
✅ **Strict mode:** Local silhouette fallback available  
✅ **Diagnostics:** `window.__dumpAvatarStatus()` works  
✅ **High fallback warning:** Shows card when >30% missing  
✅ **PF winner card:** Single winner with decimal percentage  
✅ **Enhanced logging:** Pacing, votes, and winner logged  
✅ **Mobile layout:** Jury reveal doesn't block interactive elements  
✅ **Settings toggle:** Strict avatars option in Visual tab  
✅ **Tests:** Comprehensive test suite provided  

## Non-Goals

- No changes to game logic, PF weighting, or jury tally rules
- No localization or sound effects
- No changes to other avatar usage outside jury/PF modules

## Future Enhancements

- Add support for WEBP format
- Add avatar preloading to detect missing files earlier
- Add per-player avatar override in cast editor
- Add avatar upload functionality

## Commit History

```
53dedc5 Enhanced avatar resolver with multi-format, strict mode, and diagnostics
[next] Mobile CSS fixes and integration tests
[next] Documentation update
```

---

**Implementation Date:** 2024  
**Related PRs:** #53 (original), This retry PR  
**Status:** ✅ Complete
