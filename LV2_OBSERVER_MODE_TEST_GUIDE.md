# LV2 Observer Mode & Voter Feed Test Guide

## Overview
This guide provides test scenarios to verify that the LV2 (Live Vote 2.0) overlay works correctly for both observers and voters, with real-time voter chip animations.

## Test Scenarios

### Scenario 1: Voter Mode (Human Can Vote)
**Setup:**
- Start game with 6+ players
- Progress to eviction with 2 nominees
- Human is eligible voter (not HOH, not nominated)

**Expected Behavior:**
1. LV2 overlay appears in TV area
2. Two nominee cards shown side-by-side (or carousel on mobile)
3. CTA bar appears with "Evict [Left]" and "Evict [Right]" buttons
4. Turn indicator shows human's turn
5. Voter feed is visible and empty initially
6. After human votes, voter chips appear for each AI vote
7. Chips show voter avatar + "X votes to evict Y"
8. Vote counts update in real-time
9. Overlay remains visible throughout diary sequence
10. No legacy vote UI appears (no bars, no voter list)

**Testing:**
```javascript
// Open browser console and run:
// 1. Open test_live_vote_observer_vs_voter.html
// 2. Click "Setup: 2 Nominees, Human as Voter"
// 3. Observe LV2 overlay renders
// 4. Vote and watch chips animate
```

---

### Scenario 2: Observer Mode - Nominated Player
**Setup:**
- Start game with 6+ players
- Progress to eviction with 2 nominees
- Human is one of the nominees

**Expected Behavior:**
1. LV2 overlay appears in TV area
2. Two nominee cards shown (including human)
3. NO CTA bar (no voting buttons)
4. Turn indicator shows observers are watching
5. Voter feed is visible and empty initially
6. Voter chips appear automatically as AI votes
7. Chips show voter avatar + "X votes to evict Y"
8. Vote counts update in real-time
9. Overlay remains visible throughout diary sequence
10. No legacy vote UI appears

**Testing:**
```javascript
// Open browser console and run:
// 1. Open test_live_vote_observer_vs_voter.html
// 2. Click "Setup: 2 Nominees, Human as Nominee (Observer)"
// 3. Observe LV2 overlay renders WITHOUT CTA buttons
// 4. Watch chips animate automatically
```

---

### Scenario 3: Observer Mode - HOH (No Tie-Break)
**Setup:**
- Start game with 6+ players (not Final 4)
- Progress to eviction with 2 nominees
- Human is HOH

**Expected Behavior:**
1. LV2 overlay appears in TV area
2. Two nominee cards shown
3. NO CTA bar initially (no voting buttons)
4. Turn indicator shows observers are watching
5. Voter feed is visible and empty initially
6. Voter chips appear automatically as AI votes
7. Vote counts update in real-time
8. If tie occurs, CTA bar appears for HOH to break tie
9. After tie-break vote, HOH chip appears in feed
10. Overlay remains visible throughout

**Testing:**
```javascript
// Open browser console and run:
// 1. Open test_live_vote_observer_vs_voter.html
// 2. Click "Setup: 2 Nominees, Human as HOH (Observer)"
// 3. Observe LV2 overlay renders WITHOUT CTA initially
// 4. If tie, CTA appears for tie-break
```

---

### Scenario 4: HOH Tie-Break Chip
**Setup:**
- Start game with even number of voters
- Progress to eviction with 2 nominees
- Ensure vote results in tie
- Human is HOH

**Expected Behavior:**
1. Regular votes appear as chips in feed
2. Vote counts reach a tie (e.g., 2-2)
3. Status message: "Tie! HOH must break it."
4. CTA bar appears with tie-break buttons
5. After HOH votes, chip appears with HOH's avatar
6. Vote count updates (3-2)
7. Result card shows final vote count

**Testing:**
```javascript
// Open browser console and run:
// 1. Open test_live_vote_observer_vs_voter.html
// 2. Click "Force Tie Scenario"
// 3. Watch tie-break flow
// 4. Verify HOH chip appears after decision
```

---

### Scenario 5: Legacy UI Fallback (LV2 Disabled)
**Setup:**
- Disable modernLiveVoteUI config
- Progress to eviction with 2 nominees

**Expected Behavior:**
1. NO LV2 overlay appears
2. Legacy UI shows in #panel:
   - Vote bars (side-by-side)
   - Voter checklist
   - Vote buttons below TV
3. Diary room cards appear during sequence
4. Result card shows final vote

**Testing:**
```javascript
// Open browser console and run:
window.game.cfg.modernLiveVoteUI = false;
// Then start eviction
```

---

### Scenario 6: Triple Eviction (No Changes Expected)
**Setup:**
- Set twist mode to triple eviction
- Progress to eviction with 3 nominees

**Expected Behavior:**
1. LV2 triple UI appears (3-up carousel)
2. Voter feed not used for triple mode
3. Triple flow unchanged from before

**Note:** This PR does NOT modify triple/double eviction flows.

---

## Key Validation Points

### ✅ LV2 Overlay Activation
- [ ] LV2 renders for voters AND observers with 2 nominees
- [ ] LV2 does NOT render for 3+ nominees (triple mode)
- [ ] LV2 does NOT render when modernLiveVoteUI = false

### ✅ CTA Bar Behavior
- [ ] CTA appears for eligible voters
- [ ] CTA does NOT appear for observers (nominees, HOH)
- [ ] CTA appears for HOH during tie-break
- [ ] setTurn(true) called for voters, setTurn(false) for observers

### ✅ Voter Feed & Chips
- [ ] Voter chips appear for every AI vote
- [ ] Voter chips appear for human vote (after voting)
- [ ] Voter chips appear for HOH tie-break vote
- [ ] Chips show correct voter avatar and target nominee
- [ ] Vote counts update in real-time as chips appear

### ✅ Overlay Persistence
- [ ] Overlay NOT closed by closeAllVoteUI during diary sequence
- [ ] Overlay remains visible while votes are being cast
- [ ] Overlay cleanup happens AFTER result card

### ✅ Legacy UI Suppression
- [ ] No legacy vote bars when LV2 active
- [ ] No legacy voter checklist when LV2 active
- [ ] updateLiveVoteGraph NOT called when useLv2 = true
- [ ] No double visuals (legacy + LV2 together)

### ✅ No Regressions
- [ ] Triple eviction flow unchanged
- [ ] Double eviction flow unchanged
- [ ] Self-eviction flow unchanged
- [ ] Final 3/Final 2 flows unchanged
- [ ] Legacy UI still works when LV2 disabled

---

## Code Changes Summary

### File: js/eviction.js

**1. renderLiveVotePanel() - Lines 339-357**
```javascript
// Only make CTA if human can vote and hasn't voted yet
if (humanIsVoter && !hasVoted) {
  global.lv2.createCtaBar({ ... });
  global.lv2.setTurn?.(true);
} else {
  // Observer mode: no voting UI, just watch
  global.lv2.setTurn?.(false);
}
```

**2. beginDiaryRoomSequence() - Lines 784-793**
```javascript
// Do NOT tear down LV2 overlay during diary sequence
if (!useLv2) {
  if (global.closeAllVoteUI) {
    console.info('[eviction] Closing all vote UI before diary room sequence');
    global.closeAllVoteUI();
  }
} else {
  console.debug('[eviction] LV2 active — keeping overlay during diary sequence');
}
```

**3. Vote Emission - Lines 830-843**
```javascript
// Already implemented correctly:
if (global.lv2?.pushVote) {
  const [leftId] = noms;
  const votePick = pick === leftId ? 'left' : 'right';
  global.lv2.pushVote({
    voterId: entry.voter,
    voterName: nameV,
    pick: votePick
  });
}
```

**4. Legacy Tally Suppression - Lines 860-862**
```javascript
// Already implemented correctly:
if (!useLv2) {
  updateLiveVoteGraph(tallyA, tallyB);
}
```

---

## Manual Testing Checklist

- [ ] Open test_live_vote_observer_vs_voter.html in browser
- [ ] Test Scenario 1: Voter mode
- [ ] Test Scenario 2: Observer mode (nominated)
- [ ] Test Scenario 3: Observer mode (HOH)
- [ ] Test Scenario 4: HOH tie-break chip
- [ ] Test Scenario 5: Legacy UI fallback
- [ ] Test mobile viewport (carousel mode)
- [ ] Test desktop viewport (side-by-side mode)
- [ ] Verify no console errors
- [ ] Verify no visual glitches
- [ ] Verify smooth animations

---

## Troubleshooting

### Issue: LV2 overlay not appearing
**Check:**
- `window.game.cfg.modernLiveVoteUI !== false`
- `window.lv2?.enabled !== false`
- Exactly 2 nominees in eviction
- Console for errors in lv2.init()

### Issue: Voter chips not appearing
**Check:**
- Diary sequence started
- `global.lv2?.pushVote` is being called
- Console for errors in pushVote()
- Vote queue processing

### Issue: Observer sees CTA buttons
**Check:**
- humanIsVoter flag is false
- setTurn(false) is being called
- CTA bar creation is guarded by humanIsVoter check

### Issue: Overlay disappears during voting
**Check:**
- closeAllVoteUI is guarded by !useLv2 check
- beginDiaryRoomSequence logs "LV2 active — keeping overlay"
- No premature cleanup calls

---

## Success Criteria

All scenarios pass with:
- ✅ No console errors
- ✅ Smooth animations
- ✅ Correct UI for each role (voter/observer)
- ✅ Real-time chip appearance
- ✅ No double visuals (legacy + LV2)
- ✅ No regressions in other flows

