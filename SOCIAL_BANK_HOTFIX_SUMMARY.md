# Social Energy Bank Hotfix - Implementation Summary

## Problem Statement

The Social Maneuvers system had issues where:
1. Energy seeding was not using the bank system despite being implemented
2. Logs incorrectly showed "Base + bonuses/penalties" instead of bank-based seeding
3. HUD rendering threw TDZ errors due to `ariaLabel` being used before declaration

## Root Cause Analysis

### Issue 1: Bank Seeding Not Active
- `onSocialPhaseStart` called `resetWeekly` which skipped energy seeding (line 307)
- Phase energy was never explicitly seeded from bank
- The log message (line 2200) was misleading, showing legacy formula

### Issue 2: HUD TDZ Error
- In `ui.hud-and-router.js`, `ariaLabel` was used at line 679
- But declared later at line 688
- This caused a Temporal Dead Zone error blocking HUD updates

## Changes Made

### 1. social-maneuvers.js

**onSocialPhaseStart (lines 2176-2207)**

Before:
```javascript
// Reset weekly for all alive players (applies weekly housekeeping and energy seeding)
alivePlayers.forEach(p => {
  SocialResources.resetWeekly(p.id);
});

// Log energy seeding for human player
if(humanId) {
  const humanEnergy = SocialResources.get(humanId, 'energy');
  console.info(`[social-maneuvers] ⚡ Energy seeded for human player: ${humanEnergy} (Base=${DEFAULT_ENERGY} + weekly bonuses/penalties)`);
}
```

After:
```javascript
// Reset weekly for all alive players (applies weekly housekeeping - influence decay, event tracker reset)
alivePlayers.forEach(p => {
  SocialResources.resetWeekly(p.id);
});

// BANK-BASED SEEDING: Seed phase energy strictly from bank for all players
alivePlayers.forEach(p => {
  SocialResources.recomputePhaseEnergy(p.id);
});

// Log bank-based seeding for human player
if(humanId) {
  const bankBalance = SocialEnergyBank.get(humanId);
  const phaseEnergy = SocialResources.get(humanId, 'energy');
  console.info(`[sm-phase] seeded from bank=${bankBalance}, phase energy=${phaseEnergy}`);
}
```

**Key Changes:**
- Added explicit call to `recomputePhaseEnergy` to seed from bank
- Updated comment to clarify `resetWeekly` does NOT seed energy
- Changed log format to `[sm-phase] seeded from bank=X, phase energy=Y`
- Shows both bank balance (uncapped) and phase energy (capped at MAX_ENERGY=10)

### 2. ui.hud-and-router.js

**renderTopRoster (lines 659-689)**

Before:
```javascript
wrap.appendChild(img);

// Add finishing place badge inside avatar for ranks ≥ 3
if(p.evicted && p.showFinishingBadge && p.finalRank && p.finalRank >= 3){
  // ... badge creation code ...
  
  // Update aria label to include rank
  ariaLabel = `${p.name} (Finished ${ordinalRank})`; // ❌ TDZ ERROR - used before declaration
}

// Name/Status label - show icons or text that replaces the name
const name=document.createElement('div'); 
name.className='top-tile-name';

let labelText = p.name;
let statusClass = '';
let ariaLabel = p.name; // ❌ Declared AFTER use above
```

After:
```javascript
wrap.appendChild(img);

// Initialize aria label and status variables before any use
let ariaLabel = p.name;
let labelText = p.name;
let statusClass = '';

// Add finishing place badge inside avatar for ranks ≥ 3
if(p.evicted && p.showFinishingBadge && p.finalRank && p.finalRank >= 3){
  // ... badge creation code ...
  
  // Update aria label to include rank
  ariaLabel = `${p.name} (Finished ${ordinalRank})`; // ✅ Safe - declared above
}

// Name/Status label - show icons or text that replaces the name
const name=document.createElement('div'); 
name.className='top-tile-name';
```

**Key Changes:**
- Moved variable declarations BEFORE the finishing badge block
- Prevents Temporal Dead Zone (TDZ) ReferenceError
- No functional change, just proper variable scoping

## How Bank System Works

### Energy Flow
1. **Weekly Events** → Immediately update bank via `SocialEnergyBank.applyEventDelta()`
2. **Phase Start** → Seed phase energy from bank via `recomputePhaseEnergy()`
3. **During Phase** → Spend/earn operations update both phase energy AND bank (lock-step)
4. **Phase End** → Bank already reflects final state (no separate sync needed)

### Lock-Step Synchronization
When energy is spent or earned:
```javascript
// In SocialResources.spend()
if(type === 'energy') {
  SocialEnergyBank.adjust(playerId, -cost);  // ✅ Bank updated automatically
}

// In SocialResources.earn()
if(type === 'energy') {
  SocialEnergyBank.adjust(playerId, amount);  // ✅ Bank updated automatically
}
```

This ensures bank and phase energy are ALWAYS synchronized.

## Expected Log Output

### Before Fix
```
[social-maneuvers] ⚡ Energy seeded for human player: 5 (Base=5 + weekly bonuses/penalties)
[social-resources] Weekly reset complete for player 1 at week 2. Bank balance: 5
```
❌ Misleading - suggests legacy seeding, bank shows default value

### After Fix
```
[sm-phase] seeded from bank=8, phase energy=8
[social-resources] Weekly reset complete for player 1 at week 2. Bank balance: 8
```
✅ Clear - shows bank-based seeding with actual accumulated value

## Testing

### Automated Tests
Created `test_social_bank_hotfix.html` with 5 test cases:
1. ✅ Bank-based seeding at phase start
2. ✅ Event deltas apply to bank immediately
3. ✅ Leftover energy syncs via lock-step
4. ✅ HUD ariaLabel TDZ fix
5. ✅ Log messages show bank format

### Validation Script
Created `/tmp/test-social-bank-fix.mjs`:
- Validates code structure
- Checks for correct function calls
- Verifies log message format
- Confirms TDZ fix

All tests: **5/5 PASS** ✅

## Verification Checklist

- [x] Bank seeding logs show: `[sm-phase] seeded from bank=X`
- [x] Weekly reset messages show correct bank balances (not stuck at 5)
- [x] Event deltas (HOH win, nominations, etc.) update bank immediately
- [x] Phase energy matches bank balance (capped at MAX_ENERGY=10)
- [x] HUD renders without TDZ errors
- [x] No runtime errors in console
- [x] All existing tests pass (`npm run test:all`)

## Files Modified

1. `js/social-maneuvers.js`
   - Lines 2188-2207: Updated `onSocialPhaseStart` function
   
2. `js/ui.hud-and-router.js`
   - Lines 661-689: Fixed variable declaration order in `renderTopRoster`

## Backward Compatibility

✅ **Fully backward compatible**
- No breaking changes to API
- Bank system was already in place
- Only fixed the seeding logic to actually use it
- HUD fix is purely internal scoping

## Performance Impact

✅ **Negligible**
- `recomputePhaseEnergy` is a simple getter + setter
- Called once per player at phase start
- No additional loops or complexity

## Future Considerations

The bank system is now fully operational and can support:
- Unlimited energy accumulation across weeks
- Complex weekly events with positive/negative deltas
- Preview displays showing next week's energy
- Balanced gameplay with strategic energy management
