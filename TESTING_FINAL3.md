# Testing the Final 3 Implementation

## Quick Test Guide

### Prerequisites
1. Start a new game with at least 10 players
2. Play through to Final 3 (or use save/load to jump to that point)

### Manual Test Steps

#### 1. Trigger Final 3 Flow
- **When**: After an eviction leaves exactly 3 houseguests
- **Expected**: System should automatically start Final 3 Part 1 (no regular HOH)
- **Verify**: 
  - ✅ TV shows "Final 3 — Part 1"
  - ✅ All 3 houseguests compete
  - ✅ No nominations/veto phase

#### 2. Part 1 Competition
- **UI**: Minigame appears for human player
- **Expected**: After timer ends, highest scorer wins
- **Verify**:
  - ✅ Card shows "🏆 F3 Part 1 Winner"
  - ✅ Message: "[Name] Advances directly to Part 3!"
  - ✅ Log: "Final 3 Part 1: Winner is [Name] (advances to Part 3)."
  - ✅ Automatically proceeds to Part 2

#### 3. Part 2 Competition
- **When**: Immediately after Part 1
- **Who Competes**: The 2 losers from Part 1
- **Expected**: Head-to-head competition
- **Verify**:
  - ✅ TV shows "Final 3 — Part 2"
  - ✅ Only 2 players compete
  - ✅ Part 1 winner does NOT compete
  - ✅ Card shows "🏆 F3 Part 2 Winner"
  - ✅ Message: "[Name] Advances to Part 3!"
  - ✅ Automatically proceeds to Part 3

#### 4. Part 3 Competition
- **When**: Immediately after Part 2
- **Who Competes**: Part 1 winner + Part 2 winner
- **Expected**: Final showdown
- **Verify**:
  - ✅ TV shows "Final 3 — Part 3"
  - ✅ Only 2 finalists compete
  - ✅ Part 1 loser does NOT compete
  - ✅ Card shows "👑 Final HOH"
  - ✅ Message: "[Name] Winner of the Final 3 Competition! Must now evict one houseguest"
  - ✅ Winner has HOH badge
  - ✅ Both non-winners have NOM badges

#### 5. Eviction Ceremony
- **When**: After Part 3
- **Expected**: Live eviction ceremony panel
- **Verify**:
  - ✅ Panel title: "🎬 Final 3 Eviction Ceremony"
  - ✅ Text: "Final HOH [Name] must evict one houseguest in this live ceremony."
  - ✅ If human HOH: Two "Evict [Name]" buttons visible
  - ✅ Clicking button shows confirmation dialog
  - ✅ After confirmation, eviction proceeds
  - ✅ Card shows: "[HOH] has chosen to evict [Name] to the Jury"
  - ✅ Evicted player removed from game
  - ✅ Jury updated (if applicable)

#### 6. Final 2
- **When**: After Final 3 eviction
- **Expected**: Proceed to jury vote
- **Verify**:
  - ✅ Only 2 houseguests remain
  - ✅ System automatically starts jury vote
  - ✅ Jury includes the just-evicted houseguest
  - ✅ No errors or crashes

### Edge Cases to Test

#### All AI Players
- **Setup**: Make all 3 finalists AI
- **Expected**: AI automatically wins competitions, AI HOH makes decision
- **Verify**:
  - ✅ Part 1, 2, 3 complete automatically
  - ✅ AI HOH makes eviction choice
  - ✅ No UI errors or hangs

#### Human Wins Part 1
- **Setup**: Ensure human player has highest Part 1 score
- **Expected**: Human skips Part 2, goes to Part 3
- **Verify**:
  - ✅ Human does not compete in Part 2
  - ✅ Human competes in Part 3
  - ✅ Correct 2 players in Part 2

#### Human Loses Part 1
- **Setup**: Ensure human player doesn't have highest Part 1 score
- **Expected**: Human competes in Part 2
- **Verify**:
  - ✅ Human competes in Part 2
  - ✅ If human wins Part 2, goes to Part 3
  - ✅ If human loses Part 2, is a nominee

#### Human is Final HOH
- **Setup**: Get human to win Part 3
- **Expected**: Human sees eviction buttons
- **Verify**:
  - ✅ Both nominees shown with evict buttons
  - ✅ Confirmation dialog appears
  - ✅ Can cancel confirmation
  - ✅ Eviction processes correctly after confirmation

#### Human is Evicted
- **Setup**: Human is a nominee and gets evicted
- **Expected**: Human joins jury
- **Verify**:
  - ✅ Human marked as evicted
  - ✅ Human added to jury
  - ✅ Final 2 proceeds correctly

### Automated Test

Run the test suite:
```bash
# Open in browser:
test_final3_flow.html

# Or use npm test if integrated
npm run test:all
```

### Regression Tests

Ensure other game flows still work:

#### Regular Weeks (4+ players)
- ✅ HOH competition runs
- ✅ Nominations work
- ✅ Veto competition runs
- ✅ Eviction works

#### Final 4
- ✅ HOH and Veto run
- ✅ Veto holder is sole vote
- ✅ No Part 1/2/3 triggered

#### Final 2
- ✅ Jury vote triggered
- ✅ Winner determined
- ✅ Finale cinematic works

### Performance Tests

- **Memory**: No leaks from competition state
- **Timing**: Competitions complete within time limits
- **State**: Game state consistent after Final 3
- **UI**: No visual glitches or overlaps

### Browser Compatibility

Test in:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (if available)
- ✅ Mobile browsers

### Known Non-Issues

These are expected behaviors:
- ⚪ Test page shows some tests failing (functions not in global scope)
- ⚪ Console may show legacy warnings (unrelated to Final 3)
- ⚪ Part order is different from old 2-part system (intentional)

### Debugging Tips

If issues occur:

1. **Check Console**: Look for errors starting with `[Competition]` or `[F3]`
2. **Check Game State**: 
   - `window.game.phase` should be `final3_comp1/2/3` or `final3_decision`
   - `window.game.__f3p1Winner` and `__f3p2Winner` should be set
   - `window.game.hohId` should be set after Part 3
3. **Check Logs**: Game log should show progression through all parts
4. **Check Badges**: HOH and NOM badges should update correctly

### Reporting Issues

If you find a bug, please include:
- Step-by-step reproduction
- Game state at time of bug (save file if possible)
- Console errors/warnings
- Expected vs actual behavior
- Browser and version

### Success Criteria

The implementation is successful if:
- ✅ All 3 parts run in sequence
- ✅ Correct players compete in each part
- ✅ Final HOH is determined correctly
- ✅ Eviction ceremony works
- ✅ Game proceeds to Final 2
- ✅ No crashes or errors
- ✅ UI is clear and understandable
- ✅ Regular weeks still work
