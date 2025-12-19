# Social AI Catalog & Weighting Engine

## Overview

The Social AI Catalog is a comprehensive system for AI-driven social interactions with phase-aware behavior, relationship-based targeting, truthiness mechanics, and cooldown management.

## Architecture

### Core Components

1. **SocialActionsRegistry** (`js/social/social-actions-registry.js`)
   - 20+ action definitions with metadata
   - Phase tags, costs, cooldowns, spendable flags
   - Outcome generators with deltas

2. **SocialAIWeights** (`js/social/social-ai-weights.js`)
   - Weight computation engine
   - Phase multipliers
   - Role multipliers
   - Relationship multipliers
   - Cooldown and decay system

3. **SocialAIIntegrator** (`js/social/social-ai-integrator.js`)
   - Adapter between scheduler and weights/registry
   - Candidate building
   - Target selection
   - Context building

4. **SocialAIScheduler** (`js/social-ai-scheduler.js`)
   - Main scheduling loop
   - Integrates with new system while maintaining backward compatibility
   - Event emission

## Action Catalog

### Ally Building Actions

#### secret_chat
- **Phase Tags**: general, pre-noms, post-noms
- **Cost**: 2 energy
- **Cooldown**: 2 ticks
- **Targets**: 1
- **Spendable**: Yes
- **AI Bias**: ally:1.5, general:1.0, rival:0.3
- **Deltas**: affinity +0.05, trust +0.03

#### alliance_invite
- **Phase Tags**: general, pre-noms
- **Cost**: 3 energy
- **Cooldown**: 5 ticks
- **Targets**: 1
- **Spendable**: Yes
- **AI Bias**: ally:2.0, general:0.5, rival:0.1
- **Deltas**: affinity +0.10, trust +0.08, alliance +1

#### alliance_renew
- **Phase Tags**: general, post-noms
- **Cost**: 2 energy
- **Cooldown**: 4 ticks
- **Targets**: 1
- **Spendable**: Yes
- **AI Bias**: ally:1.8, general:0.3, rival:0.0
- **Deltas**: affinity +0.06, trust +0.05

#### favor_grant
- **Phase Tags**: general, post-noms
- **Cost**: 3 energy
- **Cooldown**: 3 ticks
- **Targets**: 1
- **Spendable**: Yes
- **AI Bias**: ally:1.5, general:0.8, rival:0.2
- **Deltas**: affinity +0.08, trust +0.06, influence +0.05

#### sympathy_visit
- **Phase Tags**: post-noms
- **Cost**: 2 energy
- **Cooldown**: 3 ticks
- **Targets**: 1
- **Spendable**: No
- **AI Bias**: nominee:2.0, ally:1.2, general:0.5
- **Deltas**: affinity +0.04, trust +0.03

#### gift
- **Phase Tags**: general
- **Cost**: 2 energy
- **Cooldown**: 4 ticks
- **Targets**: 1
- **Spendable**: No
- **AI Bias**: ally:1.3, general:0.8, rival:0.4
- **Deltas**: affinity +0.05, trust +0.02

### Intel Gathering Actions

#### eavesdrop
- **Phase Tags**: general, pre-noms, pre-pov
- **Cost**: 2 energy
- **Cooldown**: 4 ticks
- **Targets**: 2
- **Spendable**: Yes
- **AI Bias**: general:1.0, rival:1.2
- **Deltas**: information +0.04

#### probe_hoh
- **Phase Tags**: pre-noms
- **Cost**: 3 energy
- **Cooldown**: 3 ticks
- **Targets**: 1 (HOH)
- **Spendable**: Yes
- **AI Bias**: hoh:2.5, general:0.8
- **Deltas**: information +0.08
- **Intel Type**: hoh_target
- **Truthiness**: Influenced by trust/rivalry with HOH

#### probe_pov
- **Phase Tags**: pre-pov, post-noms
- **Cost**: 3 energy
- **Cooldown**: 3 ticks
- **Targets**: 1 (POV holder)
- **Spendable**: Yes
- **AI Bias**: povHolder:2.5, general:0.8
- **Deltas**: information +0.08
- **Intel Type**: pov_intention
- **Truthiness**: Influenced by trust/rivalry with POV holder

#### verify_rumor
- **Phase Tags**: general
- **Cost**: 2 energy
- **Cooldown**: 3 ticks
- **Targets**: 1
- **Spendable**: Yes
- **AI Bias**: general:1.0
- **Deltas**: information +0.05

### Strategy & Bargaining Actions

#### bargain_pov
- **Phase Tags**: pre-pov, post-noms
- **Cost**: 4 energy
- **Cooldown**: 4 ticks
- **Targets**: 1 (POV holder)
- **Spendable**: Yes
- **AI Bias**: povHolder:3.0, nominee:2.0, general:0.3
- **Deltas**: affinity +0.03, influence +0.06
- **Intel Type**: bargain

#### favor_request
- **Phase Tags**: general, pre-noms
- **Cost**: 2 energy
- **Cooldown**: 3 ticks
- **Targets**: 1
- **Spendable**: Yes
- **AI Bias**: ally:1.5, general:0.7, rival:0.2
- **Deltas**: trust +0.02, influence +0.03

#### vote_rally
- **Phase Tags**: post-noms
- **Cost**: 3 energy
- **Cooldown**: 4 ticks
- **Targets**: 1
- **Spendable**: Yes
- **AI Bias**: ally:1.8, general:1.0, nominee:2.5
- **Deltas**: influence +0.07, trust +0.03

#### wedge_plant
- **Phase Tags**: general
- **Cost**: 3 energy
- **Cooldown**: 5 ticks
- **Targets**: 1
- **Spendable**: Yes
- **AI Bias**: rival:1.8, general:0.5
- **Deltas**: influence +0.04
- **Spread Simulation**: Yes

### Conflict Actions

#### rivalry_poke
- **Phase Tags**: general
- **Cost**: 2 energy
- **Cooldown**: 3 ticks
- **Targets**: 1
- **Spendable**: No
- **AI Bias**: rival:2.0, general:0.3
- **Deltas**: affinity -0.04, rivalry +0.05

#### deescalate
- **Phase Tags**: general, post-noms
- **Cost**: 2 energy
- **Cooldown**: 3 ticks
- **Targets**: 1
- **Spendable**: No
- **AI Bias**: rival:1.5, general:0.6
- **Deltas**: affinity +0.03, rivalry -0.03

#### betrayal_tease
- **Phase Tags**: general
- **Cost**: 3 energy
- **Cooldown**: 5 ticks
- **Targets**: 1
- **Spendable**: Yes
- **AI Bias**: ally:0.2, rival:1.8, general:0.5
- **Deltas**: affinity -0.08, trust -0.10, influence +0.05

#### public_callout
- **Phase Tags**: general, post-noms
- **Cost**: 4 energy
- **Cooldown**: 6 ticks
- **Targets**: 1
- **Spendable**: Yes
- **AI Bias**: rival:2.5, general:0.2
- **Deltas**: affinity -0.10, rivalry +0.08, influence +0.04

### Rumor Actions

#### plant_rumor
- **Phase Tags**: general, pre-noms
- **Cost**: 3 energy
- **Cooldown**: 5 ticks
- **Targets**: 1
- **Spendable**: Yes
- **AI Bias**: rival:1.8, general:0.4
- **Deltas**: influence +0.05
- **Spread Simulation**: Yes
- **Risk**: Medium

#### counter_rumor
- **Phase Tags**: general
- **Cost**: 2 energy
- **Cooldown**: 3 ticks
- **Targets**: 1
- **Spendable**: Yes
- **AI Bias**: ally:1.5, general:0.8
- **Deltas**: trust +0.05, influence +0.03

## Weighting System

### Phase Multipliers

#### Pre-Noms Phase
- `probe_hoh`: 3.0x (heavily favored)
- `alliance_invite`: 1.5x
- `favor_request`: 1.3x
- `plant_rumor`: 0.8x (discouraged)

#### Pre-POV Phase
- `probe_pov`: 3.0x (heavily favored)
- `bargain_pov`: 2.5x
- `eavesdrop`: 1.5x
- `sympathy_visit`: 0.8x

#### Post-Noms Phase
- `sympathy_visit`: 2.5x
- `vote_rally`: 2.0x
- `bargain_pov`: 1.8x
- `alliance_renew`: 1.3x
- `deescalate`: 1.2x

### Role Multipliers

#### HOH Role
- `probe_hoh`: 0.2x (don't probe yourself)
- `favor_request`: 1.5x
- `alliance_invite`: 1.3x

#### POV Holder Role
- `probe_pov`: 0.1x (don't probe yourself)
- `bargain_pov`: 0.1x (don't bargain with yourself)

#### Nominee Role
- `bargain_pov`: 2.5x
- `vote_rally`: 2.8x
- `sympathy_visit`: 0.5x (don't visit others for sympathy)
- `favor_request`: 1.8x

### Relationship Multipliers

#### Ally Relationship
- `alliance_invite`: 2.0x
- `alliance_renew`: 2.5x
- `secret_chat`: 1.8x
- `favor_grant`: 1.6x
- `vote_rally`: 1.5x
- `rivalry_poke`: 0.2x
- `betrayal_tease`: 0.1x
- `public_callout`: 0.1x

#### Rival Relationship
- `rivalry_poke`: 2.0x
- `plant_rumor`: 1.8x
- `public_callout`: 1.6x
- `eavesdrop`: 1.4x
- `wedge_plant`: 1.5x
- `alliance_invite`: 0.2x
- `favor_grant`: 0.3x

## Truthiness System

### Formula

```
probability_true = 0.5 + (trust × 0.4) - (rivalry × 0.25) + (roleIncentive × 0.1)
probability_true = clamp(probability_true, 0.05, 0.95)

if random() < probability_true × 0.7: return 'true'
else if random() < probability_true: return 'partial'
else: return 'lie'
```

### Context Multipliers

- **Trust**: Based on affinity, normalized to 0-1
- **Rivalry**: Based on negative affinity
- **Role Incentive**: HOH/POV holders have slight incentive to be truthful (0.1-0.2)

### Examples

- **High Trust (0.9)**: ~70% true, ~20% partial, ~10% lie
- **High Rivalry (0.9)**: ~10% true, ~20% partial, ~70% lie
- **Neutral (0.5 trust, 0.2 rivalry)**: ~50% true, ~30% partial, ~20% lie

## Cooldown System

- **Per-Actor**: Each actor has independent cooldowns
- **Per-Action**: Each action has a cooldown period (in ticks)
- **Zero Weight**: Actions on cooldown get weight = 0
- **Decay**: Actions used recently (within 60s) get weight decay of 0.6^n where n = repetition count

## Tuning Parameters

### Cost Bands
- **Low cost (1-2)**: Common actions (secret_chat, sympathy_visit)
- **Medium cost (3-4)**: Strategic actions (probe_hoh, bargain_pov)
- **High cost (5+)**: Rare/risky actions (none currently, reserved for future expansion)

### Cooldown Bands
- **Short (2-3)**: Common actions
- **Medium (4-5)**: Strategic actions
- **Long (6+)**: High-impact actions (public_callout)

### Repetition Decay
- **Factor**: 0.6 (each repetition reduces weight by 40%)
- **Window**: 60 seconds
- **Effect**: 1st use = 1.0x, 2nd use = 0.6x, 3rd use = 0.36x

## QA Steps

### 1. Phase-Aware Behavior
- Start social phase in pre-noms
- Observe AI action logs
- Verify probe_hoh appears more frequently than other actions
- Advance to pre-pov phase
- Verify bargain_pov and probe_pov increase
- Advance to post-noms
- Verify sympathy_visit and vote_rally increase

### 2. Truthiness Validation
- Create alliance with AI (high trust)
- Probe them for intel
- Verify most intel is truthful
- Create rivalry with AI (low trust)
- Probe them for intel
- Verify more lies/partial info

### 3. Cooldown Testing
- Enable debug mode (`game.cfg.debugSocialAI = true`)
- Watch logs for action repetition
- Verify same action doesn't repeat immediately
- Verify cooldown period is respected

### 4. Relationship Targeting
- Observe AI-to-AI interactions
- Verify allies interact more with alliance actions
- Verify rivals interact more with poke/rumor actions

### 5. Budget Constraints
- Set low energy for AI players
- Verify they only choose affordable actions
- Verify phase ends gracefully when no actions available

## Integration with Existing Systems

### Event Emission

All AI actions emit two events:

1. **sm-ai-interaction**: Legacy event for compatibility
   ```javascript
   {
     actorId, targetIds, actionId, success,
     outcome, deltas, pairwise
   }
   ```

2. **social.action:result**: Enriched event for enricher
   ```javascript
   {
     actorId, targetId, actionId, success,
     outcome, deltas, truthiness,
     actorTrust, actorRivalry, roleIncentive,
     hohTarget, hohName, suggestedTarget
   }
   ```

### Enricher Integration

The `social-enricher.js` module consumes `social.action:result` events and:
- Adds flavor text via `SocialFlavor.renderFlavorLine()`
- Computes detailed text via `SocialFlavor.renderDetailed()`
- Includes truthiness and spend prompts
- Re-emits enriched events for UI

### UI Adapter Integration

The `social-ui-adapter.js` module:
- Listens for enriched events
- Adds spend-to-reveal CTAs in Diary Room
- Respects `socialSpendingEnabled` flag
- Handles truthiness partial reveals

### Highlights Integration

The `social-highlights.js` module detects major events:
- HOH probes (always interesting)
- Successful bargains
- Lies exposed (truthiness = 'lie')
- Big favors
- Major betrayals
- Renders in Diary Room with icons

## Configuration Flags

All features are gated by existing flags:

```javascript
game.cfg = {
  aiSocialEnabled: true,         // Master switch
  socialSpendingEnabled: true,   // Spend-to-reveal
  socialSpicyLogs: true,         // Flavor text
  socialHighlightsEnabled: true, // Highlights in DR
  aiSocialAggression: 'low',     // 'low' | 'medium'
  aiSocialMaxPerPhase: 5,        // Soft cap per AI
  debugSocialAI: false           // Verbose logging
}
```

## Performance Considerations

- **Memory**: Cooldown store grows with O(actors × actions) but pruned periodically
- **CPU**: Weight computation is O(candidates × relationships) per tick
- **Events**: ~1-2 events per tick (~800ms intervals) = low overhead

## Known Limitations

1. **No multi-step planning**: AI selects actions independently each tick
2. **No memory of past phases**: Cooldowns reset each phase
3. **No alliance coordination**: AIs don't coordinate with allies for joint actions
4. **No adaptive learning**: Weights are static, don't learn from outcomes

## Future Enhancements

1. **Persona weights**: Different AIs prefer different action types
2. **Alliance coordination**: AIs coordinate with allies on vote rallies
3. **Strategic planning**: AIs form multi-step plans (e.g., gather intel → plant wedge)
4. **Adaptive aggression**: AIs become more aggressive in later weeks
5. **Memory system**: Track which intel was truthful to adjust trust

## Troubleshooting

### AI not choosing new actions
- Check `aiSocialEnabled` flag
- Check budget: AI needs sufficient energy
- Check cooldowns: Actions may be on cooldown
- Enable debug: `game.cfg.debugSocialAI = true`

### Truthiness always 'true'
- Check trust/rivalry values in `game.__affinities`
- Verify `SocialFlavor.computeTruthiness` is being called
- Check role incentives are being passed

### Cooldowns not working
- Verify cooldown store is being updated
- Check timestamp arithmetic (ms vs seconds)
- Enable debug logging

### Weights not phase-aware
- Check phase tag in context: `phaseContext.phase`
- Verify phase multipliers in `PHASE_MULTIPLIERS`
- Check candidate filtering by phase tags

## Support

For issues or questions:
1. Check test harness: `test_e2e/test_social_ai_catalog.html`
2. Enable debug mode: `game.cfg.debugSocialAI = true`
3. Check console for errors
4. Review logs for action selection patterns
