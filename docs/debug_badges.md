# Mobile Roster Badge Diagnostics

This document describes the diagnostic tooling for investigating and fixing mobile roster badge rendering issues on iOS Safari and other mobile browsers.

## Overview

Recent observations on actual mobile devices (iPhone Safari, Chrome iOS) indicate that:
1. Player roster badges (status, role, XP level, ceremony markers) fail to render properly
2. Avatar borders render as unusually thick lines instead of subtle outlines

The diagnostics module provides instrumentation to identify which step in the badge rendering pipeline fails.

## Quick Start

### Enable Diagnostics

**Option 1: URL Parameter**
```
https://your-game-url/?debugBadges=1
```

**Option 2: JavaScript Console**
```javascript
window.game.cfg.debugBadges = true;
window.RosterBadgeDiagnostics.init();
```

**Option 3: Test Page**
Open `test_badges_mobile.html` in your browser.

### Toggle Debug Overlay
```javascript
window.RosterBadgeDiagnostics.toggleOverlay();
```

### Run Manual Diagnostic
```javascript
const results = window.RosterBadgeDiagnostics.runDiagnostic();
console.log(results);
```

## Diagnostic Features

### 1. On-Screen Overlay

When enabled, displays a floating panel showing:
- Device pixel ratio (DPR)
- Viewport dimensions
- Total badges / Visible badges / Badges with issues
- CSS variable resolution status
- Normalized border width

### 2. Console Logging

Grouped console logs showing:
- Badge lifecycle events (creation, style application, measurement)
- CSS variable resolution issues
- Fallback class applications
- Border width calculations

### 3. Debug CSS Stylesheet

When diagnostics are enabled, `css/debug_badges.css` is loaded which:
- Outlines all badges in contrasting colors (green for overlays, cyan for circular badges)
- Shows size data on badges via `::after` pseudo-elements
- Highlights problematic badges in red
- Applies DPR-specific border width clamping

### 4. Automatic Fallback Application

If a badge is detected as too small (< 4px) or invisible after 2 animation frames:
- The `.badge--force-visible` class is automatically applied
- This forces minimum dimensions and visibility

## Hypotheses Being Investigated

### H1: Race Condition
Badge DOM nodes created after a late feature-flag check and immediately measured before stylesheets fully loaded.

**Diagnostic Output:**
- Check `lastCheckTime` vs page load time
- Look for badges with `size_too_small` issue that later resolve

### H2: CSS Variable Scoping
CSS variables like `--badge-size` or `--avatar-border-width` not applied due to shadow DOM or missing `:root` selectors.

**Diagnostic Output:**
- `cssVariables.issues` array lists unresolved variables
- `cssVariables.vars` shows actual resolved values

### H3: Subpixel Rounding
Pixel ratio + transform scaling causing subpixel rounding → elements rounding to zero height/width.

**Diagnostic Output:**
- Compare `width`/`height` with `clientWidth`/`clientHeight`
- Check `transform` computed style value

### H4: IntersectionObserver/ResizeObserver
Badges deferred until scroll that never triggers on small viewports.

**Diagnostic Output:**
- Badges visible after scroll = likely IO issue
- Check `display: none` in badge issues

### H5: Asset Preloading
Badge SVG/PNG sprites blocked by synchronous script; fallback path hides badges.

**Diagnostic Output:**
- Badge content shows but with wrong/missing icon
- Check network tab for blocked requests

### H6: Mobile Media Query Override
A mobile-only media query setting `display:none` or incorrect `calc()` border-width.

**Diagnostic Output:**
- `display_none` in badge issues
- Compare computed styles at different breakpoints

### H7: MutationObserver Cleanup
Badges removed after insertion due to mismatched class names.

**Diagnostic Output:**
- Badge count drops after initial render
- Check DOM mutation observer logs

## API Reference

### `RosterBadgeDiagnostics`

#### Methods

| Method | Description |
|--------|-------------|
| `init()` | Initialize diagnostics (auto-runs if enabled) |
| `disable()` | Disable diagnostics and cleanup |
| `runDiagnostic()` | Run full diagnostic and return results object |
| `toggleOverlay()` | Show/hide debug overlay |
| `showOverlay()` | Show debug overlay |
| `hideOverlay()` | Hide debug overlay |
| `collectBadgeMetrics()` | Get metrics for all badges |
| `collectAvatarMetrics()` | Get metrics for avatar containers |
| `checkCSSVariables()` | Check CSS variable resolution |
| `normalizeAvatarBorderWidth()` | Apply DPR-adjusted border width |
| `checkAllBadgesAndApplyFallbacks()` | Apply fallback class to problematic badges |
| `getState()` | Get current diagnostic state |

#### Diagnostic Result Object

```javascript
{
  timestamp: "2024-01-15T12:00:00.000Z",
  dpr: 2,
  viewport: { width: 375, height: 812 },
  cssVariables: {
    vars: {
      "--badge-size": "28px",
      "--avatar-border-width": "1px",
      // ... other variables
    },
    issues: [] // Array of unresolved variable names
  },
  badgeMetrics: [
    {
      index: 0,
      playerId: "1",
      isOverlay: true,
      width: 48,
      height: 16,
      display: "flex",
      visibility: "visible",
      opacity: "1",
      transform: "none",
      classList: ["mobile-roster-badge-overlay", "hoh"],
      textContent: "HOH",
      issues: []
    },
    // ... more badges
  ],
  avatarMetrics: [
    {
      index: 0,
      playerId: "1",
      borderWidth: "1px",
      borderColor: "rgb(45, 66, 88)",
      width: 80,
      height: 80
    },
    // ... more avatars
  ],
  normalizedBorderWidth: 1
}
```

## Reproduction Steps

### Desktop (Emulation)
1. Open Chrome DevTools
2. Enable Device Toolbar (Ctrl+Shift+M)
3. Select iPhone 12/13/14 Pro
4. Navigate to `test_badges_mobile.html`
5. Run diagnostics

**Note:** Desktop emulation often shows correct rendering. Real device testing required.

### Real iPhone
1. Connect iPhone to Mac
2. Open Safari on iPhone
3. Navigate to test page (local server or deployed URL)
4. Open Safari DevTools on Mac (Develop > iPhone)
5. Check Console for diagnostic logs
6. Observe on-screen overlay

### Android Chrome
1. Enable USB debugging
2. Open `chrome://inspect` on desktop Chrome
3. Navigate to test page on mobile
4. Remote debug via DevTools

## CSS Variable Fallbacks

The diagnostic CSS includes fallback values for critical variables:

```css
@media (max-width: 768px) {
  :root {
    --badge-size-fallback: 28px;
    --badge-font-size-fallback: 0.58rem;
    --avatar-border-width-fallback: 1px;
  }
}
```

## Border Width Normalization

The module automatically normalizes avatar border width based on DPR:

| DPR | Base Width | Adjusted Width |
|-----|-----------|----------------|
| 1x  | 2px       | 2px            |
| 2x  | 2px       | 1px            |
| 3x  | 2px       | 0.67px         |

This prevents thick borders on high-DPR devices.

## Next Steps (Future PR)

Based on diagnostic findings:

1. **Consolidate Style Application**
   - Move all badge styling into a single layout commit
   - Ensure styles are applied before any measurement

2. **Virtual Layout Buffer**
   - Migrate badge rendering to off-screen buffer
   - Measure and adjust before DOM insertion

3. **Asset Preloading**
   - Ensure badge sprites/icons are preloaded before roster renders

4. **Remove Problematic Media Queries**
   - Identify and fix any media queries causing badge hiding

## Troubleshooting

### Overlay Not Appearing
- Check console for JavaScript errors
- Verify `debugBadges` is enabled
- Try calling `RosterBadgeDiagnostics.showOverlay()` manually

### All Badges Show Issues
- Check if CSS is loaded (`styles.css`, `mobileRoster.css`)
- Verify CSS variables are defined in `:root`
- Check for conflicting styles in browser DevTools

### Border Still Thick
- Check if `--avatar-border-width-normalized` is being set
- Verify no `!important` overrides in other stylesheets
- Test with debug CSS disabled

## Files

| File | Purpose |
|------|---------|
| `js/debug/rosterBadgeDiagnostics.js` | Main diagnostic module |
| `css/debug_badges.css` | Debug stylesheet with outlines and fallbacks |
| `test_badges_mobile.html` | Test page for badge rendering |
| `docs/debug_badges.md` | This documentation file |

## Related Files

- `js/ui/mobileRoster.js` - Mobile roster implementation
- `css/mobileRoster.css` - Mobile roster styles
- `test_mobile_badges.html` - Existing badge test page
