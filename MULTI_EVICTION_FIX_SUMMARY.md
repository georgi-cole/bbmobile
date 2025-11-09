# Multi-Eviction Nomination Ceremony Fix

## Issue
In multi-eviction weeks (need > 2 nominees), the Nomination Ceremony intro card with NOMINATE button intermittently fails to appear or renders outside the faux TV screen.

## Root Causes
1. **CSS Variable Dependency**: `#tvOverlay` relied on CSS custom properties (`--tv-safe-top`, etc.) that weren't always resolved, causing the overlay to collapse to 0×0 dimensions
2. **Missing Scaffold**: Some code paths didn't ensure `#tvOverlay` and its child elements existed before attempting to render content
3. **Script Load Order**: `js/nominations.js` loaded before `js/ui/tv-cards.js`, causing helper functions to be undefined
4. **Incomplete Fallbacks**: Error handling didn't provide hard fallbacks when helpers failed

## Solutions Implemented

### 1. CSS Safety Fallbacks (styles.css)
```css
.tv {
  /* Define safe area vars for overlay positioning - ensures #tvOverlay never collapses */
  --tv-safe-top: 12px;
  --tv-safe-bottom: 12px;
  --tv-safe-x: 12px;
}
```
- Added CSS variables to `.tv` base class (not just `.tv.tvTall`)
- Ensures variables are always defined before any code runs
- `#tvOverlay` already had `var()` fallbacks, but vars weren't defined

### 2. Enhanced Overlay Scaffold (js/ui/tv-cards.js)
```javascript
function ensureTVOverlay() {
  // Create #tvOverlay if missing (not just scaffold elements)
  var tvOverlay = document.getElementById('tvOverlay');
  if (!tvOverlay) {
    console.log('[TVCards] Creating missing #tvOverlay element');
    tvOverlay = document.createElement('div');
    tvOverlay.id = 'tvOverlay';
    // Append to viewport...
  }
  // Create .tvDim and .tvOverlayContent...
}
```
- Enhanced to create `#tvOverlay` itself if missing (not just child elements)
- Added diagnostic logging for troubleshooting
- `showNominateIntro()` now ensures scaffold before showing card

### 3. Pre-flight Checks (js/nominations.js)
```javascript
if (hoh && hoh.human) {
  // Pre-flight: Create #tvOverlay synchronously if missing
  let tvOverlay = document.getElementById('tvOverlay');
  if (!tvOverlay) {
    console.warn('[noms] #tvOverlay missing - creating scaffold');
    // Create tvOverlay, .tvDim, and .tvOverlayContent...
  }
  
  // Then proceed with TVCards.showNominateIntro()...
}
```
- Synchronously creates scaffold before calling any helpers
- Hard fallback if `ensureTVOverlayScaffold()` fails
- Never leaves a blank state

### 4. Script Load Order (index.html)
```html
<!-- TV Cards (shared ceremony card UI) - MUST load before nominations.js -->
<script defer src="js/ui/tv-cards.js"></script>
<script defer src="js/nominations.js"></script>
```
- Moved `tv-cards.js` to load before `nominations.js`
- Ensures `TVCards.showNominateIntro()` is defined when called
- Prevents "undefined function" errors

## Testing

### Automated Tests
- All existing tests pass: minigames, runtime, e2e, social, pov-carousel
- Created `test_multi_eviction_nomination_fix.html` for validation

### Manual Testing
To test the fix:
1. Open `test_multi_eviction_nomination_fix.html` in a browser
2. Click "Run All Tests" to validate all fixes
3. Test individual nominee counts (2, 3, 4) to verify rendering
4. Test edge cases (missing overlay, missing scaffold)

Expected results:
- ✅ All validation tests pass
- ✅ Intro card appears centered in TV for all nominee counts
- ✅ Card has non-zero dimensions and is clickable
- ✅ No console errors about missing elements or undefined functions

## Acceptance Criteria Met

✅ For need = 2, 3, 4 nominees, intro card appears centered inside faux TV  
✅ Card matches padding/typography of other ceremony cards  
✅ NOMINATE button is interactive and opens full-screen selector  
✅ Ceremony proceeds normally after selections  
✅ Full-screen modals (twist/house-shock) are unaffected  
✅ No premature card removal or blank states  

## Files Changed
- `styles.css` - CSS variable definitions
- `js/ui/tv-cards.js` - Enhanced scaffold creation
- `js/nominations.js` - Pre-flight checks and hard fallback
- `index.html` - Script load order fix
- `test_multi_eviction_nomination_fix.html` - New comprehensive test

## Backwards Compatibility
All changes are backwards compatible:
- CSS variables have fallbacks in `var()` declarations
- Scaffold creation is defensive and idempotent
- Legacy helper `window.ensureTVOverlayScaffold` still exported
- No breaking changes to existing APIs

## References
- Issue: Multi-eviction nomination intro card intermittently missing
- Related test files: `test_nomination_intro_multi_eviction.html`, `test_nomination_tv_overlay_fix.html`
- PR: Fix for multi-eviction weeks where intro card fails to render
