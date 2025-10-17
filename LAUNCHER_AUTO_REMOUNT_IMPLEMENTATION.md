# Socialize Launcher Auto-Remount Implementation

## Overview

This implementation adds robust auto-remount functionality for the Socialize launcher during social_intermission phases. The launcher now automatically re-mounts itself if removed from the DOM, ensuring users always see the social interaction button even if the TV overlay is re-rendered or cleared.

## Changes Made

### 1. New Bootstrap Module (`js/social-maneuvers-launcher-bootstrap.js`)

A dedicated module that handles launcher lifecycle management with:

- **`resolveMountTarget()`**: Finds the mount target using fallback selectors
  - Primary: `#tvOverlay`
  - Fallback 1: `.tvViewport`
  - Fallback 2: `.tv`

- **`mountIfMissing()`**: Mounts the launcher with duplicate prevention
  - Checks for existing launcher before mounting
  - Validates SocializeMobile is available
  - Logs re-mount events to console

- **`startLauncherObserver()`**: Starts MutationObserver watching
  - Observes document.body for mount target creation
  - Observes mount target for launcher removal
  - Prevents duplicate observers
  - Logs observer start events

- **`stopLauncherObserver()`**: Cleans up observers
  - Disconnects all active observers
  - Logs observer stop events

### 2. Updated `js/social.js`

Replaced the old polling-based auto-mount logic with the new bootstrap integration:

**Before:**
- Used polling with `setInterval` (every 500ms for 10 seconds)
- Single MutationObserver for mount target creation
- No auto-remount after initial mount
- Manual cleanup of poll interval

**After:**
- Uses bootstrap's `startLauncherObserver()` on phase start
- Continuous observation for launcher removal
- Automatic re-mount on DOM changes
- Clean observer shutdown on phase end via `stopLauncherObserver()`

### 3. Enhanced CSS (`socialize-mobile.css`)

Updated launcher visibility settings:

- Changed `z-index` from `15` to `2147483000` for maximum stacking order
- Retained `pointer-events: auto` to ensure clickability
- Maintains current top-right positioning (top: 12px; right: 16px)

### 4. Updated `index.html`

Script loading order updated:

```html
<script src="js/social-maneuvers.js?v=sm3"></script>
<script src="js/socialize-mobile.js"></script>
<script src="js/social-maneuvers-launcher-bootstrap.js?v=sm3"></script>
<script src="js/social.js?v=sm3"></script>
```

Ensures bootstrap loads after SocializeMobile but before social.js.

### 5. Test Suite

#### Automated Tests (`test_launcher_auto_remount.spec.js`)

Playwright test suite with 4 test cases:

1. **Auto-mount during social phase**: Verifies launcher appears and observer starts
2. **Re-mount after removal**: Confirms launcher re-mounts when manually removed
3. **Observer cleanup on phase end**: Validates observer stops when phase ends
4. **Handle overlay rebuild**: Tests resilience to overlay DOM changes

#### Manual Test Page (`test_launcher_auto_remount_manual.html`)

Interactive test page with:
- Visual test environment with TV overlay
- Test controls for all scenarios
- Real-time console log display
- Test results tracking

## Features

### Robust Auto-Remount
- Launcher automatically re-mounts if removed from DOM
- Works during forceClearCards and UI rebuilds
- No duplicate launchers created

### Visibility Guarantee
- Maximum z-index ensures launcher stays on top
- pointer-events:auto ensures clickability
- Safe positioning in TV overlay

### Diagnostics
Console logging for:
- `[social-launcher] observer started` - When observer activates
- `[social-launcher] observer stopped` - When observer deactivates
- `[social-launcher] re-mounted after DOM change` - When launcher re-mounts
- `[social-launcher] observer already active` - Duplicate prevention

### Clean Lifecycle
- Observer starts on social_intermission entry
- Observer stops on phase end (before cleanup)
- No memory leaks from lingering observers

## Testing

### Manual Testing

1. Open `test_launcher_auto_remount_manual.html` in a browser
2. Follow the numbered test buttons:
   - Initialize Game
   - Start Social Phase
   - Check Launcher (verify 1 instance)
   - Remove Launcher (verify auto-remount)
   - Rebuild Overlay (verify resilience)
   - Stop Observer (verify cleanup)
3. Monitor console output for diagnostic messages
4. Check test results panel for pass/fail indicators

### Automated Testing

Run Playwright tests (requires Chromium installed):

```bash
npm run test:playwright test_launcher_auto_remount.spec.js
```

Or use the test server:

```bash
# Terminal 1: Start server
python3 -m http.server 8080

# Terminal 2: Run tests
npx playwright test test_launcher_auto_remount.spec.js
```

## Acceptance Criteria

✅ **Launcher stays visible throughout social_intermission**
- Even if overlay is re-rendered
- Even if forceClearCards is called
- Even if UI rebuild occurs

✅ **Logs show observer started, re-mounted messages, and observer stopped**
- Observer lifecycle logged to console
- Re-mount events logged when detected
- Clean shutdown logged on phase end

✅ **No duplicate launchers appear**
- Duplicate check before mounting
- Single instance guaranteed
- Tests verify launcher count === 1

✅ **No gameplay logic changes**
- Timer/energy behavior unchanged from sm3
- Social phase logic intact
- Only launcher mounting enhanced

## Browser Compatibility

- Modern browsers with MutationObserver support (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript features used
- No polyfills required for target browsers

## Performance

- Minimal overhead: Observer only active during social phase
- Efficient DOM queries using querySelector
- No polling loops (replaced with event-driven approach)
- Clean observer cleanup prevents memory leaks

## Future Enhancements

Possible improvements:
- Add configurable mount target priority
- Support custom positioning via CSS classes
- Add performance telemetry for remount frequency
- Support multiple launcher instances (if needed)

## Troubleshooting

**Launcher doesn't appear:**
- Check console for `[social-launcher]` messages
- Verify `SocializeMobile.ensureLauncher` is defined
- Ensure `#tvOverlay`, `.tvViewport`, or `.tv` exists
- Check Social Maneuvers is enabled

**Multiple launchers:**
- Should not occur due to duplicate guards
- Check console for duplicate mount warnings
- Verify only one observer is active

**Observer not stopping:**
- Check phase end callback is called
- Verify `stopLauncherObserver()` is invoked
- Look for observer stopped log message

## Related Files

- `js/social-maneuvers-launcher-bootstrap.js` - Bootstrap module
- `js/social.js` - Social phase logic
- `js/socialize-mobile.js` - Launcher component
- `socialize-mobile.css` - Launcher styles
- `test_launcher_auto_remount.spec.js` - Automated tests
- `test_launcher_auto_remount_manual.html` - Manual test page
