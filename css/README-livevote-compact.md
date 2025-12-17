# Live Vote Compact Layout

## Overview

The `livevote-compact.css` file provides a compact and centered layout variant for the LV2 (Live Vote 2) overlay system. This CSS fixes UI issues where the Evict CTA button is pushed off-screen on mobile devices due to excessive vertical spacing between the avatar grid and the CTA.

## Purpose

- **Problem**: On mobile devices, the live vote UI can have too much vertical spacing, causing the Evict CTA to be pushed below the viewport.
- **Solution**: Apply compact spacing and centering rules that work across both mobile and laptop screen sizes.
- **Scope**: Changes are scoped to `.lv2-overlay` and `.lv2-responsive` classes to avoid affecting other parts of the application.

## How It Works

The compact layout is activated automatically on screens **up to 1280px wide** via a media query. It applies the following adjustments:

1. **Reduced Panel Height**: Max height of `70svh` (small viewport height units) prevents excessive vertical space usage.
2. **Centered Layout**: Flexbox centering ensures avatars and CTAs are visually centered both vertically and horizontally.
3. **Compact Spacing**: Uses `clamp()` with dynamic viewport units (dvh, dvw) to scale gaps and padding responsively.
4. **Smaller Avatars**: Avatar sizes are reduced from their default sizes to fit more compactly within the viewport.
5. **Sticky CTA**: The Evict CTA button is positioned with `position: sticky` to stay at the bottom of the panel, ensuring it remains accessible.
6. **Safe Area Support**: Respects device safe areas (notches, home indicators) using `env(safe-area-inset-*)`.

## Adjusting Compactness

### For Different Device Classes

If you need to adjust the compactness for specific device sizes:

1. **Edit the media query breakpoint**:
   ```css
   @media (max-width: 1280px) { /* Change this value */ }
   ```
   - Increase to `1440px` to apply compact layout on larger laptops
   - Decrease to `1024px` to only apply on tablets and smaller

2. **Adjust spacing values**:
   - **Panel padding**: Change `clamp(8px, 2.2dvh, 18px)` to increase/decrease inner padding
   - **Gap between elements**: Modify `clamp(6px, 1.6dvh, 14px)` for tighter/looser spacing
   - **Avatar size**: Edit `clamp(64px, 9dvw, 112px)` to make avatars larger/smaller

3. **Adjust maximum height**:
   ```css
   max-height: 70svh !important; /* Increase to 80svh or 85svh for more vertical space */
   ```

### Reverting to Original Layout

To disable the compact layout entirely:

1. **Remove the import** from `styles.css`:
   ```css
   /* Comment out or delete this line: */
   @import url('css/livevote-compact.css');
   ```

2. **Or delete the file**: Remove `css/livevote-compact.css` entirely.

## Technical Details

- **Specificity**: Uses `!important` flags to ensure overrides work without changing many other files.
- **Responsive Units**: Leverages modern CSS units (svh, dvh, dvw) for better viewport-relative scaling.
- **Compatibility**: Works with existing LV2 live vote system without breaking other layouts.
- **Performance**: No JavaScript required; pure CSS solution.

## Testing

When testing changes:

1. Open the live vote UI on both mobile (viewport < 480px) and laptop (viewport ~1280px)
2. Verify the Evict CTA is always visible and centered
3. Test with different player counts (2-4 nominees)
4. Ensure avatars and buttons remain tappable (minimum 44px tap targets)
5. Check safe area handling on devices with notches (iPhone X and newer)

## Related Files

- `css/livevote-compact.css` - This compact layout CSS
- `styles.css` - Main stylesheet that imports this file
- `css/livevote-voteoverlay.css` - Original LV2 vote overlay styles
- `css/livevote-rollout.css` - Voting in progress rollout overlay

## Maintenance

When updating the main LV2 styles, ensure the compact overrides still work as expected:

1. Run visual regression tests on mobile and laptop viewports
2. Verify CTA button remains visible in all scenarios
3. Check that new LV2 features are compatible with compact mode
