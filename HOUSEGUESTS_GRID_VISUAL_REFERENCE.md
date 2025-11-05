# Houseguests Grid & TV HUD Visual Reference

This document describes the visual layout and design of the houseguests grid and TV HUD implementation.

## Layout Overview

```
┌─────────────────────────────────────┐
│  🔴 Skip        Timer 00:15         │ ← TV HUD Top Bar
├─────────────────────────────────────┤
│                                     │
│   ┌───┬───┬───┬───┐                │
│   │HOH│   │NOM│   │ ← Row 1        │
│   │Ari│ Ash│Bea│Blu│                │
│   └───┴───┴───┴───┘                │
│   ┌───┬───┬───┬───┐                │
│   │   │   │   │   │ ← Row 2        │ 4×4 Grid
│   │Dex│Ech│Fin│ Ivy│                │ (16 players)
│   └───┴───┴───┴───┘                │
│   ┌───┬───┬───┬───┐                │
│   │   │   │   │   │ ← Row 3        │
│   │Jax│Kai│Lux│Mim│                │
│   └───┴───┴───┴───┘                │
│   ┌───┬───┬───┬───┐                │
│   │   │   │ X │   │ ← Row 4        │
│   │Nic│Nov│Qui│Ril│                │
│   └───┴───┴───┴───┘                │
│        (Nova = Evicted)             │
│                                     │
├─────────────────────────────────────┤
│ Players ━━━━━━━━━━━━━━━━━━ 88%     │
│          15 / 16                    │ ← Progress Bar
├─────────────────────────────────────┤
│ Season 1 │ Week 3    │ LIVE SHOW   │ ← Info Row
└─────────────────────────────────────┘
```

## Component Details

### Houseguests Grid Cards

Each card (at 375px viewport, ~82px × 82px):

```
┌────────────────┐
│ HOH NOM ←Pills │ ← Top-right corner badges
│                │
│    [Avatar]    │ ← Full-card avatar image
│                │
│                │
├────────────────┤
│   Player Name  │ ← Bottom overlay with gradient
└────────────────┘
```

**Status Indicators:**
- **HOH (Gold)**: Yellow border ring (3px) + "HOH" pill (gold background, black text)
- **NOM (Red)**: Red border ring (3px) + "NOM" pill (red background, white text)
- **HOH + NOM**: Split diagonal border (gold/red gradient) + both pills stacked
- **Evicted**: Grayscale filter + 40% opacity + strikethrough name + non-interactive

**Interaction:**
- Tap/Click: Triggers `onTap` callback (e.g., show profile)
- Long-press (500ms): Triggers `onLongPress` callback (e.g., show actions menu)

### TV HUD Components

#### Top Bar (Absolute positioned)
- **Skip Button** (top-left)
  - Red gradient background (#ff4d4d)
  - Uppercase "SKIP" text
  - White border, rounded corners
  - Hover: brightens and lifts slightly

- **Timer** (top-right)
  - Semi-transparent dark background
  - Monospace font (tabular-nums)
  - Format: MM:SS (e.g., "01:23")
  - Updates every second

#### Bottom Bar (Absolute positioned)

**Players Progress Bar:**
```
┌───────────────────────────────────┐
│ PLAYERS                           │ ← Label (uppercase, small)
├───────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░              │ ← Fill bar (teal)
├───────────────────────────────────┤
│           15 / 16                 │ ← Count (center aligned)
└───────────────────────────────────┘
```

**Info Row:**
```
┌────────────────────────────────────────┐
│ Season 1 │ Week 3     │  LIVE SHOW    │
│  (pill)  │  (pill)    │   (label)     │
└────────────────────────────────────────┘
```

- Season/Week: Semi-transparent pills with teal accent numbers
- Mode: Right-aligned, uppercase, teal color, larger font

### Responsive Breakpoints

**375px (iPhone 7):**
- Grid gap: 8px
- Card size: ~82px × 82px
- Font sizes: Name 11px, Pills 9px
- HUD padding: 8px

**390px (iPhone 12/13 mini):**
- Grid gap: 10px
- Card size: ~86px × 86px
- Font sizes: Name 12px, Pills 10px
- HUD padding: 12px

**414px (iPhone 11/XR):**
- Grid gap: 10px
- Card size: ~94px × 94px
- Font sizes: Name 12px, Pills 10px
- HUD padding: 12px

**768px+ (Tablet/Desktop):**
- Grid max-width: 450px (centered)
- Grid gap: 12px
- Larger fonts and padding

### Color Palette

**Dark Theme (default):**
- Background: `#0b121a` (TV surface)
- Card BG: `rgba(20, 35, 55, 0.9)`
- Text: `#e8f4ff`
- HOH: `#ffd700` (gold)
- NOM: `#ff4444` (red)
- Accent: `#00e0cc` (teal)
- Border: `rgba(143, 211, 255, 0.15)`

**Light Theme:**
- Background: `#11151b`
- Card BG: `rgba(240, 245, 250, 0.95)`
- Text: `#0a1018`
- (Status colors remain vibrant)

### States and Animations

**Hover (non-evicted cards):**
- Lift up 2px: `transform: translateY(-2px)`
- Soft glow shadow: `box-shadow: 0 4px 12px rgba(0, 224, 204, 0.2)`

**Active (tap/press):**
- Returns to baseline: `transform: translateY(0)`

**Long-press:**
- No visual change during hold
- Callback fires after 500ms
- Prevents context menu on mobile

**HUD Busy State:**
- `.is-hidden` class added
- Fades to `opacity: 0`
- Maintains DOM presence
- Transition: 300ms ease

**Progress Bar Fill:**
- Smooth width transition: 400ms ease
- Teal glow: `box-shadow: 0 0 8px rgba(0, 224, 204, 0.5)`

### Accessibility

**Keyboard Navigation:**
- Cards are not keyboard-focusable (pointer/touch only)
- Skip button: Tab-accessible, Enter/Space to activate

**Screen Readers:**
- Semantic HTML structure
- Alt text on avatar images
- ARIA labels in HUD (handled by component)

**Touch Targets:**
- Minimum 44×44px touch area (cards exceed this)
- Adequate spacing between cards (8-12px gap)

### CSS Namespacing

**Grid:** All classes prefixed with `hg-*`
- `.hg-grid` (container)
- `.hg-card` (individual card)
- `.hg-card__avatar`, `.hg-card__name`, `.hg-card__pills`, `.hg-card__pill`
- `.hg-card--hoh`, `.hg-card--nom`, `.hg-card--evicted` (modifiers)

**HUD:** All classes prefixed with `tv-*`
- `.tv-hud` (container)
- `.tv-hud__top`, `.tv-hud__bottom` (sections)
- `.tv-hud__skip`, `.tv-hud__timer` (controls)
- `.tv-hud__players`, `.tv-hud__players-bar`, `.tv-hud__players-fill`
- `.tv-hud__info`, `.tv-hud__meta`, `.tv-hud__pill`, `.tv-hud__mode`
- `.is-hidden` (state modifier)

### Browser Compatibility

**Minimum Requirements:**
- ES6 modules support
- CSS Grid
- CSS Custom Properties (variables)
- Pointer Events API
- Modern flex/grid layout

**Tested Browsers:**
- Chrome/Edge 90+
- Safari 14+
- Firefox 88+
- Mobile Safari iOS 14+
- Chrome Mobile Android 90+

## Example Screenshots (Generated by CI)

When the GitHub Actions workflow runs, it will generate:

1. **houseguests_grid_375x667.png** - iPhone 7 view
2. **houseguests_grid_390x844.png** - iPhone 12/13 mini view
3. **houseguests_grid_414x896.png** - iPhone 11/XR view

These will be available as PR artifacts for visual review.

## Testing the Implementation

### Manual Testing

1. Open `test_houseguests_grid_tv_hud.html` in a browser
2. Resize viewport to target widths (375px, 390px, 414px)
3. Test interactions:
   - Click cards to see tap callback
   - Hold cards (500ms) to see long-press callback
   - Click Skip button
   - Use control panel to:
     - Toggle HUD busy state
     - Increment timer
     - Toggle player status (HOH/NOM)
     - Evict players
     - Reset all
4. Verify visual appearance at each breakpoint

### Automated Testing

```bash
# Generate screenshots
npm run screenshot:houseguests

# Check output
ls -l screenshots/houseguests_grid_*.png
```

### Visual Checklist

- [ ] All 16 houseguests visible in 4×4 grid
- [ ] HOH pill visible with gold styling
- [ ] NOM pills visible with red styling
- [ ] Status rings correctly colored
- [ ] Evicted player is grayscale and non-interactive
- [ ] Names truncate with ellipsis if too long
- [ ] Skip button in top-left corner
- [ ] Timer displays MM:SS format in top-right
- [ ] Players bar shows fill percentage
- [ ] Season/Week pills display correctly
- [ ] Mode label is uppercase and right-aligned
- [ ] Busy state fades HUD when activated
- [ ] Responsive at all three target viewports
- [ ] Touch targets are adequately sized
- [ ] No layout shift or overflow

## Integration Notes

See `HOUSEGUESTS_GRID_INTEGRATION.md` for detailed integration examples and API documentation.

### Key Points

- **Non-breaking**: All changes are additive
- **Isolated**: CSS uses namespaced classes
- **Flexible**: Easy to integrate into existing TV containers
- **Accessible**: Proper semantic HTML and touch targets
- **Performant**: Minimal DOM manipulation, CSS-driven animations
- **Responsive**: Mobile-first with progressive enhancement
