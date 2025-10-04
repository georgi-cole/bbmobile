# Manual Testing Guide - Enhanced Public's Favourite Feature

## Overview
This guide provides step-by-step instructions for manually testing the enhanced Public's Favourite Player feature that now runs BEFORE jury votes are revealed.

## Prerequisites
- Game must reach finale phase with at least 2 players in the cast
- Toggle `enablePublicFav` controls whether feature runs

## Test Scenarios

### Scenario 1: Toggle OFF (Default Behavior)
**Expected:** Public Favourite segment is completely skipped

**Steps:**
1. Open game in browser
2. Click "⚙️ Settings" button
3. Navigate to "Gameplay" tab
4. Verify "Public's Favourite Player at finale" checkbox is UNCHECKED (default)
5. Click "Save & Close"
6. Start a new game (click "▶ Start")
7. Fast-forward to finale (manually or via debug commands)
8. When jury voting begins, observe console

**Expected Results:**
- Console should show: `[juryCast] start`
- Console should show: `[publicFav] skipped (toggle false)`
- Console should show: `[juryReveal] start`
- Public Favourite panel should NOT appear
- Jury reveal proceeds directly after casting
- No errors in console

---

### Scenario 2: Toggle ON - Full Feature Flow
**Expected:** Public Favourite segment runs between jury casting and reveal

**Steps:**
1. Open game in browser
2. Click "⚙️ Settings" button
3. Navigate to "Gameplay" tab
4. CHECK "Public's Favourite Player at finale" checkbox
5. Click "Save & Close"
6. Reload page (test persistence)
7. Open Settings again - verify checkbox is still checked
8. Start a new game (click "▶ Start")
9. Fast-forward to finale
10. Observe the complete flow

**Expected Results - Console Markers:**
```
[juryCast] start
[juryCast] vote juror=X stored (repeated for each juror)
[juryCast] complete
[publicFav] start (pre-jury)
[publicFav] eliminate player=Name pct=X% remaining=Y (repeated 4 times)
[publicFav] done
[juryReveal] start
[juryReveal] show juror=X vote=Y (repeated for each juror)
[juryReveal] winner=X votes=A-B
```

**Expected Results - Visual Flow:**
1. **Intro Card Appears**
   - Title: "Audience Spotlight"
   - Text: "Before we reveal the jury votes and crown the winner. Let's see who you voted as your favourite!"
   - Duration: 3000ms

2. **Voting Panel Appears**
   - Panel shows up to 5 candidate tiles in a grid
   - Each tile displays:
     - Avatar image
     - Player name
     - Progress bar (starts at 0%)
     - Percentage text (starts at "0%")
   - Panel width: ~700px
   - Background: gradient dark blue

3. **Bar Animation (5 seconds or 2s if reduced-motion)**
   - All bars animate smoothly from 0% to final percentages
   - Percentages count up in sync with bar animation
   - Final percentages sum to exactly 100%
   - Live region announces: "Vote tallies revealed"

4. **Elimination Sequence**
   - After 5s animation completes, eliminations begin
   - Each elimination has 800ms delay
   - Lowest percentage candidate eliminated first
   - Visual: tile fades out (opacity 0, scale 0.85)
   - Live region announces: "Name eliminated with X%. Y remaining."
   - Continues until only 1 candidate remains
   - All eliminated tiles disappear (display: none)

5. **Winner Enlargement**
   - Remaining tile grows to scale 1.5 (or 1.2 if reduced-motion)
   - Outline: 3px solid cyan (#6fd7ff)
   - Box-shadow: glowing cyan effect
   - Occupies most of panel width
   - Live region announces: "Name wins with X%!"
   - 1.2s delay for enlargement to complete

6. **Final Announcement Card**
   - Title: "Fan Favourite"
   - Line 1: "The Public has chosen [Name] for their Favourite player!"
   - Line 2: "Now let's see who is the Jury's favorite houseguest!"
   - Duration: 4000ms

7. **Transition to Jury Reveal**
   - Panel closes after announcement card dismisses
   - Jury reveal begins immediately
   - No confetti during Public Favourite segment
   - Winner confetti appears later (after actual game winner announced)

---

### Scenario 3: Edge Cases

#### 3.1 - Only 1 Player in Cast
**Steps:**
1. Start game with only 1 player (or manually evict all but 1)
2. Trigger finale

**Expected:**
- Console: `[publicFav] skipped (insufficient players N=1)`
- No Public Favourite panel appears
- Jury reveal proceeds normally

#### 3.2 - Exactly 2 Players
**Steps:**
1. Start game with 2 players
2. Enable toggle
3. Trigger finale

**Expected:**
- Public Favourite runs with 2 candidates
- One elimination occurs (800ms after bar animation)
- Winner enlarges
- Flow completes normally

#### 3.3 - 5 or More Players
**Steps:**
1. Start game with 8+ players
2. Enable toggle
3. Trigger finale

**Expected:**
- Up to 5 candidates selected randomly from full cast
- 4 eliminations occur sequentially
- Winner enlarges
- Flow completes normally

#### 3.4 - prefers-reduced-motion: reduce
**Steps:**
1. Enable browser's reduced motion setting
2. Enable Public Favourite toggle
3. Trigger finale

**Expected:**
- Bar animation completes in 2s (instead of 5s)
- Winner scale reduced to 1.2 (instead of 1.5)
- No pulsing/wobbling animations
- All transitions shortened or removed

---

### Scenario 4: Debug Helper Testing

**Steps:**
1. Complete a full season to finale
2. After finale completes, open browser console
3. Run: `game.__debugRunPublicFavOnce()`

**Expected Results - Toggle ON:**
- Console: `[finale] Using new pre-jury Public Favourite flow`
- Public Favourite segment re-runs
- All visual and console markers repeat

**Expected Results - Toggle OFF:**
- Console: `[finale] Public Favourite is disabled in settings`
- No segment runs

**Expected Results - No Game:**
- Console: Warning about missing game state

---

### Scenario 5: Percentage Normalization Test

**Purpose:** Verify percentages always sum to exactly 100%

**Steps:**
1. Enable Public Favourite toggle
2. Run game to finale multiple times (5+ runs)
3. For each run, note down all displayed percentages

**Expected:**
- Sum of all percentages = 100% (every time)
- No floating point errors
- Percentages are integers
- No negative values

**Example Valid Results:**
- 3 candidates: 45%, 30%, 25% (sum = 100%)
- 5 candidates: 25%, 22%, 21%, 18%, 14% (sum = 100%)

---

### Scenario 6: No Confetti During Segment

**Purpose:** Verify confetti only appears for game winner, not Public Favourite winner

**Steps:**
1. Enable Public Favourite toggle
2. Complete game to finale
3. Watch for confetti effects

**Expected:**
- NO confetti during Public Favourite segment
- NO confetti after "Fan Favourite" announcement
- Confetti ONLY appears after actual game winner announced
- Console should not show confetti-related logs during Public Favourite

---

## Accessibility Testing

### Screen Reader Test
**Steps:**
1. Enable screen reader (NVDA, JAWS, or VoiceOver)
2. Enable Public Favourite toggle
3. Run game to finale
4. Listen to announcements

**Expected Announcements:**
- "Public's Favourite Player voting, dialog"
- "Vote tallies revealed"
- "Name eliminated with X%. Y remaining." (for each elimination)
- "Name wins with X%!"

### Keyboard Navigation
**Steps:**
1. Use Tab key to navigate
2. Use screen reader commands

**Expected:**
- Panel is keyboard accessible
- Live region content is announced
- No keyboard traps

---

## Integration Points to Verify

### 1. Settings Persistence
- Settings toggle persists across page reloads
- Stored in localStorage under key 'bb_cfg_v2'

### 2. Console Markers
All expected console logs should appear:
- `[publicFav] start (pre-jury)` - when enabled and starting
- `[publicFav] skipped (toggle false)` - when disabled
- `[publicFav] skipped (already completed)` - if run twice
- `[publicFav] skipped (insufficient players N=X)` - if <2 players
- `[publicFav] eliminate player=Name pct=X% remaining=Y` - for each elimination
- `[publicFav] done` - when complete
- `[publicFav] error` - if exceptions occur

### 3. No Breaking Changes
- Old finale.js function marked deprecated but still functional
- Legacy CSS classes (.pfv-*) retained for backward compatibility
- No changes to existing winner confetti logic
- No changes to jury reveal logic

---

## Common Issues & Troubleshooting

### Issue: Panel doesn't appear
**Check:**
- Toggle is enabled in Settings → Gameplay
- At least 2 players in game
- Console for `[publicFav] skipped` messages

### Issue: Bars don't animate
**Check:**
- Browser supports CSS transitions
- Not in reduced-motion mode (or animation is just faster)
- No JavaScript errors in console

### Issue: Percentages don't sum to 100
**Check:**
- Console for actual values
- Report as bug if sum ≠ 100

### Issue: Winner doesn't enlarge
**Check:**
- `.pfWinnerBig` class is applied (inspect element)
- CSS is loaded properly
- Not overridden by other styles

---

## Success Criteria Checklist

- [ ] Toggle OFF: segment completely skipped
- [ ] Toggle ON: segment runs before jury reveal
- [ ] Up to 5 candidates from full cast shown
- [ ] Intro card shows correct text
- [ ] Bars animate smoothly
- [ ] Percentages sum to 100%
- [ ] Sequential elimination works (800ms stagger)
- [ ] Winner tile enlarges properly
- [ ] Final card shows correct text with jury transition line
- [ ] No confetti during segment
- [ ] Console markers correct
- [ ] No JavaScript errors
- [ ] Reduced motion respected
- [ ] Accessibility features work
- [ ] Settings persist across reloads
- [ ] Debug helper works

---

## Browser Testing Matrix

Test in multiple browsers to ensure compatibility:
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Performance Notes

- Panel creation: ~10ms
- Bar animation: 5000ms (or 2000ms reduced-motion)
- Elimination sequence: 800ms × (candidates - 1)
- Total segment duration (5 candidates): ~5s + 3.2s + 1.2s = ~9.4s
- No memory leaks expected (panel removed from DOM after completion)

---

## Files Modified

1. **js/jury.js** - Enhanced runPublicFavouriteSegment() function
2. **js/finale.js** - Deprecated old implementation, updated debug helper
3. **styles.css** - Added new CSS classes (.pfGrid5, .pfCell, .pfBarOuter, .pfBarFill, .pfElim, .pfWinnerBig)
4. **IMPLEMENTATION_SUMMARY.md** - Added feature documentation
5. **VERIFICATION_CHECKLIST.md** - Updated acceptance criteria

---

## Contact & Reporting

If issues are found during testing:
1. Note the browser and OS
2. Copy console logs
3. Screenshot the visual issue
4. Describe steps to reproduce
5. Report via GitHub Issues

---

**Last Updated:** 2024
**Feature Version:** Enhanced Pre-Jury Flow with 5 Candidates
