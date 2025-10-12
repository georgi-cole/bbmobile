# Minigame Timer Synchronization - Quick Reference

## Problem Statement

1. Synchronize the minigame timer with the phase timer, so the minigame ends and submits score when the phase ends. If the phase ends early, forcibly finish the minigame, submit/cancel score, and close overlay.
2. Automatically close the play/instructions popup when the phase changes, even if Play is never clicked.
3. Prevent minigame interaction after phase time is up, and always return focus to the main game view.

## Solution Summary

✅ **Timer Synchronization**: Minigame timers now use `game.phaseEndsAt` to stay in sync with phase time
✅ **Auto-close Instructions**: Instructions cards are tracked and removed on phase change
✅ **Auto-close Minigame**: Active minigame overlays are tracked and closed on phase change  
✅ **Timeout Prevention**: Game container becomes non-interactive when time expires
✅ **Force Completion**: Minigame automatically closes 1 second after timeout

## Files Changed

1. **`js/competitions-flow.js`** (91 lines added)
   - Added phase change cleanup system
   - Implemented timer synchronization with phase timer
   - Added force completion on timeout
   - Registered cleanup function in public API

2. **`js/ui.hud-and-router.js`** (5 lines added)
   - Integrated minigame cleanup into `forceClearPhaseUI()`

3. **`test_minigame_timer_sync.html`** (360 lines, new file)
   - Comprehensive test suite with 4 test cases

4. **`MINIGAME_TIMER_SYNC_IMPLEMENTATION.md`** (176 lines, new file)
   - Detailed implementation documentation

## Key Features

### 1. Phase Timer Sync
```javascript
// Automatically uses remaining phase time
if(game && game.phaseEndsAt){
  const remainingMs = game.phaseEndsAt - Date.now();
  timeLimit = Math.ceil(remainingMs / 1000);
  usePhaseTimer = true;
}
```

### 2. Auto Cleanup on Phase Change
```javascript
// Called by forceClearPhaseUI when phase changes
cleanupOnPhaseChange() {
  // Remove instructions card
  if(activeInstructionsCard) activeInstructionsCard.remove();
  
  // Close minigame overlay
  if(activeMinigameCleanup) activeMinigameCleanup();
}
```

### 3. Force Completion on Timeout
```javascript
// When timer reaches 0
if(remaining <= 0 && !hasCompleted){
  // Disable interaction
  gameContainer.style.pointerEvents = 'none';
  gameContainer.style.opacity = '0.6';
  
  // Force close after 1 second
  setTimeout(() => { close(); }, 1000);
}
```

## Testing

Run the test file to verify all functionality:
```bash
open test_minigame_timer_sync.html
```

Or manually test:
1. Start a competition phase (HOH, Veto, etc.)
2. Launch a minigame - verify timer matches phase time
3. Change phase - verify minigame/instructions auto-close
4. Let timer expire - verify interaction is disabled

## Integration Points

- ✅ Hooks into existing `forceClearPhaseUI()` system
- ✅ Uses existing `game.phaseEndsAt` timestamp
- ✅ Backwards compatible (falls back to `timeLimit` option)
- ✅ No wrapper functions or function overrides needed

## Backwards Compatibility

All changes are additive and safe:
- Existing `timeLimit` option still works
- Safe optional chaining (`?.`) used throughout
- Graceful fallback when phase timer unavailable
- No breaking changes to API

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Phase changes with instructions shown | Instructions auto-close |
| Phase changes with minigame active | Minigame auto-closes |
| Phase timer expires during minigame | Interaction disabled, force close after 1s |
| No phase timer available | Falls back to `timeLimit` option |
| Manual close via button | References cleared properly |
| Normal completion | References cleared properly |

## Performance Impact

- Minimal: Only adds phase change listener and timer checks
- Timer updates every 1 second (same as before)
- Cleanup is O(1) - just removes tracked elements
- No memory leaks - references cleared on cleanup

## Future Enhancements

Potential improvements for future PRs:
- Add telemetry for forced completions
- Configure timeout behavior (submit 0 vs cancel)
- Visual countdown warning overlay at 10 seconds
- Support pause/resume during minigame
- Add recovery for network disconnects

## Success Criteria

✅ Minigame timer syncs with phase timer  
✅ Instructions auto-close on phase change  
✅ Minigame auto-closes on phase change  
✅ Interaction disabled on timeout  
✅ All existing tests pass  
✅ No breaking changes  
✅ Comprehensive documentation provided

## Verification

All existing tests pass:
```
npm run test:all
✅ Minigame key validation passed
✅ Legacy map validation passed
✅ Runtime validation passed
✅ E2E test validation passed
```

Syntax validation:
```
node -c js/competitions-flow.js     ✅
node -c js/ui.hud-and-router.js     ✅
```
