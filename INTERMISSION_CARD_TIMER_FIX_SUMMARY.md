# Intermission Card Timer Fix - Summary

## Issue #662: Intermission Card Does Not Disappear

### Problem
The intermission offer card showing "You cannot compete - Play Tic Tac Toe/Dots & Boxes while you wait?" persists beyond the phase timer expiration if the user doesn't click "Yes" or "No". This causes the card to overlap with subsequent UI elements and phases.

### Visual Issue
```
Timer: 00:26 seconds remaining
┌─────────────────────────────────────┐
│   Grid of houseguest portraits      │
│                                     │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│  "SOCIAL PHASE"                     │
│  "You cannot compete" 👈 STUCK!     │
│  Play Tic Tac Toe?                  │
│  [YES] [NO]                         │
│                                     │
│  "Evicted" overlay                  │
└─────────────────────────────────────┘
```

### Root Cause Analysis

1. **Card removal only on button clicks**:
   - `removeCard()` was only called when user clicked Yes or No buttons
   - No automatic cleanup mechanism existed

2. **Phase change cleanup limitations**:
   - Cleanup only triggered on phase TRANSITIONS (hoh→social, veto→nominations)
   - Timer expiration WITHIN the same phase didn't trigger cleanup
   - Card could persist through multiple phases if timer expired during the phase

3. **No timer monitoring**:
   - Card had no awareness of the phase timer
   - No polling or event listening to detect timer expiration

## Solution Implementation

### Technical Approach

Added an interval-based timer monitor that:
1. Polls `game.endAt` every 500ms
2. Detects when timer has expired (`game.endAt <= Date.now()`)
3. Automatically removes the card when expiration detected
4. Cleans up the interval properly to prevent memory leaks

### Code Changes

**File: `js/ui/intermissionCard.js`**

```javascript
// Set up timer monitor to auto-remove card when phase timer expires
if (global.game?.endAt) {
  console.info('[IntermissionCard] Setting up timer monitor (endAt:', global.game.endAt, ')');
  
  // Helper to clean up the timer monitor
  function clearTimerMonitor() {
    if (card._timerMonitor) {
      clearInterval(card._timerMonitor);
      card._timerMonitor = null;
    }
  }
  
  card._timerMonitor = setInterval(() => {
    // Check if card was already removed
    if (!card.parentNode) {
      clearTimerMonitor();
      return;
    }
    
    // Check if timer has expired
    const game = global.game;
    if (game?.endAt && game.endAt <= Date.now()) {
      console.info('[IntermissionCard] Timer expired, auto-removing card');
      clearTimerMonitor();
      removeCard();
    }
  }, 500); // Check every 500ms
}
```

### Key Design Decisions

1. **Polling interval: 500ms**
   - Balance between responsiveness and performance
   - Card removes within 0.5s of timer expiration
   - Minimal CPU usage (2 checks per second)

2. **Cleanup helper function**
   - Addresses code review feedback
   - Reduces code duplication
   - Single source of truth for cleanup logic

3. **Safety checks**
   - Check if card still in DOM before removing
   - Clear interval if card already removed
   - Graceful fallback if `game.endAt` not available

4. **Integration with existing cleanup**
   - Updated `removeCard()` to clear timer monitor
   - Updated `removeActive()` to clear timer monitor
   - No breaking changes to existing APIs

## Testing

### Test File: `test_intermission_card_timer_fix.html`

Created comprehensive test page with:
- Visual timer countdown display
- Multiple test scenarios (5s, 10s timers)
- Event logging to track card lifecycle
- Manual controls for edge case testing

### Test Scenarios

1. **Primary test**: Show card with 10s timer, don't click anything
   - ✅ Expected: Card auto-removes when timer reaches 0
   - ✅ Actual: Card disappears automatically

2. **Secondary test**: Show card with 5s timer, verify shorter timeout
   - ✅ Expected: Same behavior with shorter timer
   - ✅ Actual: Works correctly

3. **Edge case**: Manual removal before timer expires
   - ✅ Expected: Timer monitor cleaned up, no errors
   - ✅ Actual: Clean removal, no leaks

### Automated Test Results

```
✅ npm run test:minigames - PASS
   - All 52 minigames validated
   - All 35 selector pool games resolve correctly
   - Legacy map validation passed

✅ Runtime validation - PASS
   - No breaking changes detected
   - All modules load successfully

✅ CodeQL security scan - PASS
   - 0 alerts found
   - No security vulnerabilities introduced
```

## Flow Diagram

### Before Fix
```
User is ineligible for competition
        ↓
Show intermission card
        ↓
Wait for user to click Yes/No
        ↓ (if no click)
Timer expires → Phase advances
        ↓
❌ Card STUCK on screen
```

### After Fix
```
User is ineligible for competition
        ↓
Show intermission card
        ↓
Start timer monitor (500ms interval)
        ↓
User clicks Yes/No?  OR  Timer expires?
        ↓                      ↓
    Remove card           Auto-remove card
        ↓                      ↓
        └─────────┬────────────┘
                  ↓
        ✅ Card properly removed
```

## Impact Assessment

### User-Facing Changes
- ✅ Intermission card now disappears automatically when timer expires
- ✅ No more overlapping UI elements
- ✅ Smoother game flow progression
- ✅ No impact on users who click Yes/No (existing behavior preserved)

### Technical Impact
- ✅ Minimal performance impact (interval runs only while card is shown)
- ✅ No breaking changes to existing APIs
- ✅ Backwards compatible with all existing code
- ✅ No new dependencies added
- ✅ Clean interval cleanup prevents memory leaks

### Files Changed
```
Modified: js/ui/intermissionCard.js
  - Added timer monitor logic (~30 lines)
  - Enhanced cleanup functions

Added: test_intermission_card_timer_fix.html
  - Comprehensive test page for manual verification
```

## Code Review & Quality

### Code Review Feedback
1. ✅ Extract duplicate timer cleanup logic → Implemented `clearTimerMonitor()` helper
2. ✅ Optimize game reference access → Captured once per interval tick

### Security Scan
- ✅ CodeQL: 0 alerts
- ✅ No DOM injection vulnerabilities
- ✅ No memory leaks
- ✅ Safe interval cleanup

### Code Quality
- ✅ Follows existing code patterns
- ✅ Consistent with module conventions
- ✅ Well-documented with comments
- ✅ Null-safe operations
- ✅ Idempotent cleanup functions

## Deployment

### Deployment Notes
- ✅ No special deployment steps required
- ✅ No database migrations needed
- ✅ No configuration changes needed
- ✅ Safe to deploy immediately

### Rollback Plan
If issues arise (unlikely), can easily revert by:
1. Remove timer monitor setup code
2. Remove `clearTimerMonitor()` calls from cleanup functions
3. Restore original cleanup behavior

### Monitoring
After deployment, monitor for:
- Console logs showing "Timer expired, auto-removing card"
- No error logs related to interval cleanup
- User reports of improved game flow

## Future Enhancements

Potential improvements (not in scope for this fix):
1. Use event-driven approach instead of polling (if timer emits events in future)
2. Add telemetry to track how often cards auto-remove vs manual removal
3. Add visual countdown indicator on the card itself
4. Consider animation improvements when auto-removing

## Related Issues

- Fixes: Issue #662 - Intermission card does not disappear
- Related to previous fix: HOH Intermission Prompt Persistence (#650)
- Related architecture: Phase transition cleanup system

## Conclusion

This fix successfully addresses the issue by:
1. ✅ Adding reliable timer monitoring
2. ✅ Automatically removing card when timer expires
3. ✅ Maintaining backwards compatibility
4. ✅ Ensuring proper cleanup to prevent leaks
5. ✅ Passing all security and quality checks

The implementation is production-ready with comprehensive testing and documentation.

---

**Date Completed:** 2025-12-28  
**Branch:** `copilot/fix-intermission-card-timer`  
**Status:** ✅ Ready for Merge
