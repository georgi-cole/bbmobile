# Quick Start Guide - SM Enhancements

## What Was Implemented

Three SM-only enhancements to the Social Energy Bank system:

1. **Week 1 Starter Bonus** - Grant +5 to all players at week 1
2. **HOH Participation Rules** - Penalties for skipping/last place, bonus for participating
3. **Veto Drawing Watcher** - -1 penalty for players not drawn to compete

## Testing the Enhancements

### Run Existing Tests (Regression Check)
```bash
npm run test:social
```
Expected: All 9 tests pass ✅

### Run New Enhancement Tests (Browser)
1. Open `test_sm_enhancements.html` in a browser
2. Click "Run All Tests"
3. Verify all 7 tests pass:
   - Week 1 starter bonus
   - HOH skip penalty
   - HOH last place penalty
   - HOH participation bonus
   - HOH phase exit fallback
   - Veto drawing watcher
   - notDrawnVeto penalty

### Manual Verification

#### Test Week 1 Starter
```javascript
// In browser console after loading social-maneuvers.js
window.game = { week: 0, humanId: 1, cfg: { enableSocialManeuvers: true } };
window.alivePlayers = () => [
  { id: 1, name: 'Player 1' },
  { id: 2, name: 'Player 2' }
];

// Initialize
window.SocialManeuvers.SocialResources.init(1);
window.SocialManeuvers.SocialResources.init(2);

// Check initial banks (should be 0)
console.log('P1 bank:', window.SocialManeuvers.SocialEnergyBank.get(1)); // 0
console.log('P2 bank:', window.SocialManeuvers.SocialEnergyBank.get(2)); // 0

// Trigger week 1
window.game.week = 1;

// Check banks after (should be 5)
console.log('P1 bank:', window.SocialManeuvers.SocialEnergyBank.get(1)); // 5
console.log('P2 bank:', window.SocialManeuvers.SocialEnergyBank.get(2)); // 5

// Verify idempotence
window.game.week = 1; // Set again
console.log('P1 bank:', window.SocialManeuvers.SocialEnergyBank.get(1)); // Still 5
```

#### Test HOH Participation
```javascript
// Setup
window.game.week = 2;
window.game.humanId = 1;
window.game.lastCompScores = new Map([[1, 45], [2, 50], [3, 40]]);

// Set initial bank
window.SocialManeuvers.SocialEnergyBank.set(1, 10);

// Trigger HOH winner (human participated and not last)
window.game.hohId = 2;

// Check human bank (should be 10 + 5 = 15)
console.log('Human bank:', window.SocialManeuvers.SocialEnergyBank.get(1)); // 15
```

#### Test HOH Skip
```javascript
// Setup
window.game.week = 3;
window.game.humanId = 1;
window.game.__sm_watcherApplied = new Map(); // Reset
window.game.lastCompScores = new Map([[2, 50], [3, 45]]); // Human not in scores

// Set initial bank
window.SocialManeuvers.SocialEnergyBank.set(1, 20);

// Trigger HOH winner (human skipped)
window.game.hohId = 2;

// Check human bank (should be 0)
console.log('Human bank:', window.SocialManeuvers.SocialEnergyBank.get(1)); // 0
```

#### Test Veto Drawing
```javascript
// Setup
window.game.week = 4;
window.game.__sm_watcherApplied = new Map(); // Reset
window.alivePlayers = () => [
  { id: 1, name: 'P1' },
  { id: 2, name: 'P2' },
  { id: 3, name: 'P3' },
  { id: 4, name: 'P4' }
];

// Set initial banks
[1, 2, 3, 4].forEach(id => {
  window.SocialManeuvers.SocialEnergyBank.set(id, 10);
});

// Draw players 1 and 2 for veto (exclude 3 and 4)
window.game.__vetoPlayers = [1, 2];

// Check banks (3 and 4 should have -1 penalty)
console.log('P1 bank:', window.SocialManeuvers.SocialEnergyBank.get(1)); // 10 (drawn)
console.log('P2 bank:', window.SocialManeuvers.SocialEnergyBank.get(2)); // 10 (drawn)
console.log('P3 bank:', window.SocialManeuvers.SocialEnergyBank.get(3)); // 9 (not drawn)
console.log('P4 bank:', window.SocialManeuvers.SocialEnergyBank.get(4)); // 9 (not drawn)
```

## Files to Review

1. **js/social-maneuvers.js** - Main implementation
   - Lines 2253-2310: Enhanced hohId watcher with participation rules
   - Lines 2439-2459: Week 1 starter bonus in week watcher
   - Lines 2465-2495: New __vetoPlayers watcher for notDrawnVeto
   - Lines 2053-2092: HOH phase exit fallback in setPhase wrapper

2. **test_sm_enhancements.html** - Test suite
   - All test scenarios with expected results

3. **SM_ENHANCEMENTS_IMPLEMENTATION.md** - Detailed documentation
   - Complete implementation details
   - Code snippets and explanations

## Key Features

### Idempotence
All enhancements are idempotent (can be triggered multiple times safely):
- Week 1 starter: `g.__sm_weekStarterApplied` flag
- HOH participation: `hoh-participation-${week}` event key
- notDrawnVeto: `notDrawnVeto-${playerId}` event key per player

### Logging
All enhancements log their actions:
- `[sm-week] starter +5 applied (week=1)`
- `[sm-penalty] hohSkipped → bank=0`
- `[sm-penalty] hohLast → bank=0`
- `[sm-event] hohParticipated +5`
- `[sm-event] notDrawnVeto -1 for player=`

### Integration
All enhancements integrate with existing systems:
- Uses existing `SocialEnergyBank` API
- Uses existing `SocialResources.recordWeeklyEvent()` API
- Uses existing property watcher infrastructure
- Uses existing idempotence Map (`g.__sm_watcherApplied`)

## Troubleshooting

### Tests Fail
1. Verify social-maneuvers.js is loaded: `console.log(window.SocialManeuvers)`
2. Check browser console for errors
3. Verify game object is initialized: `console.log(window.game)`

### Enhancements Don't Trigger
1. Check if Social Maneuvers is enabled: `console.log(window.USE_SOCIAL_MANEUVERS)`
2. Verify property watchers are installed: Check console for "[sm-watchers] ✓ Property watchers installed"
3. Check idempotence flags: `console.log(window.game.__sm_watcherApplied)`

### Banks Not Updating
1. Check if bank is initialized: `console.log(window.SocialManeuvers.SocialEnergyBank.get(playerId))`
2. Verify player is alive: `console.log(window.alivePlayers())`
3. Check console logs for enhancement triggers

## Next Steps

1. Review implementation in `js/social-maneuvers.js`
2. Run test suite in browser (`test_sm_enhancements.html`)
3. Read detailed documentation (`SM_ENHANCEMENTS_IMPLEMENTATION.md`)
4. Test in actual game scenarios

## Support

For questions or issues:
1. Check console logs for debug information
2. Review `SM_ENHANCEMENTS_IMPLEMENTATION.md` for detailed explanations
3. Use browser dev tools to inspect game state
