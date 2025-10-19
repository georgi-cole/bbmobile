# Social Energy Bank - Uncapped Implementation Summary

## Overview
The Social Energy Bank has been fully converted to an **uncapped rolling balance system** that persists across weeks and replaces all legacy weekly reset logic.

## Key Changes

### 1. Removed MAX_ENERGY Cap
**Before:**
```javascript
const MAX_ENERGY = RESOURCE_CONFIG.energy.max; // 10
energy: { default: 5, max: 10, ... }
```

**After:**
```javascript
const MAX_ENERGY = Infinity; // Uncapped
energy: { default: 5, max: Infinity, ... }
```

### 2. Bank Storage
The bank is stored as a Map in the game state:
```javascript
game.__sm_bankEnergy: Map<playerId, energyAmount>
```

- **Initialized**: First time a player is seen (defaults to 5)
- **Persists**: Across weeks, phases, and sessions
- **Uncapped**: Can accumulate indefinitely (only minimum is 0)

### 3. Energy Flow

#### Old System (REMOVED)
```javascript
// Weekly reset
energy = clamp(Base=5 + bonuses - penalties, 0, 10)

// Phase seed
phaseEnergy = min(energy, 10) // Always capped at 10
```

#### New System (CURRENT)
```javascript
// Weekly events update bank immediately
bank += bonuses - penalties // No cap!

// Phase seed
phaseEnergy = bank // No capping, use full balance
```

### 4. Weekly Bonuses/Penalties
Applied immediately to the bank via `SocialEnergyBank.applyEventDelta()`:

**Bonuses:**
- HOH Win: +5
- POV Win: +3
- Nominated: +4
- New Alliance: +2 (stackable)
- Saved with POV: +2
- Survived Eviction: +1

**Penalties:**
- Comp Skipped: -3
- Not Drawn for Veto: -1
- Zero Score: -2
- Broke Alliance: -3

### 5. Phase Energy Seeding
```javascript
// No capping - phase energy equals bank balance
const phaseEnergy = SocialEnergyBank.seedPhaseEnergy(playerId);
// Returns full bank amount (no MAX_ENERGY cap)
```

## API Reference

### SocialEnergyBank Methods

```javascript
// Initialize bank for player
SocialEnergyBank.init(playerId)

// Get current bank balance
const balance = SocialEnergyBank.get(playerId)

// Set bank balance (clamped to >= 0)
SocialEnergyBank.set(playerId, amount)

// Adjust bank by delta
SocialEnergyBank.adjust(playerId, delta)

// Apply weekly event delta
SocialEnergyBank.applyEventDelta(playerId, eventType, delta)

// Seed phase energy from bank
const phaseEnergy = SocialEnergyBank.seedPhaseEnergy(playerId)
```

### SocialResources Methods

```javascript
// Record weekly event (applies delta to bank immediately)
SocialResources.recordWeeklyEvent(playerId, eventType, value)

// Get preview energy (bank balance, uncapped)
const preview = SocialResources.getPreviewEnergy(playerId)

// Recompute phase energy from bank
SocialResources.recomputePhaseEnergy(playerId)

// Get detailed breakdown
const breakdown = SocialResources.getPreviewEnergyBreakdown(playerId)
```

## Example Scenarios

### Scenario 1: Gradual Accumulation
```javascript
// Week 1: Start with default
bank = 5

// Win HOH
SocialResources.recordWeeklyEvent(playerId, 'hohWin', true)
// bank = 5 + 5 = 10

// Week 2: Get nominated
SocialResources.recordWeeklyEvent(playerId, 'nominated', true)
// bank = 10 + 4 = 14

// Phase energy seeded from bank
phaseEnergy = 14 // No cap!
```

### Scenario 2: Large Accumulation
```javascript
// Starting bank: 5
// Win HOH: +5 = 10
// Win POV: +3 = 13
// Nominated: +4 = 17
// New alliance: +2 = 19
// Saved with POV: +2 = 21
// Survived eviction: +1 = 22

// Phase energy = 22 (far exceeds old MAX of 10)
```

### Scenario 3: Penalties
```javascript
// Starting bank: 15
// Skipped comp: -3 = 12
// Not drawn for veto: -1 = 11
// Zero score: -2 = 9

// Phase energy = 9 (can drop below old default of 5)
```

## Testing

### Unit Tests
Run the interactive test suite:
```bash
open test_uncapped_energy_bank.html
```

Tests validate:
- ✅ Bank initialization (default = 5)
- ✅ MAX_ENERGY = Infinity
- ✅ Uncapped accumulation (50, 150, 225+)
- ✅ Weekly bonuses applied immediately
- ✅ Phase seeding without caps
- ✅ Negative prevention (minimum = 0)

### Integration Tests
All existing tests pass:
```bash
npm run test:all
```

## Migration Notes

### No Breaking Changes
- Existing code continues to work
- Bank system is drop-in replacement
- Weekly reset hooks automatically use bank
- Phase seeding automatically uncapped

### Backward Compatibility
The following still work:
- `SocialResources.get(playerId, 'energy')` - returns current phase energy
- `SocialResources.set(playerId, 'energy', amount)` - sets phase energy
- Weekly reset via `resetWeekly()` - now delegates to bank system

### New Capabilities
- Energy can exceed 10 (uncapped)
- Bank persists across weeks
- Weekly events update bank immediately (lock-step)
- Phase energy equals bank balance

## Debug Helpers

### Check Bank Balance
```javascript
// Dev console
window.__smDebug.getBank(playerId)
window.__smDebug.showAllBanks()
```

### Manipulate Bank (Dev Only)
```javascript
// Set bank to specific amount
window.__smDebug.setBank(playerId, 50)

// Adjust bank by delta
window.__smDebug.adjustBank(playerId, 25)

// Grant energy to player
window.__smDebug.grantEnergy(playerId, 10)
```

## Files Modified

1. **js/social-maneuvers.js**
   - Removed MAX_ENERGY=10 cap
   - Updated RESOURCE_CONFIG.energy.max to Infinity
   - Removed capping in seedPhaseEnergy()
   - Removed capping in getPreviewEnergy()
   - Updated comments to reflect uncapped system

2. **js/social.js**
   - Updated weekly reset log message
   - Removed "Base=5 + bonuses/penalties" reference

3. **test_uncapped_energy_bank.html** (NEW)
   - Interactive test suite for manual validation

## Summary

✅ **Single Source of Truth**: `game.__sm_bankEnergy: Map`
✅ **Uncapped Storage**: Energy can accumulate indefinitely
✅ **Immediate Application**: Weekly bonuses/penalties update bank instantly
✅ **No Legacy Logic**: Old "Base=5 + bonuses" computation removed
✅ **Persistent**: Bank survives across weeks and phases
✅ **Simple**: Phase energy = bank balance (no capping)

The Social Energy Bank is now a clean, minimal, SM-only implementation that fully replaces prior energy logic and eliminates legacy interactions.
