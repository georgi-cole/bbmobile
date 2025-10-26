# POV Carousel Picker Implementation

## Overview
This implementation adds a scroll-free, single-focus carousel picker for all POV ceremony flows (Golden, Diamond, and Standard). The carousel replaces the previous fullscreen grid/list pickers that showed large, non-scrollable lists on mobile/tablet.

## Problem Solved
- **Before**: POV ceremonies showed large non-scrollable lists that could extend off-screen on mobile, causing ceremonies to stall
- **After**: Single-focus carousel with left/right arrows ensures all players are reachable without scrolling

## Files Created

### Core Implementation
- **`js/ui/carousel-picker.js`**: Reusable carousel picker module
  - Promise-based API: `openCarouselPicker(options)`
  - Single-focus UI with one large avatar at a time
  - Left/right arrow buttons for navigation
  - Footer with Cancel + Confirm buttons
  - Keyboard support: Arrow keys, Enter, Esc, Home, End
  - Blocked player support (shown but disabled)

- **`css/carousel-picker.css`**: Styling for carousel picker
  - Full-screen overlay with dark backdrop
  - Responsive sizing (mobile/tablet/desktop breakpoints)
  - Circular arrow buttons with gradient styling
  - Large centered avatar (200px → 120px responsive)
  - Accessibility focus states
  - Smooth animations

### Integration
- **`js/veto.js`**: Updated POV ceremony flows
  - Golden POV: Carousel for save → Carousel for replacement
  - Diamond POV: Carousel for first nominee → Carousel for second nominee
  - Immediate badge updates after each selection
  - TV confirmation cards between steps
  - Cancel handling (returns to TV prompt without halting)

### Testing
- **`tests/verify_pov_carousel.mjs`**: Comprehensive test suite
  - 40 tests covering all aspects
  - Tests carousel existence, integration, CSS, accessibility
  - All tests passing ✓

### Demo
- **`demo_pov_carousel.html`**: Interactive visual demo
  - 4 scenarios: Golden save, Replacement, Diamond first, Large list
  - Mock player data for testing
  - Test keyboard navigation and blocked players

## API Reference

### `openCarouselPicker(options)`

Opens a full-screen carousel picker and returns a Promise.

**Parameters:**
```javascript
{
  ids: number[],           // Required: Array of player IDs to show
  title: string,           // Optional: Title text (default: "Make your choice")
  actionLabel: string,     // Optional: Confirm button label (default: "Confirm")
  startId: number,         // Optional: Initial player ID to focus
  blockIds: number[],      // Optional: Array of blocked player IDs (shown but disabled)
  onIndexChange: function  // Optional: Callback when carousel index changes
}
```

**Returns:**
```javascript
Promise<number|null>  // Selected player ID or null if cancelled
```

**Example:**
```javascript
const selectedId = await openCarouselPicker({
  ids: [1, 2, 3, 4, 5],
  title: 'Select replacement nominee',
  actionLabel: 'Nominate',
  blockIds: [1, 3]  // HOH and current nominee blocked
});

if (selectedId != null) {
  // Player selected
} else {
  // User cancelled
}
```

## UI Layout

```
┌─────────────────────────────────────┐
│                                     │
│        "Make your choice"           │  ← Title
│                                     │
│                                     │
│    ‹     [Large Avatar]      ›     │  ← Middle: Avatar + Arrows
│            [Name]                   │
│                                     │
│                                     │
│     [Cancel]      [Confirm]         │  ← Footer: Buttons
│            3 / 7                    │  ← Counter
│                                     │
└─────────────────────────────────────┘
```

## Keyboard Controls

| Key | Action |
|-----|--------|
| ← (Arrow Left) | Previous player |
| → (Arrow Right) | Next player |
| Enter | Confirm selection |
| Escape | Cancel (close picker) |
| Home | Jump to first player |
| End | Jump to last player |

## Golden POV Flow

1. **Decision**: TV prompt "Use POV?" → Yes
2. **Save Carousel**: Choose nominee to save (1 of 2)
   - Badge removed immediately
3. **TV Card**: "[Name] is safe"
4. **Replace Carousel**: Choose replacement nominee
   - Badge added immediately
   - Blocked: HOH, veto holder, saved player, current nominees
5. **TV Card**: "[Name] is now on the block"
6. **Continue**: Proceed to live vote

## Diamond POV Flow

1. **Decision**: TV prompt (auto-yes for Diamond)
2. **First Carousel**: Choose first replacement nominee
3. **Second Carousel**: Choose second replacement nominee
   - First nominee excluded from options
4. **Badges Updated**: Both badges applied immediately
5. **TV Card**: "[Names] are now on the block"
6. **Continue**: Proceed to live vote

## Responsive Breakpoints

### Desktop (>1024px)
- Avatar: 200px × 200px
- Arrows: 72px × 72px
- Title: 2rem
- Button padding: 14px 28px

### Tablet (768px-1024px)
- Avatar: 160px × 160px
- Arrows: 56px × 56px
- Title: 1.5rem

### Mobile (<768px)
- Avatar: 120px × 120px
- Arrows: 48px × 48px (touch-friendly)
- Title: 1.25rem
- Button padding: 12px 20px

## Accessibility Features

- **ARIA labels**: All interactive elements have descriptive labels
- **Role attributes**: Dialog role for overlay, button roles for controls
- **Focus management**: Proper focus trapping within carousel
- **Keyboard navigation**: Full keyboard support
- **Focus indicators**: Clear :focus outlines (3px solid)
- **Disabled states**: Clear visual feedback for blocked players

## Theme Integration

Uses existing CSS variables:
- `--text`: Text color
- `--accent`: Primary accent color (default: #3498db)
- `--danger`: Danger/blocked color (default: #e74c3c)

## Cancel Behavior

When user presses Escape or clicks Cancel:
1. Overlay closes with animation
2. Promise resolves with `null`
3. Ceremony returns to TV prompt
4. **Does not halt ceremony** - allows retry

## Testing

Run the test suite:
```bash
npm run test:pov-carousel
```

Expected output:
```
=== POV Carousel Picker Verification ===
Passed: 40
Failed: 0
✓ All tests passed!
```

Visual testing:
1. Open `demo_pov_carousel.html` in browser
2. Test each scenario button
3. Verify keyboard navigation (Arrow keys, Enter, Esc)
4. Test on mobile viewport
5. Verify blocked players show as disabled

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- iOS Safari 12+
- Android Chrome 80+
- Supports touch events for mobile
- Fallback avatar URLs (dicebear) if custom avatars fail

## Performance Considerations

- Single DOM render per navigation (no continuous updates)
- Minimal JavaScript execution
- CSS animations (hardware-accelerated)
- No memory leaks (proper cleanup on close)
- Event listener cleanup

## Future Enhancements

Potential improvements (not required):
- Swipe gestures for mobile (currently arrow tap only)
- Animation prefers-reduced-motion support
- Gamepad D-pad support
- Voice control integration
- Multi-select carousel for Diamond POV (instead of two sequential)

## Notes

- Old `showFullscreenNomineeSaveSelector` and `showFullscreenReplacementSelector` functions still exist in veto.js but are no longer called
- Final 4 shortcut remains intact (no carousel for F4)
- Replacement-picker.js (grid-based) still exists for backward compatibility
- TV cards are still used for confirmation between steps (not replaced)
- Carousel is the primary UI for all POV selections going forward
