# Level Consistency Fix Guide

## Problem Statement
The Leaderboard and Overview tabs in the Progression modal showed inconsistent levels and XP for the same player.

### Specific Issues Observed
1. **Overview showing aggregate XP**: Overview displayed total XP across ALL players (e.g., 77,980 XP) instead of the current player's XP
2. **Level mismatch**: Leaderboard showed Level 18 for a player, while Overview showed Level 20 for the same player
3. **Progress percentage overflow**: Progress percentage could exceed 100%
4. **Negative remaining XP**: "Next Milestone" could show negative values when XP exceeded level threshold

## Root Causes

### Primary Issue: Aggregate vs. Per-Player State
The `showModal` function in `progression-bridge.js` was calling:
```javascript
const state = await progressionCore.getCurrentState();
```

This gets the **aggregate state** across ALL players, not the specific player's state. The Overview tab was showing cumulative XP from all players, while the Leaderboard correctly filtered by playerId.

### Secondary Issue: Missing UI Clamping
The `updateOverview` function in `xp-modal.js` directly used `state.progressPercent` and `state.nextLevelXP - state.totalXP` without bounds checking, allowing:
- Progress percentage > 100%
- Negative remaining XP

## Solution

### 1. Fixed Overview to Use Player-Specific State
**File**: `js/progression-bridge.js` (Line 168)

Changed from:
```javascript
const state = await progressionCore.getCurrentState();
```

To:
```javascript
// Get player-specific state for Overview (not aggregate)
const state = await getPlayerState(playerId);
```

**Impact**: Overview now shows the same XP and level as Leaderboard for the current player.

### 2. Added Progress Display Normalization
**File**: `src/progression/xp-modal.js` (Lines 450-453)

Added clamping logic:
```javascript
// Normalize progress display to prevent UI issues
// Clamp progress percentage to [0, 100] range
const displayProgressPercent = Math.max(0, Math.min(100, state.progressPercent || 0));

// Ensure remaining XP is never negative
const remainingXP = Math.max(0, state.nextLevelXP - state.totalXP);
```

**Impact**: 
- Progress bar never exceeds 100% width
- "Next Milestone" always shows 0 or positive XP

## Level Calculation (Already Correct)

The level calculation was already using the proper threshold-based system via `computeLevel`:

### Level Thresholds
- Level 1: 0 XP
- Level 2: 100 XP
- Level 3: 250 XP
- Level 4: 500 XP
- Level 5: 850 XP
- Level 6: 1300 XP
- etc.

The `getPlayerState` fallback in `progression-bridge.js` correctly uses:
```javascript
const { level, nextLevelXP, currentLevelXP } = progressionCore.computeLevel 
  ? progressionCore.computeLevel(totalXP, levelThresholds)
  : { level: 1, nextLevelXP: 100, currentLevelXP: 0 };
```

## Manual Verification Steps

### Option 1: Browser-based Test
1. Open `test_level_consistency.html` in a browser
2. Click "Run Tests"
3. Verify all tests pass, especially:
   - Player 1 and Player 2 show different XP/levels (not aggregate)
   - Progress percentage is within [0, 100] bounds
   - Remaining XP is never negative
   - Level threshold tests for various XP values

### Option 2: In-Game Verification
1. Start a new game with progression enabled
2. Play through several weeks, earning XP for multiple players
3. Open the Progression modal (XP badge click)
4. Open browser console (F12)
5. Look for debug logs:
   ```
   [Progression Bridge] Overview state: { playerId: ..., totalXP: X, level: Y, progressPercent: Z }
   [Progression Bridge] Leaderboard player: { playerId: ..., totalXP: X, level: Y }
   ```
6. Switch between Leaderboard and Overview tabs
7. Verify:
   - Same player shows same level in both tabs
   - Same XP amount in both tabs (NOT the sum of all players)
   - Progress percentage never exceeds 100%
   - "Next Milestone" never shows negative XP

### Expected Behavior
- **Before Fix**: 
  - Overview showed aggregate XP (e.g., 77,980) from all players combined
  - Leaderboard showed correct per-player XP (e.g., 24,775)
  - Progress could show >100% or negative remaining XP
- **After Fix**: 
  - Both tabs show the same per-player XP and level
  - Progress percentage clamped to [0, 100]
  - Remaining XP always >= 0

## Test Results

### Unit Tests (test_level_consistency.html)
✓ All test cases pass:
- computeLevel function is exported
- DEFAULT_LEVEL_THRESHOLDS is exported
- Aggregate state calculation (all players)
- Player 1 state: 375 XP = Level 3
- Player 2 state: 550 XP = Level 4
- Progress percentage bounds check [0, 100]
- Remaining XP non-negative check
- Level threshold tests:
  - 0 XP = Level 1
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
