# End of Game Modal Fixes - Implementation Summary

## Issue Description
When the end-of-game modal appears (either winner modal or pre-jury eviction modal), there are two button options:
1. **Exit** - Should navigate back to the intro hub
2. **New Season** - Should start a new season with incremented season number and rebuild the entire game with a new roster

### Problems Identified
1. **Exit button**: Was only closing the modal but not navigating back to intro hub
2. **New Season button**: Was starting a new game but the roster with houseguests was not loading properly

## Solution Overview

Fixed both end-of-game modals to provide proper navigation and game state management:

### Files Modified
1. `js/finale.js` - Winner modal (shown when a player wins the game)
2. `js/game-over-modal.js` - Pre-jury eviction modal (shown when human player is evicted before making jury)

## Implementation Details

### Exit Button Fix

**Before:**
```javascript
panel.querySelector('#cinExit').onclick=()=>{ try{dim.remove();}catch{} };
```

**After:**
```javascript
panel.querySelector('#cinExit').onclick=()=>{ 
  console.info('[finale] EXIT clicked, navigating to intro hub');
  try{dim.remove();}catch{} 
  
  // Navigate back to intro hub
  if (g.IntroScreen && typeof g.IntroScreen.showWithPreload === 'function') {
    console.info('[finale] Showing intro hub after exit');
    g.IntroScreen.showWithPreload();
  } else if (g.IntroScreen && typeof g.IntroScreen.show === 'function') {
    console.info('[finale] Showing intro hub after exit (without preload)');
    g.IntroScreen.show();
  } else {
    console.warn('[finale] IntroScreen not available, reloading page');
    location.reload();
  }
};
```

**Changes:**
- Closes the modal (existing behavior)
- Calls `IntroScreen.showWithPreload()` to display intro hub with background preload
- Fallback to `IntroScreen.show()` if preload not available
- Final fallback to `location.reload()` if IntroScreen not available
- Added comprehensive logging for debugging

### New Season Button Fix

**Before:**
```javascript
// Start opening sequence after a brief delay to let rebuild complete
setTimeout(() => {
  if (typeof API.startOpeningSequence === 'function') {
    console.info('[new-season] calling startOpeningSequence()');
    API.startOpeningSequence();
  } else {
    console.warn('[new-season] startOpeningSequence not available');
  }
}, 60);
```

**After:**
```javascript
// Show intro hub so user can see new roster and start the game
setTimeout(() => {
  if (g.IntroScreen && typeof g.IntroScreen.showWithPreload === 'function') {
    console.info('[new-season] Showing intro hub with new roster');
    g.IntroScreen.showWithPreload();
  } else if (g.IntroScreen && typeof g.IntroScreen.show === 'function') {
    console.info('[new-season] Showing intro hub (without preload)');
    g.IntroScreen.show();
  } else {
    console.warn('[new-season] IntroScreen not available, starting game directly');
    // Fallback: start opening sequence directly
    if (typeof API.startOpeningSequence === 'function') {
      API.startOpeningSequence();
    }
  }
}, 200);
```

**Changes:**
- After rebuilding game with `rebuildGame(false)`, shows intro hub instead of immediately starting game
- User can now see the new roster that was generated
- User must press "Play" button on intro hub to start the new season
- This matches user expectations and allows reviewing the cast before starting
- Increased timeout from 60ms to 200ms to ensure rebuild completes
- Added comprehensive logging for debugging

## User Experience Flow

### Exit Button Flow
1. User clicks "EXIT" button on end-of-game modal
2. Modal closes
3. Intro hub appears
4. User can review game settings, roster, or start a new game

### New Season Button Flow
1. User clicks "NEW SEASON" button on end-of-game modal
2. Profile selection modal appears (if profile system enabled)
3. User selects profile or guest mode
4. Season number increments (via ProfileService)
5. Game rebuilds with new random cast (`rebuildGame(false)`)
6. Competition locks cleared
7. Logs cleared
8. Intro hub appears showing the new roster
9. User reviews the new houseguests
10. User clicks "Play" to start the new season

## Technical Details

### Season Increment Logic
- Uses `ProfileService.incrementSeason()` to track season numbers
- Season data persists across sessions in localStorage
- Guest mode always starts at Season 1

### Cast Rebuild Logic
- Calls `rebuildGame(false)` to build new cast
- `false` parameter means "don't preserve existing players"
- Internally calls `buildCast()` which:
  - Clears existing player array
  - Randomly samples from roster pool (26 names)
  - Creates new player objects with fresh stats
  - Generates new avatars for each player

### Competition State Reset
- Calls `CompLocks.clearAllLocks()` to reset all week locks
- Ensures Week 1 competitions are available in new season
- Prevents carryover of locked state from previous game

## Testing

### Test File
Created `test_end_game_modal_fixes.html` to manually test both modals:
- Tests winner modal (finale.js)
- Tests game over modal (game-over-modal.js)
- Verifies Exit button navigates to intro hub
- Verifies New Season button rebuilds game and shows intro hub
- Includes mock implementations for all dependencies
- Provides console logging for debugging

### Test Instructions
1. Open `test_end_game_modal_fixes.html` in browser
2. Click "Show Winner Modal" or "Show Game Over Modal"
3. Test Exit button → Should show intro hub
4. Test New Season button → Should rebuild game and show intro hub
5. Verify console logs show proper flow

### Automated Tests
- All existing npm test suites pass
- No breaking changes to other modules
- Minigame validation passes
- Legacy map validation passes

## Compatibility

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Progressive Web App (PWA) mode

### Fallback Behavior
If `IntroScreen` is not available:
- Exit button: Falls back to `location.reload()`
- New Season button: Falls back to `startOpeningSequence()` (old behavior)

## Benefits

1. **Consistent UX**: Both Exit and New Season buttons now have predictable behavior
2. **Roster Visibility**: Users can see the new cast before starting the season
3. **Season Tracking**: Season numbers properly increment
4. **State Reset**: All game state properly reset between seasons
5. **Debugging**: Comprehensive logging for troubleshooting

## Future Enhancements

Potential improvements (not included in this fix):
- Add transition animations between modal and intro hub
- Show "Building new cast..." loading indicator
- Display season number on intro hub
- Add "Continue current season" option to winner modal
- Add "Restart current season" option

## Related Files

- `js/finale.js` - Winner modal implementation
- `js/game-over-modal.js` - Pre-jury eviction modal
- `src/ui/IntroScreen.js` - Intro hub implementation
- `js/bootstrap.js` - Game initialization and rebuild logic
- `src/profile/profileService.js` - Profile and season tracking
- `test_end_game_modal_fixes.html` - Test file for manual testing

## Conclusion

Both end-of-game modals now properly handle Exit and New Season button clicks:
- Exit navigates back to intro hub
- New Season rebuilds game with new roster and shows intro hub
- Users have full visibility and control over game flow
- Season tracking works correctly
- All existing tests pass
