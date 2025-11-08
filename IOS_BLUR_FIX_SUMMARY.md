# iOS Safari Blur Ghosting Fix

## Problem

On iOS Safari, when scrolling the Social Phase card in the mobile feed (`#panel`), a semi-transparent blurred layer ("blur curtain") sometimes remains stuck over the Social Phase module until the user scrolls again. This is a known iOS/Safari compositing quirk with `backdrop-filter` elements inside nested scroll containers.

## Root Cause

1. **Social card surfaces** use `backdrop-filter: blur(16px)` for glass effect:
   - `.socialize-hud`, `.socialize-card`, `.social-live-card`, `[data-sm-social-card]`
   - Defined in `socialize-mobile.css` lines 53-68

2. **Nested scroll container** on mobile:
   - `#panel` has `overflow: auto; -webkit-overflow-scrolling: touch`
   - Defined in `mobile_version3.css` line 17

3. **iOS Safari bug**: Can "ghost" backdrop-filter layers during scroll inside nested overflow containers, leaving a blur "curtain" until a repaint is triggered.

## Solution

Two-layer CSS-only approach in `socialize-mobile.css` (lines 1041-1072):

### 1. Compositing Guard (Lines 1047-1059)

Applies to all Social card surfaces to promote them to their own GPU layer and ensure proper clipping:

```css
.socialize-hud,
.socialize-card,
.social-live-card,
[data-sm-social-card] {
  position: relative;          /* establish containing block */
  isolation: isolate;          /* clip composited descendants */
  contain: paint;              /* limit paint to this element */
  will-change: transform;      /* promote to its own layer */
  -webkit-transform: translateZ(0); /* force GPU compositing on iOS */
  -webkit-backface-visibility: hidden;
  z-index: 2;                  /* ensure above adjacent backgrounds */
}
```

### 2. iOS-Only Fallback (Lines 1061-1072)

If the compositing guard isn't sufficient, disable blur inside the nested scroll container on iOS mobile devices:

```css
@supports (-webkit-touch-callout: none) {
  @media (max-width: 768px) {
    #panel .socialize-hud,
    #panel .socialize-card,
    #panel .social-live-card,
    #panel [data-sm-social-card] {
      -webkit-backdrop-filter: none !important;
      backdrop-filter: none !important;
    }
  }
}
```

**Why this is safe:**
- Only targets iOS devices via `@supports (-webkit-touch-callout: none)`
- Only applies on mobile screens (≤ 768px)
- Only affects Social cards inside `#panel` (the nested scroller)
- Glass effects preserved in `#tvOverlay` and on desktop

## Testing

### Automated Tests
✅ All tests passing (no regressions)

### Manual Testing Required
**iOS Safari (iPhone 12/13/14, iOS 16-18):**
1. Start a social phase and render the Social card in the main feed
2. Scroll the feed so the Social card enters/leaves the viewport repeatedly
3. Verify no persistent blur curtain remains stuck
4. Verify the Social card still looks correct (with guard), or renders without blur but with gradient/border (if fallback triggers)

**Android Chrome (Pixel devices):**
1. Verify glass effects remain intact
2. Verify no visual regressions

**Desktop browsers:**
1. Verify no changes in behavior or appearance

## Files Modified

- `socialize-mobile.css`: Added 33 lines (1041-1072)

## References

- **Problem statement**: GitHub issue with screenshots showing the blur curtain bug
- **Original backdrop-filter**: `socialize-mobile.css` lines 61-62
- **Nested scroll container**: `mobile_version3.css` line 17
- **Related overlays with backdrop-filter**:
  - Event modal: `js/ui.event-modal.js` lines 88-113
  - Confirm modal: `js/ui.confirm-modal.js` lines 38-61

## Future Considerations

If edge cases remain on specific iOS versions, we can refine by:
1. Limiting the fallback to specific Mobile Safari engine versions via UA test
2. Adding a more aggressive repaint trigger (e.g., `translateZ(0.001px)` animation)
3. Considering a JavaScript-based scroll event listener to force repaints (not recommended due to performance)

Current implementation keeps it CSS-only and device-agnostic for maximum compatibility and minimal performance impact.
