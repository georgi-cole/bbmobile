# Idle Timer Exhaust Feature

## Overview
The Idle Timer Exhaust feature automatically reduces phase timers to 1 second when the main game screen is in an "idle" state - meaning no user interaction is required and no modal, game, or popup is displayed.

This improves the user experience by preventing unnecessary waiting when the game is simply counting down time with nothing to do.

## Purpose
- **Faster progression**: Automatically skip idle countdown periods
- **Better UX**: No manual fast-forward needed for inactive phases
- **Seamless**: Only triggers when truly idle - never interrupts gameplay or user actions

## How It Works

### Idle State Detection
The main screen is considered "idle" when **ALL** of the following conditions are true:

1. **Main screen is built** - `body.classList.contains('main-screen-built')`
2. **No modal is open** - No `.modal-backdrop.open`, `[role="dialog"]`, settings modal, etc.
3. **No popup card displayed** - No visible cards in `#tvOverlay` (ceremony cards, decision cards, etc.)
4. **No game/minigame running** - `game.__compRunning`, `game.__minigameActive`, `game.__intermissionActive` are all false
5. **No user input expected** - Human doesn't need to vote, nominate, make veto decision, etc.
6. **Game is not paused** - `PauseController.isPaused()` returns false
7. **Active timer exists** - `game.endAt` or `game.phaseEndsAt` is in the future

### Timer Exhaustion Behavior
When idle state is detected:
- Sets `game.endAt` and `game.phaseEndsAt` to `Date.now() + 1000` (1 second from now)
- Only exhausts if remaining time is greater than 1 second (to avoid unnecessary updates)
- Logs the exhaustion for debugging: `[IdleTimerExhaust] Timer exhausted from Xms to 1000ms (phase=Y)`
- Emits telemetry event for tracking

### User Input Detection
The following scenarios are detected as "user input expected":

- **livevote phase**: Human hasn't voted yet
- **jury phase**: Human is a juror who hasn't voted
- **nominations phase**: Human is HOH with unlocked nominations
- **veto_ceremony phase**: Human is POV holder with unresolved ceremony
- **Interactive buttons**: Any visible `.decision-card button`, `.ceremony-card button`, etc.

## Implementation

### Module: `js/utils/idle-timer-exhaust.js`

The module exports the following API:

```javascript
global.IdleTimerExhaust = {
  start(),              // Start periodic checking (every 500ms)
  stop(),               // Stop periodic checking
  setEnabled(bool),     // Enable/disable the feature
  isEnabled(),          // Check if feature is enabled
  isMainScreenIdle(),   // Check if main screen is currently idle
  exhaustTimerIfIdle(), // Manually trigger exhaust check
  
  // Debug helpers
  _debug: {
    isMainScreenBuilt(),
    isModalOpen(),
    isPopupCardVisible(),
    isGameRunning(),
    isUserInputExpected(),
    isGamePaused(),
    hasActiveTimer()
  }
};
```

### Configuration

The feature is controlled by a config flag in `js/config/defaults.js`:

```javascript
enableIdleTimerExhaust: true  // Default: enabled
```

This can be toggled at runtime via the Settings modal or programmatically:

```javascript
window.IdleTimerExhaust.setEnabled(false);  // Disable
window.IdleTimerExhaust.setEnabled(true);   // Enable
```

### Integration Points

1. **Script Load** (`index.html`):
   - Loaded after `ui.hud-and-router.js`
   - Deferred loading to ensure all dependencies are available

2. **Startup Flow** (`src/startup/flow.js`):
   - Monitoring starts when main screen is built
   - Called in `buildMainScreen()` function

## Testing

### Test File: `test_idle_timer_exhaust.html`

A comprehensive test page is provided with:

- **Real-time status dashboard**: Shows all detection states
- **Individual tests**: Test each detection function independently
- **Interactive controls**: Simulate various game states
- **Full scenario test**: Validates end-to-end auto-exhaustion
- **Live timer display**: Shows countdown in real-time
- **Debug console**: Logs all events

### Running Tests

1. Open `test_idle_timer_exhaust.html` in a browser
2. Click "Start Monitoring" to begin
3. Click "Run Full Scenario Test" for automated validation
4. Use interactive controls to manually test edge cases

## Debug & Monitoring

### Console Logging

The feature logs important events:

```
[IdleTimerExhaust] Module loaded
[IdleTimerExhaust] Initialized with config flag: true
[IdleTimerExhaust] Starting idle timer monitoring
[IdleTimerExhaust] Timer exhausted from 25000ms to 1000ms (phase=hoh)
```

### Telemetry Events

Exhaustion events are tracked via telemetry:

```javascript
{
  event: 'idle_timer_exhaust',
  data: {
    phase: 'hoh',
    remainingMs: 25000,
    exhaustedTo: 1000
  }
}
```

### Debug API

Access internal state checks:

```javascript
// Check individual conditions
IdleTimerExhaust._debug.isMainScreenBuilt();
IdleTimerExhaust._debug.isModalOpen();
IdleTimerExhaust._debug.isPopupCardVisible();
IdleTimerExhaust._debug.isGameRunning();
IdleTimerExhaust._debug.isUserInputExpected();
IdleTimerExhaust._debug.isGamePaused();
IdleTimerExhaust._debug.hasActiveTimer();

// Check composite idle state
IdleTimerExhaust.isMainScreenIdle();
```

## Performance Considerations

- **Check frequency**: 500ms intervals (2 checks per second)
- **Minimal overhead**: Only runs detection when feature is enabled
- **Early exit**: Stops checking at first failed condition
- **No DOM manipulation**: Only reads state, never writes (except timers)

## Edge Cases & Safeguards

1. **Threshold protection**: Only exhausts if remaining time > 1s
2. **Multiple timers**: Handles both `game.endAt` and `game.phaseEndsAt`
3. **Modal detection**: Checks multiple modal selectors and computed styles
4. **Visibility checks**: Uses `getComputedStyle` for accurate visibility
5. **Pause integration**: Respects `PauseController` state

## Known Limitations

- Only detects user input for specific phases (livevote, jury, nominations, veto_ceremony)
- Relies on specific CSS classes and DOM structure
- May need updates if new modal/card types are added

## Future Enhancements

Potential improvements:
- Configurable check interval
- Configurable exhaust threshold
- More granular user input detection
- Event bus integration for state changes
- Settings UI for runtime configuration

## Related Systems

- **PauseController** (`js/flow/PauseController.js`): Game pause state
- **PhaseTimerBridge** (`js/flow/phaseTimerBridge.js`): Timer management
- **StartupFlow** (`src/startup/flow.js`): Initialization sequence
- **Config Defaults** (`js/config/defaults.js`): Feature flags

## Troubleshooting

### Feature not working
1. Check if enabled: `IdleTimerExhaust.isEnabled()`
2. Check if monitoring started: Look for "Starting idle timer monitoring" in console
3. Verify main screen built: `document.body.classList.contains('main-screen-built')`
4. Check idle state: `IdleTimerExhaust.isMainScreenIdle()`

### Timer not exhausting
1. Verify remaining time > 1 second
2. Check all idle conditions are met
3. Look for console logs showing exhaustion
4. Ensure feature is enabled and monitoring is active

### False positives (exhausting when shouldn't)
1. Check user input detection for specific phase
2. Verify modal/popup detection is working
3. Review game state flags (__compRunning, etc.)
4. Use debug API to isolate which condition is failing

## Maintenance

When adding new features:
- Add new modal selectors to `isModalOpen()`
- Add new card types to `isPopupCardVisible()`
- Add new phases to `isUserInputExpected()`
- Update tests to cover new scenarios
- Document changes in this file
