# Startup Flow Refactor - Verification Guide

## Overview
This document describes how to manually verify the startup flow changes that remove auto-gating and add guest mode support.

## Changes Summary

### 1. Guest Mode
- **What**: User can play without a profile, no XP is recorded
- **How**: localStorage flag `bb.guestMode` is checked in progression core
- **When**: Automatically enabled when Play is pressed with no existing profile

### 2. No Auto-Popups
- **What**: Rules and Profile modals no longer auto-show after intro
- **How**: Disabled auto-show listeners and set `autoShowRulesOnStart=false`
- **When**: All modals only open via explicit button clicks

### 3. Intro Hub Buttons
- **What**: All buttons properly wired to their handlers
- **Which**: Play, Rules, Profile, Settings, Leaderboard, Credits, Help

## Manual Verification Steps

### Test 1: First-Time User (No Profile)

#### Setup
1. Clear localStorage: `localStorage.clear()`
2. Clear sessionStorage: `sessionStorage.clear()`
3. Reload page

#### Expected Behavior
1. ✅ Intro video plays (or skips if `skipIntros=true`)
2. ✅ Intro Hub appears with buttons
3. ✅ NO auto-popup of Rules modal
4. ✅ NO auto-popup of Profile modal
5. ✅ Background and buttons appear simultaneously (no flicker)

#### Click Play Button
6. ✅ Game starts immediately as Guest
7. ✅ localStorage flag `bb.guestMode` is set to `'true'`
8. ✅ Human player name is "Guest"
9. ✅ Game proceeds normally

#### Verify XP Suppression
10. ✅ Complete some game actions (HOH win, etc.)
11. ✅ Check console: progression events should show `meta.guestMode=true`
12. ✅ No XP should be persisted to IndexedDB
13. ✅ Progression panel shows 0 XP

### Test 2: Returning User (Has Profile)

#### Setup
1. Create a profile via Profile button
2. Note the profile name
3. Reload page

#### Expected Behavior
1. ✅ Intro video skips (already seen)
2. ✅ Intro Hub appears immediately
3. ✅ NO auto-popup of Rules modal
4. ✅ NO auto-popup of Profile modal
5. ✅ Play button shows "Continue" (not "Play")

#### Click Play Button
6. ✅ Last-used profile is loaded
7. ✅ Human player has correct profile name
8. ✅ localStorage flag `bb.guestMode` is NOT set (or removed)
9. ✅ Game starts with profile

#### Verify XP Tracking
10. ✅ Complete game actions
11. ✅ XP events are recorded normally (no guestMode flag)
12. ✅ Progression panel shows accumulated XP
13. ✅ XP persists to IndexedDB

### Test 3: Intro Hub Buttons

#### Rules Button
1. ✅ Click Rules button on Intro Hub
2. ✅ Rules modal opens
3. ✅ Modal contains game rules content
4. ✅ Click OK to close
5. ✅ Returns to Intro Hub

#### Profile Button
1. ✅ Click Profile button on Intro Hub
2. ✅ Profile modal opens
3. ✅ Can create new profile or select existing
4. ✅ Close modal
5. ✅ Returns to Intro Hub

#### Settings Button
1. ✅ Click Settings button on Intro Hub
2. ✅ Settings modal opens (same as topbar Settings)
3. ✅ Can adjust game settings
4. ✅ Close modal
5. ✅ Returns to Intro Hub

#### Leaderboard Button
1. ✅ Click Leaderboard button
2. ✅ XP/Progression panel opens (or appropriate leaderboard)
3. ✅ Shows XP and level info
4. ✅ Close panel
5. ✅ Returns to Intro Hub

#### Credits Button
1. ✅ Click Credits button
2. ✅ Credits modal opens (if implemented)
3. ✅ OR graceful no-op with console message
4. ✅ Returns to Intro Hub

#### Help Button
1. ✅ Click Help button
2. ✅ Help modal opens (or Rules modal as fallback)
3. ✅ Shows helpful information
4. ✅ Close modal
5. ✅ Returns to Intro Hub

### Test 4: Guest to Profile Transition

#### Setup
1. Start as Guest (no profile)
2. Click Play
3. Game is running as Guest

#### Switch to Profile
1. ✅ Open Settings → Profile (or use topbar Profile button)
2. ✅ Create or select a profile
3. ✅ Save profile
4. ✅ localStorage flag `bb.guestMode` is removed
5. ✅ Human player name updates to profile name
6. ✅ Future XP events are now recorded normally

### Test 5: Config Flag Behavior

#### Check autoShowRulesOnStart
1. Open console
2. Check `window.game.cfg.autoShowRulesOnStart`
3. ✅ Should be `false` after enterGame() is called
4. ✅ Rules modal does NOT auto-show

#### Check Guest Mode Flag
1. Start as Guest
2. Check `localStorage.getItem('bb.guestMode')`
3. ✅ Should be `'true'`
4. Select a profile
5. Check again
6. ✅ Should be `null` (removed)

## Console Verification

### Check for Expected Messages
```javascript
// During startup
[StartupFlow] Initializing...
[StartupFlow] Play button clicked
[StartupFlow] enterGame() called
[StartupFlow] no profile found, enabling guest mode
[profileService] guest mode enabled - XP writes suppressed

// When recording XP as guest
// Event should have meta.guestMode: true
```

### Check for Warnings/Errors
- ✅ No errors related to undefined functions
- ✅ No errors about missing modals (graceful fallbacks)
- ✅ No errors during profile switching

## Browser Compatibility

Test in:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (if available)
- ✅ Mobile browsers (Chrome/Safari on phone)

## Performance Verification

1. ✅ Background loads before buttons appear (no flicker)
2. ✅ Intro Hub responds quickly to button clicks
3. ✅ No noticeable delay when switching modes
4. ✅ Game starts smoothly after Play button

## Edge Cases

### Case 1: Corrupted Profile Data
1. Manually corrupt profile in localStorage
2. Reload page
3. ✅ Should fall back to guest mode
4. ✅ No errors, game still playable

### Case 2: localStorage Disabled
1. Disable localStorage in browser settings
2. Reload page
3. ✅ Should handle gracefully
4. ✅ May default to guest mode behavior

### Case 3: Rapid Button Clicks
1. Click buttons rapidly on Intro Hub
2. ✅ No duplicate modals
3. ✅ No errors
4. ✅ Smooth behavior

## Success Criteria

All of the following must be true:
- ✅ No auto-popups of Rules or Profile modals
- ✅ Play button works for both first-time and returning users
- ✅ Guest mode correctly suppresses XP writes
- ✅ Profile mode correctly enables XP writes
- ✅ All Intro Hub buttons work and open correct modals
- ✅ Background preloads correctly (no flicker)
- ✅ No console errors during normal flow
- ✅ CodeQL security scan passes with 0 alerts
- ✅ All existing tests pass (npm run test:all)

## Security Summary

**CodeQL Analysis**: 0 alerts found
- No SQL injection vulnerabilities
- No XSS vulnerabilities
- No path traversal issues
- No command injection risks
- No insecure authentication patterns

**localStorage Usage**: Appropriate and safe
- Only stores boolean flag for guest mode
- No sensitive data in localStorage
- Graceful fallback if localStorage unavailable

**XSS Protection**: Maintained
- All user inputs are properly handled by existing systems
- Profile data validated by ProfileStorage module
- No new innerHTML assignments with user data

## Known Limitations

1. **Credits Modal**: May not exist yet - graceful fallback in place
2. **Help Modal**: Falls back to Rules modal if not implemented
3. **Daily/News Chips**: Placeholder no-ops - not yet implemented
4. **Progressive Enhancement**: Requires JavaScript - no fallback for non-JS

## Rollback Plan

If issues are found:
1. Revert commits: `git revert fd3b0eb 504000c`
2. Previous behavior will be restored:
   - Rules modal auto-shows after intro
   - Profile modal auto-shows after rules
   - No guest mode option

## Test File

Use `test_startup_flow.html` for automated verification of:
- Guest mode flag behavior
- ProfileService API
- StartupFlow API
- Config flag behavior
- Button wiring (indirect verification)

## Conclusion

This refactor significantly improves the user experience by:
1. Removing mandatory onboarding friction
2. Allowing immediate gameplay as Guest
3. Preserving all existing functionality for profile users
4. Maintaining security and data integrity
