# Social Maneuvers Alignment - Validation Guide

## Overview
This document provides validation steps for the Social Maneuvers alignment implementation and bug fixes.

## Changes Summary

### 1. Hard-swap Legacy UI (js/social.js)
- Modified `renderSocialPhase()` to check `SocialManeuvers.isEnabled()`
- When enabled: clears panel, mounts Socialize launcher, skips legacy simulation/decision cards
- Updated `resetWeeklyCounters()` to call `SocialManeuvers.SocialResources.resetWeekly()` for all alive players
- Refreshes HUD after weekly reset

### 2. Timer Pause/Resume (js/social-maneuvers.js)
- Implemented `pausePhaseTimer()` - freezes phase timer by storing remaining time
- Implemented `resumePhaseTimer()` - restores timer with original remaining time, with validation
- Wrapped `global.setPhase` to detect phase transitions
- When leaving social_intermission: closes modal, hides launcher, resumes timer
- Exported timer functions on `global.SocialManeuvers`

### 3. Modal Timer Integration (js/socialize-mobile.js)
- `openSocializeModal()` now calls `SocialManeuvers.pausePhaseTimer()` and sets high z-index backdrop (9998/9999)
- `closeSocializeModal()` now calls `SocialManeuvers.resumePhaseTimer()`
- Modified `executeAction()` to check `SocialManeuvers.isEnabled()` before routing
- When enabled: always uses `SocialManeuvers.executeAction()`, no legacy fallback
- This ensures session data from engine drives end-of-phase summary

### 4. Phase Gating
- Mount observer already checks `isInSocialPhase()` before mounting launcher
- setPhase wrapper closes modal and hides launcher when leaving social_intermission
- Clean state transitions guaranteed

### 5. Skip Button & Phase Completion (NEW)
- Added `endSocialPhaseNow(reason)` function for unified phase completion
- Added Skip button pill to Social phase HUD (red accent, matches group toggle pills)
- Wired Skip button to call `SocialManeuvers.endSocialPhaseNow('skip')`
- Enhanced `stopSocialPhaseTimer()` to try GameTimer.pause() first
- Added idempotency guards to prevent double execution
- Exported `endSocialPhaseNow` and `stopSocialPhaseTimer` on `global.SocialManeuvers`

### 6. Duplicate Summary Prevention (NEW)
- Added module-level `summaryPanelOpen` singleton flag
- Guard `showSummaryPanel()` to prevent duplicate calls
- Remove stray summary instances before opening new one
- Mark panels with `[data-social-summary]` attribute for cleanup
- Reset flag when Continue button is clicked

### 7. Timer Correctness & Clamping (NEW)
- Added `renderCountdown(ms)` utility with safe clamping (max 24 hours)
- Enhanced `tv-skip.js` updateTimerDisplay() to clamp extreme values
- Added validation to `resumePhaseTimer()` for pausedTimerState.remaining
- Prevents timer display of values like 52600:00 after Continue
- Exported `renderCountdown` on `global.SocialManeuvers`

## Validation Steps

### Automated Test
1. Open `test_social_alignment.html` in a browser
2. Click "Run All Tests"
3. Verify all 10 tests pass:
   - ✓ Social Maneuvers enabled by default
   - ✓ Timer control functions exported
   - ✓ SocialResources.resetWeekly available
   - ✓ Weekly reset initializes energy
   - ✓ Timer pause freezes endAt
   - ✓ Timer resume restores endAt
   - ✓ SocializeMobile API complete
   - ✓ Legacy UI hidden when Social Maneuvers enabled
   - ✓ setPhase wrapped for phase exit handling
   - ✓ Weekly reset refreshes HUD

### Manual Validation

#### Test 1: Only New UI Shows During social_intermission
**Steps:**
1. Start a new game
2. Trigger social_intermission phase
3. Observe the UI

**Expected:**
- ✓ Socialize launcher appears in TV overlay
- ✓ No legacy panel with dropdowns/buttons
- ✓ No legacy "Memories" popup or decision cards
- ✓ Console log: `[social.js] Social Maneuvers enabled - mounting launcher, hiding legacy UI`

#### Test 2: Timer Pauses on Modal Open, Resumes on Close
**Steps:**
1. During social_intermission, note the phase timer
2. Click "Socialize" button to open modal
3. Wait 10 seconds
4. Close the modal
5. Observe the phase timer

**Expected:**
- ✓ Timer stops advancing when modal opens
- ✓ Console log: `[socialize-mobile] ⏸️ Phase timer paused (modal opened)`
- ✓ Console log: `[social-maneuvers] ⏸️ Timer paused: X ms remaining`
- ✓ Timer resumes from paused time when modal closes
- ✓ Console log: `[socialize-mobile] ▶️ Phase timer resumed (modal closed)`
- ✓ Console log: `[social-maneuvers] ▶️ Timer resumed: X ms remaining`
- ✓ No phase advance happens in background while modal open

#### Test 3: End-of-Phase Summary Reflects Actions
**Steps:**
1. During social_intermission, open Socialize modal
2. Perform 2-3 social actions (e.g., Small Talk, Strategize)
3. Close modal
4. Wait for phase to end naturally

**Expected:**
- ✓ Summary card shows actions performed
- ✓ Summary shows energy spent (e.g., "⚡ Energy: 3 spent")
- ✓ Summary shows relationship changes
- ✓ Console shows: `[social-maneuvers] ✓ Social phase complete - generating summary`
- ✓ No legacy simulation data in summary

#### Test 4: New Week Resets Energy with Adjustments
**Steps:**
1. Complete a week with various events:
   - Win HOH (bonus: +5 energy)
   - Get nominated (bonus: +4 energy)
   - Win POV (bonus: +3 energy)
2. Enter next week's social_intermission
3. Check energy in HUD

**Expected:**
- ✓ Base energy: 5
- ✓ Bonuses applied correctly (e.g., 5 + 5 + 4 + 3 = 17 if all bonuses)
- ✓ Console log: `[social-resources] Player X weekly energy delta: Y`
- ✓ Console log: `[social-resources] Weekly reset for player X at week Y`
- ✓ HUD updates immediately with new energy value
- ✓ Console log from social.js: `[social.js] Social Maneuvers enabled - resetting weekly resources for all alive players`

#### Test 5: Phase Exit Closes Modal and Hides Launcher
**Steps:**
1. During social_intermission, open Socialize modal
2. Wait for phase timer to expire (or manually advance phase)
3. Observe phase transition

**Expected:**
- ✓ Modal closes automatically on phase exit
- ✓ Launcher hides when leaving social_intermission
- ✓ Console log: `[social-maneuvers] Leaving social_intermission - closing launcher`
- ✓ Timer resumes if it was paused
- ✓ Clean transition to next phase (nominations)

#### Test 6: Actions Route Through Engine (No Legacy Fallback)
**Steps:**
1. Open browser DevTools Console
2. During social_intermission, open Socialize modal
3. Select a player and action
4. Click "Execute Action"
5. Observe console output

**Expected:**
- ✓ Console log: `[socialize-mobile] Action executed: [actionId]`
- ✓ Shows success chance, roll, outcome
- ✓ Resources update via canonical SocialManeuvers store
- ✓ NO legacy fallback messages
- ✓ Action recorded in session data for summary

#### Test 7: Skip Button Ends Phase Immediately (NEW)
**Steps:**
1. During social_intermission, locate the Skip button in the Social phase HUD
2. Click the Skip button
3. Observe phase transition and summary

**Expected:**
- ✓ Skip button is visible as a red pill next to "Social Phase" title
- ✓ Skip button has focus ring when tabbed to (keyboard accessible)
- ✓ Click triggers immediate phase end
- ✓ Console log: `[socialize-mobile] Skip button clicked`
- ✓ Console log: `[sm-phase-end] Ending Social phase now (reason: skip)`
- ✓ Exactly one summary dialog appears (no duplicates)
- ✓ Summary shows "Social Phase Complete"
- ✓ Click Continue advances to nominations
- ✓ Timer does not jump to extreme value

#### Test 8: No Duplicate Summaries After Energy Depletion (NEW)
**Steps:**
1. During social_intermission, open Socialize modal
2. Perform actions until all energy is spent (energy = 0)
3. Modal closes automatically
4. Observe the summary dialog

**Expected:**
- ✓ Only ONE summary dialog appears (no stacked duplicates)
- ✓ Console log: `[social-maneuvers] Summary panel already open - ignoring duplicate call` (if duplicate attempt)
- ✓ Summary shows energy spent, actions performed
- ✓ No `.modal--social-summary` or legacy summary elements
- ✓ Click Continue advances phase correctly

#### Test 9: Timer Does Not Jump After Continue (NEW)
**Steps:**
1. Complete social phase and see summary
2. Note the timer display in TV header
3. Click Continue button in summary
4. Observe timer display

**Expected:**
- ✓ Timer does not show extreme values like 52600:00
- ✓ Timer shows either correct countdown or 00:00
- ✓ Timer does not become stuck
- ✓ Console shows no errors about invalid endAt
- ✓ Next phase timer starts correctly

#### Test 10: Skip Pill Matches Other Pills Visually (NEW)
**Steps:**
1. During social_intermission, compare Skip button to Group toggle pill (in modal)
2. Inspect with DevTools if needed

**Expected:**
- ✓ Skip pill height matches (~24-28px with padding 4px 12px)
- ✓ Skip pill border-radius matches (16px)
- ✓ Skip pill font-weight matches (600)
- ✓ Skip pill has red accent color (rgba(231, 76, 60, ...))
- ✓ Hover state shows transform: translateY(-1px)
- ✓ Focus ring visible on keyboard focus (2px solid)
- ✓ Pill is not larger/thicker than other pills

## Console Log Checklist

When validating, look for these key log messages:

### Phase Entry
- `[social-maneuvers] ✓ startPhase() triggered`
- `[social-maneuvers] Resources initialized for X players`
- `[social-maneuvers] ⚡ Energy seeded for human player: X`
- `[social-maneuvers] Session tracking initialized for end-of-phase summary`
- `[social-timer] ✓ Timer set to 180000ms (3 minutes)`

### UI Mounting
- `[social.js] Social Maneuvers enabled - mounting launcher, hiding legacy UI`
- `[socialize-mobile] Launcher shown`

### Timer Control
- `[socialize-mobile] ⏸️ Phase timer paused (modal opened)`
- `[social-maneuvers] ⏸️ Timer paused: X ms remaining`
- `[socialize-mobile] ▶️ Phase timer resumed (modal closed)`
- `[sm-phase-skip] Stopping Social phase timer...` (when Skip clicked)
- `[sm-phase-skip] ✓ Timer stopped via GameTimer.pause()` or `✓ Timer stopped (endAt set to far future)`

### Skip Button Workflow (NEW)
- `[socialize-mobile] Skip button clicked`
- `[sm-phase-end] Ending Social phase now (reason: skip)`
- `[sm-phase-skip] Stopping Social phase timer...`
- `[social-maneuvers] ◼️ onSocialPhaseEnd() - leaving social_intermission phase`
- `[social-maneuvers] ✓ Social phase complete - generating summary`

### Summary Panel (NEW)
- `[social-maneuvers] Summary panel already open - ignoring duplicate call` (if duplicate attempt detected)
- `[social-maneuvers] Removing stray summary panel` (if cleanup occurs)
- `[social-maneuvers] ▶️ Timer resumed: X ms remaining`

### Weekly Reset
- `[social.js] Social Maneuvers enabled - resetting weekly resources for all alive players`
- `[social-resources] Weekly reset for player X at week Y`
- `[social-resources] Player X weekly energy delta: Y`

### Phase Exit
- `[social-maneuvers] Leaving social_intermission - closing launcher`

### Action Execution
- `[socialize-mobile] Action executed: [actionId]`
- Shows success/failure, outcome type, affinity changes
- NO messages about legacy fallback when Social Maneuvers enabled

## Known Issues / Edge Cases

None identified at this time. All functionality working as specified.

## Related Files
- `js/social.js` - Legacy/hybrid social system with hard-swap
- `js/social-maneuvers.js` - Core Social Maneuvers engine with timer control
- `js/socialize-mobile.js` - Mobile UI with timer integration
- `test_social_alignment.html` - Automated validation suite

## Approval Checklist
- [x] Code follows repository patterns
- [x] All syntax checks pass
- [x] Automated tests created
- [x] Manual validation steps documented
- [x] Console log checklist provided
- [x] No breaking changes to existing functionality
- [x] Changes are surgical and minimal
