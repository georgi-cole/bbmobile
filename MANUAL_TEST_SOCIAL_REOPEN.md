# Manual Test Checklist: Social Reopen + DR Log + Timer Pause

## Overview
This checklist validates the three new features implemented for social maneuvers:
1. Social module reopen after summary dismissal
2. Action log entries in Diary Room Social tab
3. Timer pause when Details modal is open

## Prerequisites
- Open `index.html` in a browser
- Start a new game or load a saved game
- Advance to a social intermission phase (Week 1)

## Test 1: Social Launcher Reopen After Summary

### Scenario A: Reopen with Energy/Time Remaining
**Steps:**
1. Enter social intermission phase (wait for social launcher to appear)
2. Click the social launcher to open the social modal
3. Perform 1-2 social actions (do NOT spend all energy)
4. Close the social modal (X button)
5. Wait for the phase to end or manually end it
6. Observe the social summary card appearing
7. Click the "Continue" button on the summary

**Expected Result:**
- ✅ Social launcher reappears after summary dismissal
- ✅ Launcher is clickable and functional
- ✅ Can open social modal again to perform more actions

**Actual Result:** _____________________________

**Status:** ☐ Pass ☐ Fail ☐ N/A

---

### Scenario B: Do NOT Reopen When Energy Exhausted
**Steps:**
1. Enter social intermission phase
2. Open social modal and spend ALL remaining energy
3. Close modal and wait for phase end
4. Observe summary and click "Continue"

**Expected Result:**
- ✅ Social launcher does NOT reappear (no energy left)
- ✅ Phase advances normally

**Actual Result:** _____________________________

**Status:** ☐ Pass ☐ Fail ☐ N/A

---

### Scenario C: Do NOT Reopen When Time Expired
**Steps:**
1. Enter social intermission phase
2. Wait for phase timer to run out (or manually advance phase)
3. Observe summary

**Expected Result:**
- ✅ Social launcher does NOT reappear (phase ended)
- ✅ Phase advances to nominations

**Actual Result:** _____________________________

**Status:** ☐ Pass ☐ Fail ☐ N/A

---

## Test 2: Action Log → Diary Room Social Tab

### Scenario: Action Log Entries Appear in DR
**Steps:**
1. Enter social intermission phase
2. Open social modal
3. Perform 3-5 different social actions (mix of outcomes)
   - Example: Strategize, Compliment, Confront
4. Note the outcomes and targets
5. Close modal and wait for phase end
6. Dismiss the summary by clicking "Continue"
7. Click the "DR" button in the TV header
8. Navigate to the "Social" tab in the Diary Room modal

**Expected Result:**
- ✅ Social tab contains entries for each action performed
- ✅ Each entry shows: "Actor → Target: Action (outcome) [⚡cost] → +X%"
- ✅ Entries are ordered chronologically
- ✅ Affinity delta is shown when significant (≥ 0.01)
- ✅ No duplicate entries

**Example Entry Format:**
```
Player1 → Player2: Strategize (✓) [⚡1] → +5.0%
Player1 → Player3: Compliment (✓) [⚡1] → +3.2%
Player2 → Player1: Confront (✗) [⚡2] → -2.1%
```

**Actual Result:** _____________________________

**Status:** ☐ Pass ☐ Fail ☐ N/A

---

### Scenario: Empty Action Log (No Actions)
**Steps:**
1. Enter social intermission phase
2. Do NOT open social modal or perform any actions
3. Wait for phase to end
4. Dismiss summary
5. Check Diary Room Social tab

**Expected Result:**
- ✅ No action log entries created (or only summary entry)
- ✅ No errors in console

**Actual Result:** _____________________________

**Status:** ☐ Pass ☐ Fail ☐ N/A

---

## Test 3: Timer Pause on Details Modal

### Scenario: Timer Pauses When Details Opens
**Steps:**
1. Enter social intermission phase
2. Perform 1-2 actions and close modal
3. Wait for phase to end and summary to appear
4. Note the remaining time on the game timer (if visible)
5. Click the "Details" button on the summary card
6. Observe the detailed summary modal
7. Wait ~10 seconds while modal is open
8. Click "Close" button to dismiss Details modal

**Expected Result:**
- ✅ Timer pauses when Details modal opens
- ✅ Time does NOT advance while Details is open
- ✅ Timer resumes when Details modal closes
- ✅ No errors in console
- ✅ Check console logs for:
  - `[social-maneuvers] ⏸️ Timer paused for Details modal`
  - `[social-maneuvers] ▶️ Timer resumed after Details modal closed`

**Actual Result:** _____________________________

**Status:** ☐ Pass ☐ Fail ☐ N/A

---

### Scenario: Timer Resumes on Backdrop Click
**Steps:**
1. Follow steps 1-6 from previous scenario
2. Instead of clicking "Close", click the dark backdrop area outside the modal

**Expected Result:**
- ✅ Details modal closes
- ✅ Timer resumes
- ✅ Console shows resume message

**Actual Result:** _____________________________

**Status:** ☐ Pass ☐ Fail ☐ N/A

---

## Test 4: Regression Testing

### No Regressions to Existing Summary Flow
**Steps:**
1. Complete a social phase normally
2. Verify summary displays correctly
3. Verify "Continue" button advances phase
4. Verify no visual glitches or overlays

**Expected Result:**
- ✅ Summary card displays as before
- ✅ All existing functionality works
- ✅ No visual regressions

**Actual Result:** _____________________________

**Status:** ☐ Pass ☐ Fail ☐ N/A

---

## Browser Console Checks

Open browser DevTools console and verify:

- [ ] No JavaScript errors
- [ ] Expected log messages appear:
  - `[social-maneuvers] ✓ Social launcher restored (phase active, time/energy remain)`
  - `[social-summary-bridge] ✓ Pushed X action log entries to DR Social tab`
  - `[social-maneuvers] ⏸️ Timer paused for Details modal`
  - `[social-maneuvers] ▶️ Timer resumed after Details modal closed`

---

## Test Summary

| Test | Status |
|------|--------|
| 1A: Reopen with Energy/Time | ☐ Pass ☐ Fail |
| 1B: No Reopen (Energy) | ☐ Pass ☐ Fail |
| 1C: No Reopen (Time) | ☐ Pass ☐ Fail |
| 2: Action Log to DR | ☐ Pass ☐ Fail |
| 2: Empty Action Log | ☐ Pass ☐ Fail |
| 3: Timer Pause (Close) | ☐ Pass ☐ Fail |
| 3: Timer Pause (Backdrop) | ☐ Pass ☐ Fail |
| 4: No Regressions | ☐ Pass ☐ Fail |

**Overall Status:** ☐ All Pass ☐ Some Failures

**Notes:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

---

## Quick Test via Test File

For a faster automated check, open:
```
test_social_reopen_and_dr_log.html
```

This test file simulates the scenarios above in a controlled environment.
