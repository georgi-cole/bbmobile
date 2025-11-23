# Level Consistency Fix Guide

## Problem Statement
The Leaderboard and Overview tabs in the Progression modal showed inconsistent levels and XP for the same player.

## Root Cause
The `getPlayerState` fallback function in `progression-bridge.js` was using a simple level calculation formula:
```javascript
const level = Math.floor(totalXP / 100) + 1;
```

This didn't match the actual level thresholds used by the reducer, which uses a more sophisticated threshold system where:
- Level 1: 0 XP
- Level 2: 100 XP
- Level 3: 250 XP
- Level 4: 500 XP
- Level 5: 850 XP
- Level 6: 1300 XP
- etc.

## Solution
1. **Exported `computeLevel` function** from `reducer.ts` to make it reusable across the codebase
2. **Re-exported from `core.ts`** for easier access via the progression core module
3. **Updated `progression-bridge.js`** to use the proper `computeLevel` function with `DEFAULT_LEVEL_THRESHOLDS`

## Changes Made

### 1. `src/progression/reducer.ts`
Changed:
```typescript
function computeLevel(
```
To:
```typescript
export function computeLevel(
```

### 2. `src/progression/core.ts`
Added:
```typescript
export { computeLevel } from './reducer.js';
```

### 3. `js/progression-bridge.js`
Changed the fallback calculation from:
```javascript
// Simple level calculation (100 XP per level)
const level = Math.floor(totalXP / 100) + 1;
const currentLevelXP = totalXP % 100;
const nextLevelXP = 100;
const progressPercent = Math.round((currentLevelXP / nextLevelXP) * 100);
```

To:
```javascript
// Use proper level calculation with thresholds (same as reducer)
const levelThresholds = progressionCore.DEFAULT_LEVEL_THRESHOLDS || [];
const { level, nextLevelXP, currentLevelXP } = progressionCore.computeLevel 
  ? progressionCore.computeLevel(totalXP, levelThresholds)
  : { level: 1, nextLevelXP: 100, currentLevelXP: 0 };

const progressPercent = currentLevelXP > 0 
  ? Math.round(((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100)
  : 0;
```

## Manual Verification Steps

### Option 1: Browser-based Test
1. Open `test_level_consistency.html` in a browser
2. Click "Run Tests"
3. Verify all tests pass, especially:
   - "Level consistency check" 
   - "XP consistency check"
   - "Progress consistency check"
   - Level threshold tests for various XP values

### Option 2: In-Game Verification
1. Start a new game with progression enabled
2. Play through several weeks, earning XP for multiple players
3. Open the Progression modal (XP badge click)
4. Open browser console (F12)
5. Look for debug logs:
   ```
   [Progression Bridge] Overview state: { totalXP: X, level: Y, progressPercent: Z }
   [Progression Bridge] Leaderboard player: { playerId: ..., totalXP: X, level: Y }
   ```
6. Switch between Leaderboard and Overview tabs
7. Verify:
   - Same player shows same level in both tabs
   - Same XP amount in both tabs
   - Progress percentage is consistent

### Expected Behavior
- **Before Fix**: Leaderboard might show "Level 4" while Overview shows "Level 3" for 375 XP
- **After Fix**: Both tabs show "Level 3" for 375 XP (because 375 is between threshold 250 and 500)

## Test Results

### Unit Test (computeLevel function)
✓ All 8 test cases pass:
- 0 XP = Level 1
- 50 XP = Level 1  
- 100 XP = Level 2
- 250 XP = Level 3
- 500 XP = Level 4
- 850 XP = Level 5
- 1300 XP = Level 6
- 375 XP = Level 3

### TypeScript Compilation
✓ No type errors (`npm run typecheck:progression`)

## Benefits
1. **Single Source of Truth**: Both tabs now use the same `computeLevel` function with the same level thresholds
2. **Consistency**: Level and XP calculations are always in sync
3. **Maintainability**: Future changes to level thresholds only need to be made in one place (`constants.ts`)
4. **Type Safety**: Function is properly typed and exported from TypeScript modules

## Related Files
- `src/progression/reducer.ts` - Core level calculation logic
- `src/progression/core.ts` - Re-exports for easy access
- `src/progression/constants.ts` - Level threshold definitions
- `js/progression-bridge.js` - Bridge between TypeScript modules and main game
- `src/progression/xp-modal.js` - Modal UI (uses the calculated states)

## Notes
- The fix is backward compatible - if `computeLevel` is not available, it falls back to safe defaults
- Debug logging can be removed in a future cleanup PR if desired
- The modal already had the correct Overview calculation; only the Leaderboard fallback needed fixing

---

## Update: Global vs Seasonal XP (v2)

### Problem Extension
The original fix addressed level consistency but didn't handle:
1. XP overflow beyond max level (Level 20 at 34,000 XP)
2. Distinction between Global (aggregate) XP and Seasonal XP
3. Negative milestone values when totalXP > maxThreshold
4. Progress percentage exceeding 100%

### Solution v2

#### 1. Max Level Handling
**Changes to `computeLevel` (reducer.ts):**
- Returns `isMax: boolean` flag when at max level
- Sets `nextLevelXP = currentLevelXP` (not `+1000`) when at max
- Ensures no fabricated threshold beyond Level 20

**Changes to `reduceEvents` (reducer.ts):**
- Sets `progressPercent = 100` when `isMax = true`
- Clamps progress to max 100% even if not at max
- Includes `isMax` in returned `PlayerState`

#### 2. Global vs Seasonal XP
**New Utilities (`utils/player.ts`):**
- `filterEventsByPlayer` - Get events for specific player
- `filterEventsBySeason` - Get events for specific season
- `computeXPFromEvents` - Calculate XP with cap enforcement
- `computePlayerXP` - Get both aggregateXP (all seasons) and seasonXP (current season)
- `computePlayerState` - Build PlayerState with both XP values

**Key Principle:**
- **Level** is always computed from **aggregate XP** (total across all seasons)
- **Leaderboard ranking** uses **seasonal XP** (current season only)
- Both values are stored and displayed separately

#### 3. UI Updates (xp-modal.js)
**Overview Tab:**
- Shows "Max Level Achieved" when `isMax = true`
- Progress bar never exceeds 100%
- Milestone shows "Max Level" instead of negative values
- Optional "Overflow XP" display when beyond max level
- Seasonal XP shown with label "(for ranking only)"

**Leaderboard Tab:**
- Sorted by seasonal XP (for competitive ranking)
- Displays "Level X (Global)" to clarify it's from aggregate XP
- Shows "Season XP" for ranking value
- Shows "Total: X XP" for aggregate XP
- Tooltip explains the difference

#### 4. Bridge Updates (progression-bridge.js)
**getPlayerState:**
- Accepts optional `seasonId` parameter
- Returns both `totalXP` (aggregate) and `seasonXP`
- Computes `isMax` flag and clamped progress
- Falls back gracefully if utilities unavailable

**getLeaderboard:**
- Passes `seasonId` to `getPlayerState`
- Returns array with `aggregateXP`, `seasonXP`, and `level`
- Sorts by `seasonXP` for ranking
- Level always derived from `aggregateXP`

### Test Coverage
Run `test_xp_level_consistency_v2.html` to verify:
- ✓ Max level detection with `isMax = true`
- ✓ Progress clamped at 100%
- ✓ No negative milestones
- ✓ Seasonal vs Aggregate XP separation
- ✓ Level from aggregate, ranking from seasonal
- ✓ Edge case: Zero seasonal XP with non-zero aggregate
- ✓ No fabricated `+1000` at max level

### Constants
- `MAX_LEVEL = 20` exported from `constants.ts`
- Level 20 threshold confirmed at 34,000 XP
- No threshold beyond Level 20

### Migration Notes
**For Existing Games:**
- All players' XP history is preserved
- Level recalculated from aggregate XP
- Seasonal XP computed by filtering events by `season` field
- If `season` field missing, defaults to 0 (won't affect aggregate)

**For New Games:**
- Events should include `season` field for proper seasonal tracking
- Leaderboard ranking will use seasonal XP
- Level progression uses aggregate XP as before

### Related Files (v2)
- `src/progression/utils/player.ts` - New utility functions
- `src/progression/types.ts` - Added `isMax` and `seasonXP` fields
- `src/progression/constants.ts` - Added `MAX_LEVEL` constant
- `src/progression/reducer.ts` - Enhanced `computeLevel` and `reduceEvents`
- `src/progression/core.ts` - Added `getPlayerState(playerId, seasonId)`
- `js/progression-bridge.js` - Updated for seasonal XP support
- `src/progression/xp-modal.js` - UI for max level and seasonal XP
