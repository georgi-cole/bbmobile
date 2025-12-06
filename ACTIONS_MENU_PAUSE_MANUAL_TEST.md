# Actions Menu Pause Integration - Manual Test Guide

## Overview

This document provides instructions for manually verifying that the Actions menu (3-dots button) properly pauses and resumes the game.

## Test Environment

1. Open `test_actions_menu_pause.html` in a browser
2. Alternatively, open `index.html` and start a game

## Test Procedure

### Pre-Test Setup

1. Open browser developer console (F12)
2. Ensure console is set to show "Debug" level messages
3. If testing with `test_actions_menu_pause.html`, start the timer by clicking "Start Timer"

### Test 1: Opening Actions Menu Pauses Game

**Steps:**
1. Click the Actions menu button (⋮ / three vertical dots)
2. Observe the following:

**Expected Results:**
- ✅ Console shows: `[ActionMenu] Paused game for Actions menu`
- ✅ `window.game.pauseController.isPaused()` returns `true`
- ✅ `window.game.pauseController.getOpenModals()` includes `'modal:actions'`
- ✅ If a timer is running (competition phase or test timer), it stops incrementing
- ✅ No JavaScript errors in console

**Verification Commands** (in console):
```javascript
window.game.pauseController.isPaused()        // Should return: true
window.game.pauseController.getOpenModals()   // Should include: "modal:actions"
```

### Test 2: Closing Actions Menu Resumes Game

**Steps:**
1. With Actions menu still open from Test 1
2. Click the backdrop (area outside menu) or press Escape key
3. Observe the following:

**Expected Results:**
- ✅ Console shows: `[ActionMenu] Resumed game after Actions menu closed`
- ✅ `window.game.pauseController.isPaused()` returns `false` (if no other modals are open)
- ✅ `window.game.pauseController.getOpenModals()` does NOT include `'modal:actions'`
- ✅ If a timer was running before, it resumes incrementing
- ✅ No JavaScript errors in console

**Verification Commands** (in console):
```javascript
window.game.pauseController.isPaused()        // Should return: false (if no other modals)
window.game.pauseController.getOpenModals()   // Should NOT include: "modal:actions"
```

### Test 3: Multiple Opens/Closes

**Steps:**
1. Open and close Actions menu 3-5 times rapidly
2. After final close, verify game state

**Expected Results:**
- ✅ Each open shows pause debug message
- ✅ Each close shows resume debug message
- ✅ After final close, game is running (isPaused = false)
- ✅ No memory leaks or lingering modal IDs
- ✅ No JavaScript errors in console

### Test 4: Actions Menu with Other Modals

**Steps:**
1. Open Settings modal (or another modal)
2. While Settings is open, verify `isPaused()` is `true`
3. Keep Settings open and also open Actions menu
4. Close Actions menu but keep Settings open
5. Verify game is still paused (Settings is still open)
6. Close Settings
7. Verify game resumes

**Expected Results:**
- ✅ Opening Actions menu while Settings is open: modal list includes both
- ✅ Closing Actions menu while Settings is open: game stays paused
- ✅ Only after closing all modals does game resume
- ✅ Modal stacking works correctly (no conflicts)

### Test 5: Automated Test Suite

**Steps:**
1. Open `test_actions_menu_pause.html`
2. Click "Run Automated Tests" button
3. Review test results

**Expected Results:**
- ✅ All automated tests pass
- ✅ Timer correctly pauses and resumes
- ✅ Modal ID tracking works correctly

## Success Criteria

All tests must pass with:
- ✅ No JavaScript errors in console
- ✅ Correct pause/resume debug messages
- ✅ Accurate `isPaused()` state
- ✅ Correct modal ID tracking in `getOpenModals()`
- ✅ Timer/competition phase respects pause state
- ✅ Multiple open/close cycles work correctly
- ✅ Modal stacking with other modals works correctly

## Troubleshooting

### Console shows no debug messages
- Ensure browser console is set to show "Debug" level messages
- Check that `js/ui/actionMenu.js` is loaded correctly

### isPaused() doesn't return true when menu is open
- Verify `window.game.pauseController` exists
- Check for JavaScript errors that might be preventing execution
- Confirm `js/ui/global-pause.js` is loaded

### Timer doesn't pause
- Verify that the timer implementation checks `pauseController.isPaused()`
- Check `js/ui.hud-and-router.js` has the pause guards in place

### Multiple modals don't stack correctly
- Verify each modal uses a unique ID
- Check that no modal is calling `pauseController.reset()` inappropriately

## Related Files

- `js/ui/actionMenu.js` - Actions menu implementation with pause integration
- `js/ui/global-pause.js` - Pause controller implementation
- `test_actions_menu_pause.html` - Dedicated test page
- `tests/verify_pause_integration.mjs` - Automated test suite

## Notes

- The Actions menu uses the modal ID `'modal:actions'` for pause tracking
- Pause integration follows the same pattern as Settings modal
- All pause operations are defensive (check for existence before calling)
- Error handling ensures no crashes if pauseController is unavailable
