# Social Mechanics Foundation Implementation

## Overview

This document describes the comprehensive energy, influence, and information mechanics implemented for the Social Maneuvers system in Big Brother Mobile.

## Energy System

### Configuration
- **Base Energy**: 5 (up from 3)
- **Max Energy**: 10 (up from 5)
- **Weekly Reset**: Yes, with bonuses/penalties applied

### Weekly Bonuses
Energy bonuses are accumulated throughout the week and applied at the next Social phase start:

| Event | Bonus |
|-------|-------|
| HOH Win | +5 |
| POV Win | +3 |
| Nominated | +4 |
| New Alliance Formed | +2 (per alliance) |
| Saved with POV | +2 |
| Survived Eviction | +1 |

### Weekly Penalties
Energy penalties are also accumulated and applied at the next Social phase start:

| Event | Penalty |
|-------|---------|
| Competition Skipped (DQ/no-show) | -3 |
| Not Drawn for Veto | -1 |
| Zero Score in HOH/POV | -2 |
| Broke Alliance | -3 |

### Energy Seeding Formula
```
Energy = clamp(Base + WeeklyBonus - WeeklyPenalty, 0, MaxEnergy)
Energy = clamp(5 + bonuses - penalties, 0, 10)
```

### In-Phase Energy Refunds
To maintain momentum without enabling farming:

| Action | Refund Chance | Limit |
|--------|---------------|-------|
| Compliment | 30% | Once per target per phase |
| Strategy Chat | 20% | Once per phase |
| Mediate | 100% (if conflict resolved) | Once per conflict per phase |

### Auto-Advance
When human player's energy reaches 0, the social phase automatically advances in ~3 seconds using the `scheduleFastAdvance()` function.

## Pairwise Influence System

### Tracking
- **Format**: I[A→B] represents A's influence over B
- **Range**: [0, 100]
- **Direction**: Directional (I[A→B] ≠ I[B→A])
- **Non-spendable**: Unlike energy, influence is not consumed

### Weekly Decay
If no positive interaction occurs from A→B during a week:
```
I[A→B]_new = I[A→B]_old × 0.75  // 25% decay
```

### Influence Deltas

#### Positive Actions
| Action | Delta |
|--------|-------|
| Strategy Chat Success | +6 |
| Confide Success | +10 |
| Protect with Veto | +8 |
| Give Gift/Compliment Success | +4 |

#### Negative Actions
| Action | Delta |
|--------|-------|
| Major Betrayal | -25 |
| Confront Fail | -8 |
| Serious Negative Context | -10 |

### Effect on Success Rates
Influence provides an uplift to action success chances:
```
Success Boost = I[A→B] × 0.0025
// Example: I[A→B] = 40 → +10% success boost
```

## Information System

### Configuration
- **Initial**: 0 points
- **Range**: [0, 100]
- **Weekly Carryover**: +5 base
- **Cap**: 100

### Information Earning

| Action | Points Earned |
|--------|---------------|
| Interrogate Success | +10 |
| Eavesdrop/Observe Success | +6 |
| Strategy Chat Reveal | +3 |
| Mediate Reveal | +4 |

### Information Spending
(Planned for future implementation)
- Reveal Intent/Alignment: 8 points
- Blackmail/Pressure: 8-15 points (requires intel flag)
- Success Boost: 5 points per +8% (cap +25%)

## Unified Success Calculation

### Formula
```javascript
chance = BaseChance 
       + AffinityAdjustment(±15%)
       + InfluenceUplift(I[A→B] × 0.0025)
       + InfoBoost
       - RiskPenalties

finalChance = clamp(chance, 0.05, 0.95)  // [5%, 95%]
```

### Components
1. **Base Chance**: Action-specific base probability
2. **Affinity**: Relationship modifier (±15%)
3. **Influence**: Pairwise influence uplift
4. **Info Boost**: Optional information spending bonus
5. **Risk Penalties**: Situational penalties

### Telemetry
All success calculations are logged to `game.__successCalcTelemetry` for debugging and balance analysis.

## Game Flow Integration

### Weekly Event Hooks

#### HOH Win (competitions.js)
```javascript
// After HOH is determined
if(global.SocialManeuvers?.SocialResources) {
  global.SocialManeuvers.SocialResources.recordWeeklyEvent(winner, 'hohWin', true);
}
```

#### POV Win (veto.js)
```javascript
// After POV is determined
if(global.SocialManeuvers?.SocialResources) {
  global.SocialManeuvers.SocialResources.recordWeeklyEvent(winner, 'povWin', true);
}
```

#### Nominations (nominations.js)
```javascript
// When players are nominated
g.nominees.forEach(id => {
  if(global.SocialManeuvers?.SocialResources) {
    global.SocialManeuvers.SocialResources.recordWeeklyEvent(id, 'nominated', true);
  }
});
```

#### Veto Saves (veto.js)
```javascript
// When veto is used to save someone
if(global.SocialManeuvers?.SocialResources) {
  global.SocialManeuvers.SocialResources.recordWeeklyEvent(savedId, 'savedWithPov', true);
}
```

#### Eviction Survival (eviction.js)
```javascript
// After eviction, track survivors
if(global.SocialManeuvers?.SocialResources) {
  const survivors = g.nominees.filter(id => id !== evId);
  survivors.forEach(survivorId => {
    global.SocialManeuvers.SocialResources.recordWeeklyEvent(survivorId, 'survivedEviction', true);
  });
}
```

## Action Integration

### processActionOutcome() Updates

The action outcome processor now:
1. Records positive interactions for influence decay tracking
2. Applies action-specific influence deltas
3. Awards information points based on action type
4. Handles in-phase energy refunds with probability checks

Example for Strategy Chat:
```javascript
if(action.id === 'strategize') {
  // Influence delta
  SocialResources.adjustInfluence(actorId, targetId, INFLUENCE_DELTAS.STRATEGY_CHAT_SUCCESS);
  
  // Information reveal (40% chance)
  if(Math.random() < 0.4) {
    SocialResources.earn(actorId, { information: INFORMATION_EARNINGS.STRATEGY_CHAT_REVEAL });
  }
  
  // Energy refund (20% chance, once per phase)
  if(SocialResources.canRefundEnergy(actorId, 'strategize-phase')) {
    if(Math.random() < ENERGY_REFUND_CHANCES.STRATEGY_CHAT) {
      SocialResources.earn(actorId, { energy: 1 });
      SocialResources.recordEnergyRefund(actorId, 'strategize-phase');
    }
  }
}
```

## Developer Tools

### Debug Helpers
All debug functions are available via `window.__smDebug`:

```javascript
// Energy management
__smDebug.grantEnergy(playerId, amount)     // Add energy
__smDebug.setEnergy(playerId, amount)        // Set energy directly

// Influence management
__smDebug.grantInfluence(actorId, targetId, amount)  // Add influence
__smDebug.setInfluence(actorId, targetId, amount)    // Set influence directly
__smDebug.getInfluence(actorId, targetId)            // Get specific influence
__smDebug.showAllInfluence()                          // Table of all influences

// Information management
__smDebug.grantInformation(playerId, amount)  // Add information
__smDebug.setInformation(playerId, amount)    // Set information directly

// Weekly events
__smDebug.recordWeeklyEvent(playerId, eventType, value)  // Manually record event

// Resource inspection
__smDebug.getResources(playerId)              // Get all resources
```

### Example Usage
```javascript
// Give player 1 max energy
__smDebug.setEnergy(1, 10);

// Set high influence from player 1 to player 2
__smDebug.setInfluence(1, 2, 80);

// Grant information points
__smDebug.grantInformation(1, 25);

// Simulate HOH win for next week
__smDebug.recordWeeklyEvent(1, 'hohWin', true);

// View all current influences
__smDebug.showAllInfluence();
```

## Testing

### Test Suite
Comprehensive test suite available at `test_social_mechanics_foundation.html`:

1. **Energy System Tests** - Base, max, capping, weekly deltas
2. **Influence Tests** - Pairwise tracking, directionality, decay
3. **Information Tests** - Earning, capping, carryover
4. **Weekly Delta Tests** - Bonuses and penalties calculation
5. **Refund Tests** - In-phase energy refund logic
6. **Success Calculation Tests** - Unified formula with influence
7. **Dev Helper Tests** - All debug functions

### Running Tests
1. Open `test_social_mechanics_foundation.html` in a browser
2. Click "Run Test X" buttons to execute individual tests
3. Use "Refresh Stats" to see current resource state
4. Check browser console for detailed logs

## Constants Reference

All constants are exported and accessible:

```javascript
// From SocialManeuvers
DEFAULT_ENERGY = 5
MAX_ENERGY = 10
RESOURCE_CONFIG = { energy: {...}, influence: {...}, information: {...} }
WEEKLY_ENERGY_BONUSES = { HOH_WIN: 5, POV_WIN: 3, ... }
WEEKLY_ENERGY_PENALTIES = { COMP_SKIPPED: -3, ... }
INFLUENCE_DELTAS = { STRATEGY_CHAT_SUCCESS: 6, ... }
INFORMATION_EARNINGS = { INTERROGATE_SUCCESS: 10, ... }
INFORMATION_COSTS = { REVEAL_INTENT: 8, ... }
```

## Telemetry

### Resource Telemetry
Stored in `game.__socialResourcesTelemetry` (last 100 operations):
- Timestamp
- Week and phase
- Player ID
- Resource type
- Operation (set, spend, earn, reset)
- Value
- Balance after operation

### Success Calculation Telemetry
Stored in `game.__successCalcTelemetry` (last 100 calculations):
- Timestamp
- Base chance
- Additive total
- Multiplicative total
- Influence bonus
- Info boost
- Final chance

## Future Enhancements

Planned features not yet implemented:
1. Information spending mechanics (Reveal, Blackmail, Boost)
2. Intel flags for blackmail/pressure actions
3. Diminishing returns for repeated attempts on same target
4. Alliance formation tracking
5. Alliance breaking detection
6. Competition skip tracking
7. Zero score detection

## Notes

- All changes are minimal and surgical
- Existing functionality preserved
- Full backward compatibility maintained
- Dev helpers only available in debug builds
- Telemetry capped at 100 entries to prevent memory issues
