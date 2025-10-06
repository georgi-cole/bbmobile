# UX Flow Improvements

This document describes the UX improvements implemented to enhance the game flow and user experience.

## Overview

Three main improvements were implemented:
1. **Configurable Rules Modal** - Rules modal no longer auto-shows on game start (unless explicitly enabled)
2. **Early Opening Phase Completion** - Opening sequence ends immediately after all player cards are shown
3. **Week Transition Modal** - New modal appears before each HOH competition with "Get Ready for Week X"

---

## 1. Configurable Rules Modal

### What Changed
- Added new config flag `game.cfg.autoShowRulesOnStart` (default: `false`)
- Auto-showing rules modal is now opt-in rather than default behavior
- Manual Rules button still works as before

### Files Modified
- **js/settings.js**: Added `autoShowRulesOnStart: false` to `DEFAULT_CFG`
- **js/rules.js**: Guarded `setupIntroListener()` and `setupFallback()` to respect the config flag

### Implementation Details
```javascript
// In js/settings.js
var DEFAULT_CFG = {
  // ...
  autoShowRulesOnStart: false, // When true, shows rules modal automatically after intro
  // ...
};
```

```javascript
// In js/rules.js
function setupIntroListener() {
  const cfg = (global.game && global.game.cfg) || {};
  if (!cfg.autoShowRulesOnStart) {
    console.info('[rules] autoShowRulesOnStart is false — skipping intro listener');
    return;
  }
  // ... rest of listener setup
}
```

### User Impact
- Players no longer see the rules modal pop up automatically when starting a new game
- Players can still access rules anytime via the manual Rules button
- Cleaner, less interruptive game start experience

---

## 2. Early Opening Phase Completion

### What Changed
- Opening sequence now tracks how many player intro pairs have been displayed
- Once all pairs are shown, the opening phase ends early (after 300ms grace period)
- No more waiting for the full `tOpening` duration when all intros are complete

### Files Modified
- **js/ui.hud-and-router.js**: 
  - Modified `startOpeningSequence()` to track pair counts
  - Modified `finishOpening()` to prevent duplicate calls

### Implementation Details
```javascript
// Track total and shown pairs
game.__introPairsTotal = pairs.length;
game.__introPairsShown = 0;
game.__introEarlyFinished = false;

// After each pair is displayed
game.__introPairsShown = (game.__introPairsShown || 0) + 1;

// Check if all pairs shown
if(game.__introPairsShown >= game.__introPairsTotal && 
   game.phase === 'opening' && 
   !game.__introEarlyFinished) {
  console.info('[opening] All intro pairs shown, finishing early');
  game.__introEarlyFinished = true;
  setTimeout(() => {
    if(game.phase === 'opening') {
      g.finishOpening();
    }
  }, 300);
}
```

### User Impact
- No long idle wait after last player intro is shown
- Smooth transition to HOH competition
- Music and subsequent flow preserved
- Manual skip still works as before

---

## 3. Week Transition Modal

### What Changed
- New modal appears before each HOH competition showing "Get Ready for Week X"
- Modal features eye emoji (👁️) AND house emoji (🏠), week number, and subtitle
- Auto-dismisses after 5 seconds OR can be dismissed early by clicking/tapping
- Includes "Click to continue" hint text
- Shown exactly once per week transition

### New Files
- **js/ui.week-intro.js**: New module implementing the week intro modal

### Files Modified
- **index.html**: Added `<script>` tag for `js/ui.week-intro.js`
- **js/jury_return.js**: Modified `proceedToHOH()` to show week intro before HOH
- **js/ui.week-intro.js**: Wraps `startHOH()` to show modal when appropriate

### Implementation Details

#### Modal Display
```javascript
function showWeekIntroModal(weekNumber, callback) {
  // Creates full-screen overlay with high z-index (999999)
  // Shows eye emoji (👁️) and house emoji (🏠), title, and subtitle
  // Auto-dismisses after 5000ms (5 seconds)
  // Can be dismissed early by clicking/tapping on the modal
  // Calls callback when done
}
```

#### Week Tracking
```javascript
// Track which week has been shown
if (shouldShow && g.__weekIntroShownFor !== currentWeek) {
  g.__weekIntroShownFor = currentWeek;
  showWeekIntroModal(currentWeek, () => {
    // Continue with HOH competition
  });
}
```

#### Guards
```javascript
// Only show if:
// 1. More than 2 players alive
// 2. Not in jury or finale phases
const shouldShow = alivePlayers.length > 2 && 
                  (!g.phase || !['jury', 'finale'].includes(g.phase));
```

### User Impact
- Clear visual transition between weeks
- Builds anticipation before HOH competition
- Ensures players know which week they're entering
- Works seamlessly with both normal week transitions and jury return flow

---

## Testing

### Automated Verification
Run the verification script to ensure all changes are correctly implemented:
```bash
node verify_ux_improvements.mjs
```

This checks:
- ✓ Config flag exists and defaults to false
- ✓ Rules.js guards are in place
- ✓ Manual rules button still works
- ✓ Early opening completion tracking exists
- ✓ Week intro modal module is complete
- ✓ Integration in jury_return.js
- ✓ Scripts loaded in index.html

### Manual Testing
Open `test_ux_improvements.html` in a browser to manually test:
1. Rules config flag
2. Manual rules button
3. Week intro modal display
4. Early opening completion logic

### In-Game Testing
1. **Start a new game** - Rules should NOT auto-show
2. **Click Rules button** - Rules modal should appear
3. **Watch opening sequence** - Should end shortly after last player card
4. **Proceed to HOH** - Week intro modal should appear before competition
5. **Continue through weeks** - Week intro should appear once per week

---

## Configuration Options

To enable auto-showing rules on game start (restore old behavior):
```javascript
// In browser console or settings
game.cfg.autoShowRulesOnStart = true;
```

Or add to settings modal as a checkbox option.

---

## Backward Compatibility

- Default behavior changes (rules don't auto-show), but can be re-enabled
- All existing functionality preserved
- No breaking changes to APIs
- Manual rules button still works
- Skip intro button still works
- All phases transition correctly

---

## Technical Notes

### Z-Index Hierarchy
- Week intro modal: `999999` (highest)
- Rules modal: `420`
- Settings modal: `120`

### Timing Values
- Week intro duration: `5000ms` (display) + `300ms` (fade-out) = `5300ms` total (or dismisses early on click)
- Early opening grace period: `300ms`
- Rules fallback delay: `2000ms`

### Global Flags
- `game.cfg.autoShowRulesOnStart` - Config for rules auto-show
- `game.__introPairsTotal` - Total intro pairs to show
- `game.__introPairsShown` - Count of pairs shown
- `game.__introEarlyFinished` - Guard flag for early completion
- `game.__weekIntroShownFor` - Tracks which week intro was shown

---

## Future Enhancements

Potential improvements for future versions:
1. Add settings UI checkbox for `autoShowRulesOnStart`
2. Customize week intro duration via config
3. Add animations to week intro modal
4. Support different emojis/icons per week
5. Add sound effect on week intro appearance

---

## Files Changed Summary

### Modified
- `js/settings.js` - Added config flag
- `js/rules.js` - Guarded auto-trigger logic
- `js/ui.hud-and-router.js` - Early opening completion
- `js/jury_return.js` - Week intro integration
- `index.html` - Script loading
- `.eslintrc.json` - Fixed config syntax

### Created
- `js/ui.week-intro.js` - Week transition modal module
- `test_ux_improvements.html` - Manual test page
- `verify_ux_improvements.mjs` - Automated verification script
- `UX_IMPROVEMENTS_README.md` - This documentation

---

## Support

For issues or questions:
1. Check verification script output: `node verify_ux_improvements.mjs`
2. Open test page: `test_ux_improvements.html`
3. Review browser console for debug messages (look for `[rules]`, `[opening]`, `[ui.week-intro]`, `[jury_return]` prefixes)
