# Eviction Visual Enhancement

## Overview

This enhancement adds non-breaking visual effects to evictions:
1. **Avatar Animation**: Evicted houseguest's avatar appears in the faux TV with a zoom-in → black & white → fade out animation
2. **Finishing Place Badges**: Roster displays ordinal badges (e.g., "12th") for evicted players ranked 3rd or lower

## Features

### Avatar Animation
- **Location**: Inside the faux TV container (`#tv`)
- **Duration**: ~1.6 seconds total
  - Zoom-in: 0.6s
  - Grayscale effect: 0.4s
  - Fade out: 0.6s
- **Styling**: Large circular avatar with white border and shadow
- **Resilient**: Works with multiple TV selector patterns (`#tv`, `.tv`, `.faux-tv`, `.tv-screen`)

### Finishing Place Badges
- **Display**: Ordinal badge (e.g., "3rd", "12th") replaces the red X for ranks ≥ 3
- **Medals**: 1st and 2nd place continue to show 🥇 and 🥈 medals (unchanged)
- **Styling**: Gray gradient badge with white border and subtle shadow
- **Integration**: Seamlessly integrated into existing roster rendering

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
- Updates roster with finishing badge
- Idempotent (runs only once per eviction via `game.__evictVisualDone[evictedId]`)

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

**Label Precedence** (in `renderTopRoster()`):
1. WINNER (🥇)
2. RUNNER-UP (🥈)
3. **FINISHING BADGE** (e.g., "3rd", "12th") ← NEW
4. NOM
5. HOH/POV icons
6. Player name

### CSS Classes

**Animation**:
- `.eviction-visual-avatar` - Container for animated avatar
- `.eviction-visual-avatar.zoom-in` - Zoom-in phase
- `.eviction-visual-avatar.grayscale` - Grayscale filter
- `.eviction-visual-avatar.fade-out` - Fade out phase

**Badge**:
- `.finishing-badge` - Standalone badge (legacy)
- `.status-finishing-badge` - Roster-integrated badge

## Design Decisions

### 1. Idempotent Execution
- Uses `game.__evictVisualDone[evictedId]` to prevent duplicate runs
- Safe to call multiple times for the same eviction

### 2. Non-Breaking
- If TV container not found, animation is skipped (no error)
- If roster tile not found, badge update is skipped (no error)
- Routing proceeds normally even if visual enhancement fails

### 3. Deferred Routing
- Routing is deferred until avatar animation completes
- Ensures smooth visual experience without blocking game flow
- Uses async/await for clean control flow

### 4. Rank Calculation
- Uses `player.finalRank` if available (set during eviction)
- Falls back to calculating rank based on eviction order
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
