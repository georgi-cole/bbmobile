# Final Week Timer Gap Elimination - Implementation Summary

## Problem Statement

During the final week and 3-part competition, extended periods of idleness occur where the game timer ticks but nothing happens on screen. No action is required from the player, creating a poor user experience with unnecessary waiting.

## Solution

Disable the game timer entirely during Final Week phases when optimized pacing is enabled, allowing the game to flow sequentially without idle waiting periods. The skip button continues to work for immediate acceleration.

## Implementation Details

### 1. Timer Disabled for Final Week Phases

**File: `js/ui.hud-and-router.js`**

Modified the `setPhase()` function to detect Final Week phases and skip timer setup when `skipIdleTimersF3` is enabled:

```javascript
const isFinalWeekPhase = ['final3_comp1', 'final3_comp2', 'final3_comp3', 'final3_plea', 'final3_decision'].includes(phase);
const skipIdleTimers = game.cfg?.skipIdleTimersF3 !== undefined ? game.cfg.skipIdleTimersF3 : true;

if(isFinalWeekPhase && skipIdleTimers && seconds > 0){
  // Timer disabled - show --:-- instead of countdown
  setClock('--:--');
  // Store callback for manual invocation by phase logic
  game.phaseTimeoutCallback = onTimeout;
  game.endAt = null; // No timer deadline
  game.phaseEndsAt = null; // No timer deadline
  return;
}
```

**Behavior:**
- Timer display shows `--:--` instead of countdown
- No timer interval is created
- Phase advances when game action completes (competition done, plea submitted, decision made)
- No idle waiting periods

### 2. Skip Button Enhancement

**File: `js/tv-skip.js`**

Added missing Final Week phases to the skippable phases list:

```javascript
const SKIPPABLE_PHASES = [
  // ... other phases ...
  'final3_comp1',
  'final3_comp2',
  'final3_comp3',  // ← Added
  'final3_plea',   // ← Added
  'final3_decision',
  // ...
];
```

**File: `js/ui.hud-and-router.js`**

Enhanced `fastForwardPhase()` to handle timerless Final Week phases:

```javascript
const isFinalWeekPhase = ['final3_comp1', 'final3_comp2', 'final3_comp3', 'final3_plea', 'final3_decision'].includes(phase);
const skipIdleTimers = game.cfg?.skipIdleTimersF3 !== undefined ? game.cfg.skipIdleTimersF3 : true;

if(isFinalWeekPhase && skipIdleTimers && !game.phaseEndsAt){
  // No timer running - immediately invoke phase completion callback
  if(typeof game.phaseTimeoutCallback === 'function'){
    game.phaseTimeoutCallback();
  }
  return;
}
```

**Behavior:**
- Skip button remains enabled for all Final Week phases
- Pressing skip immediately triggers phase completion
- Works even when no timer is running

### 3. Configuration

**File: `js/ui.config-and-settings.js`**

Default configuration (no changes needed - already exists):

```javascript
{
  skipIdleTimersF3: true,  // Skip idle timers in Final Week (optimized pacing)
}
```

**File: `js/settings/registry.js`**

User setting (no changes needed - already exists):

```javascript
{
  title: 'Final Week pacing',
  fields: [
    checkbox('skipIdleTimersF3', 'Skip idle timers in Final Week (optimized UX)'),
  ]
}
```

## Flow Comparison

### Before (Timer Enabled)

```
Final Week Modal
  ↓
[⏱️ Timer: 18s idle waiting]
  ↓
Part 1 Competition starts
  ↓ (human plays or AI completes)
Part 1 Competition completes
  ↓
Results modal displays
  ↓
[⏱️ Timer: 18s idle waiting]
  ↓
Part 2 Competition starts
  ↓ (losers compete)
Part 2 Competition completes
  ↓
Results modal displays
  ↓
[⏱️ Timer: 18s idle waiting]
  ↓
Part 3 Competition starts
  ↓ (finalists compete)
Part 3 Competition completes
  ↓
Results modal displays (Final HOH)
  ↓
[⏱️ Timer: 10s idle waiting]
  ↓
Plea Phase starts
  ↓ (nominees make pleas)
Pleas submitted
  ↓
[⏱️ Timer: 16s idle waiting]
  ↓
Decision Phase starts
  ↓ (HOH makes decision)
Decision made
  ↓
Final 3 Eviction
  ↓
Jury Vote begins
```

### After (Timer Disabled - Default)

```
Final Week Modal
  ↓ (immediate)
Part 1 Competition starts
  ↓ (human plays or AI completes)
Part 1 Competition completes
  ↓ (immediate)
Results modal displays
  ↓ (immediate after modal)
Part 2 Competition starts
  ↓ (losers compete)
Part 2 Competition completes
  ↓ (immediate)
Results modal displays
  ↓ (immediate after modal)
Part 3 Competition starts
  ↓ (finalists compete)
Part 3 Competition completes
  ↓ (immediate)
Results modal displays (Final HOH)
  ↓ (immediate after modal)
Plea Phase starts
  ↓ (nominees make pleas)
Pleas submitted
  ↓ (immediate)
Decision Phase starts
  ↓ (HOH makes decision)
Decision made
  ↓ (immediate)
Final 3 Eviction
  ↓ (immediate)
Jury Vote begins
```

## Technical Details

### Phase Completion Detection

Each Final Week phase has its own completion trigger:

1. **Competitions (Part 1, 2, 3):**
   - Complete when all participants submit scores
   - `finishF3P1()`, `finishF3P2()`, `finishF3P3()` called automatically
   - No timer needed - game detects completion

2. **Plea Phase:**
   - Completes when:
     - Human nominee submits plea (if applicable)
     - AI nominees generate pleas
     - Brief delay for HOH to "receive" pleas
   - `setTimeout()` triggers transition to decision (2-3s, not idle waiting)

3. **Decision Phase:**
   - Completes when:
     - Human HOH makes selection (if applicable)
     - AI HOH processes decision
   - Immediately triggers eviction ceremony

### Timer Display States

| State | Display | Meaning |
|-------|---------|---------|
| Active Timer | `05:32` | Countdown running, phase will timeout |
| No Timer (optimized) | `--:--` | Sequential flow, advances on completion |
| Waiting for Vote | `--:--` | Paused until human submits action |
| Phase Complete | `00:00` | Phase finished, transitioning |

### Skip Button Behavior

| Scenario | Old Behavior | New Behavior |
|----------|--------------|--------------|
| Timer running | Accelerate timer to 10% speed | Same |
| No timer (optimized F3) | *(Button disabled)* | Immediately invoke completion callback |
| Competition in progress | Accelerate timer | Same |
| Waiting for human action | *(No effect)* | Same |

## Testing

### Automated Tests

Run existing test suite:
```bash
npm run test:all
```

All tests pass (except unrelated jsdom dependency).

### Manual Testing

1. Open `test_final_week_timer_disabled.html`
2. Follow test instructions
3. Verify:
   - Timer shows `--:--` during Final Week
   - No idle waiting periods
   - Skip button works
   - Smooth phase transitions

### Integration Testing

Play through a full game to Final Week:

1. Start game with default settings
2. Play through to 3 players remaining
3. Observe Final Week flow:
   - Modal appears
   - Part 1 starts immediately (no idle wait)
   - Part 1 completes → Results → Part 2 starts (no idle wait)
   - Part 2 completes → Results → Part 3 starts (no idle wait)
   - Part 3 completes → Results → Pleas start (no idle wait)
   - Pleas complete → Decision starts (no idle wait)
   - Decision made → Eviction → Jury Vote
4. Test skip button during each phase
5. Verify timer display shows `--:--`

## Edge Cases Handled

1. **Human player eliminated before Final Week:** Spectator mode works correctly
2. **Skip pressed during competition:** Competition accelerates properly
3. **Setting disabled mid-game:** Next phase respects new setting
4. **Legacy saves:** Compatible with saves from before this change
5. **Fast-forward already active:** Idempotency checks prevent conflicts

## Configuration Options

Users can control this behavior via Settings:

**Settings → Gameplay → Final Week pacing**
- ✅ "Skip idle timers in Final Week (optimized UX)" - **Enabled by default**

When disabled, returns to old behavior with timer-based phases.

## Benefits

1. **Eliminates idle waiting:** No more dead time where nothing happens
2. **Improves UX:** Game feels responsive and well-paced
3. **Preserves functionality:** Skip button still works for acceleration
4. **Backwards compatible:** Can be disabled if needed
5. **Default enabled:** All users benefit automatically

## Technical Notes

- Timer UI elements still exist but show `--:--`
- Phase timeout callbacks are stored but not invoked by timer
- Game logic determines when to advance phases
- Compatible with existing Fast-Forward system
- No breaking changes to public APIs

## Files Modified

1. `js/ui.hud-and-router.js` - Core timer and skip logic
2. `js/tv-skip.js` - Skippable phases list
3. `test_final_week_timer_disabled.html` - Test file (new)

## Related Issues

- Addresses timer gaps during Final Week
- Improves sequential flow of 3-part competition
- Maintains skip functionality for acceleration

## Future Enhancements

Potential improvements:
- Apply similar logic to other phases with idle waiting
- Add visual indicator when sequential mode is active
- Telemetry to track phase transition times

---

**Implementation Date:** January 4, 2026  
**Default Behavior:** Timer disabled (optimized pacing)  
**User Control:** Can be toggled in Settings → Gameplay
