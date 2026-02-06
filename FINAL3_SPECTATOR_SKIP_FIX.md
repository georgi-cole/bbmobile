# Final 3 Spectator Skip Button Fix

## Problem Description

During the Final 3 week in spectator mode (when a player is eliminated or in jury), clicking the "Skip to results" button caused an undesirable UX issue:

1. User clicks "Skip to results"
2. Spectator view closes, showing the main screen
3. Timer continues running with nothing happening visible
4. User has to wait for the timer to expire
5. Only then are the results shown

This created a confusing gap where users saw the main screen with a running timer and no indication of what was happening.

## Root Cause

The issue was in the `handleSkip()` function in both `spectator-view.js` and `spectator-view-part3.js`:

```javascript
// OLD CODE (problematic)
showRevealSequence(() => {
  cleanup();  // ❌ This removed the spectator view too early
  
  // Set phase timer to expire in 1 second
  const g = global.game;
  if (g && g.phaseEndsAt) {
    g.phaseEndsAt = Date.now() + 1000;
  }
  
  if (skipCallback) skipCallback();  // This calls finishF3P*()
});
```

The sequence was:
1. Reveal animation plays (2-3.5 seconds)
2. `cleanup()` is called, removing the spectator view
3. `skipCallback()` is called, which triggers `finishF3P1()`, `finishF3P2()`, or `finishF3P3()`
4. These functions ALSO call `cleanup()` before showing the results modal

This double cleanup caused the spectator view to disappear before the results modal appeared, creating a visible gap where the main screen was shown.

## Solution

Removed the premature `cleanup()` call from the skip button handler. The cleanup is now handled solely by the `finishF3P*()` functions at the appropriate time:

```javascript
// NEW CODE (fixed)
showRevealSequence(() => {
  // Don't call cleanup() here - let finishF3P1/finishF3P2/finishF3P3 handle it
  // This prevents showing the main screen before results are displayed
  
  // Set phase timer to expire in 1 second
  const g = global.game;
  if (g && g.phaseEndsAt) {
    g.phaseEndsAt = Date.now() + 1000;
  }
  
  if (skipCallback) skipCallback();  // This calls finishF3P*()
});
```

## Files Modified

1. **`js/spectator-view-part3.js`** (line 951)
   - Used for Final 3 Part 3 competition
   - Removed `cleanup()` call from `handleSkip()` callback

2. **`js/spectator-view.js`** (line 547)
   - Used for Final 3 Part 1 and Part 2 competitions
   - Removed `cleanup()` call from `handleSkip()` callback

## Impact

### Before Fix
```
[User Experience]
1. Click "Skip to results" → Reveal animation (3s)
2. Spectator view disappears → Main screen visible
3. Timer continues running → User confused
4. Wait for timer to expire → Nothing visible happening
5. Results modal finally appears
```

### After Fix
```
[User Experience]
1. Click "Skip to results" → Reveal animation (3s)
2. Spectator view remains visible during transition
3. Results modal appears immediately after animation
4. Smooth transition with no gaps or confusion
```

## Technical Details

The `finishF3P1()`, `finishF3P2()`, and `finishF3P3()` functions in `js/competitions.js` all include cleanup logic:

```javascript
async function finishF3P3() {
  const g = global.game; 
  if (g.phase !== 'final3_comp3') return;
  
  // Clean up SpectatorView if it exists (legacy/fallback)
  if (global.SpectatorView && typeof global.SpectatorView.cleanup === 'function') {
    global.SpectatorView.cleanup();
    console.info('[F3P3] SpectatorView cleaned up');
  }
  
  // Clean up SpectatorViewPart3 if it exists
  if (global.SpectatorViewPart3 && typeof global.SpectatorViewPart3.cleanup === 'function') {
    global.SpectatorViewPart3.cleanup();
    console.info('[F3P3] SpectatorViewPart3 cleaned up');
  }
  
  // ... rest of function shows results modal
}
```

By removing the early cleanup, we ensure the spectator view remains visible until the results modal is ready to be shown.

## Testing

### Manual Testing
1. Open `test_final3_spectator_fix.html` in a browser
2. Click "Test Scenario 1: Human Eliminated" or "Test Scenario 2: Human in Jury"
3. When spectator view appears, click "Skip to Results"
4. Verify spectator view remains visible during reveal animation
5. Verify results modal appears immediately after animation completes
6. Verify no visible gap or main screen appears during transition

### Automated Testing
All existing tests pass:
- ✅ Minigame validation
- ✅ Runtime helpers
- ✅ E2E competitions
- ✅ Social phase
- ✅ POV carousel
- ✅ Pause integration
- ✅ Background theme

### Code Review
- ✅ No issues found
- ✅ Code follows existing patterns
- ✅ Comments added for clarity

### Security Scan
- ✅ No security vulnerabilities found

## Related Files

- `js/spectator-view.js` - Generic spectator view for Part 1 & 2
- `js/spectator-view-part3.js` - Enhanced spectator view for Part 3
- `js/competitions.js` - Competition flow and finish functions
- `test_final3_spectator_fix.html` - Test file for spectator mode

## Backward Compatibility

This fix maintains full backward compatibility:
- No API changes
- No behavior changes except for the fixed timing issue
- All existing functionality preserved
- All tests continue to pass
