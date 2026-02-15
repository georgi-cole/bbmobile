# Endurance Minigames - Suppress Global Reveal Implementation

## Problem Statement

Endurance minigames like "Hold Wall" were showing duplicate results popups:
1. **First popup**: Minigame's internal results display (showing correct winner)
2. **Second popup**: Global competition reveal from framework (potentially showing different/random winner)

This created a confusing user experience where:
- After completing Hold Wall and seeing correct results
- User returns to main screen
- Another Results popup appears with potentially incorrect winner

## Root Cause

The issue occurred because:

1. `hold-wall.js` calls `g.showResultsPopup()` internally to show its own comprehensive results (last person standing, standings, etc.)
2. After showing results, it calls `onComplete(score)` to signal completion
3. The `competitions-flow.js` wrapper intercepts `onComplete` and automatically calls `showCompetitionResultsAndFastForward(score)`
4. This triggers a second global reveal/popup, leading to duplicate results display

## Solution: suppressGlobalReveal Flag

We implemented a registry-based flag system that allows minigames to opt out of the global reveal while maintaining proper phase progression.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Minigame Completes                           │
│              (e.g., Hold Wall finishes)                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         Minigame shows internal results                          │
│    g.showResultsPopup({ title, topThree, ... })                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Minigame calls onComplete(score)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│        competitions-flow.js intercepts callback                  │
│                                                                  │
│  1. Execute original onComplete(score)                           │
│  2. Check MinigameRegistry for suppressGlobalReveal flag         │
│                                                                  │
│  IF suppressGlobalReveal === true:                               │
│    ✅ Skip showCompetitionResultsAndFastForward()                │
│    ✅ Call game.advancePhase() directly                          │
│    ✅ Phase progression continues normally                       │
│                                                                  │
│  ELSE:                                                           │
│    ✅ Call showCompetitionResultsAndFastForward()                │
│    ✅ Show global reveal/popup as normal                         │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Registry Metadata (js/minigames/registry.js)

Added new optional metadata field:

```javascript
holdWall: {
  key: 'holdWall',
  name: 'Hold Wall',
  // ... other metadata
  suppressGlobalReveal: true // NEW: Suppress global reveal for this minigame
}
```

### 2. Competition Flow Integration (js/competitions-flow.js)

Modified the `runCompetitionFlow` wrapper to check the registry flag:

```javascript
// Check if minigame has suppressGlobalReveal flag set
let suppressGlobalReveal = false;
if(global.MinigameRegistry && typeof global.MinigameRegistry.getRegistry === 'function'){
  const registry = global.MinigameRegistry.getRegistry();
  const metadata = registry[gameKey];
  if(metadata && metadata.suppressGlobalReveal === true){
    suppressGlobalReveal = true;
    console.info(`[ImmediateResults] Minigame '${gameKey}' has suppressGlobalReveal flag – skipping global reveal`);
  }
}

const wrappedOnComplete = function(score){
  try { if(typeof onComplete === 'function'){ onComplete(score); } } catch(e){ /* ... */ }
  
  // Skip global reveal if minigame handles its own results
  if(suppressGlobalReveal){
    console.info('[ImmediateResults] Skipping global reveal (minigame handles results internally)');
    // Still need to advance the phase, but without showing results
    const g = global.game;
    if(g && typeof g.advancePhase === 'function'){
      console.info('[ImmediateResults] Advancing phase without results display');
      setTimeout(() => g.advancePhase(), 100);
    }
  } else if(options.autoFastAdvance !== false){
    global.CompetitionFlow.showCompetitionResultsAndFastForward(score);
  }
};
```

### 3. Documentation (docs/minigames.md)

Added comprehensive documentation section "Endurance Minigames and Results Display" covering:
- When to use the flag
- How to implement it
- Example usage with Hold Wall
- Testing guidance

### 4. Test Page (test_hold_wall_suppress_global_reveal.html)

Created comprehensive test page with:
- Event logging and tracking
- Internal vs global results counter
- Test scenarios for HOH, POV, and direct minigame contexts
- Pass/fail validation
- Visual feedback and status indicators

## Files Changed

1. **js/minigames/registry.js**
   - Added `suppressGlobalReveal: true` to holdWall entry
   - Updated metadata documentation

2. **js/competitions-flow.js**
   - Added flag checking logic in runCompetitionFlow wrapper
   - Added header documentation about endurance minigame support

3. **docs/minigames.md**
   - Added suppressGlobalReveal to metadata field list
   - Added new section "Endurance Minigames and Results Display"
   - Documented usage patterns and examples

4. **test_hold_wall_suppress_global_reveal.html** (NEW)
   - Interactive test page for validation

## Benefits

### ✅ Solves Duplicate Popup Issue
- Only one results popup shown (minigame's internal display)
- No more confusing second popup with potentially different winner

### ✅ Preserves Game Flow
- Phase progression still occurs normally
- Score submission works as expected
- HOH/POV ceremony flow continues correctly

### ✅ Scalable Design
- Any future endurance minigames can use the same flag
- Clean, declarative approach via registry metadata
- No minigame code changes required (beyond setting the flag)

### ✅ Minimal Code Impact
- Only 3 files changed (registry, flow, docs)
- No breaking changes to existing minigames
- Backward compatible (flag is optional, defaults to false)

## Usage Guide

### For New Endurance Minigames

If creating a new endurance-style minigame that shows its own comprehensive results:

1. **Show internal results** before calling `onComplete()`:
   ```javascript
   function showResults(finalStandings, score) {
     if(g.showResultsPopup && typeof g.showResultsPopup === 'function'){
       g.showResultsPopup({
         title: 'Your Game Results',
         topThree: finalStandings.slice(0, 3),
         winnerEmoji: '👑',
         duration: 5000
       }).then(() => {
         onComplete(score);
       });
     } else {
       onComplete(score);
     }
   }
   ```

2. **Set registry flag**:
   ```javascript
   yourGame: {
     key: 'yourGame',
     // ... other metadata
     suppressGlobalReveal: true
   }
   ```

3. **Test** with `test_hold_wall_suppress_global_reveal.html` as a reference

## Testing

### Automated Tests
- ✅ `npm run test:minigames` - All pass
- ✅ `npm run test:e2e` - All pass
- ✅ No linting errors
- ✅ No security vulnerabilities (CodeQL)

### Manual Testing
Use `test_hold_wall_suppress_global_reveal.html` to:
1. Test Hold Wall in HOH context
2. Test Hold Wall in POV context
3. Test direct minigame rendering
4. Verify only one results popup appears
5. Confirm phase progression works

### Expected Behavior
- **Internal Results Counter**: Should be 1
- **Global Reveals Counter**: Should be 0
- **Test Status**: ✅ PASSED

## Future Considerations

### Other Endurance Minigames
Currently, only Hold Wall uses this flag. Other endurance minigames investigated:
- `tiltedLedge` - Does NOT call showResultsPopup internally
- `pressurePlank` - Does NOT call showResultsPopup internally
- `rainBarrelBalance` - Does NOT call showResultsPopup internally

These games rely on the global reveal, so they should NOT have `suppressGlobalReveal` set.

### Potential Enhancements
If more minigames need custom results handling in the future:
- Could add variants like `suppressGlobalReveal: 'partial'` for hybrid approaches
- Could extend to other competition types beyond endurance
- Could add telemetry to track flag usage

## Migration Notes

No migration needed:
- Existing minigames continue to work unchanged
- Flag is optional, defaults to false (show global reveal as normal)
- Hold Wall now has flag set, preventing duplicate popups

## Summary

This implementation solves the duplicate results popup issue for endurance minigames like Hold Wall by introducing a simple, scalable registry flag. The solution:
- ✅ Fixes the user-visible bug
- ✅ Maintains proper game flow and phase progression
- ✅ Uses minimal code changes (3 files)
- ✅ Provides clear documentation and testing
- ✅ Is extensible for future minigames

The registry-based approach ensures the fix is declarative, maintainable, and consistent with the existing minigame system architecture.
