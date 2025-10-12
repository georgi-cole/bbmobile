# Social Logic v2 Guide

## Overview

Social Logic v2 is a context-aware, weighted interaction system that replaces random social popup generation with strategic, relationship-driven decisions. It considers weekly game context (HOH, nominations, alliances, rivalries) and player relationships to select relevant interactions.

## Key Features

### 1. Context-Aware Selection
- **Week Context**: HOH, nominees, veto holder, week number
- **Relationship Graph**: Alliances, rivalries, affinity levels
- **Recent Events**: Nominations, HOH wins, veto usage

### 2. Weighted Candidate Generation
Interactions are weighted based on:
- **HOH Involvement**: 2.5x weight multiplier
- **Nominee Involvement**: 2.2x weight multiplier
- **Veto Holder Involvement**: 1.8x weight multiplier
- **Alliance Strength**: Up to 2x boost for strong alliances
- **Rivalry Intensity**: Up to 2.5x boost for strong rivalries
- **Context Matching**: Bonus for interactions matching current game state

### 3. Diversity Constraints
- 3-4 interactions per social phase
- Max 2 interactions of the same category (strategic/social/conflict)
- Minimum 2 different player pairs
- Cooldown system prevents repetition:
  - Pair cooldown: 2-3 weeks per interaction type
  - Type cooldown: 1-2 weeks globally
  
### 4. Controlled Randomness
- 20% random variation (0.8x to 1.2x) for variety
- Weighted selection ensures high-value interactions surface more often
- Fallback to legacy random system if no valid candidates

## Architecture

### Data Structures

#### WeekContext
```javascript
class WeekContext {
  week: number
  hohId: number
  nominees: number[]
  vetoHolder: number
  alivePlayers: Player[]
  humanId: number
  recentEvents: Event[]
}
```

#### RelationshipGraph
```javascript
class RelationshipGraph {
  players: Player[]
  alliances: Alliance[]
  rivalries: Rivalry[]
  
  areAllies(id1, id2): boolean
  areRivals(id1, id2): boolean
  getAllyStrength(id1, id2): number
  getRivalryIntensity(id1, id2): number
}
```

#### CooldownStore
```javascript
class CooldownStore {
  pairCooldowns: Map<string, number>
  typeCooldowns: Map<string, number>
  sessionInteractions: Map<string, string[]>
  
  isOnCooldown(id1, id2, type, week, pairWeeks, typeWeeks): boolean
  recordInteraction(id1, id2, type, week): void
  clearSession(): void
}
```

### Modules

#### 1. `data/config/interactionCatalog.js`
Defines interaction types, templates, and constraints:
- **INTERACTION_TYPES**: Metadata for each interaction (cooldowns, requirements)
- **INTERACTION_TEMPLATES**: Template functions that generate interaction data
- **CONSTRAINTS**: Global constraints (min/max interactions, diversity rules)

Available interaction types:
- `alliance_offer`: Form new alliances
- `target_talk`: Discuss targeting players
- `flip_plan`: Plan vote flips
- `hoh_pressure`: HOH influence attempts
- `nominee_support`: Support nominated players
- `rivalry_confrontation`: Confront rivals
- `ally_trust`: Check in with allies
- `intel_share`: Share game information
- `gossip`: Casual gossip
- `random_social`: General social interactions

#### 2. `logic/social/generator.js`
Core generation logic:
- `generateCandidates()`: Create candidate interactions
- `calculateWeight()`: Compute interaction weights
- `selectInteractions()`: Select diverse set with constraints
- `generateSocialInteractions()`: Main entry point

#### 3. `logic/social/adapter.js`
Converts generator output to popup format:
- `interactionToPopupOptions()`: Convert to SocialDecisionPopup format
- `applyInteractionEffects()`: Apply affinity changes and logs
- `determineTheme()`: Determine button theme (accept/refuse/neutral)

#### 4. `social.js` Integration
- `buildSocialDecisionsV2()`: New v2 logic entry point
- `buildSocialDecisionsLegacy()`: Original random logic (fallback)
- Feature flag check in `buildSocialDecisions()`

## Configuration

### Feature Flag

Enable Social Logic v2 in `js/config/defaults.js`:

```javascript
{
  social_logic_v2_enabled: true,  // Enable context-aware logic
  social_inter_delay: 800         // Inter-popup delay (ms)
}
```

Default: `false` (legacy random logic)

### Runtime Toggle

```javascript
// Enable v2
game.cfg.social_logic_v2_enabled = true;

// Disable v2 (revert to legacy)
game.cfg.social_logic_v2_enabled = false;
```

### Constraints Configuration

Edit `CONSTRAINTS` in `interactionCatalog.js`:

```javascript
const CONSTRAINTS = {
  MIN_INTERACTIONS_PER_SESSION: 3,
  MAX_INTERACTIONS_PER_SESSION: 4,
  MAX_SAME_CATEGORY_IN_SESSION: 2,
  MIN_DIFFERENT_PAIRS: 2,
  COOLDOWN_WEEKS_PAIR: 2,
  COOLDOWN_WEEKS_TYPE: 1
};
```

### Interaction Type Configuration

Each interaction type in `INTERACTION_TYPES` can be customized:

```javascript
ALLIANCE_OFFER: {
  id: 'alliance_offer',
  title: 'Alliance Offer',
  category: 'strategic',
  cooldownPair: 3,  // Weeks before same pair sees this
  cooldownType: 2,  // Weeks before type appears again
  requiresContext: ['nominations', 'hoh', 'alliances']
}
```

## Usage

### Basic Flow

1. Social phase starts
2. `buildSocialDecisions()` checks feature flag
3. If enabled, `buildSocialDecisionsV2()` runs:
   - Creates WeekContext and RelationshipGraph
   - Generates weighted candidates
   - Selects 3-4 diverse interactions
   - Converts to popup format
   - Queues decisions
4. Popups display sequentially with proper theming

### Extending Interactions

To add a new interaction type:

1. Add to `INTERACTION_TYPES`:
```javascript
NEW_TYPE: {
  id: 'new_type',
  title: 'New Interaction',
  category: 'strategic',
  cooldownPair: 2,
  cooldownType: 1,
  requiresContext: ['hoh']
}
```

2. Add template to `INTERACTION_TEMPLATES`:
```javascript
new_type: (actor, target, context) => ({
  type: 'new_type',
  title: 'New Interaction',
  targetPlayer: actor,
  lines: [
    `${actor.name} approaches you...`,
    'What do you do?'
  ],
  actions: [
    {
      label: 'Option A',
      affinity: { actor: 0.10, target: 0.08 },
      logMessage: 'You chose A',
      logType: 'ok'
    },
    {
      label: 'Option B',
      affinity: { actor: -0.05 },
      logMessage: 'You chose B',
      logType: 'warn'
    }
  ]
})
```

3. The new type will automatically be included in candidate generation

## Migration Guide

### From Legacy to v2

**Phase 1: Test with Flag Off**
1. Ensure all new modules are loaded in HTML
2. Test with `social_logic_v2_enabled: false`
3. Verify legacy system still works

**Phase 2: Test with Flag On**
1. Enable `social_logic_v2_enabled: true`
2. Play through multiple weeks
3. Verify interactions are context-aware
4. Check cooldowns work correctly

**Phase 3: Monitor & Tune**
1. Review interaction weights
2. Adjust constraints if needed
3. Add/remove interaction types
4. Fine-tune cooldowns

### Compatibility Notes

- **Legacy Data**: v2 reads existing affinity/alliance data
- **No Schema Changes**: Works with current player/game state
- **Graceful Fallback**: Falls back to legacy if v2 fails
- **Feature Flag**: Can toggle at runtime without restart

## Testing

### Manual Testing

1. Start a new game
2. Enable `social_logic_v2_enabled`
3. Progress to first social phase
4. Verify:
   - Interactions mention HOH/nominees when relevant
   - Different players appear (not all same person)
   - No repeated interaction types in same session
   - Cooldowns work across weeks

### Console Debugging

```javascript
// Check generated interactions
console.log(game.__socialV2Cooldowns);

// View current context
const ctx = new SocialGenerator.WeekContext(game);
console.log(ctx);

// View relationships
const rel = new SocialGenerator.RelationshipGraph(game);
console.log(rel.alliances);
console.log(rel.rivalries);
```

### Validation Checklist

- [ ] HOH-related interactions appear when HOH exists
- [ ] Nominee-related interactions appear when nominees exist
- [ ] Ally interactions appear more with allied players
- [ ] Rival interactions appear with enemy players
- [ ] No duplicate interaction types in same session
- [ ] At least 2 different players appear
- [ ] Cooldowns prevent repetition across weeks
- [ ] Fallback to legacy works if no candidates
- [ ] Feature flag toggle works without errors

## Performance Considerations

- **Candidate Generation**: O(n × m) where n = players, m = interaction types
- **Weight Calculation**: O(1) per candidate
- **Selection**: O(k log k) where k = candidate count
- **Memory**: Cooldown store grows with weeks played (cleared per session)

Typical performance:
- 12 players × 10 types = 120 candidates
- Selection from 120 candidates: < 1ms
- Total generation time: < 5ms

## Future Enhancements

### Planned Features
- [ ] Multi-week event memory (betrayals, broken promises)
- [ ] Player personality influence (risk-takers get different options)
- [ ] Adaptive difficulty (harder choices for experienced players)
- [ ] Coalition dynamics (3+ player interactions)
- [ ] Story arcs (connected interactions across weeks)

### Data Schema Redesign
When ready to redesign schemas:
1. Create migration adapters in `adapter.js`
2. Map old affinity system to new relationship types
3. Preserve cooldown data during migration
4. Test thoroughly with feature flag

## Troubleshooting

### No Interactions Generated
- Check `InteractionCatalog` is loaded
- Verify `alivePlayers()` returns players
- Check console for warnings
- Falls back to legacy automatically

### Same Interactions Repeating
- Verify cooldown store exists: `game.__socialV2Cooldowns`
- Check cooldown values in `INTERACTION_TYPES`
- Ensure `recordInteraction()` is called

### Wrong Players Appearing
- Check weight calculation logic
- Verify context data (HOH, nominees)
- Review relationship graph construction

### Performance Issues
- Reduce candidate pool (filter by context earlier)
- Optimize weight calculation
- Cache relationship graph

## Support

For issues or questions:
1. Check console logs for `[Social v2]` messages
2. Verify feature flag state
3. Test with legacy system
4. Review interaction templates for errors

## License & Credits

Part of Big Brother Mobile (bbmobile) game system.
Social Logic v2 implementation (PR C).
