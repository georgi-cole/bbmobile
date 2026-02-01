# Exit Button Fix - Summary

## Problem
When clicking "Exit" from the game-ending modals (winner celebration or game-over), the main game UI elements (topbar with buttons, houseguests panel, player cards) remained visible on top of the intro screen, creating a visual bug.

## Root Cause
The exit handlers called `IntroScreen.show()` to return to the intro screen, but did not hide the main game UI. The CSS rule for hiding game UI depends on the absence of the `main-screen-built` class on the body element:

```css
body:not(.main-screen-built) .wrap,
body:not(.main-screen-built) .topbar {
  display: none !important;
}
```

When the game starts, the body receives the `main-screen-built` class to show the game UI. This class was never removed when returning to the intro screen, causing the overlap.

## Solution
Added a single line to both exit handlers to remove the class before showing the intro screen:

```javascript
document.body.classList.remove('main-screen-built');
```

## Files Modified
1. **js/finale.js** (line 76-79)
   - Winner celebration modal exit handler
   - Class removal occurs before DOM cleanup and intro screen display

2. **js/game-over-modal.js** (line 268-271)
   - Pre-jury eviction game-over modal exit handler
   - Class removal occurs before intro screen display

3. **test_exit_button_fix.html** (NEW)
   - Test file for manual verification
   - Includes UI state monitor
   - Tests both winner and game-over modals

## Testing
- ✅ Existing test suite passes (npm run test:all)
- ✅ No ESLint issues
- ✅ No security vulnerabilities (CodeQL scan)
- ✅ Code review completed and feedback addressed
- ⏳ Manual testing required (see test_exit_button_fix.html)

## Visual Changes
### Before (Bug)
- User clicks "Exit" from winner/game-over modal
- Intro screen appears BUT main game UI remains visible
- Topbar buttons (Settings, Start, Sound, etc.) visible
- Houseguests panel visible
- Player cards visible
- Creates visual clutter and confusion

### After (Fixed)
- User clicks "Exit" from winner/game-over modal
- Main game UI automatically hidden (via CSS)
- Only intro screen visible with clean background
- User can start a new game from clean slate

## Security Summary
No security vulnerabilities introduced or discovered. The changes are minimal and only affect UI state management (CSS class manipulation).

## Minimal Change Approach
This fix follows the "minimal change" principle:
- Only 2 production files modified
- Only 1 line added to each file
- Leverages existing CSS rules
- No new dependencies
- No API changes
- No breaking changes

## Next Steps for Manual Testing
1. Open the game in a browser
2. Complete a full game (or trigger game-over by pre-jury eviction)
3. Click "EXIT" button in the final modal
4. Verify:
   - Main game UI elements are hidden
   - Only intro screen is visible
   - No visual overlap or clutter
   - Intro screen is fully functional

Alternatively, open `test_exit_button_fix.html` for isolated testing with UI state monitoring.
