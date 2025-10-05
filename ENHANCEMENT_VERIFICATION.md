# Enhancement PR - Verification Checklist

## Pre-Flight Checks

- [ ] All new JS files load without errors
- [ ] Console shows no syntax errors on page load
- [ ] Game starts successfully from lobby
- [ ] Settings modal opens and closes

## Feature Verification

### 1. Roster Status Labels ✅

**Test Steps:**
1. Start a new game
2. Progress to HOH competition
3. Complete HOH - verify winner shows "HOH" label
4. Progress to nominations - verify nominees show "NOM" label
5. Progress to veto - verify veto winner shows "POV" label
6. If HOH wins veto, verify "HOH·POV" combined label

**Expected Results:**
- Labels replace player names when status is active
- Labels have colored pill backgrounds (gold/green/red/gradient)
- Hover shows full aria-label description
- Labels revert to names when status clears

**Verification:**
- [ ] HOH label appears and is gold
- [ ] POV label appears and is green
- [ ] NOM label appears and is red
- [ ] HOH·POV combined label appears with gradient
- [ ] Labels revert to names on new week

### 2. Results Popup ✅

**Test Steps:**
1. Complete any competition (HOH, Veto, etc.)
2. Observe results popup

**Expected Results:**
- Modal appears with dark overlay
- Winner shown with large avatar and score
- 2nd and 3rd place shown smaller below
- All scores shown with 1 decimal place
- Can dismiss after 0.5s by clicking
- ESC key dismisses popup
- Auto-dismisses after 5 seconds
- Console shows: `[results] show phase=... winner=... scoreRaw=... shown=...`

**Verification:**
- [ ] Results popup appears
- [ ] Avatars load or show skeleton
- [ ] Scores formatted to 1 decimal
- [ ] Can dismiss by clicking
- [ ] Can dismiss with ESC
- [ ] Auto-dismisses after duration
- [ ] Logging present in console

### 3. Social Narrative Engine ✅

**Test Steps:**
1. Start game and progress through multiple weeks
2. Observe social interaction logs
3. Open console and run: `window.__dumpSocialMemory()`

**Expected Results:**
- Social logs show narrative descriptions (no raw numbers)
- Repeated interactions escalate narrative stages
- Threshold events log alliance/feud hints
- Console dump shows pair memory with stages

**Verification:**
- [ ] Social logs show narrative text
- [ ] No raw affinity numbers visible
- [ ] Alliance hint logged when pairs cross +0.55
- [ ] Feud hint logged when pairs cross -0.55
- [ ] `__dumpSocialMemory()` shows data structure

### 4. Phase Token & Fast-Forward ✅

**Test Steps:**
1. Start game and reach any phase
2. Click "Skip" button to fast-forward
3. Observe console logs
4. Verify no ghost operations continue

**Expected Results:**
- Phase token increments on skip
- Audio fades out smoothly
- Pending cards cancelled
- Phase advances immediately
- Console shows: `[phase] cancel token=... new=...` and `[ff] activate phase=...`

**Verification:**
- [ ] Skip button works
- [ ] Audio stops on skip
- [ ] Phase advances cleanly
- [ ] No ghost cards appear later
- [ ] Logging present in console

### 5. Audio Mute Toggle ✅

**Test Steps:**
1. Start game with audio playing
2. Click mute button (🔊) in topbar
3. Verify audio stops and button changes to 🔇
4. Refresh page
5. Verify mute state persists

**Expected Results:**
- Clicking toggles mute state
- Audio stops when muted
- Button icon updates
- State persists in localStorage
- Console shows: `[audio] muted=true/false`

**Verification:**
- [ ] Mute button visible in topbar
- [ ] Clicking toggles audio
- [ ] Icon changes between 🔊 and 🔇
- [ ] State persists after refresh
- [ ] Logging present in console

### 6. Terminal State Detection ✅

**Test Steps:**
1. In console, run: `window.__simulateFinalTwo()`
2. Observe automatic phase jump

**Expected Results:**
- Game detects 2 players remaining
- Jumps directly to jury voting phase
- Console shows: `[phase] jump reason=remainingPlayers count=2 targetPhase=jury`

**Verification:**
- [ ] `__simulateFinalTwo()` works
- [ ] Phase jumps to jury
- [ ] Logging shows terminal state detection
- [ ] No errors in console

### 7. Debug Tools ✅

**Test Steps:**
Run each command in console:
1. `window.__dumpCompStats(100)`
2. `window.__dumpPhaseState()`
3. `window.__dumpSocialMemory()`
4. `window.__simulateFinalTwo()`
5. `window.__toggleReducedMotion()`

**Expected Results:**
- Each command executes without error
- Dump commands show formatted data
- Toggle commands confirm state change

**Verification:**
- [ ] `__dumpCompStats()` shows competition fairness data
- [ ] `__dumpPhaseState()` shows current phase info
- [ ] `__dumpSocialMemory()` shows pair data
- [ ] `__simulateFinalTwo()` works
- [ ] `__toggleReducedMotion()` toggles motion

### 8. Score Formatting ✅

**Test Steps:**
1. Complete any competition
2. View results popup and cards

**Expected Results:**
- All scores show exactly 1 decimal place
- No scores shown as integers or 2+ decimals
- Consistent formatting across all displays

**Verification:**
- [ ] Results popup scores are 1 decimal
- [ ] Competition cards show 1 decimal
- [ ] No formatting inconsistencies

### 9. Mobile Responsiveness 🔄

**Test Steps:**
1. Open game on mobile device or resize browser to mobile width
2. Complete competition
3. View results popup
4. Check status labels

**Expected Results:**
- Results popup fits within viewport
- No horizontal scrolling
- Status labels readable
- All interactive elements accessible

**Verification:**
- [ ] Popup fits mobile screen
- [ ] No content cut off
- [ ] Touch targets adequate size
- [ ] Scrolling works smoothly

### 10. Accessibility 🔄

**Test Steps:**
1. Use screen reader to navigate roster
2. Tab through results popup
3. Test keyboard navigation
4. Check aria-labels

**Expected Results:**
- Status labels have descriptive aria-labels
- Results popup keyboard accessible
- Mute button announces state
- Focus management correct

**Verification:**
- [ ] Screen reader announces status labels correctly
- [ ] Can navigate results popup with keyboard
- [ ] ESC closes results popup
- [ ] Mute button aria-pressed updates
- [ ] Focus returns appropriately

## Regression Testing

- [ ] Starting new game works
- [ ] HOH competition completes successfully
- [ ] Nominations phase works
- [ ] Veto competition completes
- [ ] Eviction sequence works
- [ ] Jury voting works
- [ ] Winner declared correctly
- [ ] Settings persist
- [ ] Fast-forward doesn't break game state

## Performance Checks

- [ ] No memory leaks when skipping phases
- [ ] Card queue doesn't accumulate indefinitely
- [ ] Audio cleanup prevents multiple tracks
- [ ] Page load time acceptable
- [ ] No excessive console logging in production

## Browser Compatibility

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Known Issues

Document any issues found during verification:

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

## Sign-Off

- [ ] All critical features verified
- [ ] No blocking bugs found
- [ ] Documentation complete
- [ ] Ready for merge

**Tested by:** _______________  
**Date:** _______________  
**Notes:** _______________________________________________
