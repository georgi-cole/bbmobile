# PR: Remove Unintended Skip Button from Minigame Prompts

## Problem Statement

PR #1258 introduced an unintended new UI button: a "⏭️ Skip" button placed on the minigame prompt/instructions card (next to the Start/Play button). This was not the intended behavior. The game already has a single existing skip control: the global fast-forward control in the main HUD/timer area.

Having two different skip mechanisms created a confusing user experience and redundant UI elements.

## Solution

This PR removes the unintended skip button while preserving and adjusting the POV timer fix to work without it.

## Changes Made

### 1. UI Changes - Skip Button Removal

**File:** `js/competitions-flow.js`

Removed all skip button code from the `showInstructionsInTV()` function:
- Skip button creation and styling (~60 lines)
- Skip button event listeners (mouseenter, mouseleave, click)
- Skip button append to buttons container
- Skip button recovery/re-render logic in verification section

**Result:** Instructions card now shows only the "▶ Play" button

### 2. POV Timer Fix - Preserved & Adjusted

The POV timer fix has been preserved and works through **three pathways**:

#### Pathway A: Human Completes Minigame Normally
- **Location:** `js/competitions.js` lines 869-886
- **Trigger:** Human submits score after completing minigame
- **Action:** Calls `showCompetitionResultsAndFastForward(score)`
- **Result:** Inline results show → phase timer shortened to 1s → veto ceremony starts immediately

#### Pathway B: Human Exits Early (X Button)
- **Location:** `js/competitions-flow.js` lines 1245-1250
- **Trigger:** Human clicks X button and confirms exit
- **Action:** Calls `showCompetitionResultsAndFastForward(0)`
- **Result:** Inline results show (AI winners) → phase timer shortened → veto ceremony starts immediately

#### Pathway C: Global Fast-Forward Control (HUD)
- **Location:** `js/ui.hud-and-router.js` lines 1546-1704
- **Trigger:** User clicks global fast-forward button in HUD/timer area
- **Action:** Activates fast-forward mode (10% speed)
- **Result:** Phase accelerates → AI players complete faster → results show → ceremony starts quickly

**Key Function:** `showCompetitionResultsAndFastForward()` in `js/competitions-flow.js`
- Shows inline competition results
- Shortens phase countdown to 1 second
- Resolves phase immediately for POV competitions
- Sets `g.__vetoResultsShown = true` to prevent duplicate displays

### 3. Test Updates

**File:** `test_pov_human_timer_handling.html`

Updated Scenario 3:
- **Before:** "Skip Challenge" - test clicking skip button on instructions card
- **After:** "Global Fast-Forward" - test using global fast-forward control in HUD

All three test scenarios now cover:
1. ✅ Complete minigame normally
2. ✅ Exit early via X button
3. ✅ Use global fast-forward control

## Testing & Validation

### ✅ ESLint
```bash
./node_modules/.bin/eslint js/competitions-flow.js --config .eslintrc.json
# PASSED - No errors or warnings
```

### ✅ Automated Tests
```bash
npm run test:minigames
# PASSED - All minigame validation tests pass
```

### ✅ Code Search
```bash
grep -r "skip-comp-button" --include="*.css" --include="*.js" --include="*.html" .
# No references found - cleanup complete
```

### ✅ Manual Testing
1. Start POV competition as human player
2. Verify instructions card shows only "▶ Play" button
3. Test all three completion scenarios
4. Confirm immediate results and ceremony start in all cases

## Before & After

### Before (with skip button)
```
┌─────────────────────────────┐
│   Test Minigame             │
│   Try to match the pattern  │
│                             │
│   [▶ Play]   [⏭️ Skip]      │
└─────────────────────────────┘
```
- Two skip options: prompt button OR global fast-forward
- Confusing UX - which button to use?

### After (without skip button)
```
┌─────────────────────────────┐
│   Test Minigame             │
│   Try to match the pattern  │
│                             │
│        [▶ Play]             │
└─────────────────────────────┘
```
- One skip option: global fast-forward control in HUD
- Clear, consistent UX

## POV Competition Flow (Verified)

All three scenarios now work correctly:

**Scenario A: Normal Completion**
```
Human plays minigame → Score submitted → 
showCompetitionResultsAndFastForward(score) →
Inline results show (~3s) → Phase timer = 1s →
Veto ceremony starts immediately (NO 30-60s wait)
```

**Scenario B: Early Exit**
```
Human clicks X → Confirms exit → Overlay closes →
showCompetitionResultsAndFastForward(0) →
Inline results show (AI winners) → Phase timer shortened →
Veto ceremony starts immediately
```

**Scenario C: Global Fast-Forward**
```
Human clicks fast-forward (HUD) → Phase accelerates (10% speed) →
AI players complete faster → Results show →
Phase timer accelerates → Veto ceremony starts quickly
```

## Breaking Changes

❌ **None** - This is purely a UI simplification

Users who previously used the prompt-level skip button should now use the global fast-forward control in the HUD/timer area. The behavior is identical.

## Files Modified

1. ✏️ `js/competitions-flow.js` - Removed skip button UI and logic (97 lines removed)
2. ✏️ `test_pov_human_timer_handling.html` - Updated test scenario 3
3. 📄 `SKIP_BUTTON_REMOVAL_SUMMARY.md` - Comprehensive documentation (new)

## Files Unchanged (POV Fix Preserved)

1. ✅ `js/competitions.js` - Human completion path intact
2. ✅ `js/ui.hud-and-router.js` - Global fast-forward intact
3. ✅ `js/veto.js` - POV ceremony timer logic intact

## Related Issues/PRs

- PR #1258 - Original implementation that introduced the skip button
- This PR - Removes skip button while preserving POV timer fix

## Checklist

- [x] Code changes implemented
- [x] Skip button completely removed from UI
- [x] POV timer fix verified working (3 pathways)
- [x] Tests updated and passing
- [x] ESLint passed
- [x] No leftover artifacts (CSS selectors, event listeners, etc.)
- [x] Documentation added (SKIP_BUTTON_REMOVAL_SUMMARY.md)
- [x] Manual testing completed

## Review Notes

Please verify:
1. ✅ Instructions card shows only Play button
2. ✅ POV competitions complete quickly in all scenarios
3. ✅ Global fast-forward control works as expected
4. ✅ No console errors or warnings
5. ✅ Test file `test_pov_human_timer_handling.html` runs correctly

## Deployment Notes

Safe to merge - no breaking changes, backward compatible.

## Conclusion

This PR successfully:
- ✅ Removes the unintended skip button from minigame prompts
- ✅ Preserves the POV timer fix through existing mechanisms
- ✅ Simplifies the UX to use a single, consistent skip control
- ✅ Maintains full backward compatibility
- ✅ Passes all tests and validation

The POV timer fix is now achieved through the existing global fast-forward control and human completion/exit paths, eliminating the need for a redundant prompt-level skip button.
