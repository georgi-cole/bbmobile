# Week 1 Modal - Single Trigger Fix

## Problem Statement
The Week 1 modal was appearing twice (duplicate modals) immediately after the intro animation or video, causing poor user experience and disrupting game flow.

## Root Cause Analysis
The Week 1 modal was being triggered from multiple places:

1. **`js/bootstrap.js`** - The `skipToWeek1()` function explicitly called `showWeekIntroModal()` before calling `startHOH()`
2. **`js/jury_return.js`** - The `proceedToHOH()` function explicitly called `showWeekIntroModal()` before calling `startHOH()`
3. **`js/ui.week-intro.js`** - The `startHOH()` function was wrapped to automatically show the modal

This caused duplicate modals because:
- `bootstrap.js` would call `showWeekIntroModal()` → then call `startHOH()` → which was wrapped to show the modal AGAIN
- `jury_return.js` would call `showWeekIntroModal()` → then call `startHOH()` → which was wrapped to show the modal AGAIN

## Solution
Remove the explicit calls to `showWeekIntroModal()` from `bootstrap.js` and `jury_return.js`, relying solely on the wrapper in `ui.week-intro.js` to handle the modal display.

### Changes Made

#### 1. `js/bootstrap.js` - `skipToWeek1()` function
**Before:**
```javascript
// Show Week 1 intro modal, then start HOH
if (typeof global.showWeekIntroModal === 'function') {
  global.showWeekIntroModal(1, () => {
    console.info('[Start] Week 1 modal dismissed, starting HOH');
    global.startHOH?.();
  });
} else {
  console.warn('[Start] Week intro modal not available, starting HOH directly');
  global.setPhase?.('intermission', 3, () => global.startHOH?.());
}
```

**After:**
```javascript
// Start HOH - the week intro modal will be shown by the startHOH wrapper
global.setPhase?.('intermission', 3, () => global.startHOH?.());
```

#### 2. `js/jury_return.js` - `proceedToHOH()` function
**Before:**
```javascript
// Show week intro modal before starting HOH if not already shown
const currentWeek = g.week;
const alivePlayers = (typeof global.alivePlayers === 'function') ? global.alivePlayers() : [];
const shouldShow = alivePlayers.length > 2 && 
                  (!g.phase || !['jury', 'finale'].includes(g.phase));

if (shouldShow && g.__weekIntroShownFor !== currentWeek && typeof global.showWeekIntroModal === 'function') {
  g.__weekIntroShownFor = currentWeek;
  console.info(`[jury_return] Showing week intro for week ${currentWeek}`);
  
  global.showWeekIntroModal(currentWeek, () => {
    // After week intro, show twist announcement if juror return is pending
    if (typeof global.showTwistAnnouncementIfNeeded === 'function') {
      global.showTwistAnnouncementIfNeeded(() => {
        global.setPhase?.('intermission', g.cfg?.tIntermission || 4, ()=>global.startHOH?.());
        global.updateHud?.();
      });
    } else {
      global.setPhase?.('intermission', g.cfg?.tIntermission || 4, ()=>global.startHOH?.());
      global.updateHud?.();
    }
  });
} else {
  // No week intro needed, proceed normally
  global.setPhase?.('intermission', g.cfg?.tIntermission || 4, ()=>global.startHOH?.());
  global.updateHud?.();
}
```

**After:**
```javascript
// Week intro modal and twist announcement are handled by the startHOH wrapper in ui.week-intro.js
global.setPhase?.('intermission', g.cfg?.tIntermission || 4, ()=>global.startHOH?.());
global.updateHud?.();
```

## How the Fix Works

The `ui.week-intro.js` module wraps the `startHOH()` function with logic that:
1. Checks if the modal has already been shown for the current week (`g.__weekIntroShownFor !== g.week`)
2. If not shown, displays the week intro modal
3. After the modal, shows any twist announcements if needed
4. Finally calls the original `startHOH()` function

This ensures:
- ✅ The modal appears exactly once per week
- ✅ The modal appears at the correct time (phase change to HOH)
- ✅ Twist announcements are shown in the correct order
- ✅ No duplicate modals

## Testing

### Manual Testing
Open `test_week1_modal_single_trigger.html` in a browser and run the three test scenarios:

1. **Test 1: Bootstrap skipToWeek1() Flow** - Simulates quick start to Week 1
2. **Test 2: FinishOpening() Flow** - Simulates intro completion to Week 1  
3. **Test 3: JuryReturn proceedToHOH() Flow** - Simulates week transition after juror return

**Expected Result:** Modal count should be exactly 1 after each test.

### Integration Testing
1. Start a new game with the intro sequence
2. Complete or skip the intro animation
3. Observe that the Week 1 modal appears exactly once
4. Continue to Week 2 and verify the Week 2 modal appears once
5. Test juror return scenarios to ensure modals work correctly

## Benefits
- ✅ Eliminates duplicate Week 1 modals
- ✅ Simplifies code by centralizing modal logic
- ✅ Improves user experience with consistent modal behavior
- ✅ Reduces code duplication (removed ~40 lines)
- ✅ Makes future maintenance easier

## Files Modified
- `js/bootstrap.js` - Removed explicit modal call from `skipToWeek1()`
- `js/jury_return.js` - Removed explicit modal call from `proceedToHOH()`

## Files Not Modified
- `js/ui.week-intro.js` - The wrapper logic remains unchanged (this is the single source of truth)
- `js/ui.hud-and-router.js` - No changes needed (already relies on wrapper)
