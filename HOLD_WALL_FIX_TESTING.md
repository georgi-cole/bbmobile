# Hold the Wall - Fix Verification Guide

## Overview

This document provides testing instructions for the Hold the Wall minigame fixes that address two key issues:
1. Hiding the visible on-screen timer
2. Preventing simultaneous player drops

## Changes Made

### Issue 1: Hide Visible Timer
- Removed unused `timerInterval` variable that was created but never updated the timer display
- Added clarifying comment that `timerDiv` is intentionally hidden
- Timer display remains hidden via CSS (`display: none`)
- Phase timer suppression via `HoldTheWall` module remains intact

### Issue 2: Sequential Drop Logic
- Replaced independent per-player drop checks with per-tick selection model
- Implemented competition-type-based limits:
  - **POV competitions**: Max 1 drop per tick
  - **HOH competitions**: Max 2 drops per tick
- Added sequential drop execution with 800-1200ms stagger between drops
- Implemented `isProcessingDrops` lock to prevent overlapping tick checks
- Updated both `startMultiParticipantChecks()` and `startFailSafeAcceleration()` to use new logic

## Testing Methods

### Method 1: Browser Test (Recommended)

1. Open `test_hold_wall_fixes.html` in a web browser
2. Open browser console (F12) to see detailed logs
3. Test POV mode:
   - Click "Start POV Mode" button
   - Observe that no visible timer appears on screen
   - Watch console logs for drop events - should see max 1 drop per ~10s tick
   - Verify drops are logged with timestamps showing ~1 second gaps
4. Stop the game and test HOH mode:
   - Click "Stop Game" button
   - Click "Start HOH Mode" button
   - Observe that no visible timer appears on screen
   - Watch console logs for drop events - should see max 2 drops per ~10s tick
   - Verify drops are logged with timestamps showing ~1 second gaps
5. Use the checklist on the page to track verification items

### Method 2: Test Harness (Advanced)

1. Open `tests/test_holdthewall.html` in a web browser
2. Open browser console (F12) for detailed event logs
3. Click "Start HOH Game" or "Start POV Game" buttons
4. Monitor the event log for:
   - Phase timer pause events
   - Player drop events with timestamps
   - Sequential drop timing (look for 800-1200ms gaps)
5. Verify the game state display shows correct counts

### Method 3: Integration Test (Full Game)

1. Open `index.html` and start a new game
2. Progress to a competition phase (HOH or POV)
3. Launch the Hold the Wall minigame
4. Verify:
   - No visible countdown timer appears
   - Phase timer is suppressed (check console)
   - Players drop sequentially during gameplay
   - Deal mechanics still work correctly
   - Results are computed properly

## Verification Checklist

Use this checklist to verify all requirements are met:

### Timer Requirements
- [ ] No visible countdown timer appears in the game UI
- [ ] `timerDiv` element has `display: none` style
- [ ] No timer update code executes during gameplay
- [ ] Phase timer shows as disabled during minigame
- [ ] Phase timer remains suppressed throughout entire minigame

### Drop Behavior - POV Mode
- [ ] Maximum 1 player drops per ~10 second tick
- [ ] Drops during fail-safe acceleration (final 20s) also respect 1 drop limit
- [ ] Drop events show sequential timestamps with ~1 second gaps
- [ ] Feed messages appear individually for each drop
- [ ] Avatars fade out sequentially, not simultaneously

### Drop Behavior - HOH Mode
- [ ] Maximum 2 players drop per ~10 second tick
- [ ] Drops during fail-safe acceleration (final 20s) also respect 2 drop limit
- [ ] When 2 drops occur, they show ~1 second gap between them
- [ ] Feed messages appear individually for each drop
- [ ] Avatars fade out sequentially, not simultaneously

### Game Flow
- [ ] Deal mechanics work correctly when down to 2 players
- [ ] Final winner is determined correctly
- [ ] Results popup appears with proper top 3 standings
- [ ] Game completes without errors
- [ ] All drops are logged with proper timestamps

## Expected Console Output

### POV Mode Example:
```
[HoldWall] Started with 6 participants for pov competition
[HoldWall] Accelerated check 1/4, drop odds: 55%
[HoldWall] Alice dropped at 12.3s, 5 remaining
(wait ~1 second)
[HoldWall] Accelerated check 2/4, drop odds: 66%
[HoldWall] Bob dropped at 17.8s, 4 remaining
```

### HOH Mode Example:
```
[HoldWall] Started with 8 participants for hoh competition
[HoldWall] Accelerated check 1/4, drop odds: 55%
[HoldWall] Charlie dropped at 15.2s, 7 remaining
(wait ~1 second)
[HoldWall] Diana dropped at 16.3s, 6 remaining
(wait ~10 seconds for next tick)
[HoldWall] Accelerated check 2/4, drop odds: 66%
```

## Common Issues & Troubleshooting

### Issue: Can't see any drops happening
**Solution**: The game has a hidden timer of 90-200 seconds. Drops start after initial period and accelerate near the end. Wait for the fail-safe acceleration in the final 20 seconds to see rapid drop checks.

### Issue: Drops appear to happen simultaneously
**Solution**: Check the console timestamps carefully. Drops should show with sequential timestamps. If they appear at the exact same millisecond, the fix may not be working correctly.

### Issue: More than max drops per tick
**Solution**: Verify the competition type is correctly detected. Check console logs for "[HoldWall] Started with X participants for [TYPE] competition" to confirm the type.

### Issue: Timer appears on screen
**Solution**: Check if any other code is creating a timer display. The hold-wall.js timer should be hidden. Look for any custom overlays or UI elements that might be adding a timer.

## Performance Considerations

- Sequential drops with stagger introduce slight delays (800-1200ms between drops)
- This is intentional and improves UX by providing visual clarity
- Total time to process 2 drops: ~1-2.5 seconds maximum
- Drop processing lock prevents overlapping checks for clean execution

## Files Modified

- `js/minigames/hold-wall.js` - Main minigame implementation
- `tests/test_holdthewall.html` - Test harness with POV/HOH mode selection
- `test_hold_wall_fixes.html` - New verification test page (created)

## Success Criteria

The fixes are successfully implemented when:

1. ✅ No visible timer appears during any Hold the Wall game
2. ✅ POV games never have more than 1 drop per tick
3. ✅ HOH games never have more than 2 drops per tick
4. ✅ Drops always occur sequentially with visible delays
5. ✅ Console logs show sequential timestamps for drops
6. ✅ Game completes successfully with proper winner
7. ✅ Phase timer remains suppressed throughout game
8. ✅ All existing mechanics (deal offers, fail-safe, etc.) continue to work

## Additional Notes

- The `FINAL_FORCE_MS` constant (5000ms) is defined but currently not actively used in the force-resolution logic. It's kept for potential future refinements.
- The fail-safe acceleration happens in the final 20 seconds before hidden timer expiry
- Drop probabilities ramp up during acceleration: 44% → 65% → 85%
- The stagger delay is randomized (800-1200ms) to avoid predictable patterns
