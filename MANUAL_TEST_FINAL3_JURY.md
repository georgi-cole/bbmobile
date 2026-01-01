# Manual Test Guide: Final 3 Spectator Mode & Jury Vote Cards

This document describes how to manually test the fixes for Final 3 spectator mode and duplicate jury vote cards.

## Issue 1: Final 3 Spectator Mode & Waiting UI

### Test 1.1: Part 1 - Human Submits Score
**Objective**: Verify that after the human submits their score in Part 1, a "Waiting for results" UI is shown.

**Steps**:
1. Start a new game or load a save with 3 players remaining
2. Advance to Final 3 Part 1 competition
3. As the human player, complete the minigame and submit your score
4. **Expected**: After submission, the panel should show:
   - A spinner animation
   - "✓ Score Submitted" message
   - "AI players are completing their attempts" subtext
5. **Before fix**: The panel would be empty/idle after submission

**Status**: ⏸️ Waiting for test

---

### Test 1.2: Part 1 - Evicted Player
**Objective**: Verify that evicted players see appropriate UI during Part 1.

**Steps**:
1. Load a save where the human player is evicted but in jury
2. Advance to Final 3 Part 1 competition
3. **Expected**: Should see "Competition in Progress" waiting UI
4. The spectator view is not needed for Part 1 since all remaining players compete

**Status**: ⏸️ Waiting for test

---

### Test 1.3: Part 2 - Human Won Part 1 (Spectator)
**Objective**: Verify that if human won Part 1, they see spectator view for Part 2.

**Steps**:
1. Start Final 3 flow
2. Win Part 1 as the human player
3. **Expected**: In Part 2, should see spectator view with:
   - "Final 3 — Part 2" header
   - Two AI competitors displayed
   - Progress messages and simulated scores
   - "Skip to Results" button

**Status**: ⏸️ Waiting for test

---

### Test 1.4: Part 2 - Human Lost Part 1 (Active Player)
**Objective**: Verify that if human lost Part 1, they play in Part 2 and see waiting UI after submission.

**Steps**:
1. Start Final 3 flow
2. Lose Part 1 as the human player (ensure you're in the duo)
3. **Expected**: In Part 2, you should:
   - Be able to play the minigame
   - After submission, see "✓ Score Submitted" waiting UI
4. **Before fix**: Panel might be empty/idle after submission

**Status**: ⏸️ Waiting for test

---

### Test 1.5: Part 3 - Human Won Part 1 or Part 2 (Active Player)
**Objective**: Verify that if human won Part 1 or Part 2, they play in Part 3 and see waiting UI after submission.

**Steps**:
1. Start Final 3 flow
2. Win either Part 1 or Part 2 as the human player
3. **Expected**: In Part 3, you should:
   - Be able to play the minigame (head-to-head with other winner)
   - After submission, see "✓ Score Submitted" waiting UI
4. **Before fix**: Panel might be empty/idle after submission

**Status**: ⏸️ Waiting for test

---

### Test 1.6: Part 3 - Human Lost Both Parts (Spectator)
**Objective**: Verify that if human lost both Part 1 and Part 2, they see spectator view for Part 3.

**Steps**:
1. Start Final 3 flow
2. Lose both Part 1 and Part 2 as the human player
3. **Expected**: In Part 3, should see spectator view with:
   - "Final 3 — Part 3" header
   - Two finalists (P1 and P2 winners) displayed
   - Progress messages and simulated scores
   - "Skip to Results" button

**Status**: ⏸️ Waiting for test

---

## Issue 2: Duplicate Jury Vote Cards

### Test 2.1: Jury Vote Reveal - No Duplicates
**Objective**: Verify that during final jury vote reveal, only ONE vote card is visible at a time.

**Steps**:
1. Advance to finale with a jury (typically 7-9 jurors)
2. Reach the jury vote reveal phase
3. Watch the vote reveal sequence as each juror's vote is shown
4. **Expected**: 
   - Only ONE card should be visible at any time
   - Each card should show juror avatar, name, vote reason, and finalist choice
   - Previous card should disappear before new card appears
   - No overlap or duplicate cards
5. **Before fix**: Multiple cards could appear simultaneously, with partial cards visible on the right side

**Status**: ⏸️ Waiting for test

---

### Test 2.2: Jury Vote Reveal - Rapid Succession
**Objective**: Verify that even with fast-forwarded timing, cards don't duplicate.

**Steps**:
1. Advance to finale with a jury
2. Reach the jury vote reveal phase
3. If fast-forward is available, use it to speed up the reveal
4. **Expected**: 
   - Even with faster timing, only ONE card visible at a time
   - Clean transitions between cards
5. **Before fix**: Rapid card reveals would cause overlapping duplicates

**Status**: ⏸️ Waiting for test

---

## Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| 1.1 Part 1 Waiting UI | ⏸️ Pending | - |
| 1.2 Part 1 Evicted | ⏸️ Pending | - |
| 1.3 Part 2 Spectator | ⏸️ Pending | - |
| 1.4 Part 2 Active Player | ⏸️ Pending | - |
| 1.5 Part 3 Active Player | ⏸️ Pending | - |
| 1.6 Part 3 Spectator | ⏸️ Pending | - |
| 2.1 No Duplicate Cards | ⏸️ Pending | - |
| 2.2 Rapid Card Succession | ⏸️ Pending | - |

---

## Files Modified

### js/jury-viz.js
**Change**: Added cleanup of existing `.jury-vote-card` elements before creating new one.

```javascript
// Line ~836
// REMOVE ANY EXISTING JURY VOTE CARDS FIRST to prevent duplicates
document.querySelectorAll('.jury-vote-card').forEach(el => el.remove());
```

### js/competitions.js
**Changes**: 
1. Added `showWaitingUI()` helper function with spinner animation
2. Updated `renderF3P1()` to show waiting UI after human submits
3. Updated `renderF3P2()` to show waiting UI when human is in duo and has submitted
4. Updated `renderF3P3()` to show waiting UI when human is in finalists and has submitted

---

## How to Test

### Option 1: Manual Gameplay
1. Open `index.html` in a browser
2. Play through a season to reach Final 3
3. Test each scenario by winning/losing different parts

### Option 2: Save State Loading
1. Create or load a save file at the Final 3 stage
2. Test different scenarios by manipulating the save state

### Option 3: Developer Console
1. Open browser DevTools
2. Use console commands to advance to Final 3
3. Manipulate game state to test different scenarios

---

## Success Criteria

### Issue 1 (Final 3 Spectator Mode)
- ✅ No idle/blank screens during Final 3 competitions
- ✅ After submission, user sees clear "Waiting" UI with spinner
- ✅ Spectator mode works correctly for all scenarios:
  - Part 2: Shows if human won Part 1 or is in jury
  - Part 3: Shows if human lost both parts or is in jury
- ✅ Active player can always play when eligible

### Issue 2 (Duplicate Jury Cards)
- ✅ Only ONE jury vote card visible at any time
- ✅ No partial/cut-off cards on the right side of screen
- ✅ Clean transitions between vote reveals
- ✅ Works correctly even with fast-forward enabled

---

## Regression Testing

Ensure the following still work correctly:
- [ ] Regular HOH competitions (non-Final 3)
- [ ] Veto competitions
- [ ] Other finale sequences (winner announcement, etc.)
- [ ] Jury member experience during finale
- [ ] Fast-forward functionality

---

## Known Limitations

1. The waiting UI depends on the panel being re-rendered after submission. If the panel is not re-rendered, the old UI might persist.
2. The spectator view uses the game key stored in `g.__f3p2GameKey` or `g.__f3p3GameKey`. If not set, it falls back to generic "competition" type.

---

## Debugging Tips

If issues occur:

1. **Check browser console** for error messages
2. **Verify game state**: Check `window.game` object in console
   - `game.phase` - Should be 'final3_comp1', 'final3_comp2', or 'final3_comp3'
   - `game.lastCompScores` - Map of submitted scores
   - `game.__f3_duo` - Array of Part 2 competitors
   - `game.__f3_finalists` - Array of Part 3 competitors
3. **Check panel contents**: Inspect the `#panel` element to see what's rendered
4. **SpectatorView**: Check if `window.SpectatorView` exists and is functioning

---

Last Updated: 2026-01-01
