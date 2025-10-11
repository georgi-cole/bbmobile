# Competition Flow Enhancement - Testing Guide

## Quick Test Instructions

To manually test the changes, follow these steps:

### 1. Test HOH Competition (Already Working)
1. Open `index.html` in a browser
2. Start a new game
3. When Week 1 HOH competition starts:
   - ✅ Instructions should appear **inside the TV viewport** (not below it)
   - ✅ A **Play button** should be visible
   - ✅ Clicking Play should launch the game in **fullscreen overlay**
   - ✅ Game should complete and submit score

### 2. Test POV/Veto Competition (Updated in This PR)
1. Continue playing until after nominations
2. When Veto competition starts:
   - ✅ Instructions should appear **inside the TV viewport** (not below it)
   - ✅ A **Play button** should be visible
   - ✅ Clicking Play should launch the game in **fullscreen overlay**
   - ✅ Game should complete and submit score
   - ✅ Should **not** be blocked by anti-cheat for low input games

### 3. Test Final 3 Competitions (Already Working)
1. Play through to Final 3
2. Test each part:
   - **Part 1**: All 3 houseguests compete
   - **Part 2**: Head-to-head between losers
   - **Part 3**: Final HOH competition
3. Each should show:
   - ✅ Instructions inside TV viewport
   - ✅ Play button
   - ✅ Fullscreen minigame
   - ✅ No anti-cheat blocking

## What Changed

### Visual Changes
- **Before**: Instructions and controls appeared in the panel below the TV
- **After**: Instructions and Play button appear inside the TV viewport, creating a more immersive experience

### Functional Changes
1. **Anti-Cheat**: `minDistinctInputs` reduced from 3 to 0
   - Low-input games (timing-based) no longer blocked
   - Still validates play time and prevents backgrounding

2. **POV Flow**: Now uses same enhanced flow as HOH
   - Instructions card with Play button
   - Fullscreen minigame overlay
   - Consistent experience across all competitions

## Code Changes Summary

### js/competitions.js
```javascript
// Line 357-363: Anti-cheat with minDistinctInputs: 0
antiCheatSessionId = global.AntiCheat.startSession({
  container: host,
  gameKey: mg,
  thresholds: { minPlayTime: 3000, maxDuration: 300000, minDistinctInputs: 0 }
});

// Line 353-355: TV viewport targeting
const tvViewport = document.querySelector('.tvViewport');
const instructionsContainer = tvViewport || host;

// Line 368: Pass TV viewport to competition flow
global.CompetitionFlow.runCompetitionFlow(mg, instructionsContainer, (base) => {
  // ...
});

// Line 424: Expose function globally
global.runHumanMinigameWithGuards = runHumanMinigameWithGuards;
```

### js/veto.js
```javascript
// Lines 160-170: Use new competition flow
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
}
```

## Expected Behavior

### Instructions Card (Inside TV Viewport)
```
┌─────────────────────────────────────┐
│      House Network Live      00:00  │
├─────────────────────────────────────┤
│                                     │
│    ┌───────────────────────────┐   │
│    │   Competition Title        │   │
│    │   Game description here    │   │
│    │                            │   │
│    │   1. Step one              │   │
│    │   2. Step two              │   │
│    │   3. Step three            │   │
│    │                            │   │
│    │      [▶ Play]              │   │
│    └───────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### Fullscreen Minigame
```
┌───────────────────────────────────────┐
│                            [✕ Close]  │
│                                       │
│                                       │
│        ┌─────────────────┐           │
│        │                 │           │
│        │   Minigame      │           │
│        │   Container     │           │
│        │                 │           │
│        └─────────────────┘           │
│                                       │
│                                       │
└───────────────────────────────────────┘
```

## Troubleshooting

### Instructions not appearing inside TV?
- Check browser console for errors
- Verify `.tvViewport` element exists
- Fallback to `host` if viewport not found

### Anti-cheat blocking submissions?
- Check `minDistinctInputs` is set to 0
- Verify player spent at least 3 seconds playing
- Check console for validation failure reason

### POV not using new flow?
- Verify `runHumanMinigameWithGuards` is exposed globally
- Check `CompetitionFlow` module is loaded
- Fallback to legacy rendering should work if new system unavailable

## Browser Console Verification

Look for these console messages:

### Success Messages
```
[Competition] Using Phase 1 non-repeating pool system
[Minigame] Selected: <gameName>
[AntiCheat] Session started: ac-<id>-<timestamp> for game: <gameName>
[AntiCheat] Validation passed: {...}
[Competition] Submission received
```

### Expected Warnings (Non-Critical)
```
[Competition] Loading competition...
```

### Error Messages (Should Not Appear)
```
❌ [Competition] Anti-cheat validation failed: Too few distinct inputs
❌ [Competition] Submission blocked
```

## Automated Testing

Run the test suite:
```bash
npm run test:minigames
```

Expected output:
```
✓ VALIDATION PASSED
  All minigame keys are properly registered
✓ PASS: All selector pool keys resolve correctly
```

## Files to Review

1. `js/competitions.js` - Core competition logic with anti-cheat and TV targeting
2. `js/veto.js` - POV competition using new flow
3. `js/competitions-flow.js` - Competition flow module (instructions + fullscreen)
4. `js/anti-cheat.js` - Anti-cheat validation module

## Verification Checklist

- [ ] Instructions appear inside TV viewport (not below)
- [ ] Play button appears in instructions card
- [ ] Clicking Play launches fullscreen overlay
- [ ] Minigame renders correctly in fullscreen
- [ ] Close button (✕) appears in top-right
- [ ] Completing game closes overlay and submits score
- [ ] Low-input games not blocked by anti-cheat
- [ ] All competition phases use consistent flow
- [ ] No console errors during gameplay
- [ ] Tests pass: `npm run test:minigames`

## Success Criteria

✅ All competition phases (HOH, POV, Final 3 Parts 1-3) use the new flow
✅ Instructions appear inside TV viewport
✅ Anti-cheat allows low-input games (minDistinctInputs: 0)
✅ No regressions or breaking changes
✅ Backwards compatible with fallbacks
