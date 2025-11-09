# Skip Fast-Forward System Integration Guide

## Overview

The Skip Fast-Forward system provides a centralized, idempotent mechanism for draining all UI animations, timeouts, and pending operations when the player presses the Skip button during any game phase.

## Architecture

### Core Components

1. **SkipController** (`js/runtime/skip-controller.js`)
   - Orchestrates skip mode state
   - Manages drainer registration
   - Executes drain loop
   - Fast-forwards GSAP timelines

2. **SkipUtils** (`js/runtime/skip-utils.js`)
   - Skip-aware `sleep()` function
   - Skip-aware `registerTimeout()` function
   - Timeout tracking and cancellation

3. **Subsystem Drainers**
   - Each subsystem registers a drainer function
   - Drainers return `true` if work was performed
   - Called iteratively until stable

## API Reference

### SkipController

```javascript
// Enable skip mode
SkipController.enable();

// Execute drain loop (async)
await SkipController.drainLoop();

// Complete skip mode
SkipController.complete();

// Check if skip is active
const isActive = SkipController.isActive();

// Register a drainer
SkipController.registerDrainer('mySubsystem', function drainer() {
  // Perform cleanup work
  // Return true if work was done, false if nothing to do
  return didWork;
});
```

### SkipUtils

```javascript
// Sleep with skip awareness
await SkipUtils.sleep(1000); // Resolves instantly if skip active

// Register timeout with skip awareness
const timeoutId = SkipUtils.registerTimeout(() => {
  console.log('This runs immediately if skip active');
}, 1000);

// Cancel specific timeout
SkipUtils.cancelTimeout(timeoutId);

// Cancel all registered timeouts
SkipUtils.cancelAllTimeouts();
```

## Integration Flow

### 1. fastForwardPhase() (ui.hud-and-router.js)

```javascript
async function fastForwardPhase() {
  // 1. Enable skip mode
  SkipController.enable();
  
  // 2. Stop audio and clear phase cards
  cancelAllPhaseAudio();
  flushPhaseCards();
  
  // 3. Adjust game timers
  game.endAt = Date.now() + 1000;
  
  // 4. Execute drain loop
  await SkipController.drainLoop();
  
  // 5. Complete skip mode
  SkipController.complete();
  
  // 6. Advance to next phase
  advancePhase();
}
```

### 2. Drain Loop Execution

The drain loop runs iteratively:

1. Fast-forward all active GSAP timelines
2. Call all registered drainers
3. If any work was performed, repeat (up to 20 passes)
4. Log warning if safety cap reached

### 3. Subsystem Integration

Each subsystem implements:

1. **Skip detection** - Check `SkipController.isActive()`
2. **Immediate actions** - Auto-apply first action, skip animations
3. **Drainer function** - Clean up residual state
4. **Drainer registration** - Register at module init

## Registered Drainers

### legacyCards (ui.hud-and-router.js)
- Removes all `.revealCard` elements
- Removes `#decisionDeck`
- Clears `#tvOverlay` content
- Removes `#introDeck`

### timeouts (skip-utils.js)
- Cancels all registered timeouts

### introShow (introShow.js)
- Kills all GSAP timelines
- Clears all timeouts
- Removes intro overlay
- Resets active state

### socialDecisions (social.js)
- Auto-applies first action for queued decisions
- Clears active decision card
- Empties decision queue

### resultsPopup (results-popup.js)
- Removes any `.results-modal-overlay` elements

### numberTriviaQuiz (number-trivia-quiz.js)
- Ends active game with `reason='skip'`
- Invokes onComplete callback immediately

## Adding New Drainers

To make a new subsystem skip-aware:

### 1. Detect Skip Mode

```javascript
if (window.SkipController?.isActive()) {
  // Skip behavior: immediate actions, no UI
  return;
}
```

### 2. Implement Drainer

```javascript
function mySubsystemDrainer() {
  let didWork = false;
  
  // Clean up UI elements
  const elements = document.querySelectorAll('.my-subsystem-card');
  if (elements.length > 0) {
    elements.forEach(el => el.remove());
    didWork = true;
  }
  
  // Clear state
  if (mySubsystem.isActive) {
    mySubsystem.reset();
    didWork = true;
  }
  
  return didWork;
}
```

### 3. Register Drainer

```javascript
if (window.SkipController) {
  window.SkipController.registerDrainer('mySubsystem', mySubsystemDrainer);
}
```

## Best Practices

### DO:
- ✅ Check `isActive()` before rendering UI
- ✅ Return `true` from drainer if work was performed
- ✅ Use `SkipUtils.sleep()` for delays in skip-aware code
- ✅ Clean up all subsystem state in drainer
- ✅ Test with rapid skip button presses

### DON'T:
- ❌ Render UI when skip is active
- ❌ Use raw `setTimeout()` for critical timing (use SkipUtils)
- ❌ Forget to remove DOM elements in drainer
- ❌ Throw errors from drainer (catch and log)
- ❌ Assume skip can only happen once

## Testing

### Manual Testing Checklist

1. **Intro Sequence**
   - Press Skip during intro
   - Verify: No lingering cards or animations
   - Verify: Overlay removed immediately

2. **Social Decisions**
   - Press Skip during social phase with queued decisions
   - Verify: All decisions auto-applied
   - Verify: No 420ms delayed cards appear

3. **Results Popup**
   - Press Skip during competition results display
   - Verify: Popup does not appear
   - Verify: Scoring still occurs

4. **Minigame**
   - Press Skip during Number Trivia Quiz
   - Verify: Game ends immediately
   - Verify: Single onComplete callback
   - Verify: Score calculated

5. **Rapid Skip**
   - Press Skip button multiple times quickly
   - Verify: Single phase advancement
   - Verify: No errors in console

### Debug Tools

```javascript
// Check active drainers
console.log(SkipController.getRegisteredDrainers());

// Check active timeout count
console.log(SkipUtils.getActiveTimeoutCount());

// Check if skip is active
console.log(SkipController.isActive());
```

## Edge Cases Handled

1. **Re-entrancy Prevention**
   - `drainLoop()` guards against concurrent execution
   - Multiple `enable()` calls log warning, no duplicate work

2. **Safety Cap**
   - Drain loop limited to 20 passes
   - Warning logged if cap reached
   - Prevents infinite loops from cascading enqueues

3. **GSAP Timeline Cleanup**
   - All timelines force-progressed to `progress(1)` then killed
   - Handles infinite repeat timelines

4. **Scoring Side Effects**
   - Results popup suppressed but scoring still happens
   - Minigame onComplete always called exactly once

## Performance Considerations

- Drain loop runs synchronously per pass
- Small 0ms setTimeout between passes for DOM updates
- Typical completion: 1-3 passes
- Maximum passes: 20 (safety cap)

## Future Enhancements

Potential improvements not in initial implementation:

1. **Audio Drainer**
   - Fade-out all active audio tracks
   - Cancel pending audio plays

2. **Generic Popup Drainer**
   - Replace cardQueueWaitIdle with skip-aware version
   - Drain all popup/modal systems

3. **Telemetry**
   - Track skip events
   - Log drain loop statistics
   - Monitor safety cap triggers

4. **Animation System Integration**
   - CSS animation cancellation
   - Web Animations API support

## Troubleshooting

### Issue: Cards still appear after skip
**Solution:** Check that subsystem checks `isActive()` before rendering

### Issue: Safety cap reached
**Solution:** Check for cascading enqueues in drainer. Ensure drainer returns false when no work done.

### Issue: onComplete not called
**Solution:** Verify drainer invokes callback before returning true

### Issue: Multiple phase advancements
**Solution:** Check idempotency guard in `fastForwardPhase()`

## File Locations

- Core: `js/runtime/skip-controller.js`
- Utils: `js/runtime/skip-utils.js`
- Integration: `js/ui.hud-and-router.js` (fastForwardPhase + legacyCards drainer)
- Subsystems:
  - `js/introShow.js` (intro drainer)
  - `js/social.js` (socialDecisions drainer)
  - `js/results-popup.js` (resultsPopup drainer)
  - `js/minigames/number-trivia-quiz.js` (numberTriviaQuiz drainer)

## Related Documentation

- `docs/minigames.md` - Minigame system architecture
- `INTRO_SHOW_GUIDE.md` - Intro sequence details
- `SOCIAL_MANEUVERS_COMPLETE.md` - Social system integration

---

**Last Updated:** 2025-11-09
**Version:** 1.0
