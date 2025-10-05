# Avatar Refactor Manual Test Guide

## Overview
This guide provides step-by-step instructions for testing the avatar resolution refactoring for the return_twist phase and related juror avatar displays.

## Changes Made
1. **js/jury_return_vote.js**: Updated `getAvatar()` to use global `resolveAvatar()` function
2. **js/twists.js**: Updated `renderReturnTwistPanel()` to use global `resolveAvatar()` function
3. Added onerror handlers with logging for debugging

## Test Scenarios

### Test 1: Return Twist Phase - Standard Avatar Properties
**Setup:**
1. Open `index.html` in a browser
2. Configure a game with jury house enabled (`cfg.enableJuryHouse = true`)
3. Create players with standard avatar properties:
   - Player 1: `{ id: 1, name: 'Alice', avatar: 'custom-alice.png' }`
   - Player 2: `{ id: 2, name: 'Bob', img: 'bob-image.jpg' }`
   - Player 3: `{ id: 3, name: 'Charlie', photo: 'charlie-photo.jpg' }`

**Expected Behavior:**
- ✓ Alice's avatar should use `custom-alice.png`
- ✓ Bob's avatar should use `bob-image.jpg`
- ✓ Charlie's avatar should use `charlie-photo.jpg`
- ✓ No 404 errors in console
- ✓ If files don't exist, fallback to Dicebear with console info log

### Test 2: Return Twist Phase - Missing Avatar Files
**Setup:**
1. Create players without custom avatar properties:
   - Player 4: `{ id: 4, name: 'Diana' }` (no avatar/img/photo)
   - Player 5: `{ id: 5, name: 'Eve' }` (no avatar/img/photo)
2. Ensure `./avatars/Diana.png` and `./avatars/Eve.png` don't exist

**Expected Behavior:**
- ✓ Should try `./avatars/Diana.png`, then `./avatars/diana.png`, etc.
- ✓ If all fail, fallback to Dicebear API: `https://api.dicebear.com/6.x/bottts/svg?seed=Diana`
- ✓ Console log: `[jury_return_vote] avatar fallback used for juror=4 url=./avatars/Diana.png`
- ✓ Console log: `[twists] avatar fallback for juror=4 url=...`
- ✓ Dicebear avatars should be visible and distinct (different robots per player)
- ✓ No broken image icons

### Test 3: Return Twist Phase - Existing Avatar Files
**Setup:**
1. Place actual avatar files in `./avatars/` folder:
   - `./avatars/Frank.png`
   - `./avatars/Grace.jpg`
2. Create players:
   - Player 6: `{ id: 6, name: 'Frank' }`
   - Player 7: `{ id: 7, name: 'Grace' }`

**Expected Behavior:**
- ✓ Frank's avatar loads from `./avatars/Frank.png`
- ✓ Grace's avatar loads from `./avatars/Grace.jpg`
- ✓ No 404 errors
- ✓ No fallback logs in console

### Test 4: Jury Return Vote UI
**Setup:**
1. Trigger America's Vote return twist
2. Verify the panel with live bars and avatars renders correctly

**Expected Behavior:**
- ✓ All juror avatars display correctly
- ✓ Avatars have proper styling (54px, rounded, border)
- ✓ If avatar fails, onerror handler triggers and logs
- ✓ Fallback avatars (Dicebear) load successfully
- ✓ Live bars update smoothly during voting period

### Test 5: Console Logging
**Setup:**
1. Open browser DevTools console
2. Trigger return twist phase
3. Watch for avatar-related logs

**Expected Console Logs:**
```
[jury_return_vote] avatar fallback used for juror=4 url=./avatars/Diana.png
[twists] avatar fallback for juror=4 url=./avatars/Diana.png
```

**Should NOT see:**
- ❌ Uncaught errors or exceptions
- ❌ Multiple repeated 404 errors for the same avatar
- ❌ Broken image errors

## Browser Compatibility Test
Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

## Integration Tests

### Test 6: Full Game Flow
**Setup:**
1. Start a complete game simulation
2. Enable jury house
3. Let game progress to jury return twist phase
4. Observe avatar behavior throughout

**Expected Behavior:**
- ✓ Avatars consistent across all phases
- ✓ No avatar loading failures during phase transitions
- ✓ Performance remains smooth (no lag from avatar loading)

## Quick Unit Test
Open `test_return_twist_avatars.html` in browser:
- [ ] All test cases pass (green checkmarks)
- [ ] Avatar previews display correctly
- [ ] No errors in console

## Verification Checklist
- [ ] No 404 errors for avatar requests
- [ ] All fallback avatars are visible and distinct
- [ ] Console logs help with debugging
- [ ] Code uses `global.resolveAvatar()` consistently
- [ ] onerror handlers prevent broken images
- [ ] Performance is not degraded

## Rollback Plan
If issues are found:
1. Revert commits in this PR
2. File bug report with specific error details
3. Test avatars manually to identify root cause

## Notes
- The centralized avatar system (`js/avatar.js`) handles negative caching to prevent 404 storms
- Dicebear fallback provides unique robot avatars based on player name seed
- The system tries multiple file formats (PNG, JPG) and case variations
- Global functions are exported and available to all modules
