# Background Theme Enhancement Implementation

## Overview

This document describes the enhancement of the `BackgroundTheme` module to fix namespace mismatches, add telemetry integration, implement manual override functionality, and improve geolocation handling.

## Problem Statement

The original implementation exported the API only to `window.BackgroundTheme`, while consuming modules (like `IntroScreen.js`) expected to find it at `window.game.BackgroundTheme`. This caused the intro screen to always fall back to `daily-background.png` instead of using the adaptive theme system.

## Solution

### 1. Dual Namespace Export

The module now exports to both namespaces:
- `window.BackgroundTheme` (primary export)
- `window.game.BackgroundTheme` (alias)

The alias is established through:
- An internal `ensureAlias()` function called on module load
- A delayed re-establishment (100ms) to handle GameGuard property merges
- A bridging script in `index.html` that retries alias creation if needed

### 2. Enhanced API

#### New Methods

**`manualOverride(key)`**
- Manually sets a specific theme immediately
- Useful for testing and debugging
- Emits telemetry event `bg_manual_override`
- Returns the theme data object or null if invalid key

Example usage:
```javascript
window.game.BackgroundTheme.manualOverride('sunset');
// Immediately switches to sunset background
```

Valid theme keys:
- `sunrise`, `day`, `sunset`, `night`
- `rain`, `snow`
- `xmasDay`, `xmasy`, `xmasyNight`

#### Enhanced Existing Methods

**`init(options)`**
- Now logs `bg_init` telemetry event
- Tries multiple sources for event bus: `options.bus`, `g.bbGameBus`, `g.game.bus`

**`updateTheme(force)`**
- Now logs `bg_update` telemetry event with theme, reason, and adaptive status
- Implements geolocation retry logic (up to 2 attempts)
- 1-second delay between retry attempts

**`setAdaptive(enabled)`**
- Now logs `bg_adaptive_toggle` telemetry event

### 3. Telemetry Integration

The module now emits telemetry events for all major operations:

| Event | Data | Description |
|-------|------|-------------|
| `bg_init` | `{ adaptiveEnabled }` | Module initialized |
| `bg_update` | `{ theme, reason, adaptiveEnabled }` | Theme changed |
| `bg_manual_override` | `{ key }` | Manual override applied |
| `bg_adaptive_toggle` | `{ enabled }` | Adaptive setting changed |
| `bg_geolocation_attempt` | `{ attempt, success, reason? }` | Geolocation requested |
| `bg_weather_fetch` | `{ success, rain?, snow?, hasSolarData? }` | Weather data fetched |

Telemetry uses `window.Telemetry.log()` if available, otherwise falls back to console logging.

### 4. Geolocation Retry Logic

The module now attempts geolocation up to 2 times:
1. First attempt on initial theme update
2. Second attempt after 1-second delay if first fails
3. Each attempt is tracked and logged via telemetry

This improves the chances of getting user location for weather-based theming.

### 5. Alias Bridging Script

A new inline script in `index.html` (inserted after `backgroundTheme.js` loads) ensures the alias is established:

```javascript
(function bridgeBackgroundTheme() {
  // Retries up to 20 times (50ms intervals)
  // Creates window.game.BackgroundTheme alias
  // Logs success/failure
})();
```

This provides redundancy in case the module's internal `ensureAlias()` doesn't execute in time.

## Testing

### Automated Tests

A new test script validates the module structure:

```bash
npm run test:background-theme
```

Tests include:
- Function definitions (init, getCurrent, updateTheme, setAdaptive, manualOverride)
- Telemetry event names
- Export patterns
- Geolocation retry logic
- JSDOM simulation of browser environment

### Manual Testing

A comprehensive test page is available:

**`test_background_theme_enhanced.html`**

Features:
- Automated tests that run on page load
- Manual override buttons for all theme keys
- Adaptive toggle controls
- Live telemetry event log
- Current theme display with preview image
- API documentation

## Usage Examples

### Basic Initialization (IntroScreen)

```javascript
// IntroScreen.js already uses this pattern
if (g.BackgroundTheme && typeof g.BackgroundTheme.getCurrent === 'function') {
  const theme = g.BackgroundTheme.getCurrent();
  if (theme && theme.url) {
    bgElement.style.backgroundImage = `url(${theme.url})`;
  }
}
```

### Manual Override for Testing

```javascript
// Test sunset background
window.game.BackgroundTheme.manualOverride('sunset');

// Test snow background
window.BackgroundTheme.manualOverride('snow');
```

### Toggle Adaptive Backgrounds

```javascript
// Disable adaptive backgrounds (freezes current theme)
window.BackgroundTheme.setAdaptive(false);

// Re-enable adaptive backgrounds
window.BackgroundTheme.setAdaptive(true);
```

### Force Theme Update

```javascript
// Force immediate theme update (bypasses throttle)
window.BackgroundTheme.updateTheme(true);
```

## Implementation Files

### Modified Files
1. **`src/utils/backgroundTheme.js`**
   - Added `logTelemetry()` helper
   - Added `ensureAlias()` function
   - Added `manualOverride()` API
   - Enhanced `updateTheme()` with retry logic
   - Enhanced all methods with telemetry
   - Modified export to use both namespaces

2. **`index.html`**
   - Added bridging script after `backgroundTheme.js`
   - Script retries alias creation with timeout

3. **`package.json`**
   - Added `test:background-theme` script
   - Updated `test:all` to include background theme test

### New Files
1. **`scripts/test-background-theme.mjs`**
   - Automated structure and export validation
   - JSDOM-based browser simulation

2. **`test_background_theme_enhanced.html`**
   - Interactive test page
   - Manual override controls
   - Telemetry event viewer

3. **`BACKGROUND_THEME_ENHANCEMENT.md`** (this file)
   - Implementation documentation

## Acceptance Criteria Met

✅ **Namespace Export**: Both `window.BackgroundTheme` and `window.game.BackgroundTheme` exist and are accessible

✅ **Alias Stability**: Alias maintained even after GameGuard merges via `ensureAlias()` and bridging script

✅ **Manual Override**: `manualOverride(key)` API allows immediate theme changes for testing

✅ **Telemetry Integration**: All major operations emit telemetry events

✅ **Geolocation Retry**: Up to 2 attempts with 1-second delay between attempts

✅ **Error Recovery**: Graceful fallback when geolocation/weather APIs fail

✅ **IntroScreen Integration**: IntroScreen now receives correct theme URL from `window.game.BackgroundTheme`

✅ **Automated Tests**: New test validates module structure and exports

✅ **Documentation**: This document provides comprehensive usage guide

## Browser Console Verification

After loading the page, you should see these console logs:

```
[BackgroundTheme] Exported to window.BackgroundTheme
[BackgroundTheme] Alias established: window.game.BackgroundTheme -> window.BackgroundTheme
[BackgroundThemeBridge] Aliased window.BackgroundTheme to window.game.BackgroundTheme
[BackgroundTheme] Initialized (adaptive: true)
[BackgroundTheme] Theme updated: {key: "day", url: "assets/skins/daily-background.png", ...}
```

And telemetry events:
```
[Telemetry] bg_init {adaptiveEnabled: true}
[Telemetry] bg_update {theme: "day", reason: "time-of-day (day)", adaptiveEnabled: true}
```

## Future Enhancements

Potential improvements for future iterations:

1. **Solar Approximation**: Calculate approximate sunrise/sunset times when geolocation is denied but location is needed
2. **UI Toggle**: Add Settings panel option to enable/disable adaptive backgrounds
3. **Theme Preview**: Add preview mode to cycle through all themes
4. **Custom Backgrounds**: Allow users to upload custom background images
5. **Transition Effects**: Add smooth crossfade transitions when theme changes

## Breaking Changes

None. The enhancement is fully backward compatible:
- Existing code using `window.BackgroundTheme` continues to work
- Existing code using `window.game.BackgroundTheme` now works (was broken before)
- No API changes to existing methods
- All new functionality is additive

## Performance Impact

Minimal performance impact:
- Telemetry calls are lightweight (simple function calls)
- Geolocation retry only happens once (if first attempt fails)
- Theme updates are throttled to once per minute (unchanged)
- Alias bridging script runs once on page load with timeout

## Security Considerations

No security concerns:
- Geolocation requires user permission (browser prompt)
- Weather API calls are read-only (no user data sent)
- Manual override only accepts predefined theme keys
- All network operations have error handling

## Rollback Plan

If issues arise, revert these commits:
1. The enhancement commit (added telemetry, retry, manual override)
2. The bridging script in index.html

The original functionality will be restored, but the namespace mismatch bug will return.

## Support

For questions or issues:
1. Check browser console for error messages
2. Run `npm run test:background-theme` to verify module structure
3. Open `test_background_theme_enhanced.html` for interactive testing
4. Review this documentation for usage examples
