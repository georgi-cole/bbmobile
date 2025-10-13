# Minigame Refactor - Manual Test Checklist for QA

## Overview
This checklist verifies the minigame refactor is working correctly. Test each item and mark ✅ when complete.

## Prerequisites
- [ ] Load the application in a browser
- [ ] Open browser console for any error messages
- [ ] Have `test_minigame_refactor_qa.html` open in another tab

---

## Test 1: Automated QA Tests
Open `test_minigame_refactor_qa.html` and run all tests.

- [ ] **Test 1: Purged Games Removed** - All 14 purged games removed from registry
- [ ] **Test 2: New Skeletons Added** - All 10 new game skeletons in registry
- [ ] **Test 3: Registry Integrity** - All games have valid metadata
- [ ] **Test 4: Selector Logic** - Only implemented, non-retired games in pool
- [ ] **Test 5: Instructions Coverage** - All games have instructions
- [ ] **Registry Overview** - Visual display shows correct game count (37 total, 15 active)

**Expected:** All tests pass with green ✓ indicators

---

## Test 2: Validation Scripts
Run validation from command line:

```bash
npm run validate:minigames
```

- [ ] ✓ All 15 selector pool keys are registered
- [ ] ✓ All aliases point to valid canonical keys  
- [ ] ✓ All registry keys are in bootstrap fallback
- [ ] ✓ VALIDATION PASSED

**Expected:** All checks pass, no errors or warnings about purged games

---

## Test 3: Selector Pool
Test that selector only picks active games.

1. Start a new game/season
2. Play through 20+ competitions, noting which minigames appear
3. Verify NO purged games appear:
   - [ ] No Jump Rope
   - [ ] No Sequence Memory
   - [ ] No Memory Pairs
   - [ ] No Combo Keys
   - [ ] No Echo Chamber
   - [ ] No Icon Match
   - [ ] No Gear Shift
   - [ ] No Puzzle Dash
   - [ ] No Reaction Royale
   - [ ] No Reaction Timer
   - [ ] No Bubble Burst
   - [ ] No Dice Dash
   - [ ] No Light Speed
   - [ ] No Math Blitz

4. Verify ONLY these 15 games appear:
   - [ ] Count House
   - [ ] Trivia Pulse
   - [ ] Quick Tap
   - [ ] Memory Match
   - [ ] Timing Bar
   - [ ] Pattern Match
   - [ ] Word Anagram
   - [ ] Target Practice
   - [ ] Estimation Game
   - [ ] Card Clash
   - [ ] Chain Reaction
   - [ ] Clock Stopper
   - [ ] Flash Flood
   - [ ] Grid Lock
   - [ ] Key Master

**Expected:** Only active games appear, no purged games, good distribution

---

## Test 4: Card Clash Enhancement
Test the improved Card Clash game (5×4 grid, 10 pairs).

1. Start a game and trigger Card Clash
2. Observe the grid layout:
   - [ ] Grid is 5 columns × 4 rows (20 cards total)
   - [ ] 10 different symbols (pairs)
   - [ ] Cards fit well on screen, no overflow
   - [ ] Card dimensions look good on mobile and desktop

3. Play the game:
   - [ ] Can flip cards successfully
   - [ ] Matching works correctly
   - [ ] Stats show "Matches: X/10" (not 6)
   - [ ] Game completes when all 10 pairs found
   - [ ] Score calculated correctly (fewer moves = higher score)

**Expected:** 5×4 grid with 10 pairs works smoothly, UI looks good

---

## Test 5: Error Handler Fallback
Test error handling with invalid game keys.

1. Open browser console
2. Try loading an invalid game:
   ```javascript
   // Try to load purged games
   MinigameRegistry.render('mathBlitz', document.body, (score) => console.log(score));
   MinigameRegistry.render('reactionTimer', document.body, (score) => console.log(score));
   MinigameRegistry.render('bubbleBurst', document.body, (score) => console.log(score));
   ```

- [ ] Console shows "Game not in registry" errors
- [ ] No crashes or unhandled exceptions
- [ ] Error messages are clear and helpful

3. Verify fallback list doesn't reference purged games:
   ```javascript
   // Check the error handler's preferred fallbacks
   // Should be: ['quickTap', 'timingBar', 'memoryMatch']
   ```

**Expected:** Clean error handling, no references to purged games

---

## Test 6: New Game Skeletons
Test that new skeleton games are accessible but show "Coming Soon".

For each new game, try to load it:
```javascript
const testGames = [
  'comixSpot', 'holdWall', 'slipperyShuttle', 'memoryZipline',
  'socialStrings', 'swipeMaze', 'oteviator', 'colorMatch',
  'logicLocks', 'snake'
];

testGames.forEach(key => {
  const game = MinigameRegistry.getGame(key);
  console.log(`${key}: implemented=${game.implemented}, retired=${game.retired}`);
});
```

For each skeleton game:
- [ ] Game shows in registry
- [ ] `implemented` flag is `false`
- [ ] `retired` flag is `false`
- [ ] Has proper metadata (name, description, type, etc.)

**Expected:** All 10 skeletons registered but not implemented yet

---

## Test 7: Instructions Coverage
Test that all active games have instructions.

1. Open browser console:
   ```javascript
   const implemented = MinigameRegistry.getImplementedGames(false);
   implemented.forEach(key => {
     const instr = MinigameInstructions.getInstructions(key);
     console.log(`${key}: ${instr.title} - ${instr.description}`);
   });
   ```

- [ ] All 15 active games have instructions
- [ ] No "undefined" or missing instructions
- [ ] Instructions are clear and concise
- [ ] No references to purged games

**Expected:** Complete instruction coverage for all active games

---

## Test 8: Module Loading
Test that all active game modules load correctly.

1. Check browser console for script loading errors
2. Open DevTools Network tab and filter by ".js"
3. Verify:
   - [ ] No 404 errors for purged game files
   - [ ] All active game modules loaded successfully
   - [ ] Skeleton game modules loaded successfully
   - [ ] No JavaScript errors in console

**Expected:** Clean load, no missing files, no errors

---

## Test 9: Compat Bridge Aliases
Test that legacy aliases are removed for purged games.

```javascript
// These should NOT resolve (purged games):
console.log(MinigameCompatBridge.resolveKey('math'));        // Should fail
console.log(MinigameCompatBridge.resolveKey('reaction'));   // Should fail
console.log(MinigameCompatBridge.resolveKey('numseq'));     // Should fail
console.log(MinigameCompatBridge.resolveKey('pairs'));      // Should fail

// These SHOULD resolve (active games):
console.log(MinigameCompatBridge.resolveKey('clicker'));    // → 'quickTap'
console.log(MinigameCompatBridge.resolveKey('memory'));     // → 'memoryMatch'
console.log(MinigameCompatBridge.resolveKey('pattern'));    // → 'patternMatch'
```

- [ ] Purged game aliases removed or return null
- [ ] Active game aliases work correctly
- [ ] No console errors for valid aliases

**Expected:** Clean alias resolution, purged games not accessible

---

## Test 10: Seasonal Rotation
Test that seasonal filtering works correctly.

1. Check current season:
   ```javascript
   const selector = MinigameSelector;
   console.log('Current season:', selector.getCurrentSeason());
   ```

2. Verify games are filtered by season:
   - [ ] Games with current season in their `seasons` array appear
   - [ ] Games not available this season don't appear in pool
   - [ ] Season change triggers pool reset

**Expected:** Seasonal filtering works, appropriate games available

---

## Test 11: Performance & Stability
Test overall system performance.

1. Play through 10 consecutive competitions:
   - [ ] No memory leaks (check DevTools Memory tab)
   - [ ] No console errors or warnings
   - [ ] Smooth performance on mobile and desktop
   - [ ] Games complete successfully and return scores

2. Rapidly start/cancel games:
   - [ ] No crashes or hangs
   - [ ] Clean cleanup of game state
   - [ ] No lingering UI elements

**Expected:** Stable, performant, no memory issues

---

## Test 12: Documentation
Verify documentation is complete and accurate.

- [ ] `MINIGAME_REFACTOR_COMPLETE.md` exists and is up to date
- [ ] All purged games listed correctly
- [ ] All new skeletons listed correctly
- [ ] Migration notes are clear
- [ ] Technical details are accurate
- [ ] Instructions for developers are clear

**Expected:** Complete, accurate documentation

---

## Final Verification

### Summary Checklist
- [ ] All automated tests pass
- [ ] All validation scripts pass
- [ ] Selector only picks 15 active games
- [ ] Card Clash enhanced to 5×4 grid
- [ ] Error handler uses valid fallbacks
- [ ] 10 new skeletons registered correctly
- [ ] All games have instructions
- [ ] No module loading errors
- [ ] Compat bridge aliases cleaned up
- [ ] Seasonal rotation works
- [ ] System is stable and performant
- [ ] Documentation is complete

### Sign Off
- **Tester Name:** _______________
- **Date:** _______________
- **Test Environment:** _______________
- **Overall Result:** ⬜ PASS  ⬜ FAIL

### Notes
```
(Add any additional notes or issues found during testing)



```

---

## Regression Tests (Optional)

If time permits, verify these existing features still work:

- [ ] Competitions flow works end-to-end
- [ ] Nominations and evictions work
- [ ] Jury voting works
- [ ] Player stats and progression work
- [ ] Save/load game state works
- [ ] All UI elements render correctly
- [ ] Mobile responsiveness maintained

---

## Issue Reporting

If you find any issues during testing, report them with:
1. Test number and step where issue occurred
2. Expected behavior
3. Actual behavior
4. Screenshots or console logs if applicable
5. Browser/device information

**Format:**
```
Issue: [Test X.Y] Brief description
Expected: What should happen
Actual: What happened
Browser: Chrome 120 / Safari 17 / etc.
Device: Desktop / Mobile / Tablet
Console: (paste relevant errors)
```

---

**End of Manual Test Checklist**
