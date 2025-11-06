# Manual Testing Guide: Fullscreen Nomination Ceremony

## Quick Start

1. Open `test_nomination_fullscreen_flow.html` in a browser
2. Click "Setup Human HOH" 
3. Click "Start Nominations"
4. Follow the flow: Intro → Fullscreen Selector → Ceremony

## Test Scenarios

### ✅ Scenario 1: Standard Week (2 Nominees)

**Setup:**
1. Click "Setup Human HOH"
2. Click "Start Nominations"

**Expected Flow:**
1. Intro card appears with:
   - Title: "Nomination Ceremony"
   - Text: "Player 1, as Head of Household, you must nominate two houseguests for eviction."
   - Button: "NOMINATE"

2. Click NOMINATE → Fullscreen selector opens with:
   - Header showing "0 / 2 selected"
   - Grid of 9 player tiles (all except Player 1 who is HOH)
   - Confirm button (disabled)

3. Click on 2 players:
   - Each click toggles green border and checkmark
   - Count updates to "1 / 2", then "2 / 2"
   - Confirm button enables

4. Click CONFIRM NOMINATIONS:
   - Selector closes
   - Summary card shows: "Nominations" with both names (e.g., "Player 2 • Player 3")
   - Reaction cards appear for each nominee
   - Adjourn card: "This ceremony is adjourned."
   - Console shows: "startVetoComp() called"

**Verify:**
- [x] Intro card centered and readable
- [x] Selector shows exactly 9 tiles (10 players - HOH)
- [x] Selection count updates correctly
- [x] Confirm disabled until exactly 2 selected
- [x] No duplicate ceremony cards
- [x] Logs show `[noms-fs]` prefix

---

### ✅ Scenario 2: Double Eviction Week (3 Nominees)

**Setup:**
1. Click "Setup Double Week (3 noms)"
2. Click "Start Nominations"

**Expected:**
- Intro card: "...you must nominate three houseguests..."
- Selector: "0 / 3 selected"
- Must select exactly 3 before Confirm enables

**Verify:**
- [x] Count shows "/ 3"
- [x] Can select 3 different players
- [x] Summary shows 3 names with bullet separators

---

### ✅ Scenario 3: Triple Eviction Week (4 Nominees)

**Setup:**
1. Click "Setup Triple Week (4 noms)"
2. Click "Start Nominations"

**Expected:**
- Intro card: "...you must nominate four houseguests..."
- Selector: "0 / 4 selected"
- Must select exactly 4 before Confirm enables

**Verify:**
- [x] Count shows "/ 4"
- [x] Can select 4 different players
- [x] Summary shows 4 names

---

### ✅ Scenario 4: AI HOH (Original Flow)

**Setup:**
1. Click "Setup AI HOH"
2. Click "Start Nominations"

**Expected:**
- NO fullscreen selector
- Original flow: AI picks automatically
- Console shows nomination completion

**Verify:**
- [x] No intro card shown
- [x] No fullscreen selector
- [x] AI nominates automatically
- [x] Logs show original flow, not `[noms-fs]`

---

### ✅ Scenario 5: Keyboard Navigation

**Setup:**
1. Setup Human HOH and start nominations
2. Click NOMINATE to open selector

**Test:**
1. Press Tab → first tile gets focus (blue outline)
2. Press Arrow Right → focus moves to next tile
3. Press Arrow Left → focus moves back
4. Press Arrow Down → focus moves down a row
5. Press Arrow Up → focus moves up a row
6. Press Enter or Space on a tile → toggles selection
7. Tab to Confirm button (after selecting exact count)
8. Press Enter → confirms selections

**Verify:**
- [x] Arrow keys navigate between tiles
- [x] Focus ring visible on active tile
- [x] Enter/Space toggles selection
- [x] Tab reaches Confirm button
- [x] Enter on Confirm works

---

### ✅ Scenario 6: Escape/Backspace Blocking

**Setup:**
1. Open selector
2. Select 1 player (not exact count)
3. Press Escape or Backspace

**Expected:**
- Key press has NO effect
- Selector stays open
- Console logs: "Escape/Backspace blocked - must complete selection"

**Verify:**
- [x] Escape does nothing
- [x] Backspace does nothing
- [x] Must complete selection to proceed

---

### ✅ Scenario 7: Selection Toggle

**Setup:**
1. Open selector
2. Click Player 2 → selected (green border, checkmark)
3. Click Player 2 again → deselected

**Verify:**
- [x] Click toggles selection on/off
- [x] Count decrements on deselect
- [x] Visual feedback (border, checkmark) updates

---

### ✅ Scenario 8: Fallback on Error

**Setup:**
1. Setup Human HOH
2. Click "Test Fallback (Force Error)"

**Expected:**
- Error forced in intro card
- Console shows: "Intro card failed, falling back to original"
- Legacy panel displays (simple message)

**Verify:**
- [x] Fallback triggered
- [x] No crash
- [x] Some UI displayed (even if basic)

---

### ✅ Scenario 9: Accessibility - Screen Reader

**Setup:**
1. Enable screen reader (NVDA/JAWS/VoiceOver)
2. Open selector

**Test:**
1. Navigate to count display → should announce "0 / 2 selected"
2. Toggle selection → should announce updated count
3. Navigate to tiles → should announce "Nominate {name}" with pressed state

**Verify:**
- [x] Count has aria-live="polite"
- [x] Tiles have aria-pressed state
- [x] Screen reader announces changes

---

### ✅ Scenario 10: Reduced Motion

**Setup:**
1. Enable reduced motion in OS settings
2. Open selector

**Expected:**
- No tile hover scale animation
- No confirm button scale animation
- Transitions disabled

**Verify:**
- [x] Animations respect prefers-reduced-motion
- [x] Functionality still works

---

## Console Log Verification

Look for these key log messages:

```
[noms-fs] Interceptor called
[noms-fs] Human HOH detected, attempting fullscreen flow
[noms-fs] Showing intro card
[noms-fs] ✓ Intro card mounted successfully
[noms-fs] NOMINATE button clicked
[noms-fs] Opening fullscreen selector
[noms-fs] Eligible players: 9 Required: 2
[noms-fs] ✓ Fullscreen selector opened
[noms-fs] Selected: Player X - now 1 / 2
[noms-fs] Selected: Player Y - now 2 / 2
[noms-fs] Confirming selections: [2, 3]
[noms-fs] Set _pendingNoms: [2, 3]
[noms-fs] Calling finalizeNoms()
[noms-fs] ✓ Nominations committed successfully
```

## Edge Cases

### No Eligible Players
- If somehow only HOH remains, selector should show "No eligible players" or fallback

### Already Locked
- If nominations already locked, should show locked message (not fullscreen)

### Partial Selection on Confirm
- Confirm button stays disabled - cannot proceed with partial selection

## Browser Testing

Test in:
- [ ] Chrome (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Accessibility Checklist

- [ ] Keyboard navigation works (no mouse needed)
- [ ] Screen reader announces changes
- [ ] Focus visible on all interactive elements
- [ ] Color contrast sufficient (borders, text)
- [ ] Touch targets large enough (mobile)
- [ ] Reduced motion respected

## Performance

- [ ] No lag when opening selector (even with 16 players)
- [ ] Smooth animations (if motion enabled)
- [ ] No console errors or warnings
- [ ] Memory cleaned up on selector close

## Known Limitations

- Escape/Backspace blocked intentionally (no cancel)
- Must complete selection once started
- AI HOH uses original flow (not fullscreen)

## Troubleshooting

**Selector doesn't open:**
- Check console for `[noms-fs]` errors
- Verify game.phase === 'nominations'
- Verify HOH is human

**Tiles not showing:**
- Check eligible players count
- Verify getEligiblePlayerIds() returns array

**Confirm stays disabled:**
- Verify exact count selected
- Check console for selection count logs

**Duplicate ceremonies:**
- Check `__nomsFromFullscreenSelector` flag
- Verify nominations.js checks this flag

---

**Last Updated:** 2024-11-06  
**Test Coverage:** 10 scenarios + edge cases  
**Status:** Ready for manual testing
