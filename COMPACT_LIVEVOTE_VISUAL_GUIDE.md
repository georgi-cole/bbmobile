# Compact Live Vote Layout - Visual Guide

## Problem Statement

**Before:** On mobile devices, the LV2 live vote overlay had excessive vertical spacing that pushed the Evict CTA button off-screen, requiring users to scroll to access it.

**After:** The compact layout reduces vertical spacing, centers the content, and ensures the Evict CTA remains visible and accessible on both mobile and laptop screens.

## Visual Changes

### Mobile Viewport (≤480px)

**Before:**
```
┌─────────────────────────┐
│                         │
│   Cast Your Vote        │
│                         │ ← Too much space
│                         │
│   ┌───┐     ┌───┐      │
│   │ A │     │ B │      │
│   └───┘     └───┘      │
│   Alice     Bob         │
│                         │
│                         │ ← Too much space
│                         │
│  [Evict Button] ← OFF SCREEN
└─────────────────────────┘
```

**After (Compact):**
```
┌─────────────────────────┐
│  Cast Your Vote         │ ← Reduced padding
│                         │
│  ┌───┐    ┌───┐        │ ← Smaller avatars
│  │ A │    │ B │        │
│  └───┘    └───┘        │
│  Alice    Bob           │
│                         │ ← Minimal gap
│  [Evict Button] ✓       │ ← VISIBLE
└─────────────────────────┘
```

### Laptop Viewport (≤1280px)

**Before:**
```
┌──────────────────────────────────────┐
│                                      │
│         Cast Your Vote               │
│                                      │
│                                      │ ← Excessive spacing
│    ┌─────┐            ┌─────┐      │
│    │  A  │            │  B  │      │
│    └─────┘            └─────┘      │
│    Alice Johnson      Bob Smith     │
│                                      │
│                                      │
│                                      │
│         [Evict Button]               │
└──────────────────────────────────────┘
```

**After (Compact):**
```
┌──────────────────────────────────────┐
│       Cast Your Vote                 │ ← Reduced padding
│                                      │
│   ┌────┐           ┌────┐           │ ← More compact
│   │ A  │           │ B  │           │
│   └────┘           └────┘           │
│   Alice Johnson    Bob Smith        │
│                                      │ ← Minimal gap
│       [Evict Button] ✓               │ ← Centered & visible
└──────────────────────────────────────┘
```

## Key CSS Changes

### 1. Panel Height Constraint
```css
max-height: 70svh !important;
```
Limits the panel to 70% of the small viewport height, preventing overflow.

### 2. Compact Avatar Sizing
```css
width: clamp(64px, 9dvw, 112px) !important;
height: clamp(64px, 9dvw, 112px) !important;
```
Scales avatars responsively between 64px (minimum tappable) and 112px (maximum).

### 3. Reduced Spacing
```css
gap: clamp(6px, 1.6dvh, 14px) !important;
```
Uses viewport-relative units for consistent spacing across devices.

### 4. Centered Layout
```css
justify-content: center !important;
align-items: center !important;
```
Ensures all content is centered horizontally and vertically.

### 5. Sticky CTA
```css
position: sticky !important;
bottom: calc(env(safe-area-inset-bottom, 12px) + 8px) !important;
```
Keeps the Evict button at the bottom of the panel, respecting device safe areas.

## Breakpoint Strategy

The compact layout activates at **max-width: 1280px**, which covers:

- **Mobile devices** (320px - 480px)
- **Tablets** (481px - 768px)
- **Small laptops** (769px - 1280px)

Devices wider than 1280px use the standard layout with more generous spacing.

## Accessibility Considerations

✓ **Tap target minimum:** All buttons maintain ≥40px height (meets WCAG 2.1 Level AAA)
✓ **Safe area handling:** Respects device notches and home indicators
✓ **Scrollable when needed:** Overflow-y: auto allows scrolling if content exceeds viewport
✓ **Touch-friendly:** -webkit-overflow-scrolling: touch for smooth scrolling on iOS

## Testing Checklist

- [ ] Mobile (375x667) - iPhone SE viewport
- [ ] Mobile (414x896) - iPhone 11 Pro viewport
- [ ] Tablet (768x1024) - iPad portrait
- [ ] Laptop (1280x800) - Small laptop
- [ ] Laptop (1440x900) - Standard laptop
- [ ] With 2 nominees (standard eviction)
- [ ] With 3 nominees (triple eviction)
- [ ] With 4 nominees (quad eviction)
- [ ] CTA always visible without scrolling
- [ ] Avatars remain tappable
- [ ] Layout stays centered

## Browser Compatibility

The CSS uses modern viewport units and features:

- `svh` (small viewport height) - Supported in Chrome 108+, Safari 15.4+, Firefox 101+
- `dvh` (dynamic viewport height) - Supported in Chrome 108+, Safari 15.4+, Firefox 101+
- `dvw` (dynamic viewport width) - Supported in Chrome 108+, Safari 15.4+, Firefox 101+
- `clamp()` - Supported in all modern browsers
- `env(safe-area-inset-*)` - Supported in Safari 11+, Chrome 69+

**Fallback:** Older browsers will ignore these rules and use the standard layout.

## Performance Impact

✅ **Minimal:** Pure CSS solution, no JavaScript required
✅ **No reflow:** Layout adjustments happen via media query at load time
✅ **No additional requests:** CSS is imported via @import in main stylesheet
✅ **Small file size:** ~3.5KB (unminified)

## Rollback Instructions

If the compact layout causes issues, it can be quickly disabled:

1. **Quick disable:** Comment out the import in `styles.css`:
   ```css
   /* @import url('css/livevote-compact.css'); */
   ```

2. **Permanent removal:** Delete both files:
   - `css/livevote-compact.css`
   - `css/README-livevote-compact.md`
   - Remove import from `styles.css`

## Related Documentation

- `css/README-livevote-compact.md` - Detailed technical documentation
- `css/livevote-voteoverlay.css` - Original LV2 overlay styles
- `css/livevote-rollout.css` - Voting in progress overlay
- `test_lv2_responsive_mobile.html` - Responsive layout test file
- `test_compact_livevote.html` - New compact layout test file
