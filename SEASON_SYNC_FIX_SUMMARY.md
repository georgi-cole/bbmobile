# Season Number Sync Fix - Summary

## Issue Description

Users reported that their profile showed "Season 3" but the UI pill displayed "S1W1" instead of "S3W1". This inconsistency occurred because the profile's season number was not being synchronized with the game state.

### Visual Evidence of the Issue

**Before Fix:**
- Profile modal shows: "Season 3" 
- UI pill shows: "S1W1" ❌ (incorrect)

**After Fix:**
- Profile modal shows: "Season 3"
- UI pill shows: "S3W1" ✅ (correct)

## Root Cause Analysis

The issue was traced to three locations:

1. **`src/profile/profileService.js`** - The `applyProfileToGame()` function stored the profile's season in `humanPlayer.meta.season` but never set `game.season`
2. **`js/state.js`** - The initial game state didn't include a `season` property
3. **`js/bootstrap.js`** - The `resetRoundState()` function didn't preserve the `season` value when resetting game state

The `compactHud.js` module reads from `game.season` to display the season/week pill:
```javascript
const season = game.season || 1;  // Line 407 in compactHud.js
const text = `S${season}W${weekText}`;
```

Since `game.season` was never set, it always defaulted to 1, creating the inconsistency.

## Solution

### 1. Update profileService.js
Added season synchronization when applying a profile to the game:

```javascript
// Update game.season to sync with profile
// This ensures the season/week pill displays the correct season number
global.game.season = profile.season || 1;
```

### 2. Update state.js
Added `season` to the initial game state:

```javascript
const game = {
  cfg: { /* ... */ },
  week: 1,
  season: 1,  // Added this line
  phase: 'lobby',
  // ...
};
```

### 3. Update bootstrap.js
Preserved season value in `resetRoundState()`:

```javascript
function resetRoundState() {
  const g = global.game;
  Object.assign(g, {
    week: 1,
    season: g.season || 1,  // Preserve existing season or default to 1
    phase: 'lobby',
    // ...
  });
}
```

## Testing

Created comprehensive test suite in `test_season_sync.html` with 4 test cases:

### Test 1: Profile Season Sync
✅ **PASSED** - When a profile with season=3 is applied, `game.season` is correctly set to 3

### Test 2: Guest Mode Default Season
✅ **PASSED** - Guest mode correctly defaults to season=1

### Test 3: HUD Season Display
✅ **PASSED** - CompactHud reads season from `game.season` and displays correct format (e.g., "S5W2")

### Test 4: Profile Season Switching
✅ **PASSED** - Switching between profiles with different seasons works correctly:
- Apply profile1 (season=1) → `game.season = 1`
- Apply profile2 (season=7) → `game.season = 7`
- Switch back to profile1 → `game.season = 1`

## Impact Analysis

### Files Changed
- `src/profile/profileService.js` - 3 lines added
- `js/state.js` - 1 line modified
- `js/bootstrap.js` - 1 line modified
- `test_season_sync.html` - 305 lines added (test file)

### Affected Features
- ✅ Profile selection and application
- ✅ Season/week pill display in UI
- ✅ Guest mode
- ✅ Game state persistence (already supported via persistence.js)

### Backwards Compatibility
✅ **Fully backwards compatible**
- Existing profiles without explicit season will default to 1
- Guest mode continues to work with season=1
- Saved games already include season in the save data

## Verification

### Code Review
✅ **PASSED** - 2 minor suggestions for test improvements (non-blocking)

### Security Scan
✅ **PASSED** - No vulnerabilities found

### Manual Testing
✅ All tests passed in browser environment

## Related Files

### Core Game Files
- `src/ui/compactHud.js` - Reads `game.season` to display pill (no changes needed)
- `js/persistence.js` - Already saves/loads `game.season` (no changes needed)
- `src/ui/ProfileModal.js` - Displays season in profile cards (no changes needed)

### Test Files
- `test_season_sync.html` - New test suite for season synchronization
- `test_guest_season.html` - Existing test for guest mode (still valid)

## Deployment Notes

No special deployment steps required. This is a bug fix that:
1. Adds minimal code (5 lines total)
2. Maintains backwards compatibility
3. Requires no database migrations
4. Introduces no breaking changes

## Future Considerations

This fix properly establishes `game.season` as the single source of truth for the current season number. Any future features that need to display or use the season number should reference `game.season` rather than reading from profile or player metadata.
