# chore(debug): settings debug button to force jurors-return (requires ≥2 evictees)

## Summary

This PR adds a debug button to the **Settings → Debug** area that allows developers to force-trigger the Jurors Return twist UI for testing purposes. The button:
- **Only runs when there are ≥2 evictees** in the game state
- Shows a friendly inline message when conditions are not met
- Uses the same overlay mounting strategy as Fans' Favorite (defensive mounting)
- **Never moves the original juror DOM node** (clone-only behavior)
- Includes comprehensive fallback chain for detecting evictees

## Changes

### New Files

#### 1. `js/ui/settings-debug-juror.js` (501 lines)
Main integration module that:
- Inserts a "Force Jurors Return (Debug)" button into Settings → Debug
- Implements comprehensive evictee detection with fallback chain:
  1. Tries `window.game.evictees`
  2. Falls back to `evicted`, `evictedPlayers`, `evictionHistory`, `evictions`
  3. Scans `players` array for `evicted` flag
  4. Last resort: DOM scan for `.evicted` elements
- Validates minimum 2 evictees before triggering
- Shows inline status hints when conditions not met
- Converts evictee IDs to full player objects with avatars
- Calls `JurorReturnOverlay.debugShow(players)` with guarded checks
- Dispatches `jurors_return` CustomEvent as fallback
- Creates inline fallback overlay if no overlay system available
- Includes keyboard accessibility and ARIA attributes
- Has toast notification system

#### 2. `test_debug_juror_button.html` (335 lines)
Interactive test page with:
- Mock game state setup
- 4 test scenarios: 0, 1, 2, and 5 evictees
- Real-time state checking
- Console log output
- Button to trigger debug overlay
- Validates all requirements

### Modified Files

#### 1. `js/ui/juror-return-overlay.js`
Enhanced to accept optional `players` array parameter:
- `show(players?)` - now accepts optional array of player objects
- `debugShow(players?)` - passes players to show method
- New `createPlayerListPanel(players)` function - builds UI from provided array
- When players array provided, builds custom UI instead of cloning panel
- Maintains all existing clone-only safety guarantees
- No breaking changes to existing usage

#### 2. `js/progression-events.js`
Minor update to `onJurorsReturn`:
- Extracts `players` from payload if present
- Passes players array to `JurorReturnOverlay.show(players)`
- Maintains backward compatibility (works with or without players)

#### 3. `index.html`
Added script tags to load new modules:
```html
<script src="js/ui/juror-return-overlay.js"></script>
<script src="js/ui/settings-debug-juror.js"></script>
```

## Safety Guarantees

✅ **Clone-only behavior**: Never reparents or moves the game's real juror DOM node  
✅ **Guarded API calls**: All `window.*` game API calls are guarded  
✅ **Local-only quick-vote**: No server vote submission (visual only)  
✅ **Minimum evictees**: Button only triggers with ≥2 evictees  
✅ **Defensive mounting**: Uses Fans' Favorite APIs/hosts with fallbacks  
✅ **Non-breaking**: Opt-in debug behavior, doesn't affect production code  
✅ **Backward compatible**: Existing overlay usage continues to work  

## Testing Steps

### Manual Testing

1. **Build and deploy branch to staging**
   ```bash
   git checkout copilot/add-debug-button-settings
   # Deploy to staging environment
   ```

2. **Test with ≥2 evictees**
   - Start a game with multiple players
   - Evict at least 2 players (ensure they enter jury house)
   - Open Settings → Debug
   - Click "Force Jurors Return (Debug)" button
   - **Expected**: Overlay appears full-screen with dimmed background
   - **Expected**: Shows all evictees with avatars and names
   - **Expected**: Quick-vote UI is present and functional (local-only)
   - **Expected**: Can close overlay with X button or Escape key

3. **Test with <2 evictees**
   - Start fresh game or game with only 1 evictee
   - Open Settings → Debug
   - **Expected**: Button shows inline hint: "Need at least 2 evictees to run jurors return"
   - Click button
   - **Expected**: Toast notification shows error message
   - **Expected**: Overlay does NOT appear

4. **Test with ?juror_debug=1**
   - Add `?juror_debug=1` to URL
   - Load page
   - **Expected**: Overlay auto-shows after 1 second (if jurors available)

5. **Test Interactive Test Page**
   - Open `test_debug_juror_button.html` in browser
   - Try all setup buttons (0, 1, 2, 5 evictees)
   - Verify button behavior matches requirements
   - Check log output for proper flow

### Debug Overlay Removal Detection

If the overlay gets removed unexpectedly, add a MutationObserver to capture the removal:

```javascript
// In browser console or debug script
const overlay = document.querySelector('.juror-return-overlay');
if (overlay) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node.className?.includes('juror-return-overlay')) {
          console.trace('[DEBUG] Overlay removed! Stack trace:');
        }
      });
    });
  });
  observer.observe(overlay.parentNode, { childList: true });
  console.log('[DEBUG] MutationObserver attached to overlay parent');
}
```

## Implementation Details

### Evictee Detection Fallback Chain

The module tries multiple strategies to find evictees:

1. **Game state properties** (in order):
   - `window.game.evictees`
   - `window.game.evicted`
   - `window.game.evictedPlayers`
   - `window.game.evictionHistory`
   - `window.game.evictions`

2. **Players array scan**:
   - Filters `window.game.players` for `player.evicted === true`

3. **DOM scan** (last resort):
   - Queries for `.evicted` and `.roster .evicted` elements
   - Extracts `data-id` or `data-player-id` attributes

### Player Object Conversion

Evictee IDs are converted to full player objects:
```javascript
{
  id: player.id,
  name: player.name || safeName(id),
  avatarUrl: player.avatar || getDicebearUrl(name)
}
```

### Mounting Strategy

The overlay uses defensive mounting (same as Fans' Favorite):

1. Try `IntermissionCard.showInTv()`
2. Try `livevoteHelpers.enterExternalOverlayMode()`
3. Try `CardManager.showInTv()`
4. Fall back to host selectors:
   - `.tvOverlayContent`
   - `[data-sm-faux-tv]`
   - `.tvContainer`
   - `.tvDim`
   - `#tv-overlay`
5. Final fallback: `document.body`

## Visual Reference

### Settings Debug Button (≥2 evictees)
![Settings Debug Button with 2+ evictees](https://placeholder-for-screenshot-1.png)

### Settings Debug Button (<2 evictees)
![Settings Debug Button with hint message](https://placeholder-for-screenshot-2.png)

### Jurors Return Overlay
![Jurors Return Overlay Fullscreen](https://placeholder-for-screenshot-3.png)

## Related Files

- `js/jury_return.js` - Original juror return competition logic
- `js/jury_return_vote.js` - Vote handling for juror return
- `js/ui/juror-overlay.js` - Different module (jury house overlay)
- `test_juror_return_overlay_defensive.html` - Existing test for overlay

## Breaking Changes

**None.** This is purely additive debug functionality.

## Migration Guide

No migration needed. The feature is opt-in via the debug button.

## Rollback Plan

If issues arise, remove the script tags from `index.html`:
```diff
- <script src="js/ui/juror-return-overlay.js"></script>
- <script src="js/ui/settings-debug-juror.js"></script>
```

## Future Enhancements

- Add more debug options (force specific juror to win)
- Add vote percentage controls
- Add timing controls for animation testing
- Integration with replay/save state system

## Checklist

- [x] Code follows existing patterns
- [x] No breaking changes
- [x] Safety guarantees implemented
- [x] Test page created
- [x] Syntax validated
- [x] PR description complete
- [ ] Manual testing completed
- [ ] Screenshots added
- [ ] Reviewers assigned

## Notes

This implementation reuses the existing `js/ui/juror-return-overlay.js` module which was already present in the codebase. The overlay module had most of the required functionality; we only needed to:
1. Enhance it to accept an optional players array
2. Create the settings integration module
3. Update the progression events handler

The solution is conservative, non-breaking, and follows all existing code patterns.
