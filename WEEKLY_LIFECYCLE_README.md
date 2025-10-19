# Weekly Lifecycle Implementation - SM-only

## Overview
This document describes the weekly lifecycle implementation for the Social Maneuvers system, featuring unlimited energy carryover and configurable bonus/penalty values.

## Architecture

### Weekly Flow
```
Week N Social Phase End
  ↓
finalizeWeekForAll() - Compute next week seeds
  ↓
Store in g.__sm_nextWeekSeedEnergy Map
  ↓
Week N+1 Social Phase Start
  ↓
resetWeekly() - Apply precomputed seeds
  ↓
Players start with: Base + Bonuses - Penalties + Carryover (clamped to 0-10)
```

## Key Components

### 1. `finalizeWeekForAll()`
**Location:** `SocialResources.finalizeWeekForAll()`

**Purpose:** Called at the end of each social phase to compute next week's energy seeds.

**Algorithm:**
```javascript
for each alive player:
  carryoverLeftover = current energy (unlimited)
  bonuses = sum of weekly event bonuses
  penalties = sum of weekly event penalties
  nextSeed = clamp(Base + bonuses - penalties + carryoverLeftover, 0, MAX_ENERGY)
  store in g.__sm_nextWeekSeedEnergy[playerId]
```

**Called by:** `onSocialPhaseEnd()` automatically

### 2. `resetWeekly()` (Updated)
**Location:** `SocialResources.resetWeekly(playerId)`

**Purpose:** Reset weekly resources at phase start, consuming precomputed seeds.

**Logic:**
1. Check for precomputed seed in `g.__sm_nextWeekSeedEnergy`
2. If exists: Use seed, delete from map
3. If not exists: Fall back to legacy calculation (backwards compatibility)

### 3. `getPreviewEnergy()` (Updated)
**Location:** `SocialResources.getPreviewEnergy(playerId)`

**Purpose:** Calculate preview of next week's energy for UI display.

**Formula:** `Base + Bonuses - Penalties + CurrentEnergy (carryover)`

**Usage:** Battery tooltip, HUD displays

### 4. `getPreviewEnergyBreakdown()` (Updated)
**Location:** `SocialResources.getPreviewEnergyBreakdown(playerId)`

**Purpose:** Detailed breakdown for tooltip display.

**Returns:**
```javascript
{
  base: DEFAULT_ENERGY,
  bonuses: [...],
  penalties: [...],
  bonusTotal: number,
  penaltyTotal: number,
  carryover: currentEnergy,  // NEW: Carryover included
  total: clamped result
}
```

## Configurable Constants

### Weekly Energy Bonuses
```javascript
WEEKLY_ENERGY_BONUSES = {
  HOH_WIN: 5,             // Won Head of Household competition
  POV_WIN: 3,             // Won Power of Veto competition
  NOMINATED: 4,           // Was nominated for eviction (adversity bonus)
  NEW_ALLIANCE: 2,        // Per alliance formed (can stack)
  SAVED_WITH_POV: 2,      // Was saved from eviction using POV
  SURVIVED_EVICTION: 1    // Survived being on the block
}
```

### Weekly Energy Penalties
```javascript
WEEKLY_ENERGY_PENALTIES = {
  COMP_SKIPPED: -3,       // Skipped a competition
  NOT_DRAWN_VETO: -1,     // Not drawn to compete in veto
  ZERO_SCORE: -2,         // Scored zero in a competition
  BROKE_ALLIANCE: -3      // Broke an alliance (trust damage)
}
```

**Access:** `window.SocialManeuvers.WEEKLY_ENERGY_BONUSES` and `window.SocialManeuvers.WEEKLY_ENERGY_PENALTIES`

## Unlimited Carryover

### Design Decision
- **No cap on carryover amount** - all leftover energy carries forward
- Final seed is clamped to [0, MAX_ENERGY] (0-10)
- This allows strategic energy conservation across weeks

### Example
```
Week 1:
  - Player starts with 5 energy
  - Uses 2 energy
  - Leftover: 3 energy

Week 2 Seed:
  - Base: 5
  - Bonuses: 5 (HOH win)
  - Penalties: 0
  - Carryover: 3
  - Total: 5 + 5 - 0 + 3 = 13
  - Clamped: 10 (max)

Week 2:
  - Player starts with 10 energy (capped at max)
```

## Battery Tooltip Behavior

### Display Strategy
The carryover is **integrated into the preview total**, not shown as a separate line.

**Before (Not Used):**
```
Base: 5
HOH Win: +5
Nominated: +4
Carry from last week: +3  ← NOT SHOWN
─────────────────
Total: 17 → 10 (capped)
```

**After (Implemented):**
```
Base: 5
HOH Win: +5
Nominated: +4
─────────────────
Total: 17 → 10 (capped)
```

The carryover (3) is included in the total calculation but not listed separately, as per requirements.

## State Storage

### `g.__sm_nextWeekSeedEnergy`
- **Type:** `Map<playerId, number>`
- **Lifecycle:** Created at phase end, consumed at next phase start
- **Purpose:** Store precomputed energy seeds
- **Cleanup:** Cleared after consumption by `resetWeekly()`

## Backwards Compatibility

### Fallback Path
If `g.__sm_nextWeekSeedEnergy` doesn't have a seed for a player:
- Legacy calculation is used: `Base + Bonuses + Penalties` (no carryover)
- This ensures the system works even if finalization didn't run

### Migration
No migration needed - system works with existing saves:
1. Old saves won't have `g.__sm_nextWeekSeedEnergy`
2. First reset will use legacy calculation
3. From second week onwards, finalization creates seeds

## Testing

### Test File
`test_weekly_lifecycle.html` - Comprehensive test suite

### Test Coverage
- ✅ Module loading and exports
- ✅ Configurable constants
- ✅ Player initialization
- ✅ Energy and event tracking
- ✅ Preview calculations with carryover
- ✅ Week finalization and seed storage
- ✅ Seed consumption and cleanup
- ✅ Fallback path (legacy mode)
- ✅ Unlimited carryover with high values

### Running Tests
1. Start HTTP server: `python3 -m http.server 8080`
2. Open: `http://localhost:8080/test_weekly_lifecycle.html`
3. Tests auto-run and display results

## API Reference

### New Methods
```javascript
// Finalize week for all alive players
SocialResources.finalizeWeekForAll()
```

### Updated Methods
```javascript
// Reset weekly resources (now consumes precomputed seeds)
SocialResources.resetWeekly(playerId)

// Get preview energy (now includes carryover)
SocialResources.getPreviewEnergy(playerId)

// Get preview breakdown (now includes carryover field)
SocialResources.getPreviewEnergyBreakdown(playerId)
```

### Exported Constants
```javascript
window.SocialManeuvers.WEEKLY_ENERGY_BONUSES
window.SocialManeuvers.WEEKLY_ENERGY_PENALTIES
```

## Developer Notes

### Tuning the System
To adjust bonus/penalty values, edit the constants at the top of `js/social-maneuvers.js`:

```javascript
const WEEKLY_ENERGY_BONUSES = {
  HOH_WIN: 5,  // Change this value to adjust HOH bonus
  // ... etc
};
```

### Debugging
```javascript
// Check stored seeds
console.log(game.__sm_nextWeekSeedEnergy);

// Get preview for player
const preview = SocialManeuvers.SocialResources.getPreviewEnergy(playerId);

// Get detailed breakdown
const breakdown = SocialManeuvers.SocialResources.getPreviewEnergyBreakdown(playerId);
console.log(breakdown.carryover); // Current leftover energy
```

## Known Limitations
None - implementation is complete and tested.

## Future Enhancements
Potential areas for expansion (not in current scope):
- Dynamic bonus/penalty values based on game difficulty
- Player-specific carryover modifiers (traits)
- Weekly energy caps configurable per season
