# Legacy Social UI Purge Summary

## Objective
Physically remove legacy Social UI/modules and entry points to ensure Social Maneuvers (SM) is the sole owner of social_intermission phase, with __sm_bankEnergy as the single energy source.

## Changes Made

### 1. Removed Legacy Functions from social.js
The following legacy functions have been **physically removed** (not just disabled):

- **simulateHouseSocial()** - Legacy social simulation (lines ~313-361)
  - Random floater selection
  - Ally/enemy affinity adjustments
  - Random positive/negative interactions
  
- **buildSocialDecisions()** - Legacy decision generation (lines ~437-535)
  - Alliance offer prompts
  - Target talk prompts
  - Flip plan prompts
  
- **buildSocialDecisionsV2()** - V2 decision logic (lines ~393-433)
  - Context-aware interaction generation
  - Fallback to legacy decisions
  
- **buildSocialDecisionsLegacy()** - Legacy fallback (lines ~581-669)
  - Duplicate of original decision logic
  
- **generateSocialSummary()** - Legacy summary card (lines ~788-862)
  - Alliance detection
  - Rivalry detection
  - Romance detection
  - "Social Update" card rendering

### 2. Updated Core Functions

- **shouldShowLegacyMemories()** - Now always returns `false`
  - Previously checked `!SocialManeuvers.isEnabled()`
  - Legacy UI path completely removed

- **renderSocialPhase()** - Simplified to only delegate to Social Maneuvers
  - Removed entire legacy UI rendering branch
  - Always mounts SocializeMobile launcher
  - Always updates HUD via Social Maneuvers

- **startSocialIntermission()** - Removed legacy summary call
  - Deleted `else` branch that called `generateSocialSummary()`
  - Now only calls SM engine's summary methods

### 3. File Size Reduction
- **Before:** 1,127 lines
- **After:** 711 lines
- **Removed:** 416 lines (~37% reduction)

### 4. Verification

#### Energy Bank Implementation ✅
The Social Maneuvers energy bank is properly implemented in `social-maneuvers.js`:
```javascript
// game.__sm_bankEnergy: Map<playerId, energyAmount>
const SocialEnergyBank = {
  init(playerId) { ... },
  get(playerId) { ... },
  set(playerId, amount) { ... },
  adjust(playerId, delta) { ... },
  applyEventDelta(playerId, eventType, delta) { ... },
  seedPhaseEnergy(playerId) { ... }
}
```

Features:
- Persisted as `game.__sm_bankEnergy: Map`
- Uncapped rolling balance (can accumulate indefinitely)
- Weekly bonuses/penalties applied immediately to bank
- Phase energy seeded from bank (no capping)

#### Social Maneuvers Ownership ✅
Social Maneuvers is now the sole owner of social_intermission:
- `onSocialPhaseStart()` called when entering social_intermission
- `onSocialPhaseEnd()` called when exiting social_intermission
- Launcher automatically mounted via SocializeMobile
- HUD automatically updated via SocializeMobile
- Summary shown via SM engine (`showSummaryPanel`, `showEndOfPhaseSummary`, or `presentPhaseSummary`)

#### Test Results ✅
All tests pass:
```
✅ VALIDATION PASSED - All minigame keys are properly registered
✅ All static analysis tests passed! (24/24)
✅ VALIDATION PASSED - E2E test harness validated
```

### 5. Remaining Infrastructure

The following components are **kept** as they're used by the new system:

- **Decision Queue System** (`queueDecision`, `showNextDecision`, `ensureDecisionDeck`, `clearDecisionDeck`)
  - Used by Social Maneuvers for popup decisions
  
- **Interaction System** (`applyInteraction`, `applyAction`)
  - Core affinity mechanics still needed
  
- **State Management** (`ensureSocialState`, `resetWeeklyCounters`)
  - Weekly reset hooks into Social Maneuvers
  
- **setPhase Wrapper** (lines 606-709)
  - Defensive wrapper ensures SM hooks are always called
  - Handles edge cases where other code calls setPhase directly

### 6. No Legacy Resurrections

All searches confirm no remaining references to removed functions:
```bash
$ grep -r "simulateHouseSocial\|buildSocialDecisions\|generateSocialSummary" --include="*.js"
# No results (except REMOVED: comments)
```

## Summary

✅ Legacy functions **physically removed** (not just disabled)
✅ Legacy "Social Update" card rendering removed
✅ Legacy fallback paths removed
✅ Social Maneuvers is sole owner of social_intermission
✅ `game.__sm_bankEnergy: Map` is sole energy source (uncapped)
✅ All tests pass
✅ File size reduced by 37%

The codebase is now fully committed to Social Maneuvers with no legacy escape hatches.
