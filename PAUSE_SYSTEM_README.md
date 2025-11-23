# Global Pause System

## Overview

The Global Pause System freezes all game activity when the Settings modal is open. This ensures that:
- Phase timers stop counting
- No phase transitions occur
- Competitions cannot start
- Social AI scheduler pauses
- Fast-forward is disabled

When Settings closes, the game resumes exactly where it left off, preserving timer state and triggering overdue phase transitions immediately if needed.

## Architecture

### Core Components

1. **PauseController** (`js/flow/PauseController.js`)
   - Manages global pause state
   - Coordinates pause/resume across all systems
   - Handles timer state capture and restoration
   - Provides guard functions for gameflow actions

2. **Deferred Config System** (`js/config/defaults.js`)
   - Classifies settings as immediate or deferred
   - Stores pending changes in `game.cfgPending`
   - Merges pending changes on season restart

3. **Settings UI Integration** (`js/ui.config-and-settings.js`)
   - Calls pause/resume on modal open/close
   - Shows visual pause indicator
   - Displays deferred setting indicators (⏱)
   - Disables FFWD controls during pause

### Pause Flow

```
Settings Open
    ↓
PauseController.pause('settings')
    ↓
├─ Set game.isGloballyPaused = true
├─ Capture timer state (endAt, remainingMs)
├─ Set game.timerPaused = true
├─ Pause PhaseTimerBridge
├─ Stop Social AI Scheduler
├─ Broadcast 'game:paused' event
└─ Show pause indicator in UI
```

```
Settings Close
    ↓
PauseController.resume()
    ↓
├─ Clear game.isGloballyPaused
├─ Restore timer state
│   ├─ If remainingMs <= 0: trigger timeout immediately
│   └─ Else: set new endAt = now + remainingMs
├─ Clear game.timerPaused
├─ Resume PhaseTimerBridge
├─ Resume Social AI (if in social phase)
├─ Broadcast 'game:resumed' event
└─ Remove pause indicator
```

## Usage

### Programmatic Pause/Resume

```javascript
// Pause the game
if (window.PauseController) {
  window.PauseController.pause('my-reason');
}

// Resume the game
if (window.PauseController) {
  window.PauseController.resume();
}

// Check if paused
const isPaused = window.PauseController?.isPaused();

// Get pause state details
const state = window.PauseController?.getState();
// Returns: { isPaused, reason, pausedAt, refCount }
```

### Debug Helpers

```javascript
// Quick debug commands (exposed globally)
window.__debugPauseGame();   // Pause with reason='debug'
window.__debugResumeGame();  // Resume
```

### Adding Pause Guards

To protect a function from running while paused:

```javascript
function myGameFunction() {
  // Add guard at function start
  if (window.PauseController?.isPaused()) {
    console.info('[my-module] myGameFunction blocked: game is paused');
    return;
  }
  
  // Function logic...
}
```

Or use the guard helper:

```javascript
const myGameFunction = PauseController.guardFunction(
  function() {
    // Function logic...
  },
  'myGameFunction'
);
```

## Deferred Config System

### Classification

Settings are classified into two categories:

**Immediate Settings** (apply right away):
- Visual/UI: `fxCards`, `showTopRoster`, `colorblindMode`, `useRibbon`, `timerStyle`
- Audio: `musicOn`, `sfxOn`
- Accessibility: `autoShowRulesOnStart`, `skipIntros`
- Card animations: `cardHoldMs`, `cardGapMs`, `skipCascade*`
- UI modes: `modernLiveVoteUI`

**Deferred Settings** (apply next season):
- Game mechanics: `enableJuryHouse`, twist percentages, `enablePublicFav`
- Phase timers: `tHOH`, `tVeto`, `tLiveVote`, etc.
- Minigame settings: `miniMode`, `useNewMinigames`, `minigameDuration`
- Roster: `numPlayers`
- Feature flags: `progressionEnabled`, social AI settings, etc.

### Usage

When a user changes a deferred setting mid-season:

1. Change is written to `game.cfgPending` instead of `game.cfg`
2. Visual indicator (⏱) shown next to the setting
3. Notice displayed: "N setting(s) will apply next season"
4. On season restart (week 1) or full page refresh:
   - `Config.applyPendingConfig()` is called
   - Pending changes merged into active config
   - `game.cfgPending` is cleared

### API

```javascript
// Check if a key is deferred
const isDeferred = Config.isConfigKeyDeferred('doubleChance'); // true
const isImmediate = Config.isConfigKeyImmediate('musicOn'); // true

// Apply a config change (automatically defers if needed)
const result = Config.applyConfigChange('tripleChance', 10);
// Returns: 'applied' or 'deferred'

// Check for pending changes
const hasPending = Config.hasPendingConfig(); // true/false
const keys = Config.getPendingConfigKeys(); // ['tripleChance', 'tHOH']

// Manually trigger merge (called automatically on season start)
Config.applyPendingConfig();
```

## Guard Points

The following functions are guarded against execution while paused:

- `setPhase()` - Phase transitions
- `startHOH()` - HOH competition start
- `startVetoComp()` - Veto competition start
- `startLiveVote()` - Live vote start
- `startAiSocialPhase()` - Social AI scheduler start
- `activateFastForward()` - Fast-forward activation

## Events

The pause system broadcasts events via `window.game.bus`:

### `game:paused`
Emitted when game is paused.

Payload:
```javascript
{
  reason: string,        // Why pause was triggered
  pausedAt: number,      // Timestamp
  phase: string,         // Current phase
  week: number,          // Current week
  remainingMs: number    // Timer remaining (if applicable)
}
```

### `game:resumed`
Emitted when game is resumed.

Payload:
```javascript
{
  reason: string,        // Reason from original pause
  pauseDuration: number, // How long paused (ms)
  phase: string,         // Current phase
  week: number           // Current week
}
```

### `config:pending-applied`
Emitted when pending config is merged on season restart.

Payload:
```javascript
{
  keys: string[],        // List of keys that were applied
  timestamp: number      // When applied
}
```

## Timer State Management

The pause system carefully manages timer state:

1. **On Pause:**
   - Captures `game.endAt` or `game.phaseEndsAt`
   - Calculates `remainingMs = max(0, endAt - now)`
   - Stores `game.pausedTimeRemaining`
   - Sets `game.timerPaused = true`

2. **On Resume:**
   - Clears `game.timerPaused`
   - If `remainingMs <= 0`:
     - Timer expired during pause
     - Triggers `game.phaseTimeoutCallback()` immediately (via setTimeout)
   - Else:
     - Restores timer: `newEndAt = now + remainingMs`
     - Updates `game.endAt` and `game.phaseEndsAt`

This ensures:
- No time is lost during pause
- Overdue timers fire immediately on resume
- No negative timer values

## Reference Counting

The pause system uses reference counting to handle nested pause calls:

```javascript
PauseController.pause('settings');  // refCount = 1, pauses game
PauseController.pause('modal2');    // refCount = 2, already paused
PauseController.resume();           // refCount = 1, still paused
PauseController.resume();           // refCount = 0, resumes game
```

This prevents accidental resume when multiple systems trigger pause.

## Telemetry

Pause/resume events are logged to `game.__pauseTelemetry[]` for debugging:

```javascript
// Access telemetry
console.table(window.game.__pauseTelemetry);

// Example entries:
{
  type: 'pause',
  reason: 'settings',
  timestamp: 1732377720000,
  phase: 'hoh',
  week: 3,
  remainingMs: 15000
}
{
  type: 'resume',
  pauseDuration: 5234,
  timestamp: 1732377725234,
  phase: 'hoh',
  week: 3
}
```

## Testing

### Test Suite

Run `test_pause_controller.html` to verify:
- Basic pause/resume
- Timer preservation
- Double-pause safety
- Guard function blocking
- Debug helper functions

### Manual Testing Checklist

1. ✅ Start game, enter active phase (HOH/Veto/etc.)
2. ✅ Open Settings → verify "⏸ Game Paused" badge
3. ✅ Verify timer stops counting
4. ✅ Try FFWD → should be blocked
5. ✅ Change deferred setting → verify ⏱ indicator
6. ✅ Close Settings → game resumes
7. ✅ Open/close Settings multiple times → no issues
8. ✅ Let timer expire during pause → phase advances on resume
9. ✅ Start new season → deferred settings applied

## Troubleshooting

### Game doesn't pause when opening Settings

**Check:**
- Is `PauseController.js` loaded? (`window.PauseController` should exist)
- Check console for errors during modal open

### Timer doesn't resume correctly

**Check:**
- `game.pausedTimeRemaining` should be set during pause
- `game.phaseTimeoutCallback` should exist
- Check console for PauseController logs

### Deferred settings apply immediately

**Check:**
- Is game in active phase? (not lobby)
- Is `Config.applyConfigChange` being called?
- Check classification arrays in `config/defaults.js`

### FFWD still works during pause

**Check:**
- Guard in `state.js` `activateFastForward()` should check `PauseController.isPaused()`
- Button should be disabled by `disableFFWDControls()`

## Implementation Notes

- Pause state is stored in `window.game.isGloballyPaused` for easy access
- Timer state is stored in `PauseController` private state
- Guards use early return pattern for minimal performance impact
- Deferred config uses separate `game.cfgPending` object to avoid conflicts
- All critical gameflow functions are guarded

## Future Enhancements

Potential improvements:
- [ ] Pause animation/visual effect
- [ ] Pause sound effect
- [ ] Pause duration tracking in analytics
- [ ] Configurable pause timeout (auto-resume)
- [ ] Pause reason UI display
- [ ] Multi-level pause priorities
