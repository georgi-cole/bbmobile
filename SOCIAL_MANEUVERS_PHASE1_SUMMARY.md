# Social Maneuvers Phase 1 Implementation Summary

## Overview
Clean, surgical implementation of two improvements to the Social Maneuvers module without touching legacy files.

## Implementation Details

### Phase 1: Event-driven Energy Preview and Seeding ✅

**New Methods Added to `SocialResources`:**

1. **`getPreviewEnergy(playerId)`**
   - Returns predicted energy for next social phase based on current weekly events
   - Formula: `Math.max(0, Math.min(MAX_ENERGY, DEFAULT_ENERGY + bonuses + penalties))`
   - Bonuses: HOH Win (+5), POV Win (+3), Nominated (+4), New Alliance (+2), Saved with POV (+2), Survived Eviction (+1)
   - Penalties: Comp Skipped (-3), Not Drawn Veto (-1), Zero Score (-2), Broke Alliance (-3)

2. **`getPreviewEnergyBreakdown(playerId)`**
   - Returns detailed breakdown object with:
     - `base`: Base energy (5⚡)
     - `bonuses`: Array of {reason, amount}
     - `penalties`: Array of {reason, amount}
     - `bonusTotal`: Sum of all bonuses
     - `penaltyTotal`: Sum of all penalties
     - `total`: Final clamped energy [0, 10]

3. **`recomputePhaseEnergy(playerId)`**
   - Computes and sets energy based on weekly events
   - Called during phase seeding to set initial energy
   - Returns the computed energy value

4. **`recordWeeklyEvent(playerId, eventType, value)` [Enhanced]**
   - Now dispatches `social-battery-preview` CustomEvent after recording
   - Event detail: `{ playerId, preview, breakdown }`
   - Allows HUDs/UI to update preview displays live

**New Function:**

5. **`seedPhaseResources(playerId)`**
   - Wrapper function called at phase entry
   - Initializes resources if needed
   - Calls `recomputePhaseEnergy()` to set energy from weekly events
   - Dispatches `social-resources-changed` event for HUD updates
   - Logs: `[social-maneuvers] ✓ Phase resources seeded for player X: energy=Y`

**Integration:**

- Modified `onSocialPhaseStart()` to call `seedPhaseResources(humanId)` for human player
- Human player gets energy seeded from weekly events
- Non-human players get standard weekly reset (base 5⚡)
- Emits events for live UI updates

### Phase 2: Group Actions Extra Cost ✅

**Modified `executeAction()` function:**

1. **Cost Calculation:**
   ```javascript
   const baseCost = action.costs?.energy || action.cost || 0;
   const extraTargetsCount = Math.max(0, allTargets.length - 2);
   const effectiveCost = baseCost + extraTargetsCount;
   ```

2. **Pre-check Energy:**
   - Before spending anything, check if `currentEnergy >= effectiveCost`
   - If insufficient, return early with:
     ```javascript
     { 
       success: false, 
       reason: 'insufficient_energy',
       message: 'Not enough energy: need XY⚡ for N targets...'
     }
     ```

3. **Spend Extra Energy:**
   - First, spend base costs (energy, influence, information)
   - Then, spend extra energy: `SocialResources.spend(actorId, { energy: extraTargetsCount })`
   - Logs: `[social-maneuvers] ✓ Extra energy spent: X⚡ for Y additional targets`

4. **Enhanced Telemetry:**
   - Added to telemetry object:
     - `targetCount`: Total number of targets
     - `baseCost`: Base energy cost
     - `extraCost`: Extra cost for additional targets
     - `effectiveCost`: Total cost charged

**Modified `updateExecuteButton()` in `socialize-mobile.js`:**

1. **Dynamic Cost Display:**
   - Computes effective cost: `baseCost + Math.max(0, selectedPlayers.length - 2)`
   - Shows breakdown for group actions: `"Execute Action: ⚡3 (base 2 + group 1)"`
   - Shows simple cost for single/dual targets: `"Execute Action: ⚡2"`

2. **Insufficient Energy Feedback:**
   - With group cost: `"Need 5⚡ (base 2 + group 3), have 3⚡"`
   - Without group cost: `"Need 2⚡, have 1⚡"`

3. **Tooltip:**
   - For group actions: Shows cost breakdown
     ```
     Base cost: 2⚡
     +3⚡ for 3 extra targets (after 2nd)
     Total: 5⚡
     ```
   - For simple actions: `"Energy cost: 2⚡"`

## Testing

### Interactive Test Page
**File:** `test_social_maneuvers_phase1.html`

**Test Sections:**

1. **Phase 1: Energy Preview Tests**
   - Buttons to record weekly events (HOH Win, POV Win, Nominated, etc.)
   - Live preview display showing breakdown
   - Event log capturing preview event dispatches

2. **Phase 2: Group Cost Calculator**
   - Input fields for base cost and target count
   - Live calculation of effective cost
   - Examples for 1, 2, 3, and 5 targets

3. **Integration Tests**
   - Simulate Phase Entry: Tests energy seeding from weekly events
   - Test Insufficient Energy: Validates pre-check blocks execution
   - Test Group Action Execution: Validates extra energy spending

### Test Results

**✅ Energy Preview:**
- Recording HOH Win → Preview shows 10⚡ (base 5 + bonus 5)
- Recording Nominated → Preview shows 10⚡ (base 5 + HOH 5 + Nominated 4, capped at 10)
- Events dispatched correctly with breakdown details

**✅ Phase Entry Seeding:**
- Phase entry with recorded events → Energy seeded at 10⚡ (not base 5)
- Console shows: `Phase energy recomputed for player 1: 10`
- Resources changed event dispatched for HUD updates

**✅ Group Cost Examples:**
- 1 target: base 2 + max(0, 1-2) = **2⚡**
- 2 targets: base 2 + max(0, 2-2) = **2⚡**
- 3 targets: base 2 + max(0, 3-2) = **3⚡** (base 2 + group 1)
- 5 targets: base 2 + max(0, 5-2) = **5⚡** (base 2 + group 3)

**✅ UI Cost Label:**
- Updates dynamically as target selection changes
- Shows breakdown for clarity: `"⚡3 (base 2 + group 1)"`
- Tooltip provides full cost breakdown

## Code Changes Summary

### `js/social-maneuvers.js` (+185 lines)
- Added preview methods: `getPreviewEnergy()`, `getPreviewEnergyBreakdown()`, `recomputePhaseEnergy()`
- Enhanced `recordWeeklyEvent()` to dispatch preview events
- Added `seedPhaseResources()` wrapper function
- Modified `executeAction()` for group cost enforcement
- Added pre-check, extra spending, enhanced telemetry

### `js/socialize-mobile.js` (+31 lines)
- Modified `updateExecuteButton()` to compute effective cost
- Added dynamic cost display with breakdown
- Added tooltip with cost calculation details

### `test_social_maneuvers_phase1.html` (new file, +434 lines)
- Interactive test page for all Phase 1 functionality
- Live preview displays
- Cost calculator
- Integration test buttons

## Console Logs for Debugging

**Energy Preview & Seeding:**
- `[social-resources] 📡 Dispatched social-battery-preview event: {playerId, preview, breakdown}`
- `[social-resources] 🔄 Phase energy recomputed for player X: Y`
- `[social-maneuvers] ✓ Phase resources seeded for player X: energy=Y`

**Group Action Cost:**
- `[social-maneuvers] 💰 Group action cost: base=X + extras=Y = Z (N targets)`
- `[social-maneuvers] ⚠️ Insufficient energy for group action: need X, have Y`
- `[social-maneuvers] ✓ Extra energy spent: X⚡ for Y additional targets`

## API Examples

### Recording Events with Preview
```javascript
// Record event
window.SocialManeuvers.SocialResources.recordWeeklyEvent(1, 'hohWin', true);

// Listen for preview
window.addEventListener('social-battery-preview', (event) => {
  const { playerId, preview, breakdown } = event.detail;
  console.log(`Player ${playerId} will start next phase with ${preview}⚡`);
  console.log('Bonuses:', breakdown.bonuses);
  console.log('Penalties:', breakdown.penalties);
});
```

### Getting Preview Manually
```javascript
const preview = window.SocialManeuvers.SocialResources.getPreviewEnergy(1);
const breakdown = window.SocialManeuvers.SocialResources.getPreviewEnergyBreakdown(1);

console.log('Preview:', preview); // 10
console.log('Base:', breakdown.base); // 5
console.log('Bonuses:', breakdown.bonuses); // [{reason: 'HOH Win', amount: 5}, ...]
console.log('Total:', breakdown.total); // 10
```

### Executing Group Actions
```javascript
// Execute with 4 targets (base 2 + 2 extra = 4⚡ total)
const result = window.SocialManeuvers.executeAction(
  1,           // actorId
  2,           // primaryTargetId
  'strategize', // actionId (base cost 2⚡)
  [3, 4]       // extraTargetIds (2 more targets)
);

if (!result.success && result.reason === 'insufficient_energy') {
  console.log('Not enough energy:', result.message);
  // "Not enough energy: need 4⚡ for 3 targets (base 2 + 2 extra), have 3⚡"
}
```

## Constraints Met ✅

1. **No Legacy Module Changes**
   - Did NOT modify: social.js, competitions.js, nominations.js, veto.js
   - All changes confined to: social-maneuvers.js, socialize-mobile.js

2. **Minimal Surgical Changes**
   - social-maneuvers.js: +185 lines (methods added, one function wrapped)
   - socialize-mobile.js: +31 lines (one function modified)

3. **Event-driven Architecture**
   - Dispatches CustomEvents for preview and resource changes
   - Non-invasive to existing flow
   - Optional listeners can subscribe to events

4. **Well-guarded & Logged**
   - console.info at key events (preview, seeding, cost enforcement)
   - Emojis for quick visual scanning (🔄, 💰, 📡, ⚡, ⚠️, ✓)
   - Telemetry tracking for all operations

## Future Enhancements (Out of Scope)

- Wire up legacy flow to call `recordWeeklyEvent()` automatically
- Add UI preview display in main game HUD
- Add cost preview before action confirmation
- Wire up global event listeners for standard engine events

## Validation Checklist

- [x] `getPreviewEnergy()` returns correct energy based on weekly events
- [x] `getPreviewEnergyBreakdown()` returns detailed breakdown
- [x] `recordWeeklyEvent()` dispatches `social-battery-preview` event
- [x] `recomputePhaseEnergy()` sets energy from weekly events
- [x] `seedPhaseResources()` calls recompute and emits events
- [x] `onSocialPhaseStart()` seeds human player energy from events
- [x] `executeAction()` computes effective cost for group actions
- [x] `executeAction()` pre-checks energy before execution
- [x] `executeAction()` spends extra energy after base execution
- [x] `executeAction()` blocks with message if insufficient energy
- [x] `updateExecuteButton()` shows dynamic cost with breakdown
- [x] Button tooltip shows cost calculation details
- [x] Console logs at key events for debugging
- [x] No modifications to legacy modules
- [x] Test page validates all functionality

## Conclusion

Phase 1 implementation is complete with:
- ✅ Event-driven energy preview and seeding
- ✅ Group action extra cost enforcement (+1⚡ per target after 2nd)
- ✅ Dynamic UI cost labels with breakdowns
- ✅ Comprehensive test page
- ✅ Clean, surgical changes only to SM module
- ✅ No legacy module modifications

All deliverables met. System is ready for integration.
