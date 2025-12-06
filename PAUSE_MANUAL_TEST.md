# Manual Test Instructions for Game Pause Functionality

## Overview
This document describes how to manually verify that the game pause functionality works correctly when opening Settings or Hub modals.

## Prerequisites
- Open `index.html` in a browser
- Open browser DevTools console to see logs
- Start a new game or load an existing save

## Test 1: Verify pauseController is available

1. Open browser console
2. Type: `window.game.pauseController`
3. **Expected**: Object with methods: `open`, `close`, `isPaused`, `getOpenModals`, `reset`
4. Type: `window.game.pauseController.isPaused()`
5. **Expected**: Returns `false` (game not paused)

## Test 2: Verify Settings modal pauses the game

1. Start a game and wait for a timed phase (e.g., competition or social phase)
2. Note the timer value in the UI
3. Open the Settings modal (click the gear icon)
4. In console, type: `window.game.pauseController.isPaused()`
5. **Expected**: Returns `true`
6. Watch the timer in the UI for 5-10 seconds
7. **Expected**: Timer should NOT advance (frozen)
8. Check console logs
9. **Expected**: Should see `[social-maneuvers] 🛑 Received game:pause event` log
10. Close the Settings modal
11. In console, type: `window.game.pauseController.isPaused()`
12. **Expected**: Returns `false`
13. Watch the timer in the UI
14. **Expected**: Timer should resume advancing from where it stopped
15. Check console logs
16. **Expected**: Should see `[social-maneuvers] ▶️ Received game:resume event` log

## Test 3: Verify Hub modal (3-dots menu) pauses the game

1. During a timed phase, note the timer value
2. Click the 3-dots menu button (⋮) to open hub modal
3. In console, type: `window.game.pauseController.isPaused()`
4. **Expected**: Returns `true`
5. Watch the timer for 5-10 seconds
6. **Expected**: Timer should NOT advance (frozen)
7. Close the hub modal
8. **Expected**: Timer resumes advancing

## Test 4: Verify minigame timer pauses

1. Start a competition (HOH, Veto, etc.)
2. When the instructions appear, click "Play" to start the minigame
3. Note the minigame countdown timer in the fullscreen overlay
4. Open DevTools (press F12 or right-click and select "Inspect")
5. In console, type: `window.game.pauseController.open('test-pause')`
6. **Expected**: Minigame timer should freeze
7. Wait 5-10 seconds
8. **Expected**: Timer value should not change
9. In console, type: `window.game.pauseController.close('test-pause')`
10. **Expected**: Timer resumes counting down

## Test 5: Verify multiple modals can be open

1. During a timed phase, open Settings modal
2. In console, type: `window.game.pauseController.getOpenModals()`
3. **Expected**: Returns array with one modal ID (e.g., `["modal:settings"]`)
4. Without closing Settings, programmatically open another modal:
   ```javascript
   window.game.pauseController.open('test-modal')
   ```
5. In console, type: `window.game.pauseController.getOpenModals()`
6. **Expected**: Returns array with two modal IDs
7. Close one modal: `window.game.pauseController.close('test-modal')`
8. **Expected**: Game still paused (Settings still open)
9. Close Settings modal
10. **Expected**: Game resumes (all modals closed)

## Test 6: Verify console logging for QA

1. Open console and filter logs by `[CompetitionFlow]`, `[social-maneuvers]`, or pause-related terms
2. During various game actions (opening modals, starting competitions), verify:
   - `[social-maneuvers] 🛑 Received game:pause event` appears when opening modals
   - `[social-maneuvers] ▶️ Received game:resume event` appears when closing modals
   - `[CompetitionFlow] Game is paused - competition flow will proceed but timer will be frozen` appears when starting competitions while paused
   - Timer tick logs stop appearing when paused (timer frozen)
   - Timer tick logs resume when unpaused

## Expected Behavior Summary

### When paused (modal open):
- `window.game.pauseController.isPaused()` returns `true`
- Phase timer (main countdown) freezes and does not advance
- Minigame countdown timer (if active) freezes
- Social phase timer (if active) freezes
- Console shows pause event logs

### When resumed (all modals closed):
- `window.game.pauseController.isPaused()` returns `false`
- All timers resume from where they left off
- Console shows resume event logs
- Game progression continues normally

## Common Issues

### Issue: Timer continues advancing when paused
**Check**: Verify `window.game.pauseController.isPaused()` returns `true` when modal is open
**Check**: Look for console errors related to pauseController
**Check**: Ensure global-pause.js loaded before other scripts

### Issue: Timer doesn't resume after closing modal
**Check**: Verify `window.game.pauseController.getOpenModals()` returns empty array
**Check**: Look for console errors in pause/resume logic
**Check**: Manually call `window.game.pauseController.reset()` to clear stuck state

### Issue: Multiple modals cause problems
**Check**: Verify `getOpenModals()` properly tracks all open modals
**Check**: Each modal must call both `open(id)` and `close(id)` with matching IDs
**Check**: Use different IDs for different modals

## Success Criteria

✅ All timers freeze when any modal is open
✅ All timers resume when all modals are closed  
✅ Console logs show pause/resume events for QA
✅ Game state is preserved correctly during pause
✅ No errors in console during pause/resume cycles
