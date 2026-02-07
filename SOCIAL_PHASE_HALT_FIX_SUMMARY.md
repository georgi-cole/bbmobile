# Social Phase Flow Race Condition Fix - Complete Summary

## Problem
The social phase flow was completely broken after the social summary appeared:

1. **Summary showed twice** - After clicking OK, the summary would reappear
2. **Timer continued running** - Timer kept counting even after phase should have ended
3. **Game halted** - Never advanced to nominations phase after timer ran out
4. **Console errors** - Duplicate call warnings and race condition logs

### Console Logs (Bug Symptoms):
```
[social-maneuvers] ⚠ No callback found — advancing via fallback
[social-maneuvers] onSocialPhaseEnd already called - ignoring duplicate
[PhaseTimerBridge] ⚠ Manual resume called
```

## Root Cause Analysis

Multiple competing phase-end paths created race conditions:

### The Race Condition Flow:

1. **Timer expires** → `onDone()` fires → stores callback → calls `onSocialPhaseEnd()` → shows summary → returns early
2. **User clicks OK** → OK handler sets `socialSummaryOpen = false` (resetting guard TOO EARLY) → **RESUMES TIMER** → starts 400ms animation
3. **After 400ms**, OK handler calls `game.__socialPhaseAdvanceCallback()` → which calls `advanceToNextPhase()` → which calls the original `callback` or `startNominations()`
4. **BUT**: `advanceToNextPhase()` calls the original `callback` from `setPhase`, which calls `setPhase('nominations', ...)`
5. **The `setPhase` wrapper** detects leaving `social_intermission` → calls `handleSocialPhaseExit()` → **resets flags**
6. **MEANWHILE**: The timer was RESUMED in step 2, so it's still counting down. When it hits 0 again, `defaultAdvance` fires
7. **AND**: The `socialSummaryOpen` guard was reset in step 2, so if anything triggers `showSummaryPanel` again, it shows a SECOND time
8. **The second OK click** tries to advance but `__socialPhaseAdvanced` is already true → ignored → **game halts**

### Three Problem Areas:

#### Problem 1: Complex `onDone()` with Fallback Logic
```javascript
// OLD CODE - Multiple fallback paths
let summaryShown = false;
if(SocialManeuvers.showSummaryPanel) {
  // try this
  summaryShown = true;
} else if(SocialManeuvers.showEndOfPhaseSummary) {
  // or try this
  summaryShown = true;
} else if(SocialManeuvers.presentPhaseSummary) {
  // or try this
  summaryShown = true;
}
if(!summaryShown) {
  // fallback advance
}
```

#### Problem 2: OK Button Handler Issues
```javascript
// OLD CODE - Timer resume + delayed callback
socialSummaryOpen = false; // Reset guard TOO EARLY

// Resume timer when phase is ending (WRONG!)
PauseController.resume('social-summary');

// Wait 400ms before advancing (race condition window)
setTimeout(() => {
  g.__socialPhaseAdvanceCallback(); // Called too late
}, 400);
```

#### Problem 3: Premature Flag Resets
```javascript
// OLD CODE - handleSocialPhaseExit()
function handleSocialPhaseExit() {
  // ... UI cleanup ...
  
  // WRONG: Reset flags during phase exit
  delete global.game.__socialPhaseStartCalled;
  delete global.game.__socialPhaseEndCalled;
}
```

## Solution

### 1. Simplified `onDone()` in js/social.js

**Removed:**
- ❌ Complex fallback logic with multiple summary methods
- ❌ `summaryShown` tracking variable
- ❌ Multiple try-catch blocks for different methods
- ❌ Cleanup before showing summary

**Added:**
- ✅ Single, clean summary path
- ✅ Cleanup before advancement (proper timing)
- ✅ Clear error messages (no duplicate warnings)
- ✅ Immediate advancement if no summary

**New Flow:**
```javascript
const onDone = async () => {
  // 1. Store callback FIRST
  global.game.__socialPhaseAdvanceCallback = advanceToNextPhase;
  
  // 2. Call onSocialPhaseEnd (with idempotency guard)
  SocialManeuvers.onSocialPhaseEnd();
  
  // 3. Hide launcher
  SocializeMobile.hide();
  
  // 4. Wait for pending UI operations
  await cardQueueWaitIdle();
  
  // 5. Try to show summary (single method, no fallbacks)
  const summary = SocialManeuvers.generatePhaseSummary();
  if(summary) {
    SocialManeuvers.showSummaryPanel(summary);
    return; // Exit early - OK button handles advancement
  }
  
  // 6. No summary? Cleanup and advance immediately
  endSocialPhaseCleanup();
  advanceToNextPhase();
};
```

### 2. Fixed OK Button Handler in js/social-maneuvers.js

**Removed:**
- ❌ Timer resume logic (`PauseController.resume`)
- ❌ Early guard reset (`socialSummaryOpen = false` before callback)
- ❌ 400ms delay before calling advancement callback
- ❌ Redundant fallback check

**Added:**
- ✅ Immediate callback execution (synchronous)
- ✅ UI cleanup in background (non-blocking)
- ✅ Guard reset AFTER callback (in setTimeout)
- ✅ Clean separation of concerns

**New Flow:**
```javascript
continueBtn.onclick = () => {
  // 1. Call advancement callback FIRST (synchronous)
  g.__socialPhaseAdvanceCallback();
  delete g.__socialPhaseAdvanceCallback;
  
  // 2. Start UI animation (non-blocking)
  card.style.animation = 'popOut 0.4s ease forwards';
  
  // 3. Cleanup after animation completes
  setTimeout(() => {
    card.remove();
    backdrop.remove();
    
    // Reset guard AFTER everything is done
    socialSummaryOpen = false;
  }, 400);
};
```

### 3. Fixed `handleSocialPhaseExit()` in js/social.js

**Removed:**
- ❌ Premature flag resets
- ❌ Phase end logic in exit handler

**Kept:**
- ✅ Only UI cleanup (hiding launcher)

**Flag Management:**
- Flags NOW reset in `startSocialIntermission()` (phase start)
- Flags stay set during phase exit
- Proper lifecycle: reset → phase runs → end guard stays set → next phase resets

## Files Modified

### js/social.js (3 changes)
1. **Lines 562-640**: Simplified `onDone()` callback
   - Removed complex fallback logic
   - Single summary path
   - Better error messages
   - Cleanup timing fixed

2. **Lines 728-740**: Fixed `handleSocialPhaseExit()`
   - Removed flag resets
   - Only UI cleanup

3. **Lines 502-507**: Flag resets (already in `startSocialIntermission`)
   - Verified proper reset timing

### js/social-maneuvers.js (1 change)
1. **Lines 3710-3762**: Fixed OK button handler
   - Removed timer resume
   - Callback before animation
   - Guard reset timing fixed
   - Removed redundant check

## Expected Behavior After Fix

### Normal Flow:
```
1. Social phase timer runs
2. Timer expires → onDone() fires ONCE
3. Summary appears ONCE
4. User clicks OK
5. Callback executes immediately
6. Game advances to nominations
7. UI animates out in background
```

### Timeline:
```
T+0ms:   Timer expires
T+0ms:   onDone() fires
T+0ms:   Store callback
T+0ms:   Call onSocialPhaseEnd() [guard set]
T+0ms:   Show summary
T+0ms:   Return (wait for user)

T+Xms:   User clicks OK
T+Xms:   Call callback immediately [phase advances]
T+Xms:   Start card animation
T+X+400: Remove card and backdrop
T+X+400: Reset socialSummaryOpen
```

### Console Logs (Expected):
```
✅ [social.js] ✓ Phase advancement callback stored
✅ [social.js] ✓ Showed summary via showSummaryPanel
✅ [social-maneuvers] ✓ Calling stored phase advancement callback
✅ [social.js] ✓ Advancing to next phase
```

### Console Logs (Should NOT See):
```
❌ onSocialPhaseEnd already called - ignoring duplicate
❌ Phase already advanced - ignoring duplicate call
❌ ▶️ Timer resumed (OK pressed)
❌ No callback found — advancing via fallback
```

## Verification

### Automated Checks (All Passing ✅)
```bash
# Verify code changes
✅ Removed fallback summary methods (showEndOfPhaseSummary, presentPhaseSummary)
✅ Removed summaryShown tracking variable
✅ OK handler does not resume timer
✅ Callback called before setTimeout (synchronous execution)
✅ socialSummaryOpen reset moved to setTimeout callback
✅ No flag resets in handleSocialPhaseExit
✅ Flags properly reset in startSocialIntermission

# Syntax and tests
✅ JavaScript syntax valid (node -c)
✅ Social phase requirements verified (npm run test:social)
✅ No security vulnerabilities (CodeQL scan: 0 alerts)
```

### Manual Testing Steps
1. Load game and start new game
2. Skip to social intermission phase
3. Let timer run out without any actions
4. **Verify:** Summary shows ONCE
5. Click OK button
6. **Verify:** Game advances to nominations immediately
7. **Verify:** No duplicate summary
8. **Verify:** No timer continuation
9. **Verify:** Expected console logs appear

### Test Files
- `test_social_phase_halt_fix.html` - Automated verification page
- Run verification checks in browser
- Includes manual testing guide

## Impact

### Before Fix:
- ❌ Game completely broken at social phase
- ❌ Required page refresh to continue
- ❌ Confusing duplicate summaries
- ❌ Timer behavior unpredictable
- ❌ Console flooded with warnings

### After Fix:
- ✅ Smooth phase transition
- ✅ Single summary display
- ✅ Immediate advancement on OK
- ✅ Predictable, debuggable flow
- ✅ Proper idempotency guards
- ✅ Clean console logs

## Technical Details

### Idempotency Guards - Proper Lifecycle

1. **`__socialPhaseAdvanced`** (game-level)
   - **Purpose**: Prevents double advancement to next phase
   - **Set**: When `advanceToNextPhase()` is called
   - **Reset**: At start of new social phase (`startSocialIntermission` line 503)
   - **Scope**: Entire social phase lifecycle

2. **`__socialPhaseEndCalled`** (game-level)
   - **Purpose**: Prevents double execution of `onSocialPhaseEnd()`
   - **Set**: When `onSocialPhaseEnd()` is called
   - **Reset**: At start of new social phase (`startSocialIntermission` line 506)
   - **NOT reset**: In `handleSocialPhaseExit()` anymore (critical fix!)

3. **`socialPhaseEnded`** (module-level in social-maneuvers.js)
   - **Purpose**: Prevents double execution of `endSocialPhaseNow()`
   - **Set**: When `endSocialPhaseNow()` is called
   - **Reset**: At start of new phase (`onSocialPhaseStart` line 3114)

4. **`socialSummaryOpen`** (module-level in social-maneuvers.js)
   - **Purpose**: Prevents double display of summary panel
   - **Set**: When `showSummaryPanel()` is called
   - **Reset**: AFTER OK button callback completes (in setTimeout, line 3760)
   - **Critical**: Reset timing fixed - was too early, now properly delayed

### Call Sequence (Successful Flow)
```
startSocialIntermission()
  ├─ Reset flags (__socialPhaseAdvanced, __socialPhaseEndCalled)
  └─ Call onSocialPhaseStart()

setPhase('social_intermission', 30, onDone)
  └─ Timer starts counting down

[... user may do actions ...]

Timer expires → onDone()
  ├─ Store __socialPhaseAdvanceCallback
  ├─ Call onSocialPhaseEnd() [sets __socialPhaseEndCalled]
  ├─ Hide launcher
  ├─ Generate summary
  ├─ Show summary panel [sets socialSummaryOpen]
  └─ Return (wait for user)

User clicks OK → continueBtn.onclick
  ├─ Call __socialPhaseAdvanceCallback() [sets __socialPhaseAdvanced]
  │   └─ Advance to nominations (phase changes immediately)
  ├─ Start card animation (400ms)
  └─ setTimeout(400ms)
      ├─ Remove card and backdrop
      └─ Reset socialSummaryOpen

handleSocialPhaseExit() [triggered by setPhase('nominations')]
  └─ Hide launcher (UI cleanup only, no flag resets)

Next social phase
  └─ startSocialIntermission() resets all flags
```

### Timing is Critical

**Old (Broken):**
```
Click OK
  ↓
Reset guard (TOO EARLY)
  ↓
Resume timer (WRONG)
  ↓
Wait 400ms
  ↓
Call callback (TOO LATE)
  ↓
Race condition window = 400ms
```

**New (Fixed):**
```
Click OK
  ↓
Call callback immediately (RIGHT)
  ↓
Phase advances (RIGHT)
  ↓
Start animation (background)
  ↓
Wait 400ms for UI
  ↓
Reset guard (RIGHT timing)
  ↓
No race condition
```

## Code Review Feedback Addressed

1. ✅ **Improved error messages** - Removed duplicate warnings
2. ✅ **Fixed cleanup timing** - Moved `endSocialPhaseCleanup()` to before advancement
3. ✅ **Removed redundant check** - Cleaned up fallback logic
4. ✅ **Better code structure** - Single responsibility, clear separation

## Security

**CodeQL Analysis**: 0 vulnerabilities found

**Changes reviewed**:
- No external API calls
- No data exposure
- No injection risks
- Proper error handling maintained

## Backward Compatibility

✅ **Fully backward compatible**
- No API changes
- No data structure changes
- Existing game saves work correctly
- Internal phase transition logic only

## Testing Recommendations

### For Developers:
1. Run `npm run test:social` - Verify social phase requirements
2. Open `test_social_phase_halt_fix.html` - Run verification checks
3. Play through social phase manually - Verify smooth flow

### For QA:
1. Test with timer expiring naturally (no user actions)
2. Test with user doing actions before timer expires
3. Test with depleting energy before timer expires
4. Verify no duplicate summaries in all scenarios
5. Verify smooth transition to nominations in all scenarios

### For Users:
The fix is transparent. Social phase should now:
- Show summary once
- Advance smoothly when you click OK
- Never get stuck or require refresh

## Related Issues

This fix addresses the core problem described in the issue:
- ✅ Summary no longer shows twice
- ✅ Timer no longer continues after phase end
- ✅ Game no longer halts
- ✅ Proper phase advancement to nominations

## Future Improvements

While this fix resolves the race conditions, future enhancements could include:
- Centralized phase transition manager
- More robust guard system
- Better debugging tools for phase transitions
- Unit tests for phase transition logic

## Conclusion

The social phase flow is now:
- ✅ **Reliable** - No race conditions
- ✅ **Predictable** - Single execution path
- ✅ **Debuggable** - Clear console logs
- ✅ **Maintainable** - Simplified code structure

The fix ensures proper idempotency guard management, correct timing of operations, and a smooth user experience transitioning from the social phase to nominations.
