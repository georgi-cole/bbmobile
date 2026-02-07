# Social Phase Controller Fix - Summary

## Problem Statement

The social phase flow had critical issues that prevented game progression:

1. **Duplicate Timer Starts**: Multiple event listeners caused duplicate scheduler starts
2. **Cached Summaries**: Summary generation was cached and reused, blocking phase advancement  
3. **Stuck Progression**: After clicking OK on the summary, the phase timer continued and game halted
4. **Lingering Countdown**: Redundant timers continued after summary was shown
5. **Watchdog Restarts**: Watchdog timer caused unwanted scheduler restarts during summary display

**Console Symptoms:**
```
[social-ai-autostart] Already running - ignoring duplicate start
[ai-scheduler] Not in social phase - stopping
[social-maneuvers] Summary already generated for this phase - returning cached version
```

## Solution

Implemented a **centralized SocialPhaseController** with explicit lifecycle states to eliminate race conditions and ensure deterministic phase transitions.

### Architecture

```
┌─────────────────────────────────────────────────┐
│          SocialPhaseController                   │
│  ┌────────────────────────────────────────┐    │
│  │ States: idle → running → summarizing → │    │
│  │         advanced                         │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  Owns:                                           │
│  • Phase timer handle                            │
│  • AI scheduler timer handle                     │
│  • RAF pump handle                               │
│  • Watchdog timer handle                         │
│  • Fast-advance timer handle                     │
│  • Phase advance callback                        │
└─────────────────────────────────────────────────┘
```

### State Machine

```
idle ──startPhase()──> running ──beginSummarizing()──> summarizing ──advancePhase()──> advanced
  ↑                                                                                        │
  └────────────────────────────────────reset()───────────────────────────────────────────┘
```

### Key Features

1. **Single Source of Truth**: Controller is the sole owner of phase lifecycle
2. **Atomic State Transitions**: State changes are validated and logged
3. **Automatic Timer Cleanup**: All timers cancelled when entering summarizing state
4. **Scheduler Blocking**: Scheduler start requests blocked during summarizing/advanced
5. **Immediate Advancement**: OK button triggers immediate phase transition

## Files Modified

### js/social-maneuvers.js (Primary Owner)
- Added `SocialPhaseController` object with state machine
- `onSocialPhaseStart()` uses `controller.startPhase()`
- `showSummaryPanel()` uses `controller.beginSummarizing()` - cancels all timers
- `generatePhaseSummary()` checks controller state to prevent cached reuse
- OK button handler uses `controller.advancePhase()`
- Controller exported in public API

### js/social.js (Delegate)
- `startSocialIntermission()` stores advance callback in controller
- Single callback registration before any async operations
- Throws error if controller not available (fail-fast)

### js/social-ai-scheduler.js (Scheduler)
- `startAiSocialPhase()` checks `controller.shouldBlockSchedulerStart()`
- Watchdog checks controller state before restarting stalled loop
- Prevents starts during summarizing/advanced states

### js/social/social-ai-autostart.js (Auto-Driver)
- `handleSocialPhaseStart()` checks controller state
- `handlePhaseChanged()` checks controller state
- Prevents duplicate starts when controller is summarizing/advanced

### js/phase-terminator.js (Cleanup)
- `_scheduleDelayedStop()` checks controller state
- `_stopSocialAI()` skips delayed stops during summarizing/advanced
- No interference with controller-managed phase end

## Testing

### Automated Tests
- ✅ `npm run test:social` - all requirements verified
- ✅ `test_social_phase_controller.html` - controller unit tests
- ✅ JavaScript syntax validation - all files pass
- ✅ CodeQL security scan - 0 vulnerabilities found

### Manual Testing
1. Start game → HOH → nominations → veto
2. Enter social intermission phase
3. Spend all social energy OR let timer expire
4. Summary shows (single time)
5. Click OK button
6. **Expected**: Immediate advance to nominations with no lingering timer
7. **Expected**: Game continues normally

### Console Log Verification
**✅ Expected patterns:**
```
[SocialPhaseController] ▶️ Starting phase (idle -> running)
[social.js] ✓ Phase advancement callback stored in controller
[SocialPhaseController] 📊 Begin summarizing (running -> summarizing)
[SocialPhaseController] ❌ Canceling all timers
[SocialPhaseController] ✅ Advancing phase (summarizing -> advanced)
```

**❌ Should NOT see:**
```
[social-ai-autostart] Already running - ignoring duplicate start
[ai-scheduler] Not in social phase - stopping
[social-maneuvers] Summary already generated - returning cached version
```

## Acceptance Criteria

All requirements met:

✅ Social intermission runs under single owner with single timer  
✅ When summary shown, all social timers/schedulers/watchdogs cancelled  
✅ OK button immediately advances with no lingering countdown  
✅ Summary generated at most once per social phase  
✅ No auto-restarts of scheduler while summary open or after phase end  
✅ Phase terminator does not schedule delayed stops during summarizing/advanced  

## Code Review

All review feedback addressed:
- ✅ Removed redundant `clearAllTimers()` alias
- ✅ Removed redundant `__socialPhaseStartCalled` guard
- ✅ Removed redundant `socialSummaryOpen` flag check  
- ✅ Made controller requirement explicit (throws error if missing)

## Security

- ✅ CodeQL analysis: 0 alerts
- ✅ No new dependencies added
- ✅ No external API calls
- ✅ All game state remains client-side

## Backward Compatibility

- ✅ Public API unchanged (controller added to exports)
- ✅ Existing game saves unaffected
- ✅ All existing tests pass
- ✅ Social Maneuvers feature flag still respected

## Performance Impact

**Minimal overhead:**
- State machine transitions: O(1)
- Timer cancellation: O(1) per timer (max 5 timers)
- No new background processes
- No additional DOM manipulation

## Future Improvements

Potential enhancements (not in scope):
1. Add controller state telemetry/metrics
2. Add state transition event emitters
3. Add controller reset on game restart
4. Add more granular state logging (debug mode)

## References

- Problem statement: Issue description (image1.png screenshot)
- Test file: `test_social_phase_controller.html`
- Social tests: `npm run test:social`
- Controller implementation: `js/social-maneuvers.js:27-179`
