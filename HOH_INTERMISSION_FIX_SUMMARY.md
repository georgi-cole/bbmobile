# HOH Intermission Prompt Persistence Fix - Summary

## Issue #650: HOH Intermission Prompt Persisting Incorrectly

### Problem Description
After winning the HOH competition, the intermission prompt "HOH Competition In Progress" incorrectly appeared to the current HOH winner and persisted through subsequent phases (social_intermission → nominations), overlapping with ceremony UI.

### Root Causes Identified

1. **Eligibility Logic Bug**: The code checked `lastHOHId` without tracking which week it was won, causing the current HOH winner to be immediately classified as "previous HOH"

2. **Missing Week Context**: No `lastHOHWeek` field existed to distinguish between "won last week" vs "won this week"

3. **Persistent DOM Nodes**: Intermission cards were injected into TV overlay but not tracked by cleanup systems

4. **No Phase Change Hooks**: No cleanup triggered on phase transitions

### Solution Implemented

#### 1. Week-Based HOH Eligibility (`js/competitions.js`)

**Changes Made:**
- Added `game.lastHOHWeek` field to track which week HOH was won
- Set `lastHOHWeek = g.week` when HOH winner is determined (line 1467)
- Initialize `lastHOHWeek` to `null` in `startHOH()` for backwards compatibility (lines 1358-1361)

**Eligibility Logic Updated (5 Locations):**
```javascript
// Old logic (broken):
const blocked = (alive.length > 3 && g.week > 1) ? g.lastHOHId : null;

// New logic (fixed):
const blocked = (
  alive.length > 3 && 
  g.week > 1 && 
  g.lastHOHId && 
  g.lastHOHWeek === (g.week - 1)
) ? g.lastHOHId : null;
```

**Human Player Check Enhanced:**
```javascript
const wasPreviousWeekHOH = (
  alive.length > 3 && 
  g.week > 1 && 
  g.lastHOHId && 
  you.id === g.lastHOHId && 
  g.lastHOHWeek === (g.week - 1)
);

const isCurrentHOH = (
  g.lastHOHId === you.id && 
  g.lastHOHWeek === g.week
);

// Skip intermission if player is current HOH
if (isCurrentHOH) {
  console.info('[HOHEligibility] Skipping intermission (player is current HOH for this week)');
  // Fall through to normal flow
}
```

**Locations Updated:**
1. `generateSyntheticOpponentScores()` - Line ~295
2. `maybeFinishComp()` - Line ~350
3. `startHOH()` - Line ~1366 (AI generation fallback)
4. `finishCompPhase()` - Line ~1407 (eligibility filter)
5. Human player eligibility check in competition start - Line ~1260

#### 2. Intermission Cleanup System (`js/intermission-flow.js`)

**New `forceCleanup(reason)` Function:**
```javascript
function forceCleanup(reason) {
  console.info(`[IntermissionFlow] forceCleanup reason=${reason}`);
  
  // Remove intermission card from TV
  if (global.IntermissionCard && typeof global.IntermissionCard.removeActive === 'function') {
    global.IntermissionCard.removeActive();
  }
  
  // Close any active intermission overlay/game
  if (global.IntermissionOverlay && typeof global.IntermissionOverlay.close === 'function') {
    global.IntermissionOverlay.close();
  }
  
  // Clear intermission active flag
  if (global.game) {
    global.game.__intermissionActive = false;
  }
}
```

**Event Listeners Added:**
```javascript
// Listen for bb:phase:changed custom event
document.addEventListener('bb:phase:changed', function(event) {
  const newPhase = event.detail?.phase;
  const oldPhase = event.detail?.oldPhase;
  
  // Cleanup if transitioning away from HOH or veto phases
  if ((oldPhase === 'hoh' || oldPhase === 'veto_competition') && 
      newPhase !== 'hoh' && newPhase !== 'veto_competition') {
    forceCleanup('phase_change');
  }
});

// Listen for competition results shown
global.game.bus.on('competition:results:shown', function() {
  forceCleanup('competition_results_shown');
});
```

**State Flag Added:**
- `game.__intermissionActive` - Set to `true` when intermission starts, cleared to `false` on cleanup

#### 3. Null-Safe DOM Operations (`js/ui/intermissionCard.js`)

**Enhanced `removeActive()` Function:**
```javascript
function removeActive() {
  const overlays = document.querySelectorAll('.tv-intermission-overlay');
  let removedCount = 0;
  
  overlays.forEach(overlay => {
    const cards = overlay.querySelectorAll('.intermission-card-container');
    cards.forEach(card => {
      if (card) {
        try {
          card.remove(); // Modern API, null-safe
          removedCount++;
        } catch (e) {
          console.warn('[IntermissionCard] Failed to remove card:', e);
        }
      }
    });
    if (overlay) {
      overlay.style.pointerEvents = 'none';
    }
  });
  
  // Clear intermission active flag
  if (global.game) {
    global.game.__intermissionActive = false;
  }
  
  console.info(`[IntermissionCard] ✓ Removed ${removedCount} active card(s)`);
}
```

**Updated `removeCard()` Function:**
- Added null check before removal
- Use modern `element.remove()` instead of `parentNode.removeChild()`
- Clear `__intermissionActive` flag after removal

#### 4. Test Suite (`test_hoh_eligibility_week_fix.html`)

**5 Test Scenarios Created:**
1. **Current HOH Winner** - Should NOT see intermission
2. **Previous Week HOH** - Should see intermission
3. **Week 1 No Block** - No previous HOH exists
4. **Cleanup on Phase Change** - Verify cleanup works
5. **Force Cleanup Idempotent** - Safe to call multiple times

**Test Features:**
- Console log capture with color-coded output
- Simulates game state for each scenario
- Visual pass/fail indicators
- Comprehensive logging of eligibility checks

### Acceptance Criteria Met ✅

- ✅ Intermission prompt never persists beyond competition results phase
- ✅ Current HOH (just won) is never shown the ineligible prompt for the same week
- ✅ Prior week HOH properly receives the prompt during new HOH competition
- ✅ Cleanup occurs reliably on all phase transitions out of the competition phase
- ✅ No orphan DOM nodes or recurring cleanup errors

### Testing Results

**Automated Tests:**
- ✅ All existing minigame tests pass
- ✅ Runtime validation tests pass
- ✅ ESLint passes with no new errors
- ✅ CodeQL security scan passes (0 vulnerabilities)

**Custom Test Suite:**
- ✅ Test 1: Current HOH winner correctly NOT triggered
- ✅ Test 2: Previous week HOH correctly triggered
- ✅ Test 3: Week 1 correctly allows all players
- ✅ Test 4: Phase change cleanup verified
- ✅ Test 5: Idempotent cleanup verified

### Code Quality Improvements

**Code Review Feedback Addressed:**
1. ✅ Added initialization for `lastHOHWeek` in `startHOH()`
2. ✅ Simplified nested conditionals in event listeners
3. ✅ Replaced legacy DOM APIs with modern `element.remove()`
4. ✅ Fixed circular reference in test file

**Security:**
- ✅ No new vulnerabilities introduced (CodeQL scan clean)
- ✅ All DOM operations are null-safe
- ✅ No memory leaks from circular references

### Impact Assessment

**User-Facing Changes:**
- Current HOH winners will no longer see the confusing intermission prompt
- Intermission cards will properly clean up during phase transitions
- Previous week HOH players continue to see intermission as intended

**Technical Changes:**
- Week-based eligibility tracking added
- Centralized cleanup system for intermission UI
- Event-driven cleanup on phase changes
- Backwards compatible with existing save games

**Performance:**
- Negligible impact (cleanup is O(n) where n = number of cards, typically 0-1)
- Event listeners registered once at module initialization
- No polling or continuous checking

### Files Changed

1. **js/competitions.js** - 30 lines modified
   - Added `lastHOHWeek` tracking
   - Updated 5 eligibility check locations
   - Added initialization and logging

2. **js/intermission-flow.js** - 40 lines added
   - Added `forceCleanup()` function
   - Added event listeners
   - Added state flag management

3. **js/ui/intermissionCard.js** - 25 lines modified
   - Enhanced `removeActive()` with counting
   - Updated to modern DOM APIs
   - Added state flag management

4. **test_hoh_eligibility_week_fix.html** - New file (500+ lines)
   - Comprehensive test suite
   - 5 test scenarios
   - Console log capture

### Backwards Compatibility

- ✅ Older save games work (null initialization in `startHOH()`)
- ✅ No breaking changes to public APIs
- ✅ Graceful fallbacks if modules not loaded
- ✅ Event listeners check for availability before registering

### Future Considerations

**Potential Enhancements (Not in Scope):**
1. Apply same week-based logic to Veto eligibility (separate PR)
2. Add telemetry for intermission engagement metrics
3. Add visual indicator of eligibility status in UI
4. Add debug panel showing week tracking state

**Maintenance Notes:**
- `lastHOHWeek` must be updated whenever HOH winner is set
- Cleanup listeners rely on `bb:phase:changed` event from `ui.hud-and-router.js`
- Test suite should be run after any phase transition changes

### Deployment Notes

**No Special Actions Required:**
- Changes are fully backwards compatible
- No database migrations needed
- No user data affected
- Safe to deploy immediately

**Verification Steps:**
1. Play through HOH competition as winner → should NOT see intermission
2. Play as previous week's HOH in new week → should see intermission
3. Fast-forward through HOH phase → cleanup should occur
4. Check console for no DOM errors or warnings

### Related Issues

- Fixes: #650 - HOH Intermission Prompt Persistence
- Related: Potential future Veto eligibility improvements
- Related: General phase transition cleanup architecture

### Contributors

- Primary Implementation: GitHub Copilot Agent
- Code Review: Automated + Manual
- Testing: Automated + Manual Test Suite

---

**Date Completed:** 2025-11-23  
**Branch:** `copilot/fix-hoh-prompt-persistence`  
**Status:** ✅ Ready for Merge
