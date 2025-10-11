# Competition Flow Enhancement - Implementation Summary

## Problem Statement
1. Apply the new competition flow (instructions + Play button + fullscreen minigame) to POV and other competition phases, not just HOH
2. Ensure instructions and Play button appear inside the TV panel, not below it, by passing the TV container as target
3. Disable anti-cheat or set minDistinctInputs: 0 for minigames, so valid submissions are no longer blocked for low input games

## Changes Made

### 1. Anti-Cheat Configuration (competitions.js)
**File:** `js/competitions.js`
**Lines:** 357-365

**Change:** Set `minDistinctInputs: 0` in anti-cheat thresholds

**Before:**
```javascript
thresholds: { minPlayTime: 3000, maxDuration: 300000, minDistinctInputs: 3 }
```

**After:**
```javascript
// Start AntiCheat session with minDistinctInputs: 0 to allow low-input games
thresholds: { minPlayTime: 3000, maxDuration: 300000, minDistinctInputs: 0 }
```

**Rationale:** Some minigames (like timing-based games) have very few distinct inputs, and the previous threshold of 3 was blocking valid submissions.

---

### 2. TV Viewport Targeting (competitions.js)
**File:** `js/competitions.js`
**Lines:** 353-368

**Change:** Pass TV viewport as the instructions container

**Added:**
```javascript
// Get TV viewport as the target for instructions (inside TV, not below it)
const tvViewport = document.querySelector('.tvViewport');
const instructionsContainer = tvViewport || host;

// Run competition flow (pass TV viewport for instructions to appear inside TV)
global.CompetitionFlow.runCompetitionFlow(mg, instructionsContainer, (base) => {
  // ...
});
```

**Rationale:** Instructions should appear inside the TV panel (.tvViewport) rather than in the panel below it, for better UX and visual consistency.

---

### 3. Global Function Exposure (competitions.js)
**File:** `js/competitions.js`
**Line:** 424

**Change:** Expose `runHumanMinigameWithGuards` globally

**Added:**
```javascript
global.runHumanMinigameWithGuards = runHumanMinigameWithGuards;
```

**Rationale:** Allows other modules (like veto.js) to use the new competition flow system.

---

### 4. POV/Veto Competition Flow Update (veto.js)
**File:** `js/veto.js`
**Lines:** 154-181

**Change:** Use `runHumanMinigameWithGuards` instead of direct `renderMinigame`

**Before:**
```javascript
if(hostNode && typeof global.renderMinigame==='function'){
  var playWrap = document.createElement('div');
  playWrap.className = 'col';
  global.renderMinigame(mg, playWrap, function(base){
    var humanMultiplier = (0.75 + (you && you.compBeast ? you.compBeast : 0.5) * 0.6);
    submitGuarded(you.id, base, humanMultiplier, 'Veto/'+mg);
  });
  hostNode.appendChild(playWrap);
}
```

**After:**
```javascript
if(hostNode){
  // Use new competition flow with guards if available
  if(typeof global.runHumanMinigameWithGuards === 'function'){
    global.runHumanMinigameWithGuards({
      mg: mg,
      host: hostNode,
      player: you,
      label: 'Veto/' + mg,
      multiplier: (0.75 + (you && you.compBeast ? you.compBeast : 0.5) * 0.6),
      onAfterSubmit: function(){
        // Callback after submission
      }
    });
  } else if(typeof global.renderMinigame==='function'){
    // Fallback to legacy rendering
    var playWrap = document.createElement('div');
    playWrap.className = 'col';
    global.renderMinigame(mg, playWrap, function(base){
      var humanMultiplier = (0.75 + (you && you.compBeast ? you.compBeast : 0.5) * 0.6);
      submitGuarded(you.id, base, humanMultiplier, 'Veto/'+mg);
    });
    hostNode.appendChild(playWrap);
  }
}
```

**Rationale:** POV competitions now use the same enhanced flow as HOH:
- Shows instructions card with Play button inside TV panel
- Launches minigame in fullscreen overlay
- Includes anti-cheat validation with proper thresholds
- Includes replay-lock protection

---

## Competition Phases Status

| Phase | Status | Implementation |
|-------|--------|----------------|
| HOH Competition | ✅ Already using new flow | `runHumanMinigameWithGuards` at line 806 |
| POV/Veto Competition | ✅ Updated in this PR | Modified veto.js to use `runHumanMinigameWithGuards` |
| Final 3 Part 1 | ✅ Already using new flow | `runHumanMinigameWithGuards` at line 1084 |
| Final 3 Part 2 | ✅ Already using new flow | `runHumanMinigameWithGuards` at lines 1223, 1240 |
| Final 3 Part 3 | ✅ Already using new flow | `runHumanMinigameWithGuards` at lines 1322, 1339 |

---

## New Competition Flow Behavior

When a player enters a competition, they will now experience:

1. **Instructions Card** - Appears inside the TV viewport (.tvViewport)
   - Shows game title
   - Shows game description
   - Shows step-by-step instructions
   - Displays "Play" button

2. **Play Button Click** - Launches fullscreen minigame
   - Fullscreen overlay with dark background
   - Close button (✕) in top-right corner
   - Game container in center
   - Warning if player tries to close before completing

3. **Game Completion** - Returns to normal view
   - Score submitted automatically
   - Anti-cheat validation with minDistinctInputs: 0
   - Replay-lock prevents multiple submissions
   - Panel shows "Submission received. Waiting for others…"

---

## Testing

All changes have been tested:
- ✅ Minigame validation tests pass
- ✅ No build errors or regressions
- ✅ All competition phases use consistent flow

---

## Files Modified

1. `js/competitions.js` - Updated `runHumanMinigameWithGuards` function
   - Set minDistinctInputs: 0
   - Added TV viewport targeting
   - Exposed function globally

2. `js/veto.js` - Updated veto competition flow
   - Use `runHumanMinigameWithGuards`
   - Added fallback to legacy rendering

---

## Breaking Changes

None. All changes are backwards compatible with fallbacks to legacy rendering if new system is not available.
