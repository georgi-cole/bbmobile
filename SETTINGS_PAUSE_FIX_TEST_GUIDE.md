# Settings Modal Pause/Resume Fix - Test Guide

## Overview
This document describes how to test the fix for the Settings modal crash caused by inconsistent pause/resume behavior and double-prefixed modal IDs.

## Background
**Issue**: Opening Settings and keeping it open long enough for a phase timer to expire, then closing Settings would cause:
```
Uncaught TypeError: pauseState.timerState.phaseTimeoutCallback is not a function
```

**Root Cause**: 
1. Settings UI was calling both `PauseController.pause('settings')` AND `game.pauseManager.open('modal:settings')`
2. PauseManager would then call `PauseController.pause('modal:' + id)`, creating owner `modal:modal:settings`
3. This created two pause owners: `settings` and `modal:modal:settings`
4. On resume, mismatched owner IDs could leave stale state causing the callback error

**Fix**:
1. Normalized modal IDs in PauseManager to strip leading `modal:` prefix
2. Updated Settings UI to use only PauseManager (with fallback to PauseController)
3. All callers now pass simple IDs like `'settings'` instead of `'modal:settings'`

## Automated Tests
Run the pause integration test suite:
```bash
npm run test:pause-integration
```

Expected result: **40/40 tests passing**

## Manual Testing

### Test 1: Basic Settings Open/Close
**Purpose**: Verify no double-pause issues

**Steps**:
1. Open `index.html` in a browser
2. Start a new game or load an existing save
3. Open Settings (gear icon or ⚙️)
4. Close Settings immediately
5. Open developer console and check for errors

**Expected Result**:
- ✅ Settings opens normally
- ✅ Settings closes normally
- ✅ No console errors
- ✅ No "modal:modal:settings" in logs
- ✅ Owner IDs in logs show only `modal:settings`

### Test 2: Settings Open During Active Timer
**Purpose**: Verify pause/resume works correctly with active phase timer

**Steps**:
1. Open `test_pause_controller.html` in browser
2. Click "Start Timer (5min)" to start a simulated phase timer
3. Click "⏸ Pause (Settings)" button
4. Observe timer stops counting
5. Click "▶ Resume" button
6. Observe timer resumes from where it stopped

**Expected Result**:
- ✅ Timer pauses when pause button clicked
- ✅ Timer resumes correctly
- ✅ No console errors
- ✅ Event log shows proper pause/resume sequence

### Test 3: Settings Open Past Timer Expiry (Critical Test)
**Purpose**: Verify the main bug is fixed - no crash when timer expires during pause

**Steps**:
1. Open `index.html` in a browser
2. Start a new game or load an existing save
3. Wait for a phase to be active (HOH, Veto, Nominations, etc.)
4. Note the remaining time on the phase timer (e.g., 30 seconds remaining)
5. Open Settings modal
6. Wait for the original timer duration to elapse (let the clock run past when timer would have expired)
7. Close Settings modal
8. Check developer console

**Expected Result**:
- ✅ Settings modal stays open without issues
- ✅ Closing Settings does NOT throw `TypeError: pauseState.timerState.phaseTimeoutCallback is not a function`
- ✅ Phase advances correctly (either immediately or after a short delay)
- ✅ No console errors related to pause/resume
- ✅ Game continues normally after Settings closes

**Previous Behavior (Bug)**:
- ❌ Console error: `Uncaught TypeError: pauseState.timerState.phaseTimeoutCallback is not a function`
- ❌ Phase might not advance properly
- ❌ Game could get stuck

### Test 4: Multiple Modals
**Purpose**: Verify PauseManager correctly tracks multiple open modals

**Steps**:
1. Open `test_pause_manager_runtime.html` in browser
2. Click "Open Multiple Modals" button
3. Check the state monitor
4. Manually close modals one by one (if UI supports it)

**Expected Result**:
- ✅ Each modal gets a unique normalized ID
- ✅ `isPaused()` returns true while any modal is open
- ✅ `getOpenModals()` shows correct list
- ✅ Resume only happens when all modals closed

### Test 5: Verify ID Normalization
**Purpose**: Confirm PauseManager correctly normalizes modal IDs

**Steps**:
1. Open browser console
2. Open `index.html`
3. Run in console:
```javascript
// Test that both formats work
window.game.pauseManager.open('settings');
console.log('Open modals:', window.game.pauseManager.getOpenModals());
window.game.pauseManager.close('settings');

window.game.pauseManager.open('modal:settings');
console.log('Open modals:', window.game.pauseManager.getOpenModals());
window.game.pauseManager.close('modal:settings');

// Check PauseController owners
console.log('PauseController owners:', window.PauseController.getOwners());
```

**Expected Result**:
- ✅ Both `'settings'` and `'modal:settings'` work correctly
- ✅ Internal state always stores as `'settings'` (normalized)
- ✅ PauseController receives `'modal:settings'` (with prefix)
- ✅ No double-prefixed IDs like `'modal:modal:settings'`

## Console Monitoring

### Good Logs (What You Should See)
```
[PauseManager] Opening modal: settings
[PauseController] ⏸ Pausing game (owner: modal:settings, owners: modal:settings)
[settings/render] Paused game for settings modal
...
[settings/render] Resumed game after settings modal closed
[PauseController] Removed pause owner 'modal:settings' (remaining owners: none)
[PauseController] ▶ Resuming game
```

### Bad Logs (What You Should NOT See)
```
❌ modal:modal:settings (double prefix)
❌ TypeError: pauseState.timerState.phaseTimeoutCallback is not a function
❌ Pause owner 'settings' added but 'modal:settings' removed (mismatch)
❌ [PauseController] Resume called for unknown owner
```

## Files Changed

### Core Changes
- `js/ui/global-pause.js` - Added `normalizeModalId()` helper, updated `open()` and `close()`
- `js/ui.config-and-settings.js` - Removed direct PauseController calls, use PauseManager only
- `js/settings/render.js` - Updated to pass normalized IDs

### Test Updates
- `tests/verify_pause_integration.mjs` - Updated to check for normalized ID pattern

## Regression Testing
After manual testing, verify these still work:
- [ ] Fast Forward controls are disabled while Settings open
- [ ] Pause indicator appears in Settings modal
- [ ] Settings changes are saved correctly
- [ ] Theme changes work
- [ ] Cast tab works
- [ ] Debug minigame launcher works
- [ ] Other modals (profile, more options) still pause/resume correctly

## Success Criteria
- ✅ No `TypeError` when closing Settings after timer expiry
- ✅ Pause/resume behavior is consistent across all modal integrations
- ✅ No `modal:modal:*` IDs in PauseController owners
- ✅ All automated tests pass (40/40)
- ✅ Timer correctly pauses and resumes
- ✅ Phase advances correctly after overdue timer

## Known Limitations
- PauseManager normalizes IDs by stripping `modal:` prefix
- This is a one-way normalization (can't distinguish between `'settings'` and `'modal:settings'` as separate modals)
- This is acceptable as all modals should use consistent naming

## Rollback Plan
If issues are discovered:
1. Revert commits:
   - `9f3aeb1` - Update pause integration tests
   - `51e77df` - Normalize modal IDs and fix double pause/resume
2. Previous behavior will be restored
3. Root issue (double pause) will return but game remains playable

## Additional Notes
- Changes are backward compatible with existing modal integrations
- Other modals (`settings-modal.js`, `more-options-menu.js`) already pass `'modal:*'` IDs and benefit from normalization
- Future modals should pass simple IDs (e.g., `'profile'`) and let PauseManager add the prefix
