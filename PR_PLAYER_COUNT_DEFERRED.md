# Player Total Update Issue Fix - Summary

## Problem
Users reported that changing the Players total from Settings → Cast tab triggers an immediate restart/rebuild or page reload mid-season, which interrupts the current game. The desired behavior is to defer application of the new player count until the next season starts or the user manually refreshes.

## Solution Implemented

### Files Changed
1. **js/players-total.js** - Injector for Players total control
2. **js/settings.js** - Legacy settings module (deprecated but kept for reference)
3. **js/ui.config-and-settings.js** - Main settings UI module

### Key Changes

#### 1. Deferred Mid-Season Application
All three files now defer player count application when not in lobby:
- **Before**: Called `location.reload()` immediately mid-season
- **After**: Logs message "Players set to X. Will apply next season or after a manual refresh." with `ok` level (green)
- **Lobby behavior preserved**: Still rebuilds cast and starts opening sequence

#### 2. Unified Player Range
Standardized min/max range across all files:
- **Before**: Inconsistent (4-16 in settings.js, 6-22 in players-total.js)
- **After**: Unified to 6-22 everywhere

#### 3. Event Handler Changes
Removed immediate application on field change:
- **Before**: Change events called apply functions immediately → triggered reload
- **After**: Only input events for UI clamping (validate 6-22 range)
- **Persistence**: Apply/Save buttons now handle persistence via `applySettingsFromModal`

#### 4. Data Persistence Flow
Updated persistence to use modal Apply/Save buttons:
- Added `data-key="numPlayers"` attribute to injected input
- `applySettingsFromModal` now detects `numPlayers` changes and calls `applyPlayersFromSettings`
- Removed direct change event listeners that called apply functions

## Technical Details

### js/players-total.js Changes
```javascript
// Line 130: Added data-key attribute
<input id="numPlayersCast" type="number" min="6" max="22" value="12" data-key="numPlayers" style="width:100%"/>

// Lines 147-149: Removed change listener that called applyPlayers()
// Only kept input listener for UI clamping

// Lines 172-176: Removed reload, added deferred message
else{
  // Mid-season: defer application
  g.addLog?.(`Players set to ${val}. Will apply next season or after a manual refresh.`,'ok');
  log(`Players set to ${val}. Will apply next season or after a manual refresh.`);
}
```

### js/settings.js Changes
```javascript
// Line 757: Updated min/max from 4-16 to 6-22
const val = Math.max(6, Math.min(22, Number(v)||12));

// Lines 767-770: Removed reload, added deferred message
else{
  // Mid-season: defer application
  g.addLog?.(`Players set to ${val}. Will apply next season or after a manual refresh.`,'ok');
  console.info('[settings] Players set to', val, '. Will apply next season or after a manual refresh.');
}

// Lines 813-816: Changed from change event to input event for clamping only
input.addEventListener('input', ()=>{
  const v=Math.max(6, Math.min(22, Number(input.value)||12));
  if(String(v) !== input.value) input.value = String(v);
});
```

### js/ui.config-and-settings.js Changes
```javascript
// Lines 239-242: Removed reload, added deferred message
else {
  // Mid-season: defer application
  g.addLog?.(`Players set to ${val}. Will apply next season or after a manual refresh.`, 'ok');
  console.info('[ui.config-and-settings] Players set to', val, '. Will apply next season or after a manual refresh.');
}

// Lines 1353-1381: Updated wirePlayersTotal to only handle UI clamping
// Removed change event listeners, added input events for clamping

// Lines 1663-1681: Updated applySettingsFromModal to trigger player application
// Tracks old numPlayers value, calls applyPlayersFromSettings if changed
```

## Testing

### Automated Tests
All existing tests pass:
- ✅ Minigame key validation
- ✅ Legacy map validation  
- ✅ Runtime validation
- ✅ Runtime helpers
- ✅ E2E competition tests

### Manual Test Plan
Created `test_player_count_deferred.html` for manual verification:
1. **Mid-Season Test**: Verify no reload when changing player count mid-season
2. **Lobby Test**: Verify rebuild occurs when changing player count in lobby
3. **Range Clamping Test**: Verify 6-22 range enforcement

### Expected Behavior

#### Mid-Season Scenario
1. Start a season, progress to week 3
2. Open Settings → Cast
3. Change Players total from 12 to 8
4. Press Apply
   - ✅ Modal stays open
   - ✅ Log shows: "Players set to 8. Will apply next season or after a manual refresh." (green/ok)
   - ✅ Roster unchanged
   - ✅ No reload/rebuild
5. Press Save & Close
   - ✅ Modal closes
   - ✅ Game continues
   - ✅ Roster unchanged
6. Manually refresh page
   - ✅ Next season will use 8 players

#### Lobby Scenario
1. In lobby (before season starts)
2. Open Settings → Cast
3. Change Players total to 10
4. Press Apply
   - ✅ Cast rebuilds with 10 players
   - ✅ Opening sequence starts with 10 contestants
   - ✅ No reload

#### Range Validation
- Input 5 → Clamps to 6
- Input 25 → Clamps to 22
- Input 12 → Accepts 12

## Rollback Plan
If issues arise, the previous behavior can be restored by:
1. Re-enabling mid-season reloads in the three `apply*` functions
2. Re-adding change event listeners in the wire functions
3. Reverting the deferred log messages back to reload warnings

## Risk Assessment
- **Low Risk**: Changes are isolated to player count application flow
- **No Breaking Changes**: Lobby behavior preserved, only mid-season behavior modified
- **Backward Compatible**: All existing settings and persistence mechanisms unchanged

## Files Modified
- js/players-total.js
- js/settings.js (deprecated but maintained for consistency)
- js/ui.config-and-settings.js
- .gitignore (added test file)

## Files Created
- test_player_count_deferred.html (manual test, git-ignored)
