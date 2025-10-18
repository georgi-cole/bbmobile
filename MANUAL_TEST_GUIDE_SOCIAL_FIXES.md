# Manual Test Guide: Social Maneuvers Fixes

## Test Environment Setup
1. Ensure Social Maneuvers is enabled: `window.USE_SOCIAL_MANEUVERS = true` or `game.cfg.enableSocialManeuvers = true`
2. Start a social intermission phase
3. Open the Socialize modal (click "Socialize" button in TV overlay)

---

## Test 1: Correct Gating/Copy for 2+ Cost Actions

### Test Scenario 1.1: Energy Requirement
**Setup:**
- Set player energy to 5: Check HUD shows "⚡5"
- Look at "Strategize" action (costs 2 Energy, 1 Influence)

**Expected Result:**
- ✅ If you have 0 Influence: Action shows red chip "Needs: +1 🤝 (Influence)"
- ✅ Action is disabled (grayed out, not clickable)
- ✅ Energy badge shows "⚡2" without "insufficient" class (green/normal)
- ✅ Influence badge shows "🤝1" WITH "insufficient" class (red)

**Actual Result:**
- [ ] Passed / [ ] Failed - Notes: _______________

---

### Test Scenario 1.2: Information Requirement
**Setup:**
- Set player resources: 5 Energy, 0 Influence, 0 Information
- Look at "Mediate" action (costs 2 Energy, 1 Influence, 1 Information)

**Expected Result:**
- ✅ Action shows TWO red chips:
  - "Needs: +1 🤝 (Influence)"
  - "Needs: +1 💡 (Information)"
- ✅ Action is disabled
- ✅ Energy badge is normal (green), Influence and Information badges are red

**Actual Result:**
- [ ] Passed / [ ] Failed - Notes: _______________

---

### Test Scenario 1.3: Multi-Requirements Met
**Setup:**
- Set player resources: 5 Energy, 5 Influence, 5 Information
- Look at "Mediate" action

**Expected Result:**
- ✅ No requirement chips shown (all requirements met)
- ✅ Action is enabled (clickable, normal opacity)
- ✅ All badges show normal colors

**Actual Result:**
- [ ] Passed / [ ] Failed - Notes: _______________

---

## Test 2: Group Action (Group Hangout) Execution

### Test Scenario 2.1: Target Count Gate
**Setup:**
- Select only 1 player
- Select "Group Hangout" action (minTargets: 2)

**Expected Result:**
- ✅ Action shows yellow chip "Needs: Select ≥ 2 players"
- ✅ Action is disabled
- ✅ Execute button shows "Select 2+ Players (1 selected)" and is disabled

**Actual Result:**
- [ ] Passed / [ ] Failed - Notes: _______________

---

### Test Scenario 2.2: Group Execution (Single Call)
**Setup:**
- Select 2 players (e.g., Ivy and Zed)
- Select "Group Hangout" action
- Click Execute button

**Expected Result:**
- ✅ Execute button changes to show "Execute Action (Cost: 2⚡)"
- ✅ Console shows ONE log group: "[socialize-mobile] Group action executed: group_hangout"
- ✅ Console shows: "Target count: 2"
- ✅ Console shows: "Targets: Ivy, Zed" (or similar)
- ✅ ONE feedback entry appears: "Group Hangout → Ivy, Zed"
- ✅ Energy reduces by 2 (only once, not 4)
- ✅ NO messages like "Group Hangout Zed – 2 targets needed"

**Actual Result:**
- [ ] Passed / [ ] Failed - Notes: _______________

---

### Test Scenario 2.3: Single Action Multi-Select
**Setup:**
- Select 2 players
- Select "Compliment" action (NOT a group action, minTargets: 1)
- Click Execute button

**Expected Result:**
- ✅ Console shows TWO log groups (one per target)
- ✅ TWO feedback entries appear
- ✅ Energy reduces by 2 (1 per target, as expected for single actions)

**Actual Result:**
- [ ] Passed / [ ] Failed - Notes: _______________

---

## Test 3: Remove Legacy "Memories" Popup

### Test Scenario 3.1: Phase End with Social Maneuvers Enabled
**Setup:**
- Ensure Social Maneuvers is enabled
- Complete social phase (spend all energy or advance phase)

**Expected Result:**
- ✅ Console shows: "[social] Skipping legacy summary - Social Maneuvers handles phase summary"
- ✅ NO popup appears with text like "Week X – Veto Ceremony, Memories: 0 new..."
- ✅ ONLY the new Social Maneuvers summary card appears (from social-maneuvers.js)

**Actual Result:**
- [ ] Passed / [ ] Failed - Notes: _______________

---

### Test Scenario 3.2: Phase End with Social Maneuvers Disabled
**Setup:**
- Disable Social Maneuvers: `game.cfg.enableSocialManeuvers = false`
- Complete social phase

**Expected Result:**
- ✅ Legacy summary still works (backward compatibility)
- ✅ Console does NOT show skip message
- ✅ Old social summary card appears

**Actual Result:**
- [ ] Passed / [ ] Failed - Notes: _______________

---

## Integration Test: Full Scenario

**Setup:**
1. Start new game with Social Maneuvers enabled
2. Enter social phase with 5 Energy, 0 Influence, 0 Information

**Test Flow:**
1. Open Socialize modal
2. Select 1 player
3. Verify "Group Hangout" shows "Needs: Select ≥ 2 players"
4. Select 2nd player
5. Verify chip disappears, Execute button enables
6. Execute Group Hangout
7. Verify single action call, energy spent once
8. Complete phase
9. Verify only new summary appears

**Expected Result:**
- ✅ All steps complete without errors
- ✅ Requirement chips accurate at each step
- ✅ Group action executes once
- ✅ No legacy popup

**Actual Result:**
- [ ] Passed / [ ] Failed - Notes: _______________

---

## Edge Cases

### Edge Case 1: Zero Energy with Requirements Met
**Setup:**
- Set energy to 0
- Set Influence and Information to high values
- Select players and action

**Expected Result:**
- ✅ Execute button shows "Need 2 Energy (have 0)"
- ✅ Action button shows "Needs: +2 ⚡" chip
- ✅ Everything disabled

**Actual Result:**
- [ ] Passed / [ ] Failed - Notes: _______________

---

### Edge Case 2: All Requirements Met Except Affinity
**Setup:**
- Select action with affinity requirement
- Select target with low affinity
- Have all resources

**Expected Result:**
- ✅ Action shows affinity requirement chip (from SocialActionConfig)
- ✅ Action disabled
- ✅ Resource badges show normal (all met)

**Actual Result:**
- [ ] Passed / [ ] Failed - Notes: _______________

---

## Test Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1.1 Energy Requirement | ☐ | |
| 1.2 Information Requirement | ☐ | |
| 1.3 Multi-Requirements Met | ☐ | |
| 2.1 Target Count Gate | ☐ | |
| 2.2 Group Execution | ☐ | |
| 2.3 Single Action Multi-Select | ☐ | |
| 3.1 No Legacy Popup (SM On) | ☐ | |
| 3.2 Legacy Popup (SM Off) | ☐ | |
| Integration Test | ☐ | |
| Edge Case 1 | ☐ | |
| Edge Case 2 | ☐ | |

**Tester:** _________________  
**Date:** _________________  
**Browser/Version:** _________________  
**Overall Result:** [ ] All Pass [ ] Some Failures [ ] Major Issues

---

## Common Issues & Debugging

### Issue: Requirement chips not showing
- **Check:** Browser console for errors
- **Check:** CSS file loaded (socialize-mobile.css)
- **Check:** Modal populated correctly (inspect DOM)

### Issue: Group action still calling per-target
- **Check:** Console logs - should see "Group action executed" not multiple single logs
- **Check:** `action.multiTarget` or `action.minTargets` set correctly
- **Check:** `isGroupAction` logic in executeAction

### Issue: Legacy popup still appears
- **Check:** `global.SocialManeuvers?.isEnabled()` returns true
- **Check:** Console shows skip message
- **Check:** social.js loaded and guard in place

### Issue: Execute button not updating text
- **Check:** `updateExecuteButton()` called after selection changes
- **Check:** `selectedAction.dataset.minTargets` populated
- **Check:** Button text updates in real-time
