# Social Maneuvers Parity - Visual Verification Guide

This guide provides step-by-step visual verification for the Social Maneuvers parity implementation.

## 🎯 Quick Verification Steps

### 1️⃣ Browser Console Setup
1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Enable "Preserve log" to keep messages across page transitions
4. Set filter to show Info/Warn/Error levels

### 2️⃣ Enable Social Maneuvers
In browser console, verify or set:
```javascript
game.cfg.enableSocialManeuvers = true;
SocialManeuvers.isEnabled(); // Should return true
```

---

## 📋 Verification Checklist

### ✅ Phase Entry (Social Intermission)

**What to Check:**
- [ ] Legacy UI is fully suppressed (no old-style cards or buttons)
- [ ] New launcher appears with energy/influence/information HUD
- [ ] Phase hooks are called in correct order

**Console Output to Verify:**
```
[social.js] ▶ Entering social_intermission - calling onSocialPhaseStart
[SM] onSocialPhaseStart called
[social.js] ✓ Launcher mounted with robust fallback
[SM-Mobile] Launcher mounted
[SM-Mobile] Launcher shown
[SM-Mobile] HUD updated
```

**Visual Indicators:**
- ✅ Launcher button says "Socialize" (not "No Energy")
- ✅ HUD shows: ⚡5 🤝0 💡0 (or similar)
- ✅ No legacy social action dropdown/buttons visible
- ✅ TV screen clear of old-style cards

**What NOT to See:**
- ❌ Legacy "Do Action" button with dropdown
- ❌ Alliance/Apologize/Gift action selectors
- ❌ "Floaters this week" text
- ❌ Ambient interaction logs

---

### ✅ Modal Open/Close

**What to Check:**
- [ ] Modal opens when clicking "Socialize" button
- [ ] Phase timer pauses when modal opens
- [ ] Phase timer resumes when modal closes
- [ ] Backdrop prevents clicks to background

**Console Output to Verify:**
```
[socialize-mobile] ⏸️ Phase timer paused (modal opened)
[SM] pausePhaseTimer called

[socialize-mobile] ▶️ Phase timer resumed (modal closed)
[SM] resumePhaseTimer called
```

**Visual Indicators:**
- ✅ Modal appears centered with high z-index
- ✅ Background is darkened (backdrop visible)
- ✅ Clicking outside modal area doesn't affect game UI behind it
- ✅ Timer countdown pauses when modal is open
- ✅ Timer countdown resumes when modal closes

**What NOT to See:**
- ❌ Clicks bleeding through to background
- ❌ Timer continuing to run while modal open
- ❌ Multiple modals stacked

---

### ✅ Action Execution

**What to Check:**
- [ ] Actions route through SocialManeuvers.executeAction()
- [ ] HUD updates reflect resource changes
- [ ] Feedback appears in modal

**Console Output to Verify:**
```
[socialize-mobile] Action executed: alliance
Actor: Alice (ID: 1)
Targets: Bob
Success: true
Outcome: positive - You formed an alliance with Bob
Resources after: {energy: 4, influence: 6, information: 0}
```

**Visual Indicators:**
- ✅ Energy decreases after action (⚡5 → ⚡4)
- ✅ Influence/Information may increase based on action
- ✅ Feedback entry appears in "Recent Activity" section
- ✅ Action outcome message shows in feedback

**What NOT to See:**
- ❌ Legacy affinity delta logs (e.g., "Δ Alice→Bob +0.14")
- ❌ Error messages about missing functions
- ❌ No HUD update after action

---

### ✅ Phase End (Leaving Social Intermission)

**What to Check:**
- [ ] Engine summary appears (not legacy)
- [ ] Phase hooks called in correct order
- [ ] Launcher is hidden

**Console Output to Verify:**
```
[social.js] ◼ Leaving social_intermission - calling onSocialPhaseEnd
[SM] onSocialPhaseEnd called
[SM-Mobile] Launcher hidden
[SM] resumePhaseTimer called
[social.js] ✓ Showed engine summary via showSummaryPanel
[SM] showSummaryPanel called
```

**Visual Indicators:**
- ✅ Engine summary panel appears with:
  - Action count
  - Relationship changes
  - Resource deltas
- ✅ Launcher disappears from screen
- ✅ Timer resumes if it was paused

**What NOT to See:**
- ❌ Legacy "Social Update" card with alliances/rivalries
- ❌ Legacy generateSocialSummary() output
- ❌ Launcher still visible after phase ends

---

### ✅ Weekly Rollover (After Eviction)

**What to Check:**
- [ ] socialOnNewWeek() is called exactly once
- [ ] SocialResources.resetWeekly() called for all alive players
- [ ] HUD refreshes to show new energy totals

**Console Output to Verify:**
```
[eviction] ✓ Called socialOnNewWeek for week 2
[social.js] Social Maneuvers enabled - forwarding weekly reset to SocialResources
[SM] SocialResources.resetWeekly: 1
[SM] SocialResources.resetWeekly: 2
[SM] SocialResources.resetWeekly: 3
[social.js] ✓ Weekly reset complete - energy reset (base 5 + bonuses/penalties)
```

**Visual Indicators:**
- ✅ Energy resets to base 5 (+ any bonuses)
- ✅ Week counter increments
- ✅ HUD shows updated values
- ✅ Only called once per week increment

**What NOT to See:**
- ❌ Multiple reset calls for same week
- ❌ Energy not resetting
- ❌ HUD showing stale values

---

### ✅ Event Grants (HOH Win)

**What to Check:**
- [ ] recordWeeklyEvent() called after HOH winner determined
- [ ] Event recorded with correct player ID and flag

**Console Output to Verify:**
```
[competitions.js] ✓ Recorded HOH win event for player 1
[SM] recordWeeklyEvent: 1 {hohWin: true}
```

**Visual Indicators:**
- ✅ Next week, HOH winner gets +5 energy bonus
- ✅ Energy shows as 10 instead of 5 (base 5 + HOH bonus 5)

**What NOT to See:**
- ❌ No recordWeeklyEvent call
- ❌ Event recorded for wrong player
- ❌ No energy bonus next week

---

### ✅ Event Grants (Nomination)

**What to Check:**
- [ ] recordWeeklyEvent() called for each nominee
- [ ] Event recorded with nominated flag

**Console Output to Verify:**
```
[nom] ✓ Recorded nomination event for player 2
[SM] recordWeeklyEvent: 2 {nominated: true}
[nom] ✓ Recorded nomination event for player 3
[SM] recordWeeklyEvent: 3 {nominated: true}
```

**Visual Indicators:**
- ✅ Next week, nominees get +4 energy bonus
- ✅ Energy shows as 9 (base 5 + nomination bonus 4)

**What NOT to See:**
- ❌ Missing recordWeeklyEvent for some nominees
- ❌ Event called multiple times for same nominee
- ❌ No energy bonus next week

---

### ✅ Event Grants (Veto Win)

**What to Check:**
- [ ] recordWeeklyEvent() called after veto winner determined
- [ ] Event recorded with vetoWin flag

**Console Output to Verify:**
```
[veto.js] ✓ Recorded veto win event for player 1
[SM] recordWeeklyEvent: 1 {vetoWin: true}
```

**Visual Indicators:**
- ✅ Next week, veto winner gets +3 energy bonus
- ✅ If also HOH winner: 5 + 3 = 8 energy

---

### ✅ Event Grants (Veto Usage)

**What to Check:**
- [ ] recordWeeklyEvent() called when veto is used
- [ ] Event recorded with vetoUsed flag

**Console Output to Verify:**
```
[veto.js] ✓ Recorded veto used event for player 1
[SM] recordWeeklyEvent: 1 {vetoUsed: true}
```

**Visual Indicators:**
- ✅ Veto usage tracked for weekly energy calculation

---

### ✅ Event Grants (Replacement Nominee)

**What to Check:**
- [ ] recordWeeklyEvent() called for replacement nominee
- [ ] Event recorded with nominated flag

**Console Output to Verify:**
```
[veto.js] ✓ Recorded replacement nomination event for player 4
[SM] recordWeeklyEvent: 4 {nominated: true}
```

**Visual Indicators:**
- ✅ Next week, replacement nominee gets +4 energy bonus

---

## 🔧 Troubleshooting

### Issue: No console logs appear
**Fix**: Check that Social Maneuvers is enabled:
```javascript
game.cfg.enableSocialManeuvers = true;
```

### Issue: Legacy UI still shows
**Fix**: Verify isEnabled() returns true:
```javascript
SocialManeuvers.isEnabled(); // Must return true
```

### Issue: Timer doesn't pause
**Fix**: Check that pausePhaseTimer exists:
```javascript
typeof SocialManeuvers.pausePhaseTimer; // Should be 'function'
```

### Issue: No weekly reset
**Fix**: Verify socialOnNewWeek is defined:
```javascript
typeof socialOnNewWeek; // Should be 'function'
```

### Issue: No event grants
**Fix**: Check recordWeeklyEvent exists:
```javascript
typeof SocialManeuvers.recordWeeklyEvent; // Should be 'function'
```

---

## 📊 Expected Energy Calculation

Base energy each week: **5**

**Bonuses (+):**
- HOH win: +5
- Veto win: +3
- Nominated: +4
- Saved with veto: +2
- New alliance: +2 each
- Survived eviction: +1

**Penalties (-):**
- Comp skipped: -3
- Not drawn for veto: -1
- Zero score: -2
- Broke alliance: -3

**Example**: Player wins HOH (+5), gets nominated (+4), wins veto (+3), uses veto on self (+2)
- Next week energy: 5 (base) + 5 + 4 + 3 + 2 = **19** (capped at max 10)

---

## ✅ Success Criteria

Implementation is successful when:

1. ✅ All console logs appear as documented
2. ✅ No legacy UI visible when SM enabled
3. ✅ Timer pauses/resumes correctly
4. ✅ Actions execute through engine
5. ✅ Engine summary shows at phase end
6. ✅ Weekly reset happens once per week
7. ✅ All events recorded and grants applied
8. ✅ No errors in console
9. ✅ HUD updates reflect resource changes
10. ✅ Energy bonuses apply correctly

---

## 📝 Testing Sequence

Recommended order for comprehensive testing:

1. Start new game with SM enabled
2. Verify phase entry (week 1, first social intermission)
3. Open/close modal multiple times
4. Execute various actions (alliance, strategize, etc.)
5. Verify phase end summary
6. Complete HOH competition (win or lose)
7. Get nominated
8. Compete in veto
9. Use veto (if won)
10. Complete eviction
11. Verify weekly reset at start of week 2
12. Check energy reflects bonuses
13. Repeat for multiple weeks

---

## 🎓 Advanced Verification

For thorough testing, use browser console:

```javascript
// Check all hooks are installed
console.log('setPhase wrapped:', window.__setPhaseWrapped);
console.log('SM enabled:', SocialManeuvers?.isEnabled());
console.log('socialOnNewWeek exists:', typeof socialOnNewWeek);

// Manually trigger events (testing only)
SocialManeuvers.recordWeeklyEvent(1, { hohWin: true });
SocialManeuvers.recordWeeklyEvent(2, { nominated: true });

// Check resource state
SocialManeuvers.SocialResources.getAll(game.humanId);

// Manually trigger weekly reset (testing only)
socialOnNewWeek();
```

---

## 📸 Screenshot Checklist

Take screenshots of:
- [ ] Social intermission with new launcher (no legacy UI)
- [ ] Socialize modal open with action menu
- [ ] Recent activity showing action outcomes
- [ ] HUD showing energy/influence/information
- [ ] Engine summary at phase end
- [ ] Console logs showing all hooks firing
- [ ] Energy reset at weekly rollover
- [ ] Energy bonuses applied after events

---

## ✨ Final Notes

All changes are designed to be:
- **Non-breaking**: Legacy system still works when SM disabled
- **Robust**: Error handling prevents cascade failures
- **Observable**: Console logs aid debugging
- **Minimal**: Surgical changes, no unnecessary modifications

Refer to `SOCIAL_MANEUVERS_PARITY_IMPLEMENTATION.md` for technical details.
