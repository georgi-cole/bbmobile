# TV-Centered Nomination Cards Implementation

## Overview
This implementation centers all non-fullscreen nomination ceremony cards visually over the TV background with a dynamic vertical bias that aligns cards with the "stage eye" position. Additionally, the fullscreen selector UI has been refined with concise guidance and proper theme inheritance.

## Key Features

### 1. Perfect TV-Relative Centering with Vertical Bias
All nomination ceremony cards (intro, summary, reactions, adjourn, fallback) are now centered with a vertical bias to align with the stage eye:

- **Dynamic Bias Calculation**: 
  - Portrait mobile (width < 600px): ~8% upward bias
  - Landscape/desktop: ~4% upward bias
  - Calculated based on TV height for responsive behavior

- **Override Support**:
  ```javascript
  // Set bias as ratio (8% of TV height)
  window.__tvCenterBiasY = 0.08;
  
  // Set bias as fixed pixels
  window.__tvCenterBiasY = '50px';
  ```

- **CSS Implementation**:
  ```css
  .nfs-stage {
    transform: translateY(calc(-1 * var(--tv-center-bias, 0px)));
  }
  ```

### 2. Fullscreen Selector UI Refinements

**Header Improvements:**
- Live count display: "0 / 2 selected"
- Guidance text: "(Choose 2)" / "(Choose 3)" / "(Choose 4)"
- Optional legend showing Ally (green) and Enemy (red) markers

**Button Update:**
- Changed from "CONFIRM NOMINATIONS" to simply "Confirm" for better mobile UX

**Example:**
```
┌─────────────────────────────────────┐
│  0 / 2 selected  (Choose 2)        │
│  ◯ Ally    ◯ Enemy                 │
└─────────────────────────────────────┘
```

### 3. Dynamic Grid Density

The grid automatically adjusts tile size and avatar radius based on the number of eligible players:

| Player Count | Column Width | Avatar Size |
|-------------|--------------|-------------|
| ≤ 6         | 160px        | 84px        |
| ≤ 9         | 140px        | 72px        |
| ≤ 12        | 120px        | 64px        |
| ≤ 18        | 110px        | 60px        |
| > 18        | 100px        | 56px        |

CSS variables (`--nfs-mincol`, `--nfs-avatar`) are set dynamically on the overlay element.

### 4. Theme Inheritance

All UI elements derive colors from theme CSS variables with safe fallbacks:

```css
/* Examples */
background: var(--card, #1e293b);
color: var(--fg, #f1f5f9);
border: 2px solid var(--sep, #475569);
color: var(--fg-muted, #94a3b8);
background: var(--ok, #4ade80);
```

### 5. Ally/Enemy Visual Indicators

Players are classified based on their relationship to the HOH:

**Classification Logic:**
1. Check if in same alliance (green ring)
2. Check affinity score:
   - > 0.15: Ally (green)
   - < -0.15: Enemy (red)
3. Check areEnemies function if available

**Visual Design:**
- Ally: Green ring `rgba(74, 222, 128, 0.5)` with glow
- Enemy: Red ring `rgba(248, 113, 113, 0.5)` with glow
- Aria-labels include relation for screen readers

### 6. Bias Recomputation

The vertical bias recalculates on every card show operation:
- Intro card: bias computed when shown
- Summary card: bias computed when shown
- Adjourn card: bias computed when shown
- Fallback cards: bias computed when shown

This ensures orientation changes are handled automatically without requiring explicit resize listeners.

## Files Modified

### `js/nominations-grid-fullscreen.js`
**New Function:**
```javascript
function computeTvCenterBiasPx(host) {
  // Handles override
  if (typeof global.__tvCenterBiasY !== 'undefined') { ... }
  
  // Calculate default bias
  const isPortrait = vh > vw;
  const biasRatio = isPortrait && vw < 600 ? 0.08 : 0.04;
  const biasPixels = Math.round(tvHeight * biasRatio);
  return `${biasPixels}px`;
}
```

**Modified Functions:**
- `showCenteredCard()`: Computes and applies bias
- `showSummaryCard()`: Computes and applies bias
- `showAdjournCard()`: Computes and applies bias
- `showFullscreenSelector()`: Updated header with guidance text

**CSS Changes:**
- Added `.nfs-stage` transform for bias
- Added `.noms-fs-guidance` styles for guidance text
- Updated `.noms-fs-count` to use flexbox layout

### `js/nominations.js`
**Modified Section:**
- Fallback human HOH intro card now computes bias
- Applied same transform logic as fullscreen module

## Testing

### Automated Tests
**File:** `verify_tv_centering.mjs`
- 50 automated checks covering all features
- Verifies bias computation, UI improvements, accessibility
- All tests pass ✅

### Manual Tests
**File:** `test_nomination_tv_centering.html`
- Interactive test harness with visual TV reference
- Buttons to test individual card types
- Bias override controls for testing different scenarios
- Real-time bias info display

### Test Scenarios
1. ✅ Portrait mobile: Cards center with 8% bias
2. ✅ Landscape/desktop: Cards center with 4% bias
3. ✅ Twist modes (2/3/4 nominees): Guidance text updates
4. ✅ Large eligible pool (>=18): Grid scales down appropriately
5. ✅ Bias override: `window.__tvCenterBiasY` works correctly
6. ✅ Ally/enemy coloring: Rings and aria-labels applied

## Accessibility

All existing accessibility features are preserved:
- **Aria-live count**: Updates announced to screen readers
- **Keyboard navigation**: Arrow keys wrap around grid
- **Enter/Space**: Toggle tile selection and confirm
- **Escape/Backspace**: Intentionally blocked (ceremony must complete)
- **Reduced motion**: CSS respects `prefers-reduced-motion`
- **High contrast**: CSS respects `prefers-contrast: high`
- **Focus indicators**: Clear visual focus states
- **Semantic HTML**: Proper role and aria attributes

## API Surface

The public API remains unchanged:

```javascript
// Open selector directly
NomsFS.open().then(selections => { ... });

// Show intro card
NomsFS.showIntro().then(success => { ... });

// Get debug info
NomsFS.debug();
```

## Backwards Compatibility

- All changes are additive and non-breaking
- Fallback path maintained for when fullscreen module is not loaded
- No changes to nomination logic or game state management
- Legacy map and integration points unchanged

## Performance

- Bias calculation is lightweight (simple math operations)
- CSS transforms are GPU-accelerated
- No additional event listeners on window resize
- Cards recompute bias on-demand, not continuously

## Browser Support

- Modern browsers with CSS custom properties support
- CSS `calc()` function required
- `transform: translateY()` support required
- Falls back gracefully if CSS variables not supported

## Security

- CodeQL analysis: 0 alerts ✅
- No external dependencies added
- No XSS vulnerabilities introduced
- Input validation preserved

## Future Enhancements

Potential improvements for future iterations:
1. Animate bias changes on orientation change
2. Add visual indicator showing bias value in debug mode
3. Support different bias values for specific ceremony types
4. Add bias presets for different devices/screen sizes

## Troubleshooting

**Cards not centering correctly:**
- Check that `#tv` has `position: relative`
- Verify `--tv-center-bias` is set on `#tvOverlay`
- Check browser console for bias calculation logs

**Bias override not working:**
- Ensure `window.__tvCenterBiasY` is set before card is shown
- Value must be number (ratio) or string ending in 'px'
- Check browser console for override detection logs

**Guidance text not showing:**
- Verify fullscreen module is loaded after nominations.js
- Check that interceptor is installed (see console logs)
- Confirm NomsFS.debug() shows proper state

## References

- Problem Statement: See issue description
- Test File: `test_nomination_tv_centering.html`
- Verification Script: `verify_tv_centering.mjs`
- Related Files:
  - `js/nominations-grid-fullscreen.js`
  - `js/nominations.js`
  - `styles.css` (existing TV overlay styles)
