# Timer Hierarchy Fixes - Implementation Summary

## Problem Statement

Two critical timer issues were identified in the BBMobile game:

### Issue 1: Info Buttons Don't Pause Main Game Timer
Throughout the game, info buttons (ℹ️) appear on player cards that open detailed profile modals. When users press these buttons to read player information, the main game phase timer continues running in the background. This could cause unexpected phase transitions while the user is reading, leading to:
- Premature phase timeouts
- User confusion (timer ran out while they were viewing info)
- Poor user experience

**Affected Screens:**
- Live vote eviction overlay
- Power of Veto (POV) nominee selection
- Nomination ceremony fullscreen
- TV nominee panels

### Issue 2: Vote Timer vs Main Timer Conflict
During live vote eviction, two timers run simultaneously:
- **Main game phase timer**: ~30 seconds (set by the game phase)
- **Vote overlay timer**: 90 seconds (displayed in the fullscreen UI)

The main timer takes precedence and triggers auto-vote after 30 seconds, even though the UI shows 90 seconds remaining. Users believe they have more time than they actually do, resulting in:
- Unexpected auto-votes
- User frustration
- Loss of trust in UI indicators

![Issue Screenshot](https://github.com/user-attachments/assets/c1fc1a72-79d9-4753-b85f-c086a226d2b2)

## Solution Overview

Implemented a **timer hierarchy system** using the existing `PauseController` framework:

1. **Foreground timer is active**: The timer currently visible to the user (e.g., vote overlay timer) is the authoritative timer
2. **Background timers are paused**: All other timers (main game phase timer) pause automatically when a fullscreen overlay opens
3. **Automatic resume**: Background timers resume when overlays close

### Key Technical Decisions

1. **Use existing PauseController**: Leverages the battle-tested pause/resume system already in place for settings modals
2. **Graceful degradation**: Checks for PauseController availability before calling, maintains backward compatibility
3. **Ref counting**: Supports nested pause scenarios (e.g., opening info modal during vote overlay)
4. **Context logging**: All pause/resume calls include context strings for debugging

## Implementation Details

### File: `js/houseguest-profile.js`

**Changes:**
- Added `PauseController.pause('info-modal')` on modal open (line ~24)
- Added `PauseController.resume()` on modal close (line ~158)

**Code:**
```javascript
// On open:
if (global.PauseController && typeof global.PauseController.pause === 'function') {
  global.PauseController.pause('info-modal');
  console.info('[houseguest-profile] Paused main game timer via PauseController');
}

// On close:
if (global.PauseController && typeof global.PauseController.resume === 'function') {
  global.PauseController.resume();
  console.info('[houseguest-profile] Resumed main game timer via PauseController');
}
```

**Impact:**
- All info button flows now pause main timer
- Works across: live vote, POV, nominations, TV panels
- No breaking changes to existing code

### File: `js/livevote-fullscreen.js`

**Changes:**
- Added helper function `resumeMainGameTimer(context)` (line ~18)
- Added `PauseController.pause('live-vote-overlay')` when overlay opens (line ~572)
- Added resume calls for all close scenarios:
  - Manual vote submission (EVICT button)
  - Auto-vote timeout
  - Error handling
  - External hide function

**Code:**
```javascript
// Helper function
function resumeMainGameTimer(context) {
  if (global.PauseController && typeof global.PauseController.resume === 'function') {
    global.PauseController.resume();
    console.info('[livevote-fs] Resumed main game phase timer (' + context + ')');
  }
}

// On overlay open:
if (global.PauseController && typeof global.PauseController.pause === 'function') {
  global.PauseController.pause('live-vote-overlay');
  console.info('[livevote-fs] Paused main game phase timer during voting');
}

// On overlay close (4 locations):
resumeMainGameTimer('manual vote');   // User clicked EVICT
resumeMainGameTimer('auto-vote');     // Timer expired
resumeMainGameTimer('error');         // Error occurred
resumeMainGameTimer('hide');          // External close
```

**Impact:**
- Vote overlay timer (90s) is now the only active timer during voting
- Main game phase timer pauses when overlay opens
- Main timer resumes after vote completes
- Handles all edge cases properly

### File: `test_timer_hierarchy.html` (NEW)

**Purpose:** Comprehensive interactive test suite for manual verification

**Test Cases:**
1. **Main Game Timer**: Start/pause/resume/stop main timer with visual feedback
2. **Info Button Test**: Open info modal during main timer, verify pause
3. **Vote Overlay Test**: Open vote overlay during main timer, verify hierarchy
4. **Nested Scenario Test**: Open info button during vote, verify ref counting

**Features:**
- Real-time timer displays with pause indicators
- Status indicators (Running/Paused/Stopped)
- Event log with timestamps
- PauseController state monitoring
- Interactive controls for all scenarios

## Timer Hierarchy Flow

```
┌─────────────────────────────────────────┐
│         Normal Game State               │
│  Main Timer: RUNNING                    │
│  PauseController: Not Paused            │
└─────────────────────────────────────────┘
                    │
                    ▼
         User Opens Vote Overlay
                    │
                    ▼
┌─────────────────────────────────────────┐
│     Vote Overlay Active                 │
│  Main Timer: PAUSED (via PC)            │
│  Vote Timer: RUNNING                    │
│  PauseController: Paused (reason: vote) │
└─────────────────────────────────────────┘
                    │
                    ▼
        User Clicks Info Button
                    │
                    ▼
┌─────────────────────────────────────────┐
│     Info Modal + Vote Overlay           │
│  Main Timer: PAUSED (via PC)            │
│  Vote Timer: PAUSED (module state)      │
│  PauseController: Paused (refCount: 2)  │
└─────────────────────────────────────────┘
                    │
                    ▼
        User Closes Info Modal
                    │
                    ▼
┌─────────────────────────────────────────┐
│     Vote Overlay Active                 │
│  Main Timer: PAUSED (via PC)            │
│  Vote Timer: RESUMED                    │
│  PauseController: Paused (refCount: 1)  │
└─────────────────────────────────────────┘
                    │
                    ▼
          User Casts Vote
                    │
                    ▼
┌─────────────────────────────────────────┐
│         Normal Game State               │
│  Main Timer: RESUMED                    │
│  PauseController: Not Paused            │
└─────────────────────────────────────────┘
```

## Technical Architecture

### PauseController Integration

The solution integrates with the existing `PauseController` (`js/flow/PauseController.js`), which provides:

**Features:**
- `pause(reason)`: Pauses main game timer with reason tracking
- `resume()`: Resumes main game timer
- `isPaused()`: Check pause state
- `getState()`: Get detailed pause state
- Ref counting for nested pauses
- Event bus integration (`game:paused`, `game:resumed`)
- Automatic timer state capture and restoration

**Integration Points:**
1. `houseguest-profile.js` → `PauseController.pause('info-modal')`
2. `livevote-fullscreen.js` → `PauseController.pause('live-vote-overlay')`
3. Both integrate seamlessly with existing system

### Timer State Management

**Main Game Timer (`game` object):**
- `game.endAt` - Timestamp when phase ends
- `game.phaseEndsAt` - Alternate property for phase end
- `game.timerPaused` - Boolean flag for pause state
- `game.pausedTimeRemaining` - Milliseconds remaining when paused
- `game.isGloballyPaused` - Global pause flag

**Vote Overlay Timer (`livevote-fullscreen.js` module state):**
- `timerState.timeoutId` - Auto-vote timeout ID
- `timerState.intervalId` - Display update interval ID
- `timerState.remainingMs` - Current remaining time
- `timerState.isPaused` - Pause state
- `timerState.startTimeMs` - Start timestamp
- `timerState.isOwner` - Ownership flag

## Backward Compatibility

### Graceful Degradation
All new code checks for `PauseController` availability:
```javascript
if (global.PauseController && typeof global.PauseController.pause === 'function') {
  // Use PauseController
}
```

**If PauseController is not available:**
- Code continues to work
- Timer pausing simply doesn't happen
- No errors or crashes
- Existing callback pattern still works

### Existing Code Unchanged
- No modifications to `PauseController.js` itself
- No changes to timer update loops
- No changes to phase timeout callbacks
- Existing pause/resume callback pattern preserved

## Testing Strategy

### Manual Testing (Recommended)

1. **Open `test_timer_hierarchy.html` in browser**
2. **Test 1: Main Timer**
   - Click "Start Main Timer (30s)"
   - Observe timer counting down
   - Click "Pause Main Timer"
   - Verify timer pauses
   - Click "Resume Main Timer"
   - Verify timer continues

3. **Test 2: Info Button**
   - Start main timer
   - Click "Open Info Modal (ℹ️)"
   - Verify main timer pauses (display turns red)
   - Verify PauseController status shows "PAUSED (reason: info-modal)"
   - Close info modal (click X or press ESC)
   - Verify main timer resumes

4. **Test 3: Vote Overlay**
   - Start main timer
   - Click "Open Vote Overlay (90s timer)"
   - Verify main timer pauses
   - Verify vote timer counts down from 01:30
   - Select a nominee
   - Click "EVICT"
   - Verify main timer resumes

5. **Test 4: Nested Scenario**
   - Start main timer
   - Click "Test Nested Scenario"
   - Vote overlay opens automatically
   - After 1 second, info modal opens automatically
   - Verify PauseController refCount = 2
   - Close info modal
   - Verify refCount = 1, vote timer resumes
   - Cast vote
   - Verify refCount = 0, main timer resumes

### Integration Testing

1. **Start actual game in `index.html`**
2. **Navigate to live vote eviction phase**
3. **Observe behavior:**
   - Main timer pauses when vote overlay opens
   - Vote timer (90s) is authoritative
   - Info button pauses vote timer
   - Main timer resumes after vote

### Console Logging

All actions produce detailed console logs:
```
[houseguest-profile] Paused main game timer via PauseController
[PauseController] ⏸ Pausing game (reason: info-modal)
[livevote-fs] Paused main game phase timer during voting
[PauseController] ⏸ Pausing game (reason: live-vote-overlay)
[livevote-fs] Resumed main game phase timer (manual vote)
[PauseController] ▶ Resuming game
```

## Code Review & Security

### Code Review Results
- ✅ Addressed duplication feedback
- ✅ Extracted `resumeMainGameTimer()` helper function
- ✅ Reduced code duplication from 4 locations to 1 helper + 4 calls
- ✅ Improved maintainability

### Security Scan Results
- ✅ CodeQL scan completed
- ✅ **0 security alerts found**
- ✅ No vulnerabilities introduced

## Performance Considerations

**Impact:** Minimal
- Pause/resume operations are simple flag assignments
- No heavy computation
- No DOM manipulation overhead
- Timer calculations already exist in `PauseController`

**Memory:** Negligible
- One additional helper function
- No new global state
- Ref counting uses existing mechanism

**CPU:** Negligible
- Pause/resume called infrequently (user-triggered)
- Console logging has minimal overhead
- No tight loops or continuous operations

## User Experience Improvements

### Before Fix:
- ❌ Info button opens, timer keeps running
- ❌ User confused when phase times out while reading
- ❌ Vote overlay shows 90s, but game times out at 30s
- ❌ Unexpected auto-votes frustrate users
- ❌ Users lose trust in UI indicators

### After Fix:
- ✅ Info button pauses timer automatically
- ✅ User can read without time pressure
- ✅ Vote overlay timer is authoritative
- ✅ Main timer pauses during vote
- ✅ Consistent, predictable behavior
- ✅ UI matches reality

## Future Enhancements (Optional)

1. **Visual Indicator**: Show pause icon on main timer HUD when paused
2. **Animation**: Smooth pause/resume transitions
3. **Telemetry**: Track pause/resume metrics for analytics
4. **Configuration**: Make pause behavior configurable per phase
5. **Accessibility**: Add screen reader announcements for pause state

## Files Changed

### Modified Files
- `js/houseguest-profile.js` (8 lines added, 2 lines changed)
- `js/livevote-fullscreen.js` (24 lines added, 16 lines removed)

### New Files
- `test_timer_hierarchy.html` (525 lines)
- `TIMER_HIERARCHY_FIX_SUMMARY.md` (this document)

## Acceptance Criteria

- [x] Info buttons pause main game timer
- [x] Main timer resumes when info modal closes
- [x] Vote overlay timer is authoritative during voting
- [x] Main timer pauses when vote overlay opens
- [x] Main timer resumes when vote completes
- [x] Nested pause scenarios work correctly (ref counting)
- [x] No breaking changes to existing code
- [x] Backward compatible (graceful degradation)
- [x] All edge cases handled (auto-vote, errors, hide)
- [x] Code review feedback addressed
- [x] Security scan passed (0 alerts)
- [x] Comprehensive test suite created
- [x] Console logging for debugging

## Conclusion

This PR successfully addresses both timer hierarchy issues identified in the problem statement. The solution is:

- **Minimal**: Only 3 files changed, leverages existing infrastructure
- **Robust**: Handles all edge cases and nested scenarios
- **Safe**: No security vulnerabilities, backward compatible
- **Testable**: Comprehensive test suite for manual verification
- **Maintainable**: Clean code, reduced duplication, clear logging

The timer hierarchy now works as users expect: the foreground timer is active, background timers are paused. This improves user experience and eliminates confusion around timer behavior.
