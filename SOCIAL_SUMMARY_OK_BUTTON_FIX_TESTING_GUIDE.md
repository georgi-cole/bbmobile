# Social Summary OK Button Fix - Manual Testing Guide

## 🐛 Bug Fixed
When a user depletes energy via the socialize modal and clicks OK on the social summary, a new 30-second timer was starting instead of immediately advancing to the nominations phase.

## ✅ Expected Behavior After Fix
1. User opens socialize modal
2. User spends all their energy interacting with other players
3. Modal closes and social summary appears with "More" and "OK" buttons
4. **User clicks OK → Phase immediately advances to nominations** (no timer restart!)
5. No redundant summary appears
6. Evicted players don't see the summary at all

## 🧪 Manual Testing Steps

### Test Case 1: Energy Depletion via Modal → OK Button
**Steps:**
1. Start a new game and advance to the social phase
2. Open the socialize modal (click the "Socialize" button)
3. Spend all your energy on social actions (talk, strategize, etc.)
4. Once energy hits 0, the modal should close automatically
5. Social summary card should appear with "More" and "OK" buttons
6. **Click the "OK" button**

**Expected Result:**
- ✅ Phase immediately advances to nominations
- ✅ NO new timer starts
- ✅ NO redundant summary appears
- ✅ Console shows: `[social-maneuvers] ✓ Calling stored phase advancement callback`

**Bug Behavior (before fix):**
- ❌ Timer resumes and shows ~30 seconds
- ❌ After timer expires, summary appears again
- ❌ Console shows: `[social-maneuvers] ▶️ Timer resumed via PauseController (OK pressed)`

### Test Case 2: Evicted Player Check
**Steps:**
1. Start a game and advance to social phase
2. Use the dev console to evict the human player: `game.cast[0].evicted = true` (assuming human is player 0)
3. Try to open the socialize modal OR wait for phase timer to expire

**Expected Result:**
- ✅ Evicted player does NOT see the social summary
- ✅ Console shows: `[social-maneuvers] 🚫 Human player is evicted - skipping summary display`

### Test Case 3: Callback Fallback
**Steps:**
1. Start a game and advance to social phase
2. Open browser console
3. Delete the callback: `delete game.__socialPhaseAdvanceCallback`
4. Deplete energy and click OK on summary

**Expected Result:**
- ✅ Phase still advances to nominations (fallback kicks in)
- ✅ Console shows: `[social-maneuvers] ⚠ No phase advancement callback found - attempting direct phase advancement as fallback`
- ✅ Console shows: `[social-maneuvers] ✓ Fallback: Starting nominations via startNominations`

## 🔍 What to Check in Console

### Good Logs (After Fix):
```
[socialize-mobile] ✓ Phase advancement callback stored (energy depletion path)
[social-maneuvers] ⏸️ Timer paused via PauseController (summary modal opened)
[social-maneuvers] ✓ Calling stored phase advancement callback
[socialize-mobile] ✓ Starting nominations via startNominations
```

### Bad Logs (Before Fix):
```
[social-maneuvers] ▶️ Timer resumed via PauseController (OK pressed)
[social-maneuvers] ⚠ No phase advancement callback found - phase may not advance
```

## 📝 Code Changes Summary

### 1. `js/socialize-mobile.js`
- **Before:** `showSocialSummary()` did NOT set the callback
- **After:** `showSocialSummary()` now defines and stores `game.__socialPhaseAdvanceCallback` before showing summary

### 2. `js/social-maneuvers.js`
- **Before:** OK button called `PauseController.resume()` which restarted the timer
- **After:** OK button now calls the stored callback directly (no timer resume)
- **Added:** `isHumanPlayerEvicted()` helper function
- **Added:** Eviction checks in `generatePhaseSummary()` and `showSummaryPanel()`
- **Added:** Fallback logic if callback is missing

### 3. Refactoring
- Extracted `START_NOMINATIONS_METHODS` constant to reduce duplication
- Exported constant from `SocialManeuvers` for reuse
- Added defensive fallback in `socialize-mobile.js`

## 🎯 Key Files Modified
- `js/socialize-mobile.js` - Set callback on energy depletion
- `js/social-maneuvers.js` - Remove timer resume, add eviction checks
- `test_social_summary_ok_button_fix.html` - Automated test suite

## 🔒 Security
- ✅ CodeQL scan passed: 0 alerts
- ✅ No security vulnerabilities introduced
- ✅ Follows existing code patterns

## 📚 Related Documentation
- `SOCIAL_PHASE_TIMER_FIX_SUMMARY.md` - Similar timer bug that was fixed
- `SOCIAL_EVICTION_FIX.md` - Pattern for eviction checks
- `SOCIAL_SUMMARY_OK_BUTTON_FIX.md` - Previous OK button callback fix

## 💡 Tips for Testing
1. Use Fast Forward (FFwd) button to quickly advance to social phase
2. Check the browser console for detailed logs
3. Test with different player counts
4. Test both with and without Social Maneuvers feature flag
5. Verify behavior is consistent across multiple social phases in the same game

## 🚨 Common Issues to Watch For
- ❌ Timer restarting after OK press (main bug)
- ❌ Summary appearing twice
- ❌ Evicted players seeing summary
- ❌ Phase not advancing at all
- ❌ Console errors when clicking OK

## ✅ Success Criteria
- [x] OK button immediately advances phase (no timer restart)
- [x] Only ONE social summary per phase (no duplicates)
- [x] Evicted players don't see summary
- [x] Callback is set in ALL code paths (timer expiration AND energy depletion)
- [x] Console logs clearly show phase advancement when OK is pressed
- [x] Fallback works if callback is missing
