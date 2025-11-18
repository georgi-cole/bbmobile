# Manual Idempotency Verification Guide

## Overview
This guide provides step-by-step instructions to manually verify that the idempotency guards are working correctly.

## Test Environment Setup
1. Open `index.html` in a browser
2. Open the browser console (F12 / Cmd+Option+I)
3. Optionally set `skipIntros: true` in localStorage for faster testing

## Test 1: Multiple init() Calls (StartupFlow)

### Steps:
```javascript
// In browser console:
window.StartupFlow.init();
window.StartupFlow.init();
window.StartupFlow.init();
```

### Expected Results:
- First call: `[StartupFlow] Initializing...`
- Second call: `[StartupFlow] Already initialized, skipping duplicate init() call`
- Third call: `[StartupFlow] Already initialized, skipping duplicate init() call`
- Telemetry event `startup_init_duplicate` should be logged

### Success Criteria:
✅ Only one initialization occurs
✅ Duplicate calls log warning messages
✅ No errors thrown


## Test 2: Multiple showIntroHub() Calls

### Steps:
```javascript
// In browser console:
await window.StartupFlow.showIntroHub();
await window.StartupFlow.showIntroHub();
await window.StartupFlow.showIntroHub();
```

### Expected Results:
- First call: Hub appears with background and buttons
- Second call: `[StartupFlow] Intro Hub already shown, skipping duplicate showIntroHub() call`
- Third call: `[StartupFlow] Intro Hub already shown, skipping duplicate showIntroHub() call`
- Telemetry event `startup_show_hub_duplicate` should be logged

### Success Criteria:
✅ Hub shows only once
✅ Music starts only once
✅ Duplicate calls are logged and return early
✅ No visual glitches or re-renders


## Test 3: Multiple enterGame() Calls

### Steps:
```javascript
// In browser console:
await window.StartupFlow.enterGame();
await window.StartupFlow.enterGame();
await window.StartupFlow.enterGame();
```

### Expected Results:
- First call: Game starts, cast is built, main screen shows
- Second call: `[StartupFlow] Game already started (flowState), ignoring duplicate enterGame() call`
- Third call: `[StartupFlow] Game already started (flowState), ignoring duplicate enterGame() call`
- Telemetry event `startup_enter_game_duplicate` should be logged

### Success Criteria:
✅ Game starts only once
✅ Cast is built only once
✅ Duplicate calls are logged and return early
✅ No double initialization of game state


## Test 4: Multiple IntroScreen.init() Calls

### Steps:
```javascript
// In browser console (after reset):
window.IntroScreen.reset();
window.IntroScreen.init({ bus: window.bbGameBus });
window.IntroScreen.init({ bus: window.bbGameBus });
window.IntroScreen.init({ bus: window.bbGameBus });
```

### Expected Results:
- First call: `[IntroScreen] Initialized`
- Second call: `[IntroScreen] Already initialized, skipping duplicate init() call`
- Third call: `[IntroScreen] Already initialized, skipping duplicate init() call`
- Telemetry event `intro_init_duplicate` should be logged

### Success Criteria:
✅ DOM is built only once
✅ Event listeners are attached only once
✅ Duplicate calls return early with the API object


## Test 5: Multiple IntroScreen.showWithPreload() Calls

### Steps:
```javascript
// In browser console:
await window.IntroScreen.showWithPreload(true);
await window.IntroScreen.showWithPreload(true);
await window.IntroScreen.showWithPreload(true);
```

### Expected Results:
- First call: Screen shows with fade-in animation
- Second call: `[IntroScreen] Already visible, ignoring duplicate showWithPreload() call`
- Third call: `[IntroScreen] Already visible, ignoring duplicate showWithPreload() call`
- Telemetry event `intro_show_with_preload_duplicate` should be logged

### Success Criteria:
✅ Screen shows only once
✅ Animation plays only once
✅ No flicker or double rendering
✅ Duplicate calls return immediately


## Test 6: Multiple IntroScreen.hide() Calls

### Steps:
```javascript
// In browser console:
window.IntroScreen.hide();
window.IntroScreen.hide();
window.IntroScreen.hide();
```

### Expected Results:
- First call: Screen fades out and hides
- Second call: `[IntroScreen] Already hidden, ignoring hide() call`
- Third call: `[IntroScreen] Already hidden, ignoring hide() call`
- No errors or exceptions

### Success Criteria:
✅ Screen hides smoothly
✅ Multiple hide() calls are safe (idempotent)
✅ No errors thrown


## Test 7: Normal Flow (No Duplicates)

### Steps:
1. Refresh the page (hard refresh: Ctrl+Shift+R / Cmd+Shift+R)
2. Let the app run through its normal startup sequence:
   - Video plays (or skips if `skipIntros: true`)
   - Intro Hub appears
   - Click Play button
   - Game starts

### Expected Results:
- Smooth transition through all phases
- No duplicate initialization messages in console
- Music plays once, game starts once
- No visual glitches

### Success Criteria:
✅ Normal flow works without any issues
✅ No duplicate messages logged
✅ Smooth user experience


## Test 8: skipIntros=true Flow

### Steps:
1. Set skipIntros in localStorage:
   ```javascript
   localStorage.setItem('bb.skipIntros', 'true');
   ```
2. Refresh the page
3. Observe the startup flow

### Expected Results:
- Video is skipped
- Intro Hub shows directly
- Music starts once
- Click Play → Game starts once

### Success Criteria:
✅ Hub shows immediately (no video)
✅ Music starts only once
✅ Game starts only once when Play is clicked
✅ No duplicate initialization


## Test 9: Rapid Double-Click on Play Button

### Steps:
1. Load the app and wait for Intro Hub
2. Rapidly double-click or triple-click the Play button

### Expected Results:
- First click: enterGame() is called
- Subsequent clicks: Guarded and logged as duplicates
- Game starts only once

### Success Criteria:
✅ Only one game start occurs
✅ Duplicate clicks are ignored
✅ No race conditions or double initialization


## Test 10: restartToHub() Flow

### Steps:
```javascript
// After game has started:
await window.restartToHub();
// Hub should show again
await window.StartupFlow.enterGame();
// Game should start again
```

### Expected Results:
- Hub shows again after restart
- Can enter game again after restart
- Flags are properly reset

### Success Criteria:
✅ Hub can be shown again after reset
✅ Game can be started again after reset
✅ State flags are properly reset


## Telemetry Events to Watch For

### New Telemetry Events (for duplicates):
- `startup_init_duplicate`
- `startup_init_core_services_duplicate`
- `startup_show_hub_duplicate`
- `startup_enter_game_duplicate`
- `intro_init_duplicate`
- `intro_show_with_preload_duplicate`
- `intro_show_with_preload_animating`

### Existing Telemetry Events (should fire once):
- `startup_init_start`
- `startup_init_done`
- `startup_show_hub_start`
- `startup_show_hub_done`
- `intro_init_start`
- `intro_init_done`
- `intro_show_with_preload_start`
- `intro_show_with_preload_done`


## Console Helpers

### Check Telemetry Log:
```javascript
// If Telemetry is available:
console.table(window.__telemetryLog || []);
```

### Check Flow State (internal):
```javascript
// Note: flowState is private, but you can observe behavior through logs
```

### Force Reset for Testing:
```javascript
// Reset IntroScreen
window.IntroScreen.reset();

// Reload page for full reset
location.reload();
```


## Automated Test

To run the automated test suite:
1. Open `test_startup_idempotency.html` in a browser
2. Click "Run Test 1" through "Run Test 6"
3. Verify all tests pass
4. Check telemetry log for captured events


## Success Criteria Summary

✅ All guards prevent duplicate execution
✅ Telemetry events are logged for duplicates
✅ No errors or exceptions thrown
✅ Normal flow works without issues
✅ Rapid clicks are handled gracefully
✅ Restart flow works correctly
✅ All automated tests pass
