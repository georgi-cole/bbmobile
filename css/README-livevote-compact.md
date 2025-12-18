# Live Vote Compact Layout (LV2)

## Purpose

This CSS file addresses a critical UX issue where the Evict CTA button during Live Vote (eviction) was not visible to users. The button was either:
- Positioned at the very bottom of a tall blue LV2 panel and clipped under browser chrome on mobile
- Not created or visible at all in some cases

## Solution

The fix enforces a compact, grid-based layout for the LV2 panel that prevents the CTA from being pushed off-screen or clipped.

### Key Features

1. **Grid-Based Layout**: Uses CSS Grid with explicit template areas (avatars | stage | cta) to control positioning
2. **Height Constraints**: Caps the stage height (max-height: 160px) to prevent it from expanding and pushing the CTA down
3. **Sticky CTA**: Makes the CTA sticky to the bottom with proper safe-area handling
4. **Viewport Coverage**: Applies to both mobile and laptop widths (<=1440px) as requested
5. **Minimal Height**: Sets min-height:0 constraints to allow flexible shrinking

## Technical Details

### Grid Template
```css
grid-template-rows: auto auto auto
grid-template-areas: "avatars" "stage" "cta"
```

This ensures the three sections are stacked vertically with the CTA always in the third position.

### Height Management
- Panel: `max-height: 70svh` (uses small viewport height units)
- Panel content: `max-height: 76vh`
- Stage: `max-height: 160px` (caps the middle section to prevent expansion)
- Min-height: `0` (allows flexible shrinking)

### CTA Positioning
- Grid area: `cta`
- Sticky positioning: `bottom: calc(env(safe-area-inset-bottom, 12px) + 8px)`
- Centered: `margin: 6px auto 0 auto`
- High z-index: `9999` to ensure it stays on top

## QA Testing Steps

### Test Environment Setup
1. Deploy branch to staging or test locally
2. Start a new game and progress to eviction phase with 2 nominees

### Mobile Testing (Portrait)
1. Open on mobile device or use DevTools mobile emulation
2. Set viewport to 375×667 (iPhone SE) or similar
3. Enter Live Vote overlay
4. **Verify**:
   - Avatar grid is centered
   - Stage area is compact (not stretching)
   - Evict CTA (name button) is visible directly below avatars
   - No scrolling needed to see CTA
   - Tapping avatar or name button triggers selection
   - Tapping selected name button again triggers evict action

### Laptop Testing (≤1440px)
1. Open on laptop or set DevTools to 1440×900 viewport
2. Enter Live Vote overlay
3. **Verify**:
   - Layout is compact (not stretching to fill entire viewport)
   - Avatar grid is centered
   - Stage is constrained
   - CTA is visible without scrolling
   - Keyboard shortcuts (1, 2 keys) still work

### Edge Cases
1. **Landscape Mobile**: Test on mobile in landscape orientation
2. **Small Laptop**: Test at 1280×720 (small laptop)
3. **Large Mobile**: Test at 428×926 (iPhone 14 Pro Max)
4. **Browser Chrome**: Test with browser UI visible (address bar, tabs)

### Interaction Testing
1. **Touch**: Tap avatars and name buttons to select/evict
2. **Keyboard**: Use 1/2 keys to select nominees (desktop)
3. **Arrow Keys**: Test arrow navigation in carousel mode (mobile)
4. **Accessibility**: Test with screen reader to ensure ARIA labels work

### DevTools Console Checks
If issues occur, check the browser console for:
- `[lv2] CTA Guard:` debug messages
- `[lv2] ensureCtaForTwoNominees:` initialization logs
- Any warnings about missing CTA or onVote handlers

## Compatibility Notes

- Works with both inline CTA pattern (name button becomes evict button) and legacy CTA dock
- Safe for multi-nominee flows (>2 nominees) - guard only activates for 2-nominee flows
- Compatible with carousel mode and standard desktop layout
- Respects `prefers-reduced-motion` settings
- Handles safe-area-inset for devices with notches/rounded corners

## Maintenance

### To Adjust Layout
Edit `css/livevote-compact.css` and modify:
- `max-height` values to change overall panel size
- `grid-template-rows` to adjust section heights
- `clamp()` functions to tweak responsive sizing

### To Disable
Remove or comment out the import in `styles.css`:
```css
/* @import url('css/livevote-compact.css'); */
```

### To Extend Breakpoint
Change the media query max-width:
```css
@media (max-width: 1600px) { /* was 1440px */
```

## Related Files

- `js/livevote-ui.js`: Contains the JS guard that ensures CTA creation
- `styles.css`: Imports this file at the end (so overrides take precedence)
- `js/eviction.js`: Main eviction flow that uses lv2.createCtaBar()

## Known Limitations

- The `!important` flags are necessary to override inline styles and existing CSS
- Grid layout may not be supported on very old browsers (pre-2017)
- Safe-area-inset requires modern mobile browsers for notch/rounded corner support

## Version History

- **v1.0** (Initial): Basic compact layout with height constraints
- **v2.0** (Current): Grid-based layout with CTA visibility guarantees for mobile and laptop
