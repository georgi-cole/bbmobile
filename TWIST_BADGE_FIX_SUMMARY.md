# Twist Badge Timing Fix - Implementation Summary

## Problem
The TV twist badge was appearing immediately when `decideForWeek()` set the twist, causing it to flash briefly before the "House Shock!" modal displayed. The badge should only appear after the modal finishes.

## Solution Overview

### Three-Part Fix

```
┌─────────────────────────────────────────────────────────────┐
│                    FLOW DIAGRAM                              │
└─────────────────────────────────────────────────────────────┘

Week Start / Intermission Phase
        │
        ▼
┌───────────────────────────────────────────┐
│   js/twists.js: decideForWeek()          │
│   • Resets twist state                    │
│   • Sets __twistBadgeShown = false  ◄──┐ │ NEW
│   • Decides twist (__twistMode)          │ │
│   • Calls updateHud()                    │ │
└───────────────────────────────────────────┘ │
        │                                      │
        ▼                                      │
┌───────────────────────────────────────────┐ │
│   js/tv.js: updateTwistBadge()           │ │
│   • Checks __twistMode (double/triple)   │ │
│   • Checks __twistBadgeShown === true ◄──┼─┼─ NEW
│   • Badge HIDDEN (flag is false)         │ │
└───────────────────────────────────────────┘ │
        │                                      │
        ▼                                      │
┌───────────────────────────────────────────┐ │
│   Week Intro Flow / startHOH()           │ │
│   • Shows week intro modal                │ │
│   • Calls showTwistAnnouncementIfNeeded() │ │
└───────────────────────────────────────────┘ │
        │                                      │
        ▼                                      │
┌───────────────────────────────────────────┐ │
│   js/ui.week-intro.js:                   │ │
│   showTwistAnnouncementIfNeeded()        │ │
│   • Detects __twistMode is set           │ │
│   • Shows "House Shock!" modal           │ │
│   • await showEventModal(twistConfig)    │ │
└───────────────────────────────────────────┘ │
        │                                      │
        │ (User sees modal, clicks or waits)   │
        │                                      │
        ▼                                      │
┌───────────────────────────────────────────┐ │
│   Modal Completes                         │ │
│   • Sets __twistBadgeShown = true ────────┘ NEW
│   • Calls updateHud()                     │
└───────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────┐
│   js/tv.js: updateTwistBadge()           │
│   • Checks __twistMode (still active)    │
│   • Checks __twistBadgeShown === true ✓  │ NEW
│   • Badge NOW VISIBLE                     │
└───────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────┐
│   Badge Persists                          │
│   • Stays visible across HUD updates      │
│   • Stays visible across phase changes    │
│   • Clears when week changes              │
└───────────────────────────────────────────┘
```

## Code Changes

### 1. js/twists.js - Reset Flag on Week Start

**Location:** Line 223 in `decideForWeek()`

**Before:**
```javascript
// Reset twist state
g.doubleEvictionWeek=false;
g.tripleEvictionWeek=false;
g.__twistMode=null;
g.__twistPlannedEvictions=1;
g.__twistNomSlots=2;
g.__twistDecidedWeek=g.week;
```

**After:**
```javascript
// Reset twist state
g.doubleEvictionWeek=false;
g.tripleEvictionWeek=false;
g.__twistMode=null;
g.__twistPlannedEvictions=1;
g.__twistNomSlots=2;
g.__twistDecidedWeek=g.week;
g.__twistBadgeShown=false; // ← NEW: Reset badge flag
```

**Why:** Ensures badge starts hidden at the beginning of each week, even if a twist is decided.

---

### 2. js/ui.week-intro.js - Enable Badge After Modal

**Location:** Lines 206-223 in `showTwistAnnouncementIfNeeded()`

**Before:**
```javascript
try {
  await global.showEventModal(twistConfig);
  
  // After modal, update the twist badge in TV area
  if(typeof global.TV?.updateTwistBadge === 'function'){
    global.TV.updateTwistBadge();
  }
} catch (e) {
  console.error('[ui.week-intro] Error showing twist modal:', e);
}
```

**After:**
```javascript
try {
  await global.showEventModal(twistConfig);
  
  // After modal completes, enable badge display
  const g = global.game || {};
  g.__twistBadgeShown = true; // ← NEW: Enable badge
  
  // Update HUD to trigger badge display
  if(typeof global.updateHud === 'function'){
    global.updateHud(); // ← CHANGED: Call updateHud instead
  }
} catch (e) {
  console.error('[ui.week-intro] Error showing twist modal:', e);
  // Still enable badge even if modal throws
  const g = global.game || {};
  g.__twistBadgeShown = true; // ← NEW: Enable even on error
  if(typeof global.updateHud === 'function'){
    global.updateHud(); // ← NEW: Update HUD on error too
  }
}
```

**Why:** 
- Sets flag to `true` only after modal completes
- Calls `updateHud()` which triggers TV badge update through standard flow
- Handles errors gracefully - badge still appears even if modal throws

---

### 3. js/tv.js - Gate Badge Display on Flag

**Location:** Lines 157-182 in `updateTwistBadge()`

**Before:**
```javascript
function updateTwistBadge(){
  const game = window.game || {};
  
  // Hide badge if week changed
  if(currentTwistWeek !== null && game.week !== currentTwistWeek){
    setTwistBadge(null, false);
    return;
  }
  
  // Check for active twist
  const isDouble = game.__twistMode === 'double' || game.doubleEvictionWeek === true;
  const isTriple = game.__twistMode === 'triple' || game.tripleEvictionWeek === true;
  
  if(isTriple){
    setTwistBadge('triple', true);
  } else if(isDouble){
    setTwistBadge('double', true);
  } else if(twistBadgeVisible){
    // Clear badge if no twist is active
    setTwistBadge(null, false);
  }
}
```

**After:**
```javascript
function updateTwistBadge(){
  const game = window.game || {};
  
  // Hide badge if week changed
  if(currentTwistWeek !== null && game.week !== currentTwistWeek){
    setTwistBadge(null, false);
    return;
  }
  
  // Check for active twist
  const isDouble = game.__twistMode === 'double' || game.doubleEvictionWeek === true;
  const isTriple = game.__twistMode === 'triple' || game.tripleEvictionWeek === true;
  
  // Only show badge if twist is active AND badge has been shown (modal completed)
  const badgeAllowed = game.__twistBadgeShown === true; // ← NEW: Check flag
  
  if(isTriple && badgeAllowed){ // ← CHANGED: Added badgeAllowed check
    setTwistBadge('triple', true);
  } else if(isDouble && badgeAllowed){ // ← CHANGED: Added badgeAllowed check
    setTwistBadge('double', true);
  } else if(twistBadgeVisible){
    // Clear badge if no twist is active or badge not allowed yet
    setTwistBadge(null, false);
  }
}
```

**Why:** Prevents badge from showing until both conditions are met:
1. A twist is active (`__twistMode` is set)
2. The modal has completed (`__twistBadgeShown === true`)

## Behavioral Guarantees

### ✅ What Works
- Badge **never** flashes before modal
- Badge appears **immediately** after modal dismisses
- Badge **persists** across:
  - Multiple `updateHud()` calls
  - Phase changes (intermission → HOH → nominations, etc.)
  - HUD re-renders
- Badge **clears** when:
  - Week number changes
  - Twist ends

### ✅ Edge Cases Handled
- **Modal throws error:** Badge still appears (try/catch in ui.week-intro.js)
- **Multiple HUD updates before modal:** Badge stays hidden
- **Week changes mid-twist:** Badge correctly clears
- **No twist active:** Badge stays hidden

### ✅ Backward Compatibility
- Does not affect existing twist decision logic
- `__twistMode` still set immediately by `decideForWeek()`
- Nominations, evictions work as before
- Only UI timing is affected

## Testing Files

### test_twist_badge_timing.html
Comprehensive automated and manual tests including:
- Flag reset verification
- Badge timing with double/triple evictions
- Badge persistence tests
- Week change badge clearing
- State inspector

### TWIST_BADGE_TIMING_TEST_GUIDE.md
Step-by-step manual testing instructions with:
- Setup procedures
- Test scenarios
- Expected console output
- Success criteria
- Debugging tips

## State Flow Table

| Step | `__twistMode` | `__twistBadgeShown` | Badge Visible | User Sees |
|------|---------------|---------------------|---------------|-----------|
| 1. Week starts | `null` | `false` | ❌ | Normal TV |
| 2. `decideForWeek()` | `'double'` | `false` | ❌ | Normal TV |
| 3. Modal appears | `'double'` | `false` | ❌ | Modal overlay |
| 4. Modal completes | `'double'` | `true` ✓ | ✅ | Badge on TV |
| 5. HUD updates | `'double'` | `true` | ✅ | Badge persists |
| 6. Phase changes | `'double'` | `true` | ✅ | Badge persists |
| 7. Week changes | `'double'` | `true` | ❌ | Badge cleared |

## Key Functions Modified

| Function | File | Lines | Purpose |
|----------|------|-------|---------|
| `decideForWeek()` | js/twists.js | 212-244 | Reset badge flag |
| `showTwistAnnouncementIfNeeded()` | js/ui.week-intro.js | 139-225 | Enable badge after modal |
| `updateTwistBadge()` | js/tv.js | 157-182 | Gate display on flag |

## Integration Points

### Where badge gets updated:
1. **`updateHud()`** (js/ui.hud-and-router.js:888-889)
   - Called from multiple places
   - Triggers `TV.updateTwistBadge()`

2. **Phase changes** (js/ui.hud-and-router.js:setPhase)
   - Calls `updateHud()` at end of phase setup

3. **After modal** (js/ui.week-intro.js:214)
   - Explicitly calls `updateHud()` after setting flag

### Where flag gets set:
- **Reset to `false`:** js/twists.js:223 (`decideForWeek()`)
- **Set to `true`:** js/ui.week-intro.js:210 (after modal)

## Visual Summary

```
        BEFORE FIX                    AFTER FIX
┌─────────────────────┐      ┌─────────────────────┐
│  decideForWeek()    │      │  decideForWeek()    │
│  sets twist         │      │  sets twist         │
└──────────┬──────────┘      │  __badgeShown=false │
           │                 └──────────┬──────────┘
           ▼                            │
    ╔═══════════════╗                  ▼
    ║ BADGE FLASHES ║           ┌──────────────┐
    ║   TOO EARLY!  ║           │ Badge HIDDEN │
    ╚═══════════════╝           └──────┬───────┘
           │                            │
           ▼                            ▼
    ┌──────────────┐            ┌──────────────┐
    │ Modal shows  │            │ Modal shows  │
    │ (badge still │            │ (no badge)   │
    │  visible)    │            └──────┬───────┘
    └──────┬───────┘                   │
           │                            ▼
           ▼                     ┌──────────────┐
    ┌──────────────┐            │ Modal closes │
    │ Badge stays  │            │ __badgeShown │
    │ visible      │            │   = true     │
    └──────────────┘            └──────┬───────┘
                                       │
                                       ▼
                                ┌──────────────┐
                                │ updateHud()  │
                                │ Badge NOW    │
                                │ VISIBLE ✓    │
                                └──────────────┘
```

## Verification Commands

Quick console commands to verify the fix is working:

```javascript
// Check flag state
console.log('Badge flag:', game.__twistBadgeShown);
console.log('Twist mode:', game.__twistMode);
console.log('Badge visible:', document.getElementById('twistBadge')?.style.display !== 'none');

// Test sequence
game.cfg.doubleChance = 100;
game.week = 2;
game.__twistDecidedWeek = null;
window.twists.decideForWeek(); // Badge should be HIDDEN
console.log('After decide:', game.__twistBadgeShown); // Should be false

// Simulate modal completion
game.__twistBadgeShown = true;
window.updateHud();
console.log('Badge visible:', document.getElementById('twistBadge')?.style.display !== 'none'); // Should be true
```

## Success Metrics

The fix is successful if:
1. ✅ No badge flash before modal (0 ms early visibility)
2. ✅ Badge appears < 100ms after modal dismisses
3. ✅ Badge persists for entire week
4. ✅ Zero console errors
5. ✅ All automated tests pass
