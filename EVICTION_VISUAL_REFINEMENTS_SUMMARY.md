# Eviction Visual Refinements - Implementation Summary

## Overview

This PR refines the eviction visual sequence per user feedback to improve the viewing experience. The key change is to suppress interim roster updates (pale-out/red X) during the animation window, then show the finishing-place badge **inside the avatar** while keeping the houseguest's name visible.

## Implementation Details

### 1. Body Class for Suppression (`evict-visual-in-progress`)

**Purpose**: Suppress red X and grayscale effects during the brief animation window between the Evicted card and the completion of the faux TV animation.

**Implementation**:
- Added `notifyEvictedForVisual(evictedId, source)` function in `js/eviction-visuals.js`
- This function adds the `evict-visual-in-progress` class to the body element
- Called **before** showing the Evicted card in all eviction flows
- Removed in the `finally` block of `runEvictionVisual()` after animation completes

**Integration Points**:
- `js/eviction.js` - `handleEvictionLegacy()` and `multiEvictFinalize()`
- `js/competitions.js` - `finalizeFinal3Decision()`
- `js/veto.js` - `finalizeFinal4Eviction()`
- `js/self-eviction.js` - `processEviction()`

### 2. Avatar Rank Badge Positioning

**Key Change**: Badge now renders **inside** the avatar container (bottom-right corner), not as a replacement for the name.

**CSS** (`styles.css`):
```css
.avatar-rank-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  /* ... styling ... */
  z-index: 5;
}
```

**Roster Rendering** (`js/ui.hud-and-router.js`):
- Removed finishing badge from label precedence (previously replaced name)
- Added badge rendering **inside** the `top-tile-avatar-wrap` for ranks ≥ 3
- Name label now shows the actual houseguest name (or medals for 1st/2nd)
- Added `position: relative` to avatar wrap to support absolute positioning of badge

### 3. CSS Override for Interim Suppression

**Purpose**: Hide red X and prevent grayscale during the animation window.

**CSS** (`styles.css`):
```css
/* Suppress interim roster visuals during eviction animation */
body.evict-visual-in-progress .evicted-cross {
  display: none !important;
}

body.evict-visual-in-progress .top-tile-avatar.grayed {
  filter: none !important;
  opacity: 1 !important;
}
```

This ensures that:
1. No red X appears during animation
2. Avatar remains colorful (not grayed out) during animation
3. After animation completes, final roster state is shown with badge inside avatar

### 4. Updated Eviction Visual Module

**File**: `js/eviction-visuals.js`

**Changes**:
- Added `notifyEvictedForVisual()` function exported to global scope
- Modified `runEvictionVisual()` to include try/finally block
- `finally` block removes `evict-visual-in-progress` body class
- Updated `updateExistingTile()` to:
  - Find avatar container (`.top-tile-avatar-wrap`, `.roster-avatar`, `.avatar`, or img parent)
  - Create badge inside avatar container (not as name replacement)
  - Hide any existing red X when badge is shown
  - Fall back to tile-level data attribute if avatar container not found

### 5. Self-Eviction Integration

**File**: `js/self-eviction.js`

**Changes**:
- Made `processEviction()` async to support visual enhancement
- Added `notifyEvictedForVisual()` call before logging
- Added `await runEvictionVisual()` after jury integration
- Cascaded async changes to all handler functions:
  - `handleNomineeSelfEviction()`
  - `handleHOHSelfEviction()`
  - `handlePOVSelfEviction()`
  - `handleNonRoleSelfEviction()`

## Visual Sequence

### Before (Original)
1. Evicted card appears
2. **Interim**: Roster shows pale-out + red X immediately
3. Faux TV animation plays
4. Roster updates with finishing badge (replaced name)

### After (Refined)
1. Evicted card appears
2. **No interim update**: Body class suppresses red X and pale-out
3. Faux TV animation plays (~1.6s)
4. Body class removed
5. Roster updates with:
   - Finishing badge **inside avatar** (bottom-right)
   - Houseguest **name remains visible**
   - Red X is hidden/removed

## Medal/Award Visuals (Unchanged)

- **1st place**: 🥇 medal shown as name label
- **2nd place**: 🥈 medal shown as name label
- **3rd+ place**: Ordinal badge (e.g., "3rd", "12th") shown inside avatar, name visible

## Testing

### Test File
**File**: `test_eviction_visual_refinements.html`

**Features**:
- Setup game with 12 players
- Test scenarios:
  - Standard eviction
  - Final 4 eviction
  - Final 3 eviction
  - Self-eviction
- Visual preview with TV screen and roster
- Checklist of objectives
- Detailed test log

**Test Objectives**:
1. ✓ Evicted card appears first
2. ✓ Body class suppresses red X during animation
3. ✓ Faux TV animation plays immediately
4. ✓ After animation, roster shows badge inside avatar
5. ✓ Houseguest name remains visible
6. ✓ Red X is hidden when badge appears
7. ✓ 1st/2nd place still show medals (unchanged)
8. ✓ 3rd+ places show ordinal badge in avatar

### Manual Test Scenarios

**Standard Eviction (Weekly Vote)**:
1. Player is evicted via vote
2. "Evicted" card shows
3. No red X appears during animation
4. Faux TV animation plays
5. Roster updates: badge inside avatar, name visible, no red X

**Final 4 Eviction**:
1. POV holder casts sole vote
2. "Evicted" card shows
3. Animation sequence
4. 4th place badge appears inside avatar

**Final 3 Eviction**:
1. Final HOH makes decision
2. "🎬 Final Eviction Decision" card
3. "🥉 Third Place" card
4. Animation sequence
5. 3rd place badge ("3rd") appears inside avatar
6. Remaining 2 proceed to jury vote with medals intact

**Self-Eviction**:
1. Player self-evicts (manual or AI)
2. "Self-Evicted" card shows
3. Same animation sequence
4. Badge appears inside avatar
5. No duplicate animations (idempotent)

## Files Changed

### Modified Files
1. `js/eviction-visuals.js` - Added notification function, updated badge positioning
2. `js/eviction.js` - Added notification calls in eviction handlers
3. `js/competitions.js` - Added notification call in Final 3 handler, set finalRank=3
4. `js/veto.js` - Added notification call in Final 4 handler, set finalRank=4
5. `js/self-eviction.js` - Made handlers async, added notification and visual calls
6. `js/ui.hud-and-router.js` - Modified roster rendering to place badge inside avatar
7. `styles.css` - Added `.avatar-rank-badge` and `body.evict-visual-in-progress` styles

### New Files
1. `test_eviction_visual_refinements.html` - Comprehensive test page

## Backward Compatibility

- Non-breaking: All changes are additive or refinements
- Graceful degradation: If functions don't exist, code continues normally
- Idempotent: Visual enhancement runs only once per eviction
- Resilient: Works with multiple DOM selector patterns

## Key Design Decisions

### 1. Why Body Class?
- Global scope makes it easy to suppress roster updates across all rendering paths
- Clean separation: visual layer doesn't need to know about roster implementation
- Easy to remove after animation completes via finally block

### 2. Why Inside Avatar?
- Better visual hierarchy: badge is associated with the player, not replacing identity
- Name remains visible for clarity
- More compact: no need for extra label space
- Professional appearance: mimics sports broadcasts

### 3. Why Not Change 1st/2nd Place?
- Medals (🥇🥈) are already established UI conventions
- Users expect medals for finalists
- Ordinal badges are for 3rd+ only
- Maintains visual consistency

### 4. Why Notify Before Card?
- Body class must be active **before** any roster update is triggered
- Ensures no interim visual appears even if card queue is slow
- Clean separation: notification is decoupled from actual visual execution

## Performance Impact

- **Minimal**: Single body class add/remove
- **No DOM thrashing**: Badge created once inside existing container
- **Hardware accelerated**: CSS transforms and animations
- **Async/await**: Doesn't block game flow

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS features: absolute positioning, flexbox, transforms
- JavaScript: ES6+ (async/await, arrow functions, template literals)

## Validation

- ✅ JavaScript syntax validated (all files)
- ✅ Runtime tests pass
- ✅ No regressions in existing functionality
- ✅ Idempotent behavior confirmed
- ✅ Graceful degradation verified

## Future Enhancements

Potential improvements (not in scope):
- Animated badge entrance (slide-in from corner)
- Badge color variations by rank tier (top 5, mid-range, bottom)
- Hover tooltip with full placement text
- Sound effect for badge appearance
- Confetti/particle effects for top 3

## Summary

This PR successfully refines the eviction visual sequence to:
1. **Suppress interim roster updates** during animation via body class
2. **Position finishing badge inside avatar** (bottom-right overlay)
3. **Keep houseguest name visible** below avatar
4. **Hide red X** when badge is shown
5. **Preserve medal visuals** for 1st/2nd place
6. **Support all eviction types** (standard, Final 4, Final 3, self-eviction)

The implementation is non-breaking, resilient, and provides a smoother, more professional viewing experience that matches user expectations from the problem statement.
