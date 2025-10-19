# Eviction Visual Enhancement

## Overview

This enhancement adds a non-breaking visual effect to evictions:
- **Avatar Animation**: Evicted houseguest's avatar appears in the faux TV with a zoom-in → black & white → fade out animation

**Note**: Previously, this module also added finishing place badges to the roster, but that feature has been removed. The roster now behaves exactly as it did before these changes, showing the red X for all evicted players.

## Features

### Avatar Animation
- **Location**: Inside the faux TV container (`#tv`)
- **Duration**: ~1.6 seconds total
  - Zoom-in: 0.6s
  - Grayscale effect: 0.4s
  - Fade out: 0.6s
- **Styling**: Large circular avatar with white border and shadow
- **Resilient**: Works with multiple TV selector patterns (`#tv`, `.tv`, `.faux-tv`, `.tv-screen`)

### Roster Display
- **No modifications**: Roster displays normally with red X for evicted players
- **Medals**: 1st and 2nd place continue to show 🥇 and 🥈 medals (unchanged)
- **No badges**: Finishing place badges (3rd, 4th, etc.) have been removed

## Eviction Types Supported

✅ **Standard Vote Eviction** (regular weekly eviction)
✅ **Final 4 Eviction** (POV holder's sole vote)
✅ **Final 3 Eviction** (Final HOH's decision)
✅ **Multi-Eviction** (double/triple eviction)
✅ **Self-Eviction** (player quits)

## Implementation Details

### Core Module
**File**: `js/eviction-visuals.js`

**Main Function**: `runEvictionVisual(evictedId, context)`
- Waits for card queue to go idle
- Renders avatar animation in faux TV
- Idempotent (runs only once per eviction via `game.__evictVisualDone[evictedId]`)

**Removed Functions** (as of selective revert):
- `updateRosterFinishingBadge()` - removed
- `updateExistingTile()` - removed
- `notifyEvictedForVisual()` - removed

### Integration Points

1. **Standard Evictions** (`js/eviction.js`)
   - Called in `handleEvictionLegacy()` after the "Evicted" card
   
2. **Final 3 Evictions** (`js/competitions.js`)
   - Called in `finalizeFinal3Decision()` after the "3rd Place" card
   
3. **Final 4 Evictions** (`js/veto.js`)
   - Called in `finalizeFinal4Eviction()` after the "Evicted" card
   
4. **Multi-Evictions** (`js/eviction.js`)
   - Called in `multiEvictFinalize()` for each evicted player

### Roster Rendering
**File**: `js/ui.hud-and-router.js`

**No changes**: Roster rendering is unchanged from before the eviction visuals feature. Evicted players show red X overlay.

**Label Precedence** (in `renderTopRoster()`):
1. WINNER (🥇)
2. RUNNER-UP (🥈)
3. NOM
4. HOH/POV icons
5. Player name

### CSS Classes

**Animation** (kept):
- `.eviction-visual-avatar` - Container for animated avatar
- `.eviction-visual-avatar.zoom-in` - Zoom-in phase
- `.eviction-visual-avatar.grayscale` - Grayscale filter
- `.eviction-visual-avatar.fade-out` - Fade out phase

**Removed** (as of selective revert):
- `.finishing-badge` - removed
- `.status-finishing-badge` - removed
- `.avatar-rank-badge` - removed
- `.avatar-bw-dim` - removed
- `body.evict-visual-in-progress` - removed

## Design Decisions

### 1. Idempotent Execution
- Uses `game.__evictVisualDone[evictedId]` to prevent duplicate runs
- Safe to call multiple times for the same eviction

### 2. Non-Breaking
- If TV container not found, animation is skipped (no error)
- Routing proceeds normally even if visual enhancement fails

### 3. Minimal Impact
- No modifications to roster rendering
- No body-level classes that affect other UI elements
- Animation runs independently of game logic

### 4. Removed Features
The following features were part of PRs #317, #320, and #324 but have been selectively reverted:
- Finishing place badges on roster (3rd, 4th, 5th, etc.)
- Avatar grayscale/opacity effects on roster
- Red X suppression for badged players
- `body.evict-visual-in-progress` class
- Roster-related helper functions
- Handles multi-evictions with proper rank assignment

## Testing

### Manual Test Page
**File**: `test_eviction_visuals.html`

**Features**:
- Setup game with 12 players
- Simulate standard evictions
- Simulate Final 3 eviction
- View avatar animation in faux TV
- View roster updates with badges
- Console logging for debugging

**Usage**:
1. Open `test_eviction_visuals.html` in browser
2. Click "Setup Game (12 players)"
3. Click "Evict Player 1" to simulate first eviction
4. Observe:
   - Avatar animation in TV container
   - Roster update with finishing badge
   - Console logs

### Integration Testing

**Scenarios to Test**:
1. ✅ Standard eviction (regular vote)
2. ✅ Final 4 eviction (POV holder vote)
3. ✅ Final 3 eviction (HOH decision)
4. ✅ Double/Triple eviction
5. ✅ Self-eviction
6. ✅ Idempotency (call twice, runs once)
7. ✅ Missing TV container (graceful degradation)
8. ✅ Missing roster tile (graceful degradation)

## Browser Compatibility

- **Modern Browsers**: Full support (Chrome, Firefox, Safari, Edge)
- **CSS Animations**: Uses standard CSS transitions and keyframes
- **JavaScript**: Uses ES6+ features (async/await, arrow functions)

## Performance

- **Animation**: Hardware-accelerated CSS transforms
- **Roster Update**: Single DOM update via `updateHud()`
- **Memory**: Minimal overhead (guard object in game state)

## Accessibility

- **Alt Text**: Avatar images include player names
- **ARIA Labels**: Roster tiles include descriptive labels (e.g., "Player 1 (Finished 12th)")
- **Keyboard Navigation**: Not impacted (uses existing roster interaction)

## Known Limitations

1. **TV Container Required**: Animation only works if TV container exists
2. **Roster Must Be Rendered**: Badge only shows if roster is rendered
3. **finalRank Calculation**: Relies on correct eviction order tracking

## Future Enhancements

Potential improvements (not in scope):
- Sound effects for avatar animation
- Confetti/particle effects
- Animated transition for finishing badge appearance
- Hover effects to show full placement text
- Timeline view of all evictions in order

## Files Modified

### New Files
- `js/eviction-visuals.js` - Core module (220 lines)
- `test_eviction_visuals.html` - Test page (370 lines)

### Modified Files
- `index.html` - Added script tag for eviction-visuals.js
- `styles.css` - Added CSS for animation and badges (~60 lines)
- `js/eviction.js` - Integrated into standard and multi-evictions
- `js/competitions.js` - Integrated into Final 3 eviction
- `js/veto.js` - Integrated into Final 4 eviction
- `js/ui.hud-and-router.js` - Added badge rendering logic

## Version History

- **v1.0** (2025-10-19): Initial implementation
  - Avatar animation in faux TV
  - Finishing place badges for ranks ≥ 3
  - Integration with all eviction types
  - Idempotent execution with guards
  - Graceful degradation for missing elements

## Support

For issues or questions, refer to:
- GitHub Issues: [bbmobile repository](https://github.com/georgi-cole/bbmobile)
- Test Page: `test_eviction_visuals.html`
- Console Logs: All actions are logged with `[eviction-visuals]` prefix
