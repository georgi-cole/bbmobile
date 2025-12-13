# Juror Return Twist - Eligibility Logic

## Overview
The juror return twist now includes comprehensive eligibility checks to ensure it only runs under specific conditions and cannot run more than once per season.

## Eligibility Conditions

The twist will only activate if **ALL** of the following conditions are met:

### 1. Alive Players Threshold
- **Requirement**: Alive player count must fall within the configured range
- **Configuration keys**: 
  - `jurorReturnAliveMin` (default: 6) - Minimum alive players
  - `jurorReturnAliveMax` (default: 6) - Maximum alive players
- **Reason**: Ensures the game has enough players to make the twist meaningful
- **Adjustable**: Easy to change to different ranges (e.g., 5-8 players)

### 2. Juror Count Threshold
- **Requirement**: At least a minimum number of jurors in jury house
- **Configuration key**: `jurorReturnMinJurors` (default: 2)
- **Reason**: Ensures there are enough candidates for the return vote
- **Adjustable**: Can be set to any value (e.g., 3, 4, or 5 jurors)

### 3. Twist Has Not Run
- **Flags checked**: Both `__jurorReturnDone` and `__americaReturnDone`
- **Behavior**: If either flag is set, the twist cannot run again this season
- **Set when**: Both flags are set immediately when the twist activates (not when it completes)

### 4. Probability Check
- **Configuration**: Uses `returnChance` config value (also checks `juryReturnChance`, `jurorReturnChance`, `pJuryReturn` as fallbacks)
- **Format support**: 
  - Values 0..1 (e.g., 0.10 = 10%)
  - Values 0..100 (e.g., 10 = 10%)
  - Auto-normalized based on value magnitude
- **Behavior**: Each week that meets eligibility conditions, a random roll determines if twist activates

## Implementation Locations

The eligibility logic is implemented in two locations to provide defense-in-depth:

1. **`js/twists.js`** - `startAmericaReturnVote()`
   - Primary entry point called during week flow
   - Lines 46-91

2. **`js/jury_return_vote.js`** - `runJurorReturnTwist()`
   - Secondary entry point for direct phase triggers
   - Lines 60-93

Both implementations use identical logic to ensure consistency.

## Test Scenarios

### ✅ Should NOT Run
1. Starting with 6 players, 2 self-evict → 4 alive (fails alive < 5)
2. Starting with 12 players, only 3 jurors (fails juror count < 5 for large season)
3. Starting with 10 players, only 3 jurors (fails juror count < 4 for small season)

### ✅ Should Run (if probability succeeds)
1. Starting with 10 players, 4 jurors, 5 alive (meets all conditions for small season)
2. Starting with 12 players, 5 jurors, 6 alive (meets all conditions for large season)
3. Starting with 8 players, 4 jurors, 5 alive (meets all conditions for small season)

## Season Flag Management

**Important**: Both flags are set **when the twist activates**, not when it completes. This prevents:
- Multiple activation attempts in the same week
- Re-activation if the twist is interrupted
- Probability rolls on every subsequent week

## Configuration Example

```javascript
game.cfg = {
  enableJuryHouse: true,
  returnChance: 10,           // 10% chance per eligible week
  jurorReturnAliveMin: 6,     // Min alive players for eligibility
  jurorReturnAliveMax: 6,     // Max alive players for eligibility
  jurorReturnMinJurors: 2,    // Min jurors needed in jury house
  tJurorReturnVoteMs: 6500,   // Duration (ms) for vote panel animation
  numPlayers: 12              // Initial cast size
};
```

## Backward Compatibility

The implementation maintains backward compatibility:
- Default config values prevent breaking existing games
- Multiple config key names supported for returnChance
- If conditions aren't met, flow continues normally without error
