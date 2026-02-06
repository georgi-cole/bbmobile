# Snake Minigame Scoring Fix - Summary

## Problem Statement
The snake minigame was producing NaN (Not a Number) scores instead of valid numerical scores, breaking the game's scoring system.

## Root Cause Analysis
The issue was in `js/minigames/error-handler.js`, specifically in the `safeOnComplete` function that wraps minigame completion callbacks.

### The Bug
```javascript
// OLD CODE (BUGGY)
if(typeof score !== 'number' || isNaN(score)){
  console.warn(`Invalid score from "${gameKey}":`, score);
  score = 50; // Default to middle score
}
```

This validation logic expected scores to always be numbers, but several minigames (snake, count-house, tetris) return a `scoreData` object with this structure:

```javascript
{
  score: 450,                      // The actual score
  rawScore: 45,                    // Raw game metric
  rawScoreDisplay: '45 food eaten', // Human-readable display
  isNewPersonalBest: false         // Best score flag
}
```

When the error handler received a scoreData object:
1. `typeof score !== 'number'` evaluated to `true` (it's an object)
2. `isNaN(score)` evaluated to `true` (NaN for objects)
3. The validation incorrectly treated valid scores as invalid
4. The object was replaced with `50`, causing score calculation issues

## The Fix

Updated `js/minigames/error-handler.js` to handle both formats:

```javascript
// NEW CODE (FIXED)
if(typeof score === 'object' && score !== null){
  // New scoreData object format
  if(typeof score.score === 'number' && !isNaN(score.score)){
    // Valid scoreData object - pass through as-is
    onComplete(score);
    return;
  } else {
    console.warn(`Invalid scoreData from "${gameKey}":`, score);
    score = 50;
  }
} else if(typeof score === 'number'){
  // Legacy number format
  if(isNaN(score)){
    console.warn(`Invalid number score from "${gameKey}":`, score);
    score = 50;
  }
  // Valid number - clamp to valid range
  score = Math.max(0, Math.min(1500, score));
} else {
  // Invalid type
  console.warn(`Invalid score type from "${gameKey}":`, score);
  score = 50;
}
```

### Key Improvements
1. **Proper scoreData handling**: Objects with valid `score` properties are passed through unchanged
2. **Legacy compatibility**: Number scores continue to work as before
3. **Correct score range**: Clamping updated to 0-1500 (matching central-scoring.js SCALE * 1.5)
4. **Better error messages**: Clearer warnings for each validation failure case

## Files Changed
- `js/minigames/error-handler.js` - Core fix

## Testing
Created comprehensive test files:
- `test_snake_scoring_fix.html` - Interactive browser test with 4 test scenarios
- `test_snake_fix_verification.mjs` - Automated verification script showing before/after behavior

### Test Results
```
✓ Snake scoreData objects (score=450) - Pass through correctly
✓ Legacy number scores (score=450) - Validated and clamped
✓ NaN detection - Properly caught and defaulted
✓ Invalid scoreData (score=NaN) - Properly caught and defaulted
✓ Zero scores - Handled correctly
✓ High scores (1000+) - No longer incorrectly capped
```

### Validation Results
- ✅ ESLint: No errors
- ✅ Minigame tests: 51/51 games registered, 31/31 selector pool resolved
- ✅ CodeQL security scan: No alerts
- ✅ All existing tests pass

## Impact
### Direct Benefits
- **Snake minigame**: Now correctly reports scores instead of NaN
- **Count-house minigame**: Also benefits from the fix (uses scoreData)
- **Tetris minigame**: Also benefits from the fix (uses scoreData)

### Broader Impact
- No breaking changes to existing minigames using number scores
- Error handling is more robust and informative
- Score range properly supports the full 0-1500 scale

## Compatibility
- ✅ Backward compatible with legacy number-based minigames
- ✅ Forward compatible with new scoreData-based minigames
- ✅ No changes required to existing minigame code
- ✅ No changes required to competition system (already handled both formats)

## Related Code
The competition system in `js/competitions.js` already had proper handling for both formats:

```javascript
if (typeof result === 'object' && result !== null && typeof result.score === 'number') {
  // New scoreData object format
  base = result.score;
  rawScoreDisplay = result.rawScoreDisplay || null;
  isNewPersonalBest = result.isNewPersonalBest || false;
} else if (typeof result === 'number') {
  // Legacy number format
  base = result;
}
```

The bug was specifically in the error handler's validation wrapper, not in the competition system itself.

## Prevention
To prevent similar issues in the future:
1. When adding validation logic, consider both legacy and new formats
2. Test with actual minigame outputs, not just mock data
3. Review error handler changes carefully as they affect all minigames
4. Keep validation logic in sync with the competition system's expectations

## References
- Central Scoring: `js/minigames/central-scoring.js` (SCALE = 1000, max = 1500)
- Competition System: `js/competitions.js` (handles both score formats)
- Snake Minigame: `js/minigames/snake.js` (returns scoreData)
- Count House Minigame: `js/minigames/count-house.js` (returns scoreData)
- Tetris Minigame: `js/minigames/tetris.js` (returns scoreData)
