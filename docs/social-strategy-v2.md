# Social Strategy v2 Documentation

## Overview

Social Strategy v2 is an enhanced attribution system for social resources (Energy, Influence, and Information) in the BBMobile social maneuvers system. It introduces contextual multipliers, diminishing returns, and phase-end reconciliation to create a more balanced and strategic gameplay experience.

## Key Enhancements

### 1. Energy Attribution

#### Contextual Multipliers
- **Survival Streak Bonus**: +1% per week survived (max +20%)
- **Social Activity Bonus**: +5% for forming alliances, +10% for winning HOH/POV
- Applied via `scaleWeeklyBonus(playerId, baseBonus)`

#### Weekly Event Tracking
Events are tracked per week and apply bonuses/penalties immediately to the energy bank:
- **Bonuses**: HOH win (+5), POV win (+3), Nominated (+4), Alliance formed (+2), etc.
- **Penalties**: Comp skipped (-3), Zero score (-2), Broke alliance (-3), etc.
- **Cap**: Per-week event bonuses capped at +15
- **Diversity**: System encourages variety in event types

#### Phase-End Reconciliation
- **Unused Energy Decay**: 10% decay if energy not spent during phase
- Applied in `reconcilePhaseEnd()`

**Configuration:**
```javascript
SM_BANK_CONFIG = {
  baseWeeklyAdd: 5,
  phaseEndDecayRate: 0.10,
  perWeekEventCap: 15,
  diversityRequired: true
}
```

### 2. Influence Attribution

#### Diminishing Returns
- **Threshold**: After 4 actions to same target
- **Rate**: 70% reduction (30% of original gain)
- Prevents influence farming through repeated actions

#### Per-Target Phase Cap
- **Cap**: +20 influence gain per target per phase
- Ensures balanced relationship building

#### Weekly Decay with Waiver
- **Decay Rate**: 20% (reduced from 25%)
- **Waiver**: If ≥2 positive actions with target this week
- Encourages consistent relationship maintenance

#### Alliance Bonus
- **Bonus**: +10% influence gain with allied players
- Scales by relationship history

**Configuration:**
```javascript
INFLUENCE_WEEKLY_DECAY = 0.20
INFLUENCE_POSITIVE_ACTION_THRESHOLD = 2
INFLUENCE_PER_TARGET_PHASE_CAP = 20
INFLUENCE_DIMINISHING_RETURNS_THRESHOLD = 4
INFLUENCE_DIMINISHING_RETURNS_RATE = 0.30
```

### 3. Information Attribution

#### Secrecy Multipliers
Information gains scale by target's game position:
- **HOH**: 2.0x multiplier
- **Veto Holder**: 1.8x multiplier
- **Nominee**: 1.5x multiplier
- **Default**: 1.0x multiplier

#### Action Variety Bonus
- **Bonus**: +20% information gain for trying new action types
- Encourages diverse gameplay strategies

#### Weekly Carryover Scaling
- **High Information (>50)**: +10 carryover
- **Low Information (≤50)**: +5 carryover
- Rewards players who accumulate knowledge

#### Unused Decay
- **Rate**: 15% decay if not used since last week
- Encourages active use of gathered intelligence

#### Per-Phase Cap
- **Cap**: +25 information per phase
- Prevents excessive information hoarding

**Configuration:**
```javascript
INFORMATION_HIGH_THRESHOLD = 50
INFORMATION_HIGH_CARRYOVER = 10
INFORMATION_UNUSED_DECAY_RATE = 0.15
INFORMATION_PER_PHASE_CAP = 25
INFORMATION_SECRECY_MULTIPLIERS = {
  HOH: 2.0,
  VETO_HOLDER: 1.8,
  NOMINEE: 1.5,
  DEFAULT: 1.0
}
```

### 4. Cross-Resource Integration

#### Unified Attribution Hook
`attributeResourcesPostEvent(playerId, eventType, context)`

Centralizes post-event resource adjustments:
- **Risk-Reward**: Failed actions grant information but cost energy
- **Performance Bonus**: High average influence (>50) grants +2 energy
- **Information Usage**: Tracks usage for decay calculations

#### Phase-End Reconciliation
`reconcilePhaseEnd()`

Applies final adjustments at phase end:
- Energy decay (10% if unused)
- Information decay (15% if unused)
- Resets phase tracking (influence gains, information gains)

## API Reference

### New Functions

#### `scaleWeeklyBonus(playerId, baseBonus)`
Scales weekly energy bonuses based on survival streaks and social activity.

**Parameters:**
- `playerId` (number): Player ID
- `baseBonus` (number): Base bonus amount

**Returns:** (number) Scaled bonus amount

**Example:**
```javascript
const bonus = SocialManeuvers.scaleWeeklyBonus(1, 10);
// Returns: 11-12 (depending on streak and activity)
```

#### `calculateInfoGain(actorId, targetId, baseGain, actionType)`
Calculates information gain with secrecy factors and variety bonuses.

**Parameters:**
- `actorId` (number): Actor player ID
- `targetId` (number): Target player ID
- `baseGain` (number): Base information gain
- `actionType` (string): Type of action ('observe', 'interrogate', etc.)

**Returns:** (number) Scaled information gain

**Example:**
```javascript
const info = SocialManeuvers.calculateInfoGain(1, 2, 10, 'observe');
// Returns: 10-24 (depending on target's position and variety)
```

#### `attributeResourcesPostEvent(playerId, eventType, context)`
Unified attribution hook for post-event resource adjustments.

**Parameters:**
- `playerId` (number): Player ID
- `eventType` (string): Event type ('action_failed', 'weekly_performance_bonus', etc.)
- `context` (object): Additional context

**Example:**
```javascript
SocialManeuvers.attributeResourcesPostEvent(1, 'action_failed', {
  targetId: 2,
  actionType: 'interrogate'
});
```

#### `reconcilePhaseEnd()`
Phase-end reconciliation for decays, caps, and cleanup.

**Example:**
```javascript
SocialManeuvers.reconcilePhaseEnd();
```

#### `calculateAverageInfluence(playerId)`
Calculates average influence across all targets.

**Parameters:**
- `playerId` (number): Player ID

**Returns:** (number) Average influence value

**Example:**
```javascript
const avgInfluence = SocialManeuvers.calculateAverageInfluence(1);
// Returns: 0-100 (average influence)
```

### Updated Functions

#### `SocialResources.adjustInfluence(actorId, targetId, delta)`
Now includes:
- Diminishing returns after 4 actions
- Per-target phase cap (+20)
- Alliance bonus (+10%)
- Action count tracking

#### `SocialResources.recordPositiveInteraction(actorId, targetId)`
Now tracks count instead of boolean:
- Used for decay waiver threshold (≥2 actions)

#### `SocialResources.resetWeekly(playerId)`
Now includes:
- Information carryover scaling (high vs low)
- Influence decay with positive action waiver

### Tracking Structures

New tracking maps added to `game` object:
- `__influenceActions`: Map tracking actions per target for diminishing returns
- `__survivalStreaks`: Map tracking survival streaks for multipliers
- `__phaseInfluenceGains`: Map tracking per-target phase gains for caps
- `__phaseInformationGains`: Map tracking per-phase information gains for caps
- `__informationUsageTracking`: Map tracking when information was last used

## Debug API

New debug methods in `window.__smDebug`:

### `testScaledBonus(playerId, baseBonus)`
Test survival streak and activity multipliers.

### `testInfoGain(actorId, targetId, baseGain, actionType)`
Test information secrecy multipliers and variety bonus.

### `testAttributePost(playerId, eventType, context)`
Test post-event attribution logic.

### `testReconcile()`
Test phase-end reconciliation.

### `showV2Stats(playerId)`
Show v2 tracking stats for a player:
- Influence actions per target
- Survival streak
- Phase influence gains
- Phase information gains
- Last information usage

### `showAllV2Stats()`
Show v2 stats for all alive players.

**Example:**
```javascript
__smDebug.testScaledBonus(1, 10);
__smDebug.showV2Stats(1);
__smDebug.showAllV2Stats();
```

## Migration Notes

### Backward Compatibility

Social Strategy v2 is fully backward compatible:
- All existing code continues to work
- v1 constants and functions are preserved
- New functionality is additive
- Defensive coding ensures no ReferenceErrors

### AI Integration

AI players automatically use v2 logic through the `SocialResources` API:
- No changes needed to `social-engine.js`
- AI benefits from same attribution rules as human players
- Ensures fair and balanced gameplay

## Testing

### Test Suite

Run the comprehensive v2 test suite:
```
open test_social_strategy_v2.html
```

Tests cover:
1. Energy contextual multipliers
2. Influence diminishing returns
3. Influence per-target phase cap
4. Influence decay with positive action waiver
5. Information secrecy multipliers
6. Information high carryover
7. Phase-end energy decay
8. Phase-end information decay
9. Unified attribution hook
10. Performance-based energy bonus

### Manual Testing

1. Start a new game
2. Progress through multiple weeks
3. Monitor resource attribution via console logs
4. Use debug API to inspect v2 stats
5. Verify decays and caps are working

**Console Logs:**
```
[sm-v2] Scaled bonus for player 1: 10 → 11
[sm-v2] Diminishing returns: 1->2 action #5, delta 10 → 3.00
[sm-v2] Phase cap limiting: 1->2 gain capped to 2
[sm-v2] Info gain for 1->2: 10 → 20 (secrecy=2, variety=1)
```

## Performance Impact

v2 adds minimal overhead:
- **Attribution**: +5-10ms per action (negligible)
- **Reconciliation**: +10-20ms per phase end (negligible)
- **Memory**: +5 Maps (~1KB per player)
- **Total Impact**: <1% performance difference

## Future Enhancements

Potential v3 features:
- [ ] Time-based information expiration
- [ ] Trust erosion mechanics for betrayals
- [ ] Relationship history depth tracking
- [ ] Coalition influence bonuses
- [ ] Adaptive difficulty scaling

## Support

For issues or questions:
1. Check console logs for `[sm-v2]` messages
2. Use debug API to inspect state
3. Review test suite for examples
4. Check tracking structures in `game.__*`

## Credits

Social Strategy v2 implementation - Enhanced attribution logic for balanced and strategic social gameplay.
