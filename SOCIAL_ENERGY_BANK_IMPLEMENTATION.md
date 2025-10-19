# Social Energy Bank Implementation Summary

## Overview

This implementation replaces the capped weekly refill energy system with an uncapped **Social Energy Bank** that persists across weeks and receives immediate event deltas.

## Key Changes

### 1. Social Energy Bank Storage (`game.__sm_bankEnergy`)

**Location**: `js/social-maneuvers.js` lines 37-98

A new `SocialEnergyBank` object manages uncapped rolling energy balance:

```javascript
const SocialEnergyBank = {
  init(playerId)      // Initialize bank with DEFAULT_ENERGY
  get(playerId)       // Get current bank balance (uncapped)
  set(playerId, amt)  // Set bank balance (uncapped, min 0)
  adjust(playerId, Δ) // Adjust bank by delta
  applyEventDelta(playerId, eventType, Δ) // Apply event delta immediately
  seedPhaseEnergy(playerId) // Seed phase energy from bank (capped at MAX_ENERGY)
}
```

**Key Features**:
- ✅ Uncapped storage - bank can accumulate indefinitely
- ✅ Persists across weeks
- ✅ Separate from phase energy (which is capped at MAX_ENERGY = 10)

### 2. Immediate Event Delta Application

**Location**: `recordWeeklyEvent()` in `SocialResources` (lines 509-569)

Weekly event deltas are now applied **immediately** to the bank when recorded:

```javascript
// Before: Events recorded, computed later
recordWeeklyEvent(playerId, 'hohWin', true);
// ... delta applied at next phase start

// After: Events apply delta immediately to bank
recordWeeklyEvent(playerId, 'hohWin', true);
// Bank += 5 immediately
```

**Supported Events & Deltas**:

Bonuses:
- `hohWin`: +5
- `povWin`: +3  
- `nominated`: +4
- `newAlliance`: +2 (stackable)
- `savedWithPov`: +2
- `survivedEviction`: +1

Penalties:
- `compSkipped`: -3
- `notDrawnVeto`: -1
- `zeroScore`: -2
- `brokeAlliance`: -3

### 3. Phase Seeding from Bank

**Location**: `recomputePhaseEnergy()` and `getPreviewEnergy()` (lines 653-658, 574-579)

At social phase start, energy is seeded from the bank:

```javascript
// Bank balance: 15 (uncapped)
const phaseEnergy = SocialEnergyBank.seedPhaseEnergy(playerId);
// phaseEnergy = 10 (capped at MAX_ENERGY for phase)
```

The bank balance is preserved, but phase energy is capped for gameplay balance.

### 4. Lock-Step Updates

**Location**: `spend()` and `earn()` methods (lines 268-304, 305-336)

When energy is spent or refunded during a phase, **both** current energy AND the bank are updated:

```javascript
// Spend 3 energy
SocialResources.spend(playerId, { energy: 3 });
// Current energy: 10 → 7
// Bank: 15 → 12 (lock-step)

// Earn 2 energy (refund)
SocialResources.earn(playerId, { energy: 2 });
// Current energy: 7 → 9
// Bank: 12 → 14 (lock-step)
```

This ensures the bank always reflects the actual energy state.

### 5. Competition Skip Watcher

**Location**: `installCompetitionSkipWatcher()` (lines 2104-2178)

A new SM-only phase watcher tracks competition participation:

```javascript
// Auto-installed on module load
installCompetitionSkipWatcher();

// Tracks players entering HOH/POV phases
// Marks as skipped if no score recorded
// Applies -3 penalty to bank immediately
```

**Integration Point**:
```javascript
// In competition scoring code (no legacy file edits needed):
SocialManeuvers.recordCompetitionParticipation(playerId);
```

### 6. Simplified Weekly Functions

**Changes**:
- `resetWeekly()`: No longer computes energy deltas - just resets event trackers
- `finalizeWeekForAll()`: Simplified - bank already has all deltas
- Removed `__sm_nextWeekSeedEnergy` map (no longer needed)

## Benefits

1. **Uncapped Accumulation**: Players can bank energy indefinitely
2. **Immediate Feedback**: Event deltas visible instantly, not at next phase
3. **Carryover Fixed**: All leftover energy carries to next week automatically
4. **Skip Penalties**: Enforced via SM-only watcher, no legacy edits needed
5. **Cleaner Architecture**: Bank is single source of truth

## Testing

Run the test suite:
```bash
# Open in browser
open test_social_energy_bank.html

# Or use the test functions directly in console:
SocialManeuvers.SocialEnergyBank.get(playerId)
SocialManeuvers.SocialResources.recordWeeklyEvent(playerId, 'hohWin', true)
window.__smDebug.showAllBanks()
```

## Debug Commands

New debug helpers added to `window.__smDebug`:

```javascript
__smDebug.getBank(playerId)          // Get bank balance
__smDebug.setBank(playerId, amount)  // Set bank balance
__smDebug.adjustBank(playerId, delta)// Adjust bank by delta
__smDebug.showAllBanks()             // Show all player banks
```

## Migration Notes

**Backwards Compatible**: Existing games will initialize banks with DEFAULT_ENERGY on first access.

**No Breaking Changes**: All existing Social Maneuvers functionality preserved.

**No Legacy Edits**: Competition skip detection is SM-only via phase watcher.

## Files Modified

- `js/social-maneuvers.js` (core implementation)
- `test_social_energy_bank.html` (new test file)

## Files NOT Modified (per requirements)

- ❌ `js/social.js` (legacy)
- ❌ `js/competitions.js` (legacy)
- ❌ `js/nominations.js` (legacy)
- ❌ `js/veto.js` (legacy)

## Example Flow

```
Week 1:
  Start: Bank = 5 (default)
  HOH win: Bank = 5 + 5 = 10 (immediate)
  POV win: Bank = 10 + 3 = 13 (immediate)
  Social phase starts: Phase energy = 10 (capped from bank 13)
  Spend 7 energy in phase: Bank = 13 - 7 = 6 (lock-step)
  Week ends: Bank = 6 (carried over)

Week 2:
  Start: Bank = 6 (from previous week)
  Comp skipped: Bank = 6 - 3 = 3 (immediate penalty)
  Social phase starts: Phase energy = 3 (from bank)
  Spend 2 energy: Bank = 3 - 2 = 1 (lock-step)
  Week ends: Bank = 1 (carried over)
```

## Performance

- **Memory**: `Map<playerId, number>` - minimal overhead
- **CPU**: O(1) lookups, same as previous system
- **Events**: Immediate application is more efficient than batch computation

## Future Enhancements

Potential future additions (not in scope):
- Bank cap configuration (currently uncapped)
- Bank interest/decay mechanics
- Bank sharing/trading between players
- Bank visualization in UI

---

**Implementation Date**: 2025-10-19  
**PR Branch**: `copilot/implement-sm-only-social-energy-bank`  
**Test Coverage**: 7 automated tests
