# Eviction Result Modal System

## Overview

The Eviction Result Modal is a viewport-level modal system that displays eviction results in a centered, fully visible card that appears above all TV overlay content.

### Problem Solved

Previously, eviction results were displayed using the TV overlay card system (`global.showCard()`), which rendered cards inside the `#tvOverlay` container. This container has:
- Absolute positioning with `inset` constraints relative to `#tv`
- `z-index: 12` 
- Potential clipping by TV container boundaries

This caused eviction result cards to sometimes appear partially hidden or clipped, especially on mobile viewports or when the TV container had overflow constraints.

### Solution

The new modal system:
- Renders directly to `document.body` via a dedicated `#eviction-modal-root` container
- Uses `position: fixed` relative to the viewport (not the TV container)
- Has `z-index: 9000` to appear above all TV content
- Centers content with flexbox
- Escapes any parent stacking contexts

## Architecture

### Files

- **`src/ui/evictionModal.js`** - Core modal logic and API
- **`css/eviction-modal.css`** - Modal styling
- **`test_eviction_modal.html`** - Manual test harness
- **`tests/eviction-modal-screenshot.spec.js`** - Playwright screenshot test
- **`tests/screenshots/eviction-modal-centered.png`** - Reference screenshot

### Integration Points

The modal is integrated into the eviction flow in `js/eviction.js`:

1. **Standard evictions** (line ~990): Single player evicted
2. **Multi-nominee evictions** (line ~1096): Multiple nominees with vote breakdown
3. **Double/Triple evictions** (line ~1216): Multiple players evicted simultaneously

Each integration includes a fallback to the old `global.showCard()` system if the modal module is not loaded.

## API

### `window.EvictionModal.show(options)`

Display an eviction result modal.

**Parameters:**
- `options.title` (string) - Modal title (e.g., "Eviction Result")
- `options.lines` (string[]) - Array of text lines to display
- `options.duration` (number) - Auto-dismiss duration in ms (0 = manual close only). Default: 3800
- `options.tone` (string) - Visual tone: 'evict', 'warn', 'neutral'. Default: 'evict'

**Returns:** Promise that resolves when modal is dismissed

**Example:**
```javascript
await window.EvictionModal.show({
  title: 'Eviction Result',
  lines: ['By a vote of 5 to 2, Alice, you have been evicted.'],
  tone: 'evict',
  duration: 3800
});
```

### `window.EvictionModal.hide()`

Manually hide the current modal.

## Features

### Core Features
- ✅ Fixed positioning relative to viewport (not TV container)
- ✅ High z-index (9000) to appear above all content
- ✅ Flexbox centering with responsive layout
- ✅ Backdrop click to close
- ✅ ESC key to close
- ✅ Focus management (trap focus, restore on close)
- ✅ Auto-dismiss after specified duration
- ✅ Smooth fade-in/fade-out animations

### Accessibility
- ✅ ARIA attributes (`role="dialog"`, `aria-modal="true"`)
- ✅ Keyboard navigation (Tab to cycle, ESC to close)
- ✅ Focus trap within modal
- ✅ Screen reader announcements
- ✅ Visible focus indicators

### Responsive Design
- ✅ Mobile-first approach
- ✅ Safe-area insets for iOS notch
- ✅ Reduced motion support
- ✅ Light/dark theme support
- ✅ Viewport-adaptive sizing

### Visual Design
- ✅ Backdrop blur effect
- ✅ Theme-matching gradients and borders
- ✅ Tone variants (evict, warn, neutral)
- ✅ Smooth animations
- ✅ Matching card aesthetic from existing UI

## Testing

### Manual Testing

Open `test_eviction_modal.html` in a browser to test:

1. **Standard Eviction** - Single player with vote count
2. **Multi-Nominee Eviction** - Vote breakdown
3. **Double Eviction** - Multiple players
4. **Manual Close** - No auto-dismiss
5. **TV Container Trigger** - Verify escape from clipping
6. **Keyboard Navigation** - Tab/ESC handling

### Automated Testing with Playwright

#### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install chromium
```

#### Run Tests

Run screenshot test:
```bash
npx playwright test tests/eviction-modal-screenshot.spec.js --project=chromium
```

Run all modal tests:
```bash
npx playwright test tests/eviction-modal.spec.js --project=chromium
```

#### Regenerate Screenshot

The reference screenshot (`tests/screenshots/eviction-modal-centered.png`) can be regenerated:

```bash
# Delete old screenshot
rm tests/screenshots/eviction-modal-centered.png

# Run test to generate new one
npx playwright test tests/eviction-modal-screenshot.spec.js --project=chromium
```

The screenshot shows the modal:
- Centered in viewport
- Fully visible (not clipped)
- With proper backdrop blur
- Displaying eviction result message

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

### Fallback

If the modal module fails to load, the system falls back to the existing `global.showCard()` implementation automatically.

## Styling

### Theme Tokens

The modal uses existing CSS custom properties:
- `--card` - Card background base color
- `--bg` - Background color
- `--tv-safe-top/bottom/x` - Safe area insets

### Customization

To customize the modal appearance, edit `css/eviction-modal.css`:

- **Colors:** Modify gradient values in `.eviction-modal-card`
- **Sizing:** Adjust `max-width` and `padding`
- **Animation:** Edit `@keyframes` timing and effects
- **Backdrop:** Modify `.eviction-modal-backdrop` blur and opacity

## Performance Considerations

- Modal DOM elements are created on-demand
- Cleanup removes elements and event listeners on close
- Only one modal instance exists at a time
- Reduced motion mode disables animations for better performance
- Backdrop blur can be reduced on lower-end devices

## Future Enhancements

Possible improvements:
- [ ] Add vote meter animation
- [ ] Support player avatar images
- [ ] Add confetti effect for special evictions
- [ ] Support custom callbacks on close
- [ ] Add swipe-to-dismiss on mobile

## Troubleshooting

### Modal not showing

1. Check browser console for errors
2. Verify `src/ui/evictionModal.js` is loaded
3. Check if `window.EvictionModal` is defined
4. Ensure CSS file `css/eviction-modal.css` is loaded

### Modal appears behind content

1. Check z-index conflicts (modal uses 9000)
2. Verify parent containers don't have higher z-index
3. Check for stacking context issues

### Animations not working

1. Check if user has `prefers-reduced-motion` enabled
2. Verify CSS animations are not disabled
3. Check browser support for CSS animations

### Screenshot generation fails

1. Ensure http-server is not already running on port 8080
2. Install Playwright browsers: `npx playwright install chromium`
3. Check for permission issues in `tests/screenshots/` directory

## Related Documentation

- [TV Cards System](./TV_CARDS_MIGRATION_GUIDE.md) - Original card system
- [Eviction Flow](./EVICTION_FLOW_DIAGRAM.md) - Eviction sequence documentation
- [Accessibility](./ACCESSIBILITY.md) - Accessibility guidelines
