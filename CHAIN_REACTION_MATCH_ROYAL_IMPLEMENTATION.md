# Chain Reaction - Match Royal Style Implementation

## Overview

This document describes the implementation of the Chain Reaction minigame with match-royal style gameplay, replacing the previous cell explosion puzzle with a color-matching tile game.

## Implementation Summary

### File Changed
- `js/minigames/chain-reaction.js` - Completely rewritten with new gameplay mechanics

### New Test File
- `test_chain_reaction_match_royal.html` - Manual testing page for the new implementation

## Gameplay Changes

### Previous Implementation (Cell Explosion)
- Numeric counters on cells
- Cells explode when reaching threshold based on neighbors
- Chain reaction system with explosion propagation
- Delayed tick-based explosion processing

### New Implementation (Match-Royal)
- **Colored Tiles**: Grid filled with 5 distinct colors (no numeric counters)
- **4-Way Group Detection**: Contiguous same-color groups detected using 4-way connectivity (up, down, left, right)
- **Group Popping**: Groups with 2+ tiles can be clicked to remove them
- **Singles Blocking**: When any group ≥2 exists, single tiles cannot be clicked
- **Singles Clearance**: When only singles remain, they become clickable to finish the board
- **Gravity Physics**: After removal, tiles fall down to fill empty spaces
- **No Refill**: Board can be completely cleared (no automatic tile generation from top)
- **2 Rounds**: Players must clear the board twice to win
- **Smaller Cells**: Default 36px cell size (vs previous larger cells)

## Technical Details

### Configuration
```javascript
const config = {
  rounds: 2,                    // Default number of rounds
  rows: 8,                      // Grid height
  cols: 6,                      // Grid width
  colors: ['#ff6b6b', '#6bcfff', '#ffd166', '#8d6bff', '#6bffa3'],
  cellSizeVar: '--cr-cell-size', // CSS variable for cell size
  defaultCellSizePx: 36         // Default cell size in pixels
};
```

### Grid Data Structure
- Grid is a 2D array: `grid[row][col]`
- Each cell is either `null` (empty) or `{ color: string }`
- No numeric counters (simplification from previous version)

### Key Functions

#### Game Logic
- `getGroup(r, c)` - Flood-fill algorithm to find all tiles in same-color contiguous group
- `anyGroupSizeGE2()` - Checks if any group with 2+ tiles exists (for singles blocking)
- `removeGroup(group)` - Sets all cells in group to null
- `applyGravity()` - Compacts tiles downward after removal
- `checkRoundEnd()` - Detects when board is clear and advances round or ends game

#### Rendering
- `renderGrid()` - Creates DOM structure with colored buttons
- Each cell is a `<button>` with background color set inline
- Empty cells have transparent background

#### API Methods
- `init(container)` - Initialize game in provided DOM element
- `start()` - Begin gameplay (enables interactions)
- `stop()` - Pause/stop gameplay
- `setRounds(n)` - Configure number of rounds
- `setCellSize(px)` - Change cell size dynamically

### Global Registration

The module registers itself under multiple global namespaces for compatibility with the legacy loader system:

```javascript
window.MinigameModules.chainReaction
window.MiniGames.chainReaction
window.MiniGameModules.chainReaction
window.chainReaction
window.ChainReactionMinigame
window.game.MinigameModules.chainReaction
```

This ensures the `RegistryBootstrap` can find and load the minigame regardless of which lookup path it uses.

### Module Format

- **Non-ES-module**: Uses IIFE (Immediately Invoked Function Expression) pattern
- **No export statements**: Relies on global variable registration
- **Browser-first**: Designed for browser environment
- **CommonJS fallback**: Defensive export for Node.js test environments (with ESLint disable comments)

## CSS Styling

Existing CSS file provides styling support:
- `css/minigames/chain-reaction.css`
- Includes animations for cell pops and illegal clicks
- Responsive cell sizing via CSS variables
- Visual feedback for active cells and game end states

## Testing

### Automated Tests
All validation tests pass:
```bash
npm run test:minigames
```
- ✓ Minigame key validation
- ✓ Legacy map validation
- ✓ Runtime resolution test
- ✓ Selector pool coverage

### Manual Testing
Open `test_chain_reaction_match_royal.html` in a browser to verify:
1. **Colored tiles display** - 5 distinct colors, no numbers
2. **Group clicking** - Click groups of 2+ same-color tiles
3. **Singles blocking** - Singles can't be clicked when groups exist
4. **Singles clearance** - Singles become clickable when only singles remain
5. **Gravity** - Tiles fall down after pops
6. **No refill** - Board empties out completely
7. **Round progression** - New tiles seed for round 2 after clearing round 1
8. **Victory** - Game ends with "Cleared!" message after 2 rounds
9. **Cell size** - Cells are 36px (smaller squares)

### Debug Launcher Testing
The minigame can be launched via the debug minigame launcher:
1. Open main game (`index.html`)
2. Press `Ctrl+Shift+D` to open debug panel
3. Select "Chain Reaction" from dropdown
4. Click "Launch" to test in debug mode

## Code Quality

### ESLint
- ✓ All ESLint checks pass
- No errors or warnings
- Proper error handling with underscore-prefixed unused variables
- Comment blocks explain empty catch blocks

### Code Structure
- ✓ IIFE wrapper pattern
- ✓ Private state and helper functions
- ✓ Clean public API
- ✓ Defensive programming (null checks, try-catch blocks)
- ✓ Clear separation of concerns

## Migration Notes

### Breaking Changes from Previous Version
1. **Data format**: Grid cells are now `{ color }` objects instead of `{ count }` objects
2. **Gameplay mechanics**: Complete overhaul from explosion chains to match-royal groups
3. **Scoring removed**: No score calculation in module (handled by game system)
4. **Legacy render removed**: No backwards-compatible `render()` function wrapper

### Compatibility
- ✓ Registry entry unchanged (still registered as `chainReaction`)
- ✓ Module file path unchanged (`chain-reaction.js`)
- ✓ CSS class names unchanged (`.cr-container`, `.cr-board`, etc.)
- ✓ Global registrations maintained for all legacy paths

## Performance

### Optimizations
- Efficient flood-fill using Set for visited tracking
- Single-pass gravity algorithm (O(rows * cols))
- Event delegation not needed (click handlers per cell acceptable for small grid)
- Minimal DOM manipulation (full re-render on each action is acceptable for 48 cells)

### Memory
- Grid size: 8×6 = 48 cells
- Each cell: Small object `{ color: string }` or `null`
- Total memory footprint: Negligible (~2-3 KB for game state)

## Future Enhancements (Optional)

Possible improvements for future versions:
1. **Animations**: Smooth tile fall animations using CSS transitions
2. **Sound effects**: Pop sounds for group removal
3. **Score tracking**: Points based on group size
4. **Combo system**: Bonus points for consecutive pops
5. **Time pressure**: Optional timer mode
6. **Difficulty levels**: Vary grid size, number of colors, rounds
7. **Powerups**: Special tiles with unique abilities

## PR Testing Checklist

Before merging, verify:
- [ ] Clear browser cache and hard reload
- [ ] Launch via debug launcher (`Ctrl+Shift+D`)
- [ ] Verify colored tiles render (no numbers)
- [ ] Test group popping (click groups ≥2)
- [ ] Verify gravity (tiles fall down)
- [ ] Test singles blocking (blocked when groups exist)
- [ ] Test singles clearance (clickable when only singles)
- [ ] Verify 2 rounds gameplay
- [ ] Check cell size (36px squares - smaller than before)
- [ ] Confirm victory condition (clear all rounds)

## Validation Results

### npm run test:minigames
```
✅ PASS: All selector pool keys resolve correctly
   No "Unknown minigame" errors will occur
```

### Structure Verification
```
✅ All code structure tests passed!

Implementation verified:
  • Match-royal style gameplay (colored tiles, no counters)
  • 4-way group detection and removal
  • Gravity physics (tiles fall down)
  • Singles blocking when groups exist
  • 2 rounds by default
  • 36px cell size via CSS variable
  • Non-ES-module format with global registrations
  • All required legacy global namespaces registered
```

## Files Modified

### Changed
- `js/minigames/chain-reaction.js` - Complete rewrite (269 lines)

### Added
- `test_chain_reaction_match_royal.html` - Manual test page (230 lines)

### Unchanged
- `js/minigames/registry.js` - Registry entry remains same
- `css/minigames/chain-reaction.css` - CSS file compatible with new implementation

## Summary

The Chain Reaction minigame has been successfully converted from a cell explosion puzzle to a match-royal style color-matching game. The implementation:
- ✅ Uses colored tiles instead of numeric counters
- ✅ Implements 4-way group detection and removal
- ✅ Includes gravity physics
- ✅ Blocks singles when groups exist
- ✅ Defaults to 2 rounds with 36px cell size
- ✅ Maintains non-ES-module format
- ✅ Registers under all required legacy globals
- ✅ Passes all validation tests
- ✅ Has zero ESLint errors

The game is ready for testing and merging.
