# Minigame Timer Synchronization Implementation

## Overview

This implementation synchronizes minigame timers with the phase timer system, ensuring that:
1. Minigame timers countdown in sync with phase time remaining
2. Instructions popups automatically close when phase changes (even if Play is never clicked)
3. Active minigames forcibly close and prevent interaction when phase time expires
4. All minigame UI elements are cleaned up on phase change

## Changes Made

### 1. `js/competitions-flow.js`

#### Added Phase Change Cleanup System

- **Tracking variables** for active minigame overlays and instructions:
  - `activeMinigameOverlay` - reference to the current overlay
  - `activeInstructionsCard` - reference to the instructions card
  - `activeMinigameCleanup` - cleanup function for the active minigame

- **`cleanupOnPhaseChange()` function**: Called by the phase system when phase changes
  - Removes active instructions card if present
  - Calls cleanup function to close active minigame overlay
  - Clears all tracking references

#### Enhanced Timer Synchronization

- **Phase Timer Integration**: `launchFullscreenMinigame()` now:
  - Checks for `game.phaseEndsAt` to determine phase time remaining
  - Uses phase time if available, falling back to `options.timeLimit`
  - Logs sync status for debugging

- **Dynamic Timer Updates**: `updateTimer()` function:
  - Continuously recalculates time from `game.phaseEndsAt` when synced
  - Displays visual warnings when time is running low (10s, 30s thresholds)
  - Disables minigame interaction when time expires (`pointerEvents: none`, opacity reduction)
  - Forces overlay closure after 1 second delay when time runs out

#### Cleanup Registration

- Instructions card registered on creation in `showInstructionsInTV()`
- Overlay and cleanup function registered in `launchFullscreenMinigame()`
- Instructions reference cleared when Play button is clicked in `runCompetitionFlow()`

#### API Exports

Added `cleanupOnPhaseChange` to the public API:
```javascript
g.CompetitionFlow = {
  showInstructionsInTV,
  launchFullscreenMinigame,
  runCompetitionFlow,
  cleanupOnPhaseChange  // NEW
};
```

### 2. `js/ui.hud-and-router.js`

#### Integration with Phase Change System

Modified `forceClearPhaseUI()` to call competition flow cleanup:
```javascript
// Clean up any active minigames and instructions
if(typeof g.CompetitionFlow?.cleanupOnPhaseChange === 'function'){
  g.CompetitionFlow.cleanupOnPhaseChange();
}
```

This ensures minigame cleanup happens automatically whenever the phase changes, alongside other phase UI cleanup operations.

### 3. Test File

Created `test_minigame_timer_sync.html` with four comprehensive tests:

1. **Test 1**: Minigame Timer Syncs with Phase Timer
   - Verifies timer shows correct remaining phase time
   
2. **Test 2**: Instructions Auto-Close on Phase Change
   - Shows instructions, changes phase, verifies card removal
   
3. **Test 3**: Active Minigame Closes on Phase Change
   - Launches minigame overlay, changes phase, verifies closure
   
4. **Test 4**: Minigame Force Completion on Phase Timeout
   - Tests short timer (5 seconds), verifies force-close on timeout

## Technical Details

### Timer Synchronization Logic

```javascript
// Check if phase timer is available
if(game && game.phaseEndsAt){
  const remainingMs = game.phaseEndsAt - Date.now();
  if(remainingMs > 0){
    timeLimit = Math.ceil(remainingMs / 1000);
    usePhaseTimer = true;
  }
}
```

When `usePhaseTimer` is true, the update function continuously recalculates from `game.phaseEndsAt`:

```javascript
if(usePhaseTimer && game && game.phaseEndsAt){
  const remainingMs = game.phaseEndsAt - Date.now();
  remaining = Math.max(0, Math.ceil(remainingMs / 1000));
}
```

### Force Completion on Timeout

When time expires:
1. Timer interval is cleared
2. Display shows "0:00" with warning color
3. Game container pointer events are disabled
4. Container opacity reduced to 0.6
5. After 1 second delay, overlay is closed without score submission

### Phase Change Cleanup Flow

```
Phase Change Detected
  ↓
forceClearPhaseUI() called
  ↓
CompetitionFlow.cleanupOnPhaseChange() called
  ↓
Active instructions card removed
  ↓
Active minigame overlay closed
  ↓
All references cleared
```

## Benefits

1. **Consistent Timing**: Minigames now respect phase time limits exactly
2. **No Orphaned UI**: Instructions and overlays always clean up on phase change
3. **Better UX**: Users can't interact with expired minigames
4. **Integration**: Uses existing phase change system, no wrapper functions needed
5. **Safe Defaults**: Falls back to timeLimit option if phase timer unavailable

## Edge Cases Handled

- ✅ Phase changes while instructions are shown (but not played)
- ✅ Phase changes while minigame is active
- ✅ Phase time expires during minigame
- ✅ Multiple overlays/instructions (only tracks most recent)
- ✅ Manual close via close button (clears references)
- ✅ Normal completion (clears references)
- ✅ No phase timer available (uses timeLimit fallback)

## Backwards Compatibility

- All changes are additive; existing code continues to work
- `timeLimit` option still works when phase timer is unavailable
- Cleanup function safely checks for existence before calling
- Uses optional chaining (`?.`) for safe property access

## Testing

Run `test_minigame_timer_sync.html` in a browser to verify:
- Timer synchronization works correctly
- Instructions auto-close on phase change
- Minigame auto-closes on phase change
- Force completion works on timeout

## Future Enhancements

Possible improvements for future PRs:
- Add telemetry for forced completions
- Allow configuration of timeout behavior (submit 0 vs cancel)
- Add visual countdown warning overlay
- Support pause/resume during minigame
