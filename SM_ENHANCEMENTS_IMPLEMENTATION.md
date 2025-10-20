# SM-only Social Energy Bank Enhancements - Implementation Summary

## Overview
This document summarizes the implementation of three SM-only enhancements to the Social Energy Bank system, as specified in the requirements.

## Enhancements Implemented

### 1. Week 1 Starter Bonus (+5)

**Location:** `js/social-maneuvers.js` - `installPropertyWatchers()` function, week property watcher

**Implementation:**
- Triggers when `game.week` is set to `1` for the first time
- Grants +5 energy to human player and all alive players
- Uses idempotence flag: `game.__sm_weekStarterApplied = 1`
- Logging: `[sm-week] starter +5 applied (week=1)`

**Code snippet:**
```javascript
// ENHANCEMENT 1: Week 1 starter bonus (+5 for human and all alive players)
if(newValue === 1 && !g.__sm_weekStarterApplied) {
  console.info('[sm-week] Applying week 1 starter bonus');
  const humanId = g.humanId;
  const alivePlayers = global.alivePlayers?.() || [];
  
  // Grant +5 to human
  if(humanId) {
    SocialEnergyBank.adjust(humanId, 5);
    console.info(`[sm-week] starter +5 applied (week=1) for human player ${humanId}`);
  }
  
  // Grant +5 to all alive players
  alivePlayers.forEach(player => {
    SocialEnergyBank.adjust(player.id, 5);
    console.info(`[sm-week] starter +5 applied (week=1) for player ${player.id} (${player.name || 'unknown'})`);
  });
  
  // Mark as applied to prevent duplicates
  g.__sm_weekStarterApplied = 1;
}
```

**Testing:**
- Test file: `test_sm_enhancements.html`
- Test function: `testWeek1StarterBonus()`
- Verifies: +5 applied to all players, flag set, idempotence

---

### 2. HOH Participation/Last/Skip Rules

**Location:** 
- Primary: `js/social-maneuvers.js` - `installPropertyWatchers()` function, hohId property watcher
- Fallback: `js/social-maneuvers.js` - `setPhase` wrapper, HOH phase exit hook

**Implementation:**
- Detects HOH participation via `game.lastCompScores` (Map object)
- Applied once when HOH results are finalized (hohId is set)
- Three scenarios:
  1. **Skip**: No submission → `compSkipped` penalty → `setBank(humanId, 0)`
  2. **Last place**: Submitted but scored minimum → `setBank(humanId, 0)`
  3. **Participated**: Submitted and not last → `addToBank(humanId, +5)`
- Idempotence: Uses `hoh-participation-${week}` event key
- Logging:
  - `[sm-penalty] hohSkipped → bank=0`
  - `[sm-penalty] hohLast → bank=0`
  - `[sm-event] hohParticipated +5`

**Code snippet (hohId watcher):**
```javascript
// ENHANCEMENT 2: HOH participation/last/skip rules
const humanId = g.humanId;
const lastCompScores = g.lastCompScores;

if(humanId && lastCompScores) {
  const participationKey = `hoh-participation-${week}`;
  
  if(!isEventApplied(week, participationKey)) {
    // Check if human participated
    if(!lastCompScores.has(humanId)) {
      // Human skipped HOH - apply compSkipped penalty and set bank to 0
      SocialResources.recordWeeklyEvent(humanId, 'compSkipped', true);
      SocialEnergyBank.set(humanId, 0);
      console.info(`[sm-penalty] hohSkipped → bank=0 for player ${humanId}`);
    } else {
      // Human participated - check if they came in last place
      const scores = Array.from(lastCompScores.entries());
      const participantScores = scores.map(([id, score]) => ({ id, score }));
      const minScore = Math.min(...participantScores.map(p => p.score));
      const humanScore = lastCompScores.get(humanId);
      
      if(humanScore === minScore) {
        // Human came in last - set bank to 0
        SocialEnergyBank.set(humanId, 0);
        console.info(`[sm-penalty] hohLast → bank=0 for player ${humanId}`);
      } else {
        // Human participated and didn't come in last - award +5
        SocialEnergyBank.adjust(humanId, 5);
        console.info(`[sm-event] hohParticipated +5 for player ${humanId}`);
      }
    }
    
    markEventApplied(week, participationKey);
  }
}
```

**Fallback Implementation:**
- Triggers when exiting 'hoh' phase via `setPhase('nominations', ...)` or similar
- Same logic as hohId watcher
- Ensures rules apply even if hohId setter doesn't trigger
- Shares same idempotence key

**Testing:**
- Test file: `test_sm_enhancements.html`
- Test functions:
  - `testHOHSkipPenalty()`
  - `testHOHLastPlacePenalty()`
  - `testHOHParticipationBonus()`
  - `testHOHPhaseExitFallback()`

---

### 3. Veto Drawing Watcher (notDrawnVeto)

**Location:** `js/social-maneuvers.js` - `installPropertyWatchers()` function, __vetoPlayers property watcher

**Implementation:**
- Watches `game.__vetoPlayers` property (property used by veto.js; watcher installed in this PR)
- Triggers when set to an array
- Computes alive players not in the drawn list
- Applies `notDrawnVeto` event for each excluded player
- Weekly event handler automatically applies -1 penalty via existing infrastructure
- Idempotence: Uses `notDrawnVeto-${playerId}` event key per player per week
- Logging: `[sm-event] notDrawnVeto -1 for player=${id}`

**Code snippet:**
```javascript
// 6. Watch game.__vetoPlayers for notDrawnVeto penalty (ENHANCEMENT 3)
let _vetoPlayers = g.__vetoPlayers;
Object.defineProperty(g, '__vetoPlayers', {
  get() { return _vetoPlayers; },
  set(newValue) {
    _vetoPlayers = newValue;
    
    // ENHANCEMENT 3: Apply notDrawnVeto penalty for players not drawn
    if(Array.isArray(newValue) && newValue.length > 0) {
      const week = g.week || 1;
      const alivePlayers = global.alivePlayers?.() || [];
      const drawnPlayerIds = newValue.map(id => +id); // Ensure numeric
      
      // Find players not drawn for veto
      const notDrawn = alivePlayers.filter(p => !drawnPlayerIds.includes(p.id));
      
      notDrawn.forEach(player => {
        const eventKey = `notDrawnVeto-${player.id}`;
        
        if(!isEventApplied(week, eventKey)) {
          // Record weekly event which applies the penalty immediately to bank
          SocialResources.recordWeeklyEvent(player.id, 'notDrawnVeto', true);
          console.info(`[sm-event] notDrawnVeto -1 for player=${player.id} (${player.name || 'unknown'})`);
          markEventApplied(week, eventKey);
        }
      });
    }
  },
  enumerable: true,
  configurable: true
});
```

**Integration with existing infrastructure:**
- `SocialResources.recordWeeklyEvent()` handles the -1 penalty application
- Uses `WEEKLY_ENERGY_PENALTIES.NOT_DRAWN_VETO` (-1) from config
- Applies immediately to bank via `SocialEnergyBank.applyEventDelta()`

**Testing:**
- Test file: `test_sm_enhancements.html`
- Test functions:
  - `testVetoDrawingWatcher()`
  - `testNotDrawnVetoPenalty()`
- Verifies: -1 applied to non-drawn players, drawn players unaffected, idempotence

---

## Files Modified

### 1. `js/social-maneuvers.js`
**Changes:**
- Enhanced `installPropertyWatchers()` function:
  - Week property watcher: Added week 1 starter bonus logic
  - hohId property watcher: Added participation/last/skip rules
  - New __vetoPlayers property watcher: Added notDrawnVeto penalty
- Enhanced `setPhase` wrapper:
  - Added HOH phase exit fallback for participation rules

**Lines changed:** ~120 lines added (property watchers and setPhase enhancement)

### 2. `test_sm_enhancements.html` (NEW)
**Purpose:** Comprehensive test suite for all three enhancements
**Test coverage:**
- Week 1 starter bonus (with idempotence)
- HOH skip penalty
- HOH last place penalty
- HOH participation bonus
- HOH phase exit fallback
- Veto drawing watcher
- notDrawnVeto penalty (with idempotence)

---

## Design Principles

### SM-Only Implementation
✅ All changes made to `js/social-maneuvers.js` only
✅ No edits to legacy modules (social.js, competitions.js, veto.js)
✅ Uses existing game properties (`game.week`, `game.hohId`, `game.lastCompScores`, `game.__vetoPlayers`)

### Idempotence
✅ Week 1 starter: `g.__sm_weekStarterApplied` flag
✅ HOH participation: `hoh-participation-${week}` event key in `g.__sm_watcherApplied` Map
✅ notDrawnVeto: `notDrawnVeto-${playerId}` event key per player per week

### Immediate Application
✅ All enhancements apply changes immediately to bank when triggered
✅ Uses existing `SocialEnergyBank` API (`adjust()`, `set()`)
✅ Integrates with existing weekly event system via `SocialResources.recordWeeklyEvent()`

### Fallback Mechanisms
✅ HOH participation rules have dual triggers:
  1. Primary: hohId property watcher (when winner set)
  2. Fallback: setPhase exit hook (when leaving 'hoh' phase)
✅ Both share same idempotence key to prevent double application

---

## Testing & Verification

### Existing Tests
```bash
npm run test:social
```
**Result:** ✅ All 9 tests pass (no regressions)

### New Tests
**File:** `test_sm_enhancements.html`
**Usage:** Open in browser and click "Run All Tests"
**Test scenarios:**
1. Week 1 starter bonus (one-time +5)
2. HOH skip penalty (no submission → bank=0)
3. HOH last place penalty (minimum score → bank=0)
4. HOH participation bonus (participated and not last → +5)
5. HOH phase exit fallback (setPhase hook)
6. Veto drawing watcher (triggers on __vetoPlayers set)
7. notDrawnVeto penalty (excluded players → -1)
8. Idempotence for all enhancements

---

## Integration with Existing Systems

### Energy Bank System
- Uses existing `SocialEnergyBank.adjust()` for bonuses
- Uses existing `SocialEnergyBank.set()` for penalties
- Integrates with uncapped bank balance system

### Weekly Events System
- Uses existing `SocialResources.recordWeeklyEvent()` API
- Penalties/bonuses applied via existing event handlers
- Idempotence managed via existing `g.__sm_watcherApplied` Map

### Property Watchers
- Extends existing property watcher infrastructure
- Uses same helper functions (`isEventApplied()`, `markEventApplied()`)
- Follows same patterns as existing watchers

---

## Logging Format

All enhancements follow consistent logging patterns:

### Week 1 Starter
```
[sm-week] Applying week 1 starter bonus
[sm-week] starter +5 applied (week=1) for human player 1
[sm-week] starter +5 applied (week=1) for player 2 (Player 2)
```

### HOH Participation
```
[sm-penalty] hohSkipped → bank=0 for player 1
[sm-penalty] hohLast → bank=0 for player 1
[sm-event] hohParticipated +5 for player 1
```

### notDrawnVeto
```
[sm-event] notDrawnVeto -1 for player=4 (Player 4)
[sm-event] notDrawnVeto -1 for player=5 (Player 5)
```

---

## Summary

✅ All three enhancements implemented as specified
✅ SM-only approach - no legacy module edits
✅ Property watchers for event-driven updates
✅ Idempotence ensured for all enhancements
✅ Fallback mechanisms in place
✅ Comprehensive test coverage
✅ No regressions in existing tests
✅ Consistent logging and error handling
✅ Integration with existing Social Energy Bank infrastructure

**Total changes:** ~120 lines added to `js/social-maneuvers.js`, plus new test file
