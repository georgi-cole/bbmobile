# POV Inline Winner Flow - Manual Testing Guide

## Overview
This document describes how to manually test the POV inline winner flow changes.

## Changes Summary

### Problem Fixed
- **Before**: POV winner saw small HUD status "You have won the POV!" while countdown ran (redundant idle timer)
- **After**: POV winner sees inline winner card with avatar and shield for 3s, countdown stops, then veto choice appears immediately

### Key Changes
1. **New inline winner card** - Reuses VetoResultsUI infrastructure with player tile, avatar, and shield badge
2. **Countdown management** - Set to 3s (inline winner duration) to stop visible countdown
3. **Timer cleanup** - All timers tracked and cleared on phase transitions
4. **Immediate ceremony** - Veto choice appears immediately after inline winner card dismisses

## Manual Testing Steps

### Test 1: Human POV Winner Flow

1. **Setup**
   - Start a new game with multiple players
   - Progress to a POV competition week
   - Ensure human player is selected to participate in POV

2. **During POV Competition**
   - Complete the minigame as human player
   - Submit score (should be high enough to win)

3. **Expected Behavior After Win**
   a. **Results Display** (1s)
      - Full results screen shows with winner highlighted
      - Results auto-dismiss or can be fast-forwarded
   
   b. **Inline Winner Card** (3s)
      - ✅ Large inline card appears in TV container
      - ✅ Card shows: player avatar + name + shield icon (🛡️)
      - ✅ Card has "POV Winner" header
      - ✅ Main countdown shows ~3 seconds (not 40s)
      - ✅ No small HUD status message visible
      - ✅ Card is prominently displayed inline (not as small status chip)
      - ✅ Card auto-dismisses after exactly 3000ms
   
   c. **Veto Choice** (immediate)
      - ✅ Immediately after card dismisses, veto choice UI appears
      - ✅ Shows "Would you like to use the Power of Veto?"
      - ✅ Buttons: "Yes — Use the Veto" and "No — Keep Nominations the Same"
      - ✅ No idle waiting period between inline winner and veto choice

4. **Console Verification**
   - Open browser DevTools (F12)
   - Check console for these log messages:
     ```
     [veto] Human won POV - showing inline winner card for 3000ms
     [veto] Setting phase countdown to 3s for inline winner display
     [veto-results] Inline POV winner card displayed for <player name>
     [veto] Inline winner card dismissed - starting ceremony
     [veto] startVetoCeremony invoked
     ```
   - ✅ No error messages
   - ✅ No "leftover timer" warnings

### Test 2: Spectator Flow (AI Wins POV)

1. **Setup**
   - Start a new game
   - Progress to POV competition
   - Ensure human player is NOT selected to participate

2. **Expected Behavior**
   - ✅ Human sees "You are not playing Veto" message or wait card
   - ✅ Results show AI player as winner
   - ✅ NO inline winner card appears (human is spectator)
   - ✅ Ceremony starts immediately after results
   - ✅ Spectator flow unchanged from before

### Test 3: Fast Forward Compatibility

1. **During Inline Winner Display**
   - Click fast-forward button while inline winner card is visible
   - ✅ Card should dismiss immediately
   - ✅ Ceremony should start immediately
   - ✅ No timer errors in console

### Test 4: Timer Cleanup

1. **Console Verification**
   - After veto ceremony completes
   - Check browser console
   - ✅ Look for log: "All veto timers cleared"
   - ✅ No stale timer warnings
   - ✅ No "timer already running" errors

## Using the Test HTML File

### Quick Test (Simulated)
1. Open `test_pov_inline_winner.html` in a browser
2. Click "1. Simulate POV Win (Human)"
3. Watch the log output and status indicators
4. Verify inline winner card appears in TV container
5. Verify ceremony starts after 3s

### Full Integration Test
1. Open `index.html` (main game)
2. Start new season
3. Play through to POV competition
4. Follow "Test 1: Human POV Winner Flow" steps above

## Expected Timing

| Phase | Duration | Description |
|-------|----------|-------------|
| Results Display | 1s | Full screen results with all participants |
| Inline Winner Card | 3s | Large card with avatar + shield |
| Veto Choice | Immediate | Decision UI appears with no delay |

**Total Time**: ~4 seconds from results to veto choice (no idle timers)

## Acceptance Criteria

### ✅ Visual Requirements
- [ ] Inline winner card is large and prominently displayed
- [ ] Card shows player avatar (not text only)
- [ ] Shield icon (🛡️) is visible on card
- [ ] Card appears in TV container (inline, not as overlay)
- [ ] Main countdown shows 3s (not continuing from 40s)

### ✅ Timing Requirements
- [ ] Card displays for exactly 3000ms
- [ ] No idle waiting period after results
- [ ] No idle waiting period before veto choice
- [ ] Veto choice appears immediately after card dismisses

### ✅ HUD Requirements
- [ ] Small "You have won the POV" status does NOT appear
- [ ] TVInlineStatus HUD is cleared when inline winner shows
- [ ] No conflicting status messages

### ✅ Technical Requirements
- [ ] All timers are tracked with refs
- [ ] Timer cleanup function called on phase transitions
- [ ] No leftover timers after ceremony
- [ ] Phase guards prevent stale callbacks
- [ ] Fast-forward button works correctly

## Troubleshooting

### Issue: Inline winner card doesn't appear
- Check console for errors
- Verify VetoResultsUI module is loaded
- Check if fallback to TVInlineStatus occurred (will show small status)

### Issue: Countdown doesn't stop
- Check console for "Setting phase countdown" message
- Verify setPhase() is being called with 3s duration

### Issue: Multiple cards appear
- Check for duplicate handlePostVetoReveal() calls
- Verify __postVetoRevealCalled guard is working

### Issue: Ceremony doesn't start
- Check for phase change before ceremony start
- Verify onDismiss callback is firing
- Check console for "starting ceremony" message

## Files Modified

1. **js/ui.veto-results.js**
   - Added `renderInlinePOVWinner()` function
   - Creates player tile with avatar and shield
   - Auto-dismiss with callback

2. **js/veto.js**
   - Updated `handlePostVetoReveal()` to use inline winner card
   - Added countdown stopping logic
   - Added `__vetoInlineWinnerVisible` flag
   - Initialized flag in `startVetoComp()`

3. **test_pov_inline_winner.html**
   - Simulated test environment
   - Mock game state and dependencies
   - Visual indicators for testing

## Screenshots Location

After manual testing, screenshots should be taken and saved in:
- `screenshots/pov_inline_winner_card.png` - Inline winner card displayed
- `screenshots/pov_veto_choice_immediate.png` - Veto choice after card dismisses

## Notes

- The inline winner card reuses the same CSS classes as VetoResultsUI (`comp-player-tile`, `first-place`)
- Graceful fallback to TVInlineStatus if new component is unavailable
- Timer cleanup handled by existing `removePanel()` infrastructure
- Fast-forward support inherited from VetoResultsUI pattern
- No React/Redux - pure vanilla JavaScript implementation
