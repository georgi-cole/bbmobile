# Roster Reordering & Eviction Visuals Implementation

## Overview
This implementation adds roster reordering functionality and enhanced eviction visuals as specified in the requirements. All changes are minimal, reversible, and focused on the specific requirements.

## Changes Made

### 1. JavaScript Changes (`js/ui.hud-and-router.js`)

#### Roster Reordering Logic
- **Lines 573-590**: Added player reordering logic in `renderTopRoster()`
  - Separates players into `activePlayers` and `evictedPlayers` arrays
  - Preserves original order for active players
  - Sorts evicted players by `weekEvicted` (earliest first)
  - Concatenates arrays: `[...activePlayers, ...evictedPlayers]`

#### Data Attributes
- **Lines 598-603**: Added data attributes to each roster tile:
  - `data-player-id`: Player identifier
  - `data-original-index`: Original position in roster
  - `data-evicted`: "true" or "false" 
  - `data-evicted-at`: Week number when evicted (if applicable)
  - `data-evict-animated`: "animating" or "done" to track animation state

#### SVG Brush X Implementation
- **Lines 623-640**: Replaced text X (✖) with SVG brush strokes
  - Uses `__evictAnimated` flag on player object to prevent re-animation
  - Only adds `.animating` class on first appearance
  - SVG path creates clean brush-stroke X shape
  - Uses `currentColor` for theme integration
  - Prevents duplication by checking for existing `.evicted-cross` element

#### Auto-Scroll on Mobile
- **Lines 708-716**: Added auto-scroll functionality
  - Only triggers when there are evicted players (roster was reordered)
  - Scrolls to first active player using `scrollIntoView()`
  - Smooth behavior with 100ms delay for DOM stabilization
  - Only scrolls if not already at the beginning

### 2. CSS Changes (`styles.css`)

#### Scroll-Snap Support
- **Line 1186**: Added `scroll-snap-type: x mandatory;` to `.top-roster-row`
  - Enables smooth snap-to-grid swiping on mobile
  - Mandatory mode ensures tiles always snap to position

- **Line 1229**: Added `scroll-snap-align: start;` to `.top-roster-tile`
  - Each tile snaps to the start of the viewport
  - Creates polished swipe-between-avatars experience

#### Enhanced Evicted Cross Styling
- **Lines 1304-1333**: Completely redesigned `.evicted-cross` styling
  - Changed from text-based (4rem font) to SVG-based (80% width/height)
  - Uses CSS variable `var(--bad)` for theme color support
  - Separated animation logic: static by default, animates only with `.animating` class
  - Added `.evicted-cross svg` rules for proper SVG rendering
  - Updated `@keyframes crossFadeIn` to work with new SVG structure
  - Animation plays once and completes (`forwards` fill mode on `.animating` class only)

## Key Features

### ✅ Roster Reordering
- Active players always appear first, maintaining their original order
- Evicted players are appended at the end, sorted by eviction week
- Order is recalculated on every render but maintains consistency

### ✅ One-Time Eviction Effect
- Uses `__evictAnimated` flag on player object (persists across renders)
- Animation class only added if flag is false
- Flag set to true immediately after first render
- Subsequent renders show static X without animation

### ✅ Theme-Colored SVG X
- SVG brush stroke replaces text-based X
- Uses `currentColor` which inherits from `color: var(--bad)`
- Adapts to theme changes automatically
- Clean, professional brush-stroke appearance

### ✅ Scroll-Snap Integration
- CSS-only implementation using native scroll-snap
- Works on all modern mobile browsers
- Smooth, hardware-accelerated swiping
- No JavaScript overhead

### ✅ Mobile Auto-Scroll
- Automatically scrolls to first active player after eviction
- Only activates when roster has been reordered (evicted players present)
- Uses smooth scrolling for better UX
- Doesn't scroll if already at the correct position

## Data Attributes Usage

All logic is tracked via data attributes for easy debugging and testing:

```html
<div class="top-roster-tile evicted" 
     data-player-id="p3"
     data-original-index="2"
     data-evicted="true"
     data-evicted-at="1"
     data-evict-animated="done">
  <!-- tile content -->
</div>
```

## Testing

### Manual Testing
Two test files are provided:

1. **`test_roster_reordering.html`**: Basic functional test
   - Tests roster reordering logic
   - Verifies data attributes
   - Checks animation prevention

2. **`test_roster_visual_verification.html`**: Comprehensive visual test
   - Interactive checklist
   - SVG X demo comparison
   - Live statistics
   - Complete test scenario walkthrough

### Test Scenario
1. Initialize game with 8 players
2. Evict Player 1 → Observe move to end with animated X
3. Evict Player 2 → Verify both evicted players at end, in order
4. Evict Player 3 → Confirm eviction order maintained
5. Refresh/re-render roster → Verify X stays static (no re-animation)
6. Test scroll-snap by swiping roster (mobile)
7. Verify auto-scroll to first active player

### Expected Results
- ✅ Active players (4-8) remain at start in original positions
- ✅ Evicted players (1-3) appear at end in eviction order
- ✅ SVG X visible on evicted avatars with theme color
- ✅ First eviction shows animation
- ✅ Subsequent renders show static X
- ✅ Scroll-snap feels smooth when swiping
- ✅ Auto-scroll positions first active player after eviction

## Browser Compatibility

### Supported Features
- **SVG inline in HTML**: All modern browsers
- **CSS Custom Properties** (theme colors): All modern browsers  
- **Scroll-snap**: iOS 11+, Chrome 69+, Firefox 68+, Safari 11+
- **scrollIntoView with smooth**: All modern browsers (graceful degradation)

### Fallback Behavior
- If scroll-snap not supported: Normal scrolling still works
- If smooth scroll not supported: Instant scroll (still functional)
- SVG fallback: Browser renders as inline SVG (universal support)

## Performance Considerations

### Optimizations
1. **Animation Flag**: Prevents unnecessary CSS animations on re-render
2. **Scroll Throttle**: 100ms delay prevents excessive scroll calls
3. **SVG Instead of Font**: Better rendering, smaller payload
4. **CSS-only scroll-snap**: No JavaScript overhead
5. **Data attributes**: Minimal memory footprint

### Memory Impact
- `__originalIndex` stored per player: ~4 bytes per player
- `__evictAnimated` flag per player: ~1 byte per player
- Data attributes: ~50 bytes per tile (rendered DOM only)
- Total overhead: <100 bytes per player

## Reversibility

All changes can be easily reversed:

1. **Revert roster reordering**: Remove lines 573-590, restore original `forEach`
2. **Revert SVG X**: Restore original `.evicted-cross` HTML (`✖`)
3. **Revert scroll-snap**: Remove `scroll-snap-type` and `scroll-snap-align` CSS
4. **Revert auto-scroll**: Remove lines 708-716
5. **Revert data attributes**: Remove lines 598-603

No breaking changes to existing functionality. All additions are isolated.

## Integration Points

### Event Listeners
- No new event listeners added
- Existing `bb:eviction` event still works
- Resize handler already existed (unchanged)

### Dependencies
- Depends on existing `renderTopRoster()` function structure
- Uses existing player object properties (`evicted`, `weekEvicted`, `id`, `name`)
- Requires existing CSS variables (`--bad`, `--card`, etc.)

### API Surface
- No new global functions
- No new public methods
- Internal logic only (no external consumers affected)

## Code Quality

### Naming Conventions
- Uses existing naming patterns (`camelCase` for JS, `kebab-case` for CSS)
- Data attributes follow HTML5 conventions
- CSS classes follow BEM-adjacent methodology

### Comments
- Added inline comments for complex logic
- Explains "why" not just "what"
- Documents animation prevention mechanism
- Notes scroll behavior conditions

### Error Handling
- Graceful degradation if DOM elements missing
- Safe navigation with optional chaining
- No thrown errors for edge cases

## Future Enhancements (Out of Scope)

- Animated roster reordering transitions (slide/fade)
- Customizable scroll-snap padding
- Keyboard navigation for tiles
- Touch gesture customization
- Alternative X designs (configurable)

---

**Implementation Date**: October 10, 2025  
**Files Changed**: 2 (js/ui.hud-and-router.js, styles.css)  
**Lines Added**: ~80  
**Lines Modified**: ~20  
**Test Files**: 2 new test HTML files
