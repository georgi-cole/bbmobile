# Compact HUD and Social Spacing Fix

## Overview

This document summarizes the changes made to fix two UI issues:
1. Remove the redundant self-evict button from the compact HUD
2. Restore proper vertical spacing between avatar grid and faux TV overlay during social phase

## Issue 1: Self-Evict Button Removal

### Problem
The compact HUD (located under the clock) had a circular self-evict button labeled "Exit" that was redundant with the EXIT button already present in the toolbar next to the DR button.

### Solution
Completely removed the self-evict button from the compact HUD:

**Files Modified:**
- `src/ui/compactHud.js` - Removed 82 lines of code:
  - Button HTML markup (lines 77-80)
  - State variables: `selfEvictButton`, `selfEvictButtonHandler`
  - Event handler setup and logic (~50 lines)
  - `updateSelfEvictButton()` function (~20 lines)
  - Cleanup logic in `destroy()` method

- `css/compact-hud.css` - Removed 15 lines:
  - `.compact-hud-chip.self-evict-button` styles
  - Focus state styles for the button

**What Remains:**
- The EXIT button in the main toolbar (`index.html:119`) is still present and functional
- Self-eviction functionality is still available through the toolbar button

## Issue 2: Social Overlay Spacing Restoration

### Problem
During the social phase, the faux TV overlay (containing Social Maneuvers) was overlapping the avatar grid because the margin-top was reduced from 60px to 16px, causing visual overlap issues.

### Solution
Restored the original 60px margin to maintain a fixed gap between the avatar grid and the social overlay:

**Files Modified:**
- `socialize-mobile.css` - Updated mobile breakpoint (@media max-width: 768px):
  - Changed `margin-top: 16px` → `margin-top: 60px`
  - Updated comment to reflect restoration purpose
  - Adjusted `max-height: calc(100% - 32px)` → `max-height: calc(100% - 76px)` to account for the increased top margin

**Impact:**
- Social launcher now maintains proper spacing from avatar grid
- No overlap during social phase
- Social module remains centered and contained within TV viewport
- Content is scrollable if it exceeds the available height

## Testing

### Automated Tests
All existing automated tests pass:
- ✅ Minigame validation tests
- ✅ Runtime helpers tests
- ✅ E2E competition tests
- ✅ Social phase requirements tests
- ✅ POV carousel tests

### Manual Test Files Created

1. **`test_compact_hud_changes.html`**
   - Verifies self-evict button is not present in DOM
   - Confirms DR button is still present
   - Checks that CSS styles for self-evict button are removed

2. **`test_social_overlay_spacing.html`**
   - Tests that margin-top is 60px on mobile viewports
   - Verifies max-height calculation accounts for both margins
   - Provides visual simulation of the spacing

## Visual Changes

### Before
- Compact HUD: Phase | Season/Week | DR | **Exit** | Menu (5 buttons)
- Social Phase: 16px gap (causing overlap with avatar grid)

### After
- Compact HUD: Phase | Season/Week | DR | Menu (4 buttons)
- Social Phase: 60px gap (proper spacing, no overlap)

## Technical Notes

### Compact HUD Architecture
- Module location: `src/ui/compactHud.js`
- Styles: `css/compact-hud.css`
- Initialization: `index.html:241`
- The HUD uses ResizeObserver for responsive phase label compression
- State management is contained within the module's closure

### Social Overlay Spacing System
The project has a sophisticated overlay spacing system:
- `js/ui/overlaySpacing.js` - Dynamic measurement and compensation
- `js/ui/mobileRoster.overlay-spacing-fix.js` - Integration wrapper
- `.mobile-roster-grid-spacer` - CSS spacer element that pushes content up
- CSS variables: `--tv-overlay-height`, `--avatar-row-gap`

The 60px margin works in conjunction with this system to maintain proper spacing.

## Migration Notes

### For Developers
- **Do NOT re-add a self-evict button to the compact HUD** - use the toolbar button
- When modifying social phase UI, respect the 60px margin requirement
- The compact HUD has 4 elements: Phase, Season/Week, DR button, and Action menu
- Self-eviction remains available through `index.html:119` toolbar button

### For Testing
1. Open `test_compact_hud_changes.html` to verify button removal
2. Open `test_social_overlay_spacing.html` and resize to mobile width (≤768px) to verify spacing
3. During gameplay, verify social phase doesn't overlap avatar grid

## Related Files

### Modified
- `src/ui/compactHud.js` (-82 lines)
- `css/compact-hud.css` (-15 lines)
- `socialize-mobile.css` (+2 lines, -2 lines)

### Created
- `test_compact_hud_changes.html` (new test file)
- `test_social_overlay_spacing.html` (new test file)
- `COMPACT_HUD_AND_SOCIAL_SPACING_FIX.md` (this document)

### Related (Unchanged)
- `js/ui/overlaySpacing.js` - Dynamic spacing system
- `js/ui/mobileRoster.js` - Mobile roster implementation
- `css/mobileRoster.css` - Mobile roster styles
- `index.html` - Main HTML with toolbar EXIT button

## Verification Checklist

- [x] Self-evict button removed from compact HUD
- [x] Self-evict button CSS removed
- [x] DR button still present in compact HUD
- [x] EXIT button still present in toolbar
- [x] Social overlay margin-top restored to 60px
- [x] Max-height calculation updated to match margins
- [x] All automated tests pass
- [x] Test files created for manual verification
- [x] No regressions in existing functionality
- [x] Code is clean and documented

## Commit History

1. `9c06a39` - Remove self-evict button from compact HUD and restore TV overlay spacing
2. `969cdf5` - Add test files for verifying compact HUD and social overlay changes

## Summary

Both issues have been successfully resolved with minimal, surgical changes:
- **99 lines removed** (97 lines of self-evict button code + 2 lines adjusted for spacing)
- **2 lines modified** for spacing restoration
- **351 lines added** for test files
- **Net change:** -99 lines of production code (cleaner, simpler)
- **Zero regressions** - all existing tests pass

The changes improve the UI by removing redundancy and fixing visual overlap issues while maintaining all existing functionality.
