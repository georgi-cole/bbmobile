# AI Social Energy Fix Summary

## Issue Description
AI players were not receiving sufficient social energy resources and were attempting to spend resources they didn't have, causing failures logged as `{energy: 3, influence: 0, information: 10}`.

## Root Causes Identified

### 1. Player Initialization After Week 1
**Problem**: Players initialized after week 1 received 0 energy instead of the default 5 energy.

**Location**: `js/social-maneuvers.js` lines 48-59 (`SocialEnergyBank.init()`)

**Code Issue**:
```javascript
// BEFORE (buggy)
const initialEnergy = (week === 1) ? RESOURCE_CONFIG.energy.default : 0;
```

This meant:
- Players initialized in week 1: 5 energy ✅
- Players initialized in week 2+: 0 energy ❌

**Why This Matters**:
- If AI players aren't properly initialized at game start (week 1)
- If players are added dynamically after week 1
- If initialization happens in the wrong order
- Then AI players start with 0 energy and can't perform any actions

**Fix**:
```javascript
// AFTER (fixed)
const initialEnergy = RESOURCE_CONFIG.energy.default; // Always start with default (5)
```

Now ALL players get 5 energy on initialization regardless of current week.

### 2. AI Scheduler Only Checked Energy Costs
**Problem**: AI scheduler checked if players could afford the energy cost but ignored influence and information costs.

**Location**: `js/social-ai-scheduler.js` lines 212-222, 266-277

**Code Issue**:
```javascript
// BEFORE (buggy)
if (!SM.SocialResources?.canAfford(actorId, { energy: costCalc.total })) return false;
```

This meant AI would attempt actions like:
- `form_alliance`: costs 3 energy, 0 influence, **10 information**
- AI has: 5 energy, 0 influence, **0 information**
- Affordability check: ✅ energy OK (3 < 5)
- Execution: ❌ fails with "insufficient resources: information"

**Fix**:
```javascript
// AFTER (fixed)
const fullCosts = {
  energy: costCalc.total,
  influence: a.costs?.influence ?? 0,
  information: a.costs?.information ?? 0
};
if (!SM.SocialResources?.canAfford(actorId, fullCosts)) return false;
```

Now AI checks ALL resource types before attempting actions.

## Changes Made

### File: `js/social-maneuvers.js`
**Line 48-59**: Fixed `SocialEnergyBank.init()`
- Changed initialization to always give default energy (5)
- Added clarifying comments
- Ensures AI players and late-joining players get starting energy

### File: `js/social-ai-scheduler.js`
**Lines 212-222**: Fixed action selection affordability check
- Added `fullCosts` object with all three resource types
- Changed `canAfford()` call to check all costs
- Added comment explaining the check

**Lines 266-277**: Fixed action execution affordability check
- Same fix as action selection
- Ensures no race conditions where cost changes between selection and execution

## Expected Results

### Before Fix
```
[ai-scheduler] ❌ Attempting action: form_alliance
[social-resources] ❌ Failed to spend: {energy: 3, influence: 0, information: 10}
[social-resources] ⚠️ Insufficient: information (have: 0, need: 10)
```

### After Fix
```
[ai-scheduler] ✓ Action filtered: form_alliance (insufficient information)
[ai-scheduler] ✓ Selected affordable action: small_talk
[social-resources] ✓ Resources spent: energy=1, influence=0, info=0
```

## Acceptance Criteria Verification

✅ **AI players get default social energy weekly**
- All players now receive 5 energy on initialization (regardless of week)
- Week rollover adds +5 to all alive players
- Week 1 starter bonus adds +5 to all alive players

✅ **AI can spend energy without failures due to insufficient resources**
- AI scheduler now checks ALL resource types before attempting actions
- Actions requiring information/influence are filtered out if unaffordable
- Logs show successful spending for AI

✅ **Logs show successful spending for AI**
- No more "insufficient resources" errors for properly filtered actions
- AI only attempts actions it can afford

## Testing

### Automated Test
Created `test_ai_energy_fix.html` with 7 comprehensive tests:
1. ✅ All players initialized at week 1 get 5 energy
2. ✅ All players receive +5 energy on week rollover
3. ✅ Players initialized after week 1 still get default energy (5)
4. ✅ AI can afford energy-only action (small_talk)
5. ✅ AI correctly identifies unaffordable action (form_alliance)
6. ✅ AI can afford action after receiving sufficient information
7. ✅ Players initialized at week 5 get default energy (not 0)

### Existing Test Suite
Ran `npm run test:social` - All tests passed ✅

### Manual Testing
1. Load game and start week 1
2. Check all player banks: `SocialManeuvers.SocialEnergyBank.get(playerId)`
3. Advance to week 2
4. Verify +5 added to all players
5. Monitor AI interactions in social phase
6. Verify no "insufficient resources" errors in console

## Energy Flow Summary

### Week 1 (Game Start)
1. **Initialization**: Each player gets 5 energy (from `SocialEnergyBank.init()`)
2. **Week 1 Starter Bonus**: Each player gets +5 energy (from week watcher)
3. **Total**: 10 energy per player

### Week 2+ (Rollover)
1. **Week Rollover**: Each alive player gets +5 energy
2. **Weekly Events**: Players get bonuses/penalties based on performance
   - HOH Win: +5
   - POV Win: +3
   - Nominated: +4
   - etc.
3. **Total**: Varies by player performance

### Social Phase
1. **Phase Start**: Energy seeded from bank to phase energy
2. **Actions**: Players spend energy (and possibly influence/information)
3. **Phase End**: Unused energy carries over to bank (with 10% decay)

## Related Files
- `js/social-maneuvers.js` - Core social maneuvers system
- `js/social-ai-scheduler.js` - AI social interaction scheduler
- `js/social.js` - Legacy social system (delegates to social-maneuvers)
- `test_ai_energy_fix.html` - Validation test suite
- `AI_SOCIAL_IMPLEMENTATION.md` - Original AI social feature documentation
- `SOCIAL_ENERGY_BANK_IMPLEMENTATION.md` - Energy bank system documentation

## Future Considerations

### Prevent Similar Issues
1. Always initialize players with default resources regardless of week
2. Always check ALL resource costs before action selection
3. Add assertions in development mode for resource checks
4. Consider adding telemetry for resource insufficient failures

### Potential Enhancements
1. Add debug panel showing all player resources
2. Add validation that warns if AI is consistently unable to afford actions
3. Consider granting AI players starting information/influence based on week
4. Add metrics tracking AI vs human resource usage

## Deployment Notes
- No breaking changes
- No save game migration required
- Changes are backwards compatible
- Existing games will benefit immediately on next week rollover
- No configuration changes required
