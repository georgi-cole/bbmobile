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
- Telemetry should show only one `intro_show_done` event

**Pass/Fail:** ___

---

### 11. Telemetry Events Sequence (Desktop)

**Steps:**
1. Open browser console
2. Add telemetry listener: `window.addEventListener('telemetry', (e) => console.log('📊', e.detail.event, e.detail.data));`
3. Refresh page (cache disabled)
4. Observe telemetry events in console

**Expected:**
- Events appear in this order:
  1. `startup_init_start`
  2. `intro_init_start`
  3. `intro_init_done`
  4. `startup_init_done`
  5. `startup_video_finished` (or `startup_skip_intros`)
  6. `startup_show_hub_start`
  7. `intro_show_with_preload_start`
  8. `intro_show_start`
  9. `intro_show_done`
  10. `intro_show_with_preload_done`
  11. `startup_show_hub_done`
  12. `recovery_watchdog_check`
  13. `recovery_watchdog_healthy`
- No error events (`startup_show_hub_error`, `recovery_watchdog_api_missing`, etc.)

**Pass/Fail:** ___

---

### 12. Telemetry Events Sequence (Mobile)

**Steps:**
1. Open mobile browser or use device emulation (Chrome DevTools)
2. Open console and add telemetry listener (same as Test 11)
3. Refresh page
4. Observe telemetry events

**Expected:**
- Same event sequence as desktop test
- `context.isMobile` should be `true` in telemetry payload
- No error events

**Pass/Fail:** ___

---

### 13. Restart to Hub Telemetry

**Steps:**
1. Start game by clicking Play button
2. Wait for game to fully load
3. Call `window.game.restartToHub()` in console
4. Observe telemetry events

**Expected:**
- Telemetry shows:
  1. `startup_restart_to_hub`
  2. `intro_reset`
  3. `startup_show_hub_start`
  4. `intro_show_with_preload_start`
  5. ... (full show sequence)
  6. `startup_show_hub_done`
- Hub appears after game screen is hidden
- All hub buttons work after restart

**Pass/Fail:** ___

---

### 14. Incognito Mode (Desktop & Mobile)

**Steps:**
1. Open browser in incognito/private mode
2. Navigate to game URL
3. Add telemetry listener in console
4. Observe first load

**Expected:**
- Same telemetry sequence as normal mode
- Hub appears without issues
- No cached state interferes with initialization

**Pass/Fail:** ___

---

## Console Log Reference

### Successful Startup Sequence

```
[Telemetry] Module loaded, sessionId: session_1700000000000_abc123
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
[Telemetry] startup_init_start {}
[Telemetry] intro_init_start {}
[IntroScreen] DOM built during init
[IntroScreen] Initialized
[Telemetry] intro_init_done {hasBus: true}
[Telemetry] startup_init_done {hasIntroAPI: true}
[StartupFlow] Initialization complete, event handlers wired
[Telemetry] startup_video_finished {}
[StartupFlow] Showing intro hub...
[Telemetry] startup_show_hub_start {}
[Telemetry] intro_show_with_preload_start {skipPreload: false}
[IntroScreen] Preloading background: assets/skins/daily-background.png
[IntroScreen] Background preload completed in <N>ms
[Telemetry] intro_show_start {}
[IntroScreen] DOM appended to body
[IntroScreen] Shown
[Telemetry] intro_show_done {flagSet: true}
[Telemetry] intro_show_with_preload_done {isVisible: true}
[StartupFlow] Intro hub displayed with preloaded background
[Telemetry] startup_show_hub_done {}
[RecoveryWatchdog] IntroScreen healthy - API and element present
[Telemetry] recovery_watchdog_check {hasAPI: true, hasElement: true, shouldShow: true, ...}
[Telemetry] recovery_watchdog_healthy {hasAPI: true, hasElement: true}
```

### Play Button Click

```
[IntroHub] action=intro:play button="Play"
[Telemetry] hub_button_click {action: "intro:play", label: "Play"}
[IntroHub] Emitting bus event: intro:play
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
[Telemetry] hub_button_click {action: "intro:open:rules", label: "Rules"}
[IntroHub] Emitting bus event: intro:open:rules
[HubModalBridge] Elevating modal z-index: rulesDim
[HubModalBridge] Disabling hub pointer-events (modal visible)
```

### Modal Closing

```
[HubModalBridge] Restoring hub pointer-events (no modals)
```

### Restart to Hub

```
[StartupFlow] Restarting to intro hub...
[Telemetry] startup_restart_to_hub {}
[IntroScreen] Resetting state...
[Telemetry] intro_reset {wasVisible: false, hadContainer: true}
[IntroScreen] Reset complete
[StartupFlow] IntroScreen state reset
[StartupFlow] IntroScreen re-initialized
[Telemetry] startup_show_hub_start {}
[Telemetry] intro_show_with_preload_start {skipPreload: false}
...
[StartupFlow] Restart to hub complete
```

---

## Telemetry Events

### What is Telemetry?

The telemetry system tracks startup and user interactions to help diagnose issues. Events are:
- Logged to console with `[Telemetry]` prefix
- Dispatched as `window` CustomEvents for dev tools
- Optionally sent as beacons (if `window.game.cfg.telemetryEndpoint` is set)

### Listening to Telemetry Events

To observe telemetry events in real-time, add this to your console:

```javascript
window.addEventListener('telemetry', (e) => {
  console.log('📊 Telemetry:', e.detail.event, e.detail.data);
});
```

### Telemetry Event Types

#### Startup Events
- `startup_init_start` - Core services initialization started
- `startup_init_done` - Core services initialization complete
- `startup_video_finished` - Intro video finished or skipped
- `startup_show_hub_start` - Starting to show intro hub
- `startup_show_hub_done` - Intro hub successfully displayed
- `startup_show_hub_error` - Error showing intro hub
- `startup_skip_intros` - skipIntros setting enabled, bypassing video
- `startup_restart_to_hub` - In-game restart to hub initiated
- `startup_intro_api_missing` - IntroScreen API not found (critical)

#### IntroScreen Events
- `intro_init_start` - IntroScreen initialization started
- `intro_init_done` - IntroScreen initialization complete
- `intro_init_duplicate` - Duplicate init() call detected
- `intro_init_no_bus` - No event bus available
- `intro_show_start` - Starting to show hub
- `intro_show_done` - Hub successfully shown
- `intro_show_duplicate` - Duplicate show() call detected
- `intro_show_with_preload_start` - Starting preloaded show
- `intro_show_with_preload_done` - Preloaded show complete
- `intro_show_with_preload_duplicate` - Duplicate showWithPreload() call
- `intro_hide` - Hub hidden
- `intro_reset` - Hub state reset

#### Button Events
- `hub_button_click` - User clicked a hub button (data: action, label)
- `hub_button_dom_click` - Fallback to DOM click (data: action, elementId)
- `hub_button_custom_event_fallback` - No handler found, using CustomEvent

#### Recovery Watchdog Events
- `recovery_watchdog_check` - Watchdog performed health check
- `recovery_watchdog_healthy` - IntroScreen healthy
- `recovery_watchdog_game_started` - Game already started, no recovery needed
- `recovery_watchdog_api_missing` - IntroScreen API missing, attempting recovery
- `recovery_watchdog_element_missing` - Hub element missing, attempting show
- `recovery_watchdog_script_reloaded` - IntroScreen.js reloaded
- `recovery_watchdog_show_attempted` - Attempted to show hub via recovery
- `recovery_watchdog_reload_failed` - Failed to reload IntroScreen.js

### Getting Telemetry Buffer

```javascript
// Get all telemetry events from this session
const events = window.Telemetry.getBuffer();
console.table(events);

// Get session ID
const sessionId = window.Telemetry.getSessionId();
console.log('Session ID:', sessionId);

// Clear buffer
window.Telemetry.clearBuffer();
```

### Expected Telemetry Sequence

**Successful Initial Load:**
1. `startup_init_start`
2. `intro_init_start`
3. `intro_init_done`
4. `startup_init_done`
5. `startup_video_finished` (or `startup_skip_intros`)
6. `startup_show_hub_start`
7. `intro_show_with_preload_start`
8. `intro_show_start`
9. `intro_show_done`
10. `intro_show_with_preload_done`
11. `startup_show_hub_done`
12. `recovery_watchdog_check`
13. `recovery_watchdog_healthy`

**Button Click:**
1. `hub_button_click` (action, label)
2. Modal opens or action executes

**Restart to Hub:**
1. `startup_restart_to_hub`
2. `intro_reset`
3. `startup_show_hub_start`
4. (show sequence repeats)

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

### Core Functionality
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

### Telemetry
- [ ] Telemetry events appear in correct sequence (desktop)
- [ ] Telemetry events appear in correct sequence (mobile)
- [ ] Restart to hub shows correct telemetry sequence
- [ ] No error telemetry events during normal operation
- [ ] Recovery watchdog reports healthy status

### Cross-Browser & Devices
- [ ] Desktop Chrome: initial load, refresh, incognito
- [ ] Desktop Firefox: initial load, refresh, incognito
- [ ] Desktop Safari: initial load, refresh, incognito
- [ ] Mobile Safari: initial load, refresh, incognito
- [ ] Mobile Chrome: initial load, refresh, incognito
- [ ] Restart button returns to hub on all platforms

---

## Sign-Off

**Tester Name:** _______________  
**Date:** _______________  
**Browser:** _______________  
**Result:** PASS / FAIL (circle one)

**Notes:**
