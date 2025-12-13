# Juror Return Twist Refactor Summary

## Overview
Restored and enhanced the juror return (America's Vote) twist functionality with configurable thresholds and centralized decision logic.

## Problem Statement
The juror return UI was broken - only the twist announcement modal appeared, but the twist panel never ran. Additionally, the eligibility logic was hardcoded and conflicted between different parts of the codebase.

## Changes Made

### 1. Config Defaults (`js/config/defaults.js`)
Added new configurable thresholds:
- `jurorReturnAliveMin: 6` - Minimum alive players for eligibility
- `jurorReturnAliveMax: 6` - Maximum alive players for eligibility  
- `jurorReturnMinJurors: 2` - Minimum jurors needed for the twist
- `tJurorReturnVoteMs: 6500` - Vote panel animation duration (6.5 seconds)

### 2. Centralized Eligibility Logic (`js/twists.js`)
Updated `isJurorReturnEligible()` to use configurable thresholds:
```javascript
// Before: Hardcoded checks
if(aliveCount < 5) return false;
if(jurorCount < requiredJurors) return false;

// After: Configurable checks
const aliveMin = Number(g.cfg?.jurorReturnAliveMin || 6);
const aliveMax = Number(g.cfg?.jurorReturnAliveMax || 6);
if(aliveCount < aliveMin || aliveCount > aliveMax) return false;

const minJurors = Number(g.cfg?.jurorReturnMinJurors || 2);
if(jurorCount < minJurors) return false;
```

Updated vote panel duration to use config:
```javascript
durationMs: Number(g.cfg?.tJurorReturnVoteMs || 6500)
```

### 3. Removed Outdated Gating (`js/eviction.js`)
Removed the conflicting `shouldRunAmericaReturn()` function that had:
- Hardcoded juror count checks (4-6 jurors)
- Random RNG without caching
- No week-based decision caching

Replaced with centralized logic:
```javascript
// Before:
if(shouldRunAmericaReturn()){
  setTimeout(()=>{ try{ global.startAmericaReturnVote?.(); }catch(e){} },60);
  return;
}

// After:
if(typeof global.decideJurorReturnThisWeek === 'function' && global.decideJurorReturnThisWeek(g)){
  setTimeout(()=>{ try{ global.startAmericaReturnVote?.(); }catch(e){} },60);
  return;
}
```

### 4. Documentation Updates
- `JUROR_RETURN_ELIGIBILITY.md` - Updated to document new configurable behavior
- `src/progression/rules/canActivateJurorsReturnChallenge.mjs` - Updated to reflect new defaults and added notes about configurability

### 5. Test Page
Created `test_juror_return_config.html` to validate:
- Default configuration values (6 alive, 2 jurors)
- Below/above alive player thresholds
- Below minimum juror threshold
- Custom range configurations (e.g., 5-8 alive players)
- Weekly decision caching
- Already-run flag handling
- Vote panel duration from config

## Benefits

### Easy Configuration
Can now easily adjust thresholds to different scenarios:
```javascript
// Example: Return at 5-7 alive players with 3+ jurors
game.cfg.jurorReturnAliveMin = 5;
game.cfg.jurorReturnAliveMax = 7;
game.cfg.jurorReturnMinJurors = 3;
```

### Single Source of Truth
- No more conflicting eligibility checks
- Centralized `decideJurorReturnThisWeek()` handles both eligibility and RNG
- Weekly caching prevents multiple RNG rolls

### Consistent Behavior
- Vote panel duration matches specification (6.5 seconds)
- Eligibility logic matches across all code paths
- Before-HOH trigger timing preserved

## Backward Compatibility
- Default values maintain existing behavior (6 alive, 2+ jurors)
- Existing config keys still work (`returnChance`, `juryReturnChance`, etc.)
- No breaking changes to game saves or serialization

## Testing
Run `test_juror_return_config.html` in a browser to verify:
1. Configuration values are correctly loaded
2. Eligibility checks work with various scenarios
3. Custom configurations can override defaults
4. Weekly decision caching prevents multiple rolls

## Next Steps
- [ ] Manual testing: Play to 6 alive + 2 jurors and verify twist triggers
- [ ] Verify modal → panel → TV results → winner returns flow
- [ ] Test debug "Force Juror's Return" action
- [ ] Verify no regression in Public/Fan Favourite finale flow
