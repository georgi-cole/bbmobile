# Startup Hub Fix Verification Guide

## Overview
This document outlines manual testing procedures to verify the startup hub modal improvements.

## Test Scenarios

### 1. Background-First Paint (No Flicker)

**Steps:**
1. Clear browser cache and refresh the page
2. Wait for the Kolequant intro video to complete (or skip it)
3. Observe the intro hub appearing

**Expected:**
- Background image and buttons appear simultaneously
- NO button-first flicker (buttons should not appear before background)
- If loading takes >300ms, a loading spinner may briefly appear
- Console should show:
  ```
  [IntroScreen] Preloading background: <url>
  [IntroScreen] Background preload completed in <N>ms
  [IntroScreen] Shown
  ```

**Pass/Fail:** ___

---

### 2. No Auto Rules Modal After Video

**Steps:**
1. Clear session storage: `sessionStorage.clear()` in console
2. Refresh the page
3. Wait for intro video to complete
4. Observe if Rules modal appears automatically

**Expected:**
- Rules modal should NOT appear automatically after video ends
- Only the intro hub should be visible
- Console should show:
  ```
  [suppress-auto-rules] Setting suppression flags...
  [rules] __bbSuppressAutoRules is true — skipping intro listener
  ```

**Pass/Fail:** ___

---

### 3. Hub Buttons Work Reliably

**Steps:**
1. Click each button on the intro hub in sequence:
   - **Rules** - Should open Rules modal
   - **Profile** - Should open Profile modal (with close X button visible)
   - **Leaderboard** - Should open leaderboard or placeholder
   - **Settings** - Should open Settings modal (gear icon in top-right)
   - **Credits** - Should open Credits modal or placeholder
   - **Help** - Should open Help modal (? icon in top-right) or fallback to Rules
   - **Daily** - Should log action (feature not yet implemented)
   - **News** - Should log action (feature not yet implemented)

2. For each button, verify:
   - Button responds to click
   - Appropriate modal opens
   - Console shows: `[IntroHub] action=<action> button="<label>"`

**Expected Console Logs:**
```
[IntroHub] action=intro:open:rules button="Rules"
[IntroHub] action=intro:open:profile button="Profile"
[IntroHub] action=intro:open:leaderboard button="Leaderboard"
[IntroHub] action=intro:open:settings button="Settings"
[IntroHub] action=intro:open:credits button="Credits"
[IntroHub] action=intro:open:help button="Help"
```

**Pass/Fail:** ___

---

### 4. Audio Toggles Work (After Audio Ready)

**Steps:**
1. Wait for audio system to initialize (check console for audio logs)
2. Click the Music icon (🎵) in top-right
3. Click the Sound icon (🔊) in top-right
4. Observe icon changes and console logs

**Expected:**
- Music icon toggles between 🎵 (on) and 🔇 (off)
- Sound icon toggles between 🔊 (on) and 🔇 (off)
- Console shows retry attempts if audio not ready:
  ```
  [IntroHub] Music toggle not yet available, will retry up to 10 times...
  [IntroHub] Music toggle succeeded after <N> retries
  ```

**Pass/Fail:** ___

---

### 5. Modal Layering (Hub Becomes Non-Interactive)

**Steps:**
1. From the intro hub, click the Rules button
2. Try clicking hub buttons while Rules modal is open
3. Close Rules modal (OK button or ESC)
4. Verify hub becomes interactive again

**Expected:**
- When modal is open:
  - Modal appears above hub (z-index: 10050)
  - Hub buttons are NOT clickable (pointer-events: none)
  - Console shows: `[HubModalBridge] Disabling hub pointer-events (modal visible)`
- When modal is closed:
  - Hub buttons become clickable again
  - Console shows: `[HubModalBridge] Restoring hub pointer-events (no modals)`

**Pass/Fail:** ___

---

### 6. Profile Selection Does NOT Auto-Start Game

**Steps:**
1. Clear profile data: `localStorage.removeItem('bb_profiles'); localStorage.removeItem('bb_last_profile_id');` in console
2. Refresh page and wait for hub to appear
3. Click the Profile button
4. Fill in profile creation form and click "Create Profile"
5. Observe behavior

**Expected:**
- Profile modal closes
- User returns to intro hub (game does NOT start)
- Console shows:
  ```
  [player-profile-modal] Play not initiated yet, closing modal and returning to hub
  ```

**Alternative (if profiles exist):**
1. Click Profile button from hub
2. Select an existing profile
3. Observe behavior

**Expected:**
- Profile modal closes
- User returns to intro hub (game does NOT start)

**Pass/Fail:** ___

---

### 7. Profile Modal Has Close Button and ESC

**Steps:**
1. From intro hub, click Profile button
2. Look for close button (X) in top-right of modal
3. Try pressing ESC key while modal is open
4. Try clicking the X button

**Expected:**
- Close button (X) is visible in modal header
- ESC key closes the modal
- X button closes the modal
- User returns to intro hub

**Pass/Fail:** ___

---

### 8. Play Button Starts Game Correctly

**Steps:**
1. Ensure a profile exists (or will use guest mode)
2. From intro hub, click the Play button
3. Observe game startup sequence

**Expected:**
- Play button click is logged: `[IntroHub] action=intro:play button="Play"`
- Global flag is set: `[IntroHub] Set __bbPlayInitiated=true`
- Game starts with selected profile or guest mode
- Intro hub fades out, game screen appears
- Rules modal does NOT appear during game start

**Pass/Fail:** ___

---

### 9. No Rules Modal After Play is Pressed

**Steps:**
1. From intro hub, click Play button
2. Wait for game to start loading
3. Observe if Rules modal appears during startup

**Expected:**
- Rules modal should NOT appear at any point after Play is pressed
- Console should show: `[rules] Play already initiated — skipping rules modal` (if any code tries to show it)

**Pass/Fail:** ___

---

### 10. No Duplicate Hub Shows

**Steps:**
1. Open browser console
2. Refresh page and watch for hub-related logs
3. Count how many times "[IntroScreen] Shown" appears

**Expected:**
- `[IntroScreen] Shown` should appear ONCE only
- If duplicate calls detected: `[IntroScreen] Already visible (global flag), ignoring duplicate show() call`

**Pass/Fail:** ___

---

## Console Log Reference

### Successful Startup Sequence

```
[suppress-auto-rules] Setting suppression flags...
[suppress-auto-rules] Suppression flags set: {__bbSuppressAutoRules: true, autoShowRulesOnStart: false}
[rules] __bbSuppressAutoRules is true — skipping intro listener
[rules] __bbSuppressAutoRules is true — skipping fallback
[HubModalBridge] Initializing...
[HubModalBridge] Styles injected
[HubModalBridge] MutationObserver initialized
[HubModalBridge] Fallback event listeners registered
[HubModalBridge] Initialized
[StartupFlow] Initializing...
[StartupFlow] Initialization complete, event handlers wired
[IntroScreen] Preloading background: assets/skins/daily-background.png
[IntroScreen] Background preload completed in <N>ms
[IntroScreen] Shown
```

### Play Button Click

```
[IntroHub] action=intro:play button="Play"
[IntroHub] Set __bbPlayInitiated=true
[StartupFlow] Play button clicked
[StartupFlow] enterGame() called
[StartupFlow] found last profile: <profile name>
[StartupFlow] applying profile: <profile name>
[StartupFlow] building game cast
[StartupFlow] Main screen built
```

### Modal Opening

```
[IntroHub] action=intro:open:rules button="Rules"
[HubModalBridge] Elevating modal z-index: rulesDim
[HubModalBridge] Disabling hub pointer-events (modal visible)
```

### Modal Closing

```
[HubModalBridge] Restoring hub pointer-events (no modals)
```

---

## Known Issues / Edge Cases

1. **Audio toggles may not work immediately** - Audio system initializes asynchronously. Retry logic should handle this gracefully.
2. **Loading buffer only shows if preload >300ms** - On fast connections, you may never see the loading spinner.
3. **Some buttons (Daily, News) are placeholders** - They log actions but don't have implemented features yet.

---

## Quick Test Script

Run this in browser console after hub is visible:

```javascript
// Test all buttons programmatically
const buttons = [
  { id: 'intro-btn-rules', name: 'Rules' },
  { id: 'intro-btn-profile', name: 'Profile' },
  { id: 'intro-btn-leaderboard', name: 'Leaderboard' },
  { id: 'intro-btn-credits', name: 'Credits' }
];

buttons.forEach(({id, name}) => {
  const btn = document.getElementById(id);
  if (btn) {
    console.log(`✓ ${name} button exists`);
    btn.click();
    setTimeout(() => {
      // Close modal by pressing ESC
      document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
    }, 100);
  } else {
    console.error(`✗ ${name} button NOT found`);
  }
});
```

---

## Summary Checklist

- [ ] Background appears with buttons (no flicker)
- [ ] No auto Rules modal after video
- [ ] All hub buttons work
- [ ] Audio toggles work after audio ready
- [ ] Modals appear above hub
- [ ] Hub becomes non-interactive when modal open
- [ ] Profile selection does not start game
- [ ] Profile modal has close (X) and ESC
- [ ] Play button starts game correctly
- [ ] No Rules modal after Play pressed
- [ ] No duplicate hub shows

---

## Sign-Off

**Tester Name:** _______________  
**Date:** _______________  
**Browser:** _______________  
**Result:** PASS / FAIL (circle one)

**Notes:**
