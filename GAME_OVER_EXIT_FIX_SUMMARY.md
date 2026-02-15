# Game Over Exit Background Simulation Fix

## Problem
When the human player is evicted pre-jury and clicks **EXIT** on the Game Over modal, the UI returns to the intro hub but background game systems continue running, causing:
- Repeated `[__smDebug] Running single AI tick` logs
- Continuous `[social-ui-adapter] social.action:result` entries
- Phase progression via `setPhase`, `finishCompPhase`, etc.
- Competition renders detecting evicted human

## Root Cause
The EXIT handler navigated the UI back to the hub but did not stop:
1. Phase timer interval (`tickHandle` in `ui.hud-and-router.js`)
2. Social AI scheduler RAF/setTimeout loop
3. Social AI auto-driver setTimeout loop
4. Other background tickers

## Solution

### 1. Termination Flag
Added global flag `window.game.__terminated` to signal game termination state:
- Set to `true` when EXIT is clicked
- Set to `false` when starting a new season
- Checked by all background tick loops

### 2. Termination Guards
Added guards to all critical tick entry points:

**ui.hud-and-router.js:**
```javascript
function tick() {
  // TERMINATION GUARD: Stop timer if game has been terminated
  if (game.__terminated) {
    console.info('[hud-timer] Game terminated - stopping phase timer');
    clearInterval(tickHandle);
    tickHandle = null;
    return;
  }
  // ... rest of tick logic
}

async function setPhase(phase, seconds, onTimeout) {
  // TERMINATION GUARD: Block phase changes if game is terminated
  if (game.__terminated) {
    console.info('[phase] setPhase blocked: game has been terminated');
    return;
  }
  // ... rest of setPhase logic
}
```

**social-ai-scheduler.js:**
```javascript
function performTick() {
  const game = global.game || {};
  
  // TERMINATION GUARD: Stop if game has been terminated
  if (game.__terminated) {
    infoLog('🛑 Game terminated - stopping scheduler', 'game_terminated');
    stopAiSocialPhase('game_terminated');
    return;
  }
  // ... rest of tick logic
}
```

**social-ai-autostart.js:**
```javascript
function tick() {
  const game = global.game || {};
  
  // TERMINATION GUARD: Stop if game has been terminated
  if (game.__terminated) {
    console.info('[social-ai-autostart] 🛑 Game terminated - stopping auto-driver');
    stop();
    return;
  }
  // ... rest of tick logic
}
```

### 3. Comprehensive EXIT Teardown
Updated `game-over-modal.js` EXIT handler with complete teardown sequence:

```javascript
// 1. Set termination flag FIRST to stop all background loops
global.game.__terminated = true;

// 2. Stop Social AI Scheduler
SocialAIScheduler.stopAiSocialPhase('game-over-exit');

// 3. Stop social auto-driver
__smAutoDriver.stop();

// 4. Stop phase timer
stopPhaseTimer();

// 5. Pause game controllers
PauseController.pause('game-over-exit');

// 6. Clear game state
game.players = [];
game.phase = 'lobby';
// ... clear other state

// 7. Navigate to intro hub
StartupFlow.restartToHub();
```

### 4. NEW SEASON Flag Reset
Updated `startNewSeasonFlow()` to clear termination flag:
```javascript
global.game.__terminated = false; // Allow new game to run
```

### 5. New Public API
Added `stopPhaseTimer()` function to `ui.hud-and-router.js`:
```javascript
function stopPhaseTimer() {
  if (tickHandle) {
    clearInterval(tickHandle);
    tickHandle = null;
    console.info('[hud-timer] Phase timer stopped');
  }
}
```

## Files Modified
1. `js/game-over-modal.js` - EXIT handler teardown
2. `js/ui.hud-and-router.js` - Phase timer guards + stopPhaseTimer
3. `js/social-ai-scheduler.js` - Scheduler tick guard
4. `js/social/social-ai-autostart.js` - Auto-driver tick guard

## Test Results

### Automated Tests
✅ All minigame tests passed (51 games validated)
✅ All social tests passed
✅ All runtime helper tests passed (24 checks)
✅ 6 custom termination guard tests passed

### Manual Verification
Created `test_game_over_termination_fix.html` for manual testing:
- Test 1: Termination flag set/clear ✅
- Test 2: Phase timer guards ✅
- Test 3: Social AI guards ✅
- Test 4: Integration test (simulated EXIT flow) ✅

## Acceptance Criteria

✅ **No further AI tick logs after EXIT**
- Guard in `social-ai-autostart.js` stops setTimeout loop
- Guard in `social-ai-scheduler.js` stops RAF pump

✅ **No further phase progression after EXIT**
- Guard in `setPhase()` blocks all phase changes
- Guard in timer `tick()` stops interval

✅ **Clean return to intro hub**
- `restartToHub()` works normally
- Background loads correctly

✅ **New game starts cleanly**
- Termination flag cleared in NEW SEASON flow
- All systems restart normally

## Backward Compatibility
- No breaking changes to existing APIs
- All guards are defensive (check existence before calling)
- Existing game flows unaffected (flag only set on EXIT)

## Edge Cases Handled
1. **Multiple EXIT clicks**: Flag prevents redundant teardown
2. **Missing modules**: All teardown calls wrapped in try-catch
3. **Race conditions**: Termination flag checked at start of each tick
4. **New season after exit**: Flag explicitly cleared

## Defensive Logging
Added informative console logs for debugging:
- `[game-over] ✓ Set game termination flag`
- `[game-over] ✓ Social AI Scheduler stopped`
- `[game-over] ✓ Terminated all game systems - safe to return to hub`
- `[hud-timer] Game terminated - stopping phase timer`
- `[phase] setPhase blocked: game has been terminated`

## Performance Impact
Minimal:
- Single boolean check per tick (negligible overhead)
- No additional timers or intervals
- Guards only execute on already-running paths

## Future Improvements
Consider:
1. Centralized "GameTerminator" module for unified teardown
2. Observable termination event for modules to react to
3. Automated test for detecting background activity post-exit

---

**Status**: ✅ Implementation complete and tested
**Risk**: Low - Guards are defensive and don't change normal flow
**Deployment**: Ready for merge
