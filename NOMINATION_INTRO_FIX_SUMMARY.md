# Nomination Ceremony Intro Card Fix - Implementation Summary

## Problem Statement

In double/triple eviction weeks (requiring 3+ nominees), the Nomination Ceremony intro card with the "NOMINATE" button intermittently did not appear, even though logs showed `[noms] Using TVCards.showNominateIntro()`. In single-eviction weeks, the card appeared correctly and was centered inside the faux TV.

### Symptoms Observed
- Missing intro card only during multi-eviction weeks (3+ nominees)
- Console logs showed:
  - `[noms] Human HOH detected - showing intro card`
  - `[noms] Using TVCards.showNominateIntro()`
  - Then no visible intro, followed by: `[nom] Blocking premature finalizeNoms - human HOH has not selected nominees yet`

## Root Cause

The `#tvOverlay` element relies on CSS custom properties (`--tv-safe-top`, `--tv-safe-bottom`, `--tv-safe-x`) for its inset positioning. When these variables were undefined at the moment the card was mounted (timing/race condition across phases), the inset declaration was dropped by the browser, resulting in `#tvOverlay` effectively having 0×0 size, making the card invisible.

Additionally, the helper function did not guarantee that:
1. The overlay scaffold always existed
2. The `#tv.tvTall` class was set for proper sizing

## Solution

### 1. CSS Fallbacks (styles.css)

Added three layers of protection:

#### A. CSS Variable Defaults on `.tv` and `.tv.tvTall`
```css
.tv {
  /* Safe area defaults for overlay positioning - fallback if not set at root */
  --tv-safe-top: 12px;
  --tv-safe-bottom: 12px;
  --tv-safe-x: 12px;
}

.tv.tvTall {
  /* Ensure safe area vars are defined for overlay positioning */
  --tv-safe-top: 12px;
  --tv-safe-bottom: 12px;
  --tv-safe-x: 12px;
}
```

#### B. Fallback Values in `var()` Usage on `#tvOverlay`
```css
#tvOverlay {
  /* Use var() with fallbacks to prevent collapse if CSS vars undefined */
  inset: var(--tv-safe-top, 12px) var(--tv-safe-x, 12px) 
         var(--tv-safe-bottom, 12px) var(--tv-safe-x, 12px);
  /* Guard against zero-size collapse */
  min-width: 1px;
  min-height: 1px;
}
```

#### C. Min-Size Guards
Added `min-width: 1px` and `min-height: 1px` to all `#tvOverlay` definitions to prevent complete collapse.

### 2. Robust TV Overlay Scaffold (js/ui/tv-cards.js)

Enhanced `ensureTVOverlay()` function to:
```javascript
function ensureTVOverlay(){
  var tvOverlay = document.getElementById('tvOverlay');
  if(!tvOverlay) return null;
  
  // Ensure #tv has tvTall class for proper overlay space
  var tv = document.getElementById('tv');
  if(tv && !tv.classList.contains('tvTall')){
    tv.classList.add('tvTall');
  }
  
  // Create scaffold elements if missing
  // ... (dim and content)
  
  return content;
}
```

### 3. Error Handling in Nominations (js/nominations.js)

Added try/catch wrapper around `TVCards.showNominateIntro()`:
```javascript
try {
  global.TVCards.showNominateIntro({
    hohName: hoh.name,
    need: need,
    onNominate: () => { /* ... */ }
  });
  return;
} catch(err) {
  console.error('[noms] TVCards.showNominateIntro() failed:', err);
  // Fall through to manual fallback below
}
```

The fallback implementation already existed and now provides a safety net.

## Testing

### Automated Tests
- ✅ All existing tests pass (test:all)
- ✅ No security vulnerabilities found (CodeQL)
- ✅ No new ESLint errors introduced

### Manual Test File
Created `test_nomination_intro_multi_eviction.html` to verify:
- ✅ 2 nominee scenario (single eviction)
- ✅ 3 nominee scenario (double eviction) 
- ✅ 4 nominee scenario (triple eviction)
- ✅ CSS var fallback behavior (removing/adding vars)

### Test Procedure
1. Open `test_nomination_intro_multi_eviction.html` in browser
2. Click "3 Nominees (Double Week)" button
3. Verify intro card appears centered in faux TV
4. Click "Test Without CSS Vars" then "3 Nominees" again
5. Verify intro card still appears (fallback working)

## Verification Checklist

- [x] Intro card appears for 2, 3, and 4 nominee weeks
- [x] Card is centered inside faux TV with consistent padding
- [x] Full-screen modals (twists/house shock) remain unaffected
- [x] Existing tests pass without regression
- [x] No security vulnerabilities introduced
- [x] Fallback mechanism works when CSS vars are undefined

## Files Modified

1. **styles.css**
   - Added CSS var defaults to `.tv` and `.tv.tvTall`
   - Updated all `#tvOverlay` inset declarations with fallbacks
   - Added min-width/min-height guards

2. **js/ui/tv-cards.js**
   - Enhanced `ensureTVOverlay()` to add `tvTall` class

3. **js/nominations.js**
   - Added try/catch wrapper around `TVCards.showNominateIntro()`

4. **test_nomination_intro_multi_eviction.html** (new)
   - Manual test page for verification

## Risk Assessment

**Low Risk**: 
- CSS changes only add defaults and guards (additive, no removal)
- JavaScript changes are minimal and defensive
- Fallback mechanism already existed
- All existing tests pass

## Notes

- Typography values maintained: h3: 0.95rem, body: 0.86rem, .big: 0.92rem
- Full-screen modals untouched (NomsFS.open, twists, house shock)
- Legacy global exports preserved for backward compatibility
- Existing logs retained for debugging

## Future Considerations

None required. The fix is complete and addresses the root cause while maintaining backward compatibility.
