# Twist Badge Timing Fix - Manual Test Guide

## Overview
This guide provides step-by-step instructions to manually verify that the twist badge on the faux TV appears **only after** the "House Shock!" modal completes, and then persists for the rest of the week.

## Test Setup

### Prerequisites
1. Open the main game (`index.html`) or the dedicated test page (`test_twist_badge_timing.html`)
2. Open browser console (F12 or Cmd+Option+I)
3. Ensure you have at least 7 alive players (required for twist activation)

### Configuration
Set twist chances to 100% for testing:
```javascript
game.cfg.doubleChance = 100;
game.cfg.tripleChance = 0;
```

## Test 1: Double Eviction Badge Timing

### Expected Behavior
The badge should **NOT** appear immediately when `decideForWeek()` is called. It should only appear **after** the modal dismisses.

### Steps
1. **Prepare game state:**
   ```javascript
   // Reset to fresh state
   game.week = 2;
   game.__twistMode = null;
   game.__twistBadgeShown = false;
   game.cfg.doubleChance = 100;
   game.cfg.tripleChance = 0;
   ```

2. **Trigger twist decision:**
   ```javascript
   window.twists.decideForWeek();
   ```

3. **Verify pre-modal state:**
   - Check console for: `__twistBadgeShown: false`
   - Look at TV screen - badge should **NOT** be visible yet
   - Verify twist was set: `game.__twistMode` should be `'double'`

4. **Show the modal:**
   - The modal should appear automatically if you call `window.startHOH()` or manually:
   ```javascript
   await window.showTwistAnnouncementIfNeeded();
   ```

5. **Observe modal:**
   - "House Shock!" modal should appear
   - Title: "House Shock!"
   - Subtitle: "Double Eviction Week!! Three nominees — two leave."
   - Badge should still **NOT** be visible behind the modal

6. **After modal dismisses:**
   - Wait for modal to auto-dismiss (4 seconds) or click it
   - Badge should **NOW** appear on TV with "Double Eviction" text
   - Check console: `__twistBadgeShown: true`

### Success Criteria
- ✅ Badge does NOT appear before modal
- ✅ Badge appears immediately after modal dismisses
- ✅ Badge persists on subsequent HUD updates

## Test 2: Triple Eviction Badge Timing

### Steps
1. **Configure for triple eviction:**
   ```javascript
   game.week = 3;
   game.__twistMode = null;
   game.__twistBadgeShown = false;
   game.cfg.doubleChance = 0;
   game.cfg.tripleChance = 100;
   ```

2. **Trigger and observe:**
   ```javascript
   window.twists.decideForWeek();
   // Badge should NOT be visible yet
   
   await window.showTwistAnnouncementIfNeeded();
   // After modal: badge should appear with "Triple Eviction"
   ```

### Success Criteria
- ✅ Badge does NOT appear before modal
- ✅ Badge appears after modal with "Triple Eviction" text
- ✅ Modal shows: "Triple Eviction Week!!! Four nominees — three leave."

## Test 3: Badge Persistence Across HUD Updates

### Steps
1. **After badge is visible from Test 1 or 2:**
   ```javascript
   // Manually trigger multiple HUD updates
   window.updateHud();
   window.updateHud();
   window.updateHud();
   ```

2. **Change phase:**
   ```javascript
   window.setPhase('nominations', 30, () => {});
   ```

3. **Verify badge stays visible**

### Success Criteria
- ✅ Badge remains visible after HUD updates
- ✅ Badge remains visible across phase changes
- ✅ Badge does NOT disappear until week changes

## Test 4: Badge Clears on Week Change

### Steps
1. **With badge visible:**
   ```javascript
   console.log('Current week:', game.week);
   console.log('Badge visible:', document.getElementById('twistBadge')?.style.display !== 'none');
   ```

2. **Change week:**
   ```javascript
   game.week = game.week + 1;
   window.updateHud();
   ```

3. **Verify badge disappears:**
   ```javascript
   console.log('Badge after week change:', document.getElementById('twistBadge')?.style.display !== 'none');
   // Should be false
   ```

### Success Criteria
- ✅ Badge disappears when week increments
- ✅ `__twistBadgeShown` can be reset for new twist

## Test 5: Error Handling

### Steps
1. **Test modal error scenario:**
   ```javascript
   // Temporarily break showEventModal
   const original = window.showEventModal;
   window.showEventModal = async () => { throw new Error('Test error'); };
   
   game.week = 4;
   game.__twistMode = null;
   game.__twistBadgeShown = false;
   window.twists.decideForWeek();
   
   await window.showTwistAnnouncementIfNeeded();
   
   // Restore
   window.showEventModal = original;
   ```

2. **Verify badge still appears:**
   - Even though modal threw error, `__twistBadgeShown` should be `true`
   - Badge should be visible

### Success Criteria
- ✅ Badge appears even if modal throws error
- ✅ Game doesn't crash

## Test 6: Using Test Page

### Steps
1. **Open dedicated test page:**
   - Navigate to `test_twist_badge_timing.html`

2. **Run automated tests:**
   - Click "Run All Tests" button
   - All tests should pass with green checkmarks

3. **Run manual timing tests:**
   - Click "Test Double Eviction Badge Timing"
   - Observe step-by-step console output
   - Verify badge preview shows timing correctly

4. **Inspect state:**
   - Click "Inspect Current State"
   - Verify all flags are correct

### Success Criteria
- ✅ All automated tests pass
- ✅ Manual tests show correct timing
- ✅ Badge preview updates correctly

## Common Issues and Debugging

### Issue: Badge never appears
**Check:**
- `game.__twistMode` is set to 'double' or 'triple'
- `game.__twistBadgeShown === true`
- `#twistBadge` element exists in DOM
- Console shows no errors

### Issue: Badge appears too early
**Check:**
- `decideForWeek()` should set `__twistBadgeShown = false`
- Modal should complete before `__twistBadgeShown = true`
- `updateHud()` is only called after modal

### Issue: Badge doesn't persist
**Check:**
- `currentTwistWeek` matches `game.week`
- `__twistBadgeShown` hasn't been reset
- `updateTwistBadge()` is being called correctly

## Console Commands Quick Reference

```javascript
// Inspect current state
console.log({
  week: game.week,
  twistMode: game.__twistMode,
  badgeShown: game.__twistBadgeShown,
  badgeVisible: document.getElementById('twistBadge')?.style.display !== 'none'
});

// Reset for new test
game.week++;
game.__twistMode = null;
game.__twistBadgeShown = false;
game.__twistDecidedWeek = null;

// Trigger twist
window.twists.decideForWeek();

// Show modal
await window.showTwistAnnouncementIfNeeded();

// Force badge update
window.updateHud();
```

## Expected Console Output

### Successful Test Run
```
[ui.week-intro] Showing twist announcement: Double Eviction Week!! Three nominees — two leave.
[ui.week-intro] Modal completed, setting __twistBadgeShown = true
updateHud() called
[tv.js] updateTwistBadge: showing badge (twist=double, badgeAllowed=true)
```

### Before Modal
```
game.__twistMode: 'double'
game.__twistBadgeShown: false
Badge visible: false ✓
```

### After Modal
```
game.__twistMode: 'double'
game.__twistBadgeShown: true
Badge visible: true ✓
```

## Verification Checklist

Use this checklist to confirm all aspects are working:

- [ ] Badge does NOT flash before modal appears
- [ ] Modal appears with correct twist type
- [ ] Badge appears immediately after modal dismisses
- [ ] Badge shows correct twist type (Double/Triple Eviction)
- [ ] Badge persists across HUD updates
- [ ] Badge persists across phase changes
- [ ] Badge clears when week changes
- [ ] Badge appears even if modal throws error
- [ ] Automated tests pass
- [ ] Manual tests show correct timing
- [ ] No console errors during normal operation

## Notes

- The badge timing fix uses `game.__twistBadgeShown` as a gate
- `decideForWeek()` resets this flag to `false` at week start
- Modal completion sets it to `true`
- `updateTwistBadge()` checks both twist active AND flag true
- Badge persists by tracking `currentTwistWeek` vs `game.week`
