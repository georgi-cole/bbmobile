# PR Title
Add PlayerService and robust Self Evict dropdown population

# PR Body

## Summary

This PR adds a centralized `PlayerService` module that provides a single source of truth for alive player state with pub/sub notifications. It also updates the Settings → Advanced → Self Evict dropdown to use PlayerService for robust, live-updating player lists.

## Changes

### Files Added
1. **`js/player/PlayerService.js`** (228 lines)
   - Minimal, well-documented module with EventTarget-based pub/sub
   - API: `getAlivePlayers()`, `setAlivePlayers()`, `subscribe()`, `onNextChange()`
   - Seeds from existing globals if available
   - Normalizes player shapes and emits 'players:change' events

2. **`test_player_service.html`** (400+ lines)
   - Comprehensive test suite for PlayerService
   - Tests module loading, API methods, subscriptions
   - Tests Settings modal integration and live updates

3. **`PLAYERSERVICE_IMPLEMENTATION.md`** (200+ lines)
   - Complete implementation documentation
   - API usage examples
   - Integration guide for future PRs

### Files Modified
1. **`js/ui.config-and-settings.js`**
   - Extracted `populateSelfEvictDropdown()` function with PlayerService support
   - Added `setupPlayerServiceSubscription()` for live updates
   - Updated `openSettingsModal()` to subscribe to PlayerService
   - Updated `closeSettingsModal()` to clean up subscriptions
   - Uses MutationObserver to detect modal removal from DOM
   - Falls back to existing globals if PlayerService unavailable

2. **`index.html`**
   - Added PlayerService script tag before ui.config-and-settings.js

## Key Features

✅ **Single Source of Truth** - Centralized alive player state  
✅ **Live Updates** - Dropdown automatically updates when players change  
✅ **Backwards Compatible** - Falls back to existing globals  
✅ **Clean Subscriptions** - Automatic cleanup via MutationObserver  
✅ **Defensive** - Comprehensive error handling and logging  
✅ **Non-Breaking** - No changes to existing game flow  

## Testing Instructions

### Automated Test Suite
1. Open `test_player_service.html` in browser
2. Verify "Module Loading" shows green checkmark
3. Click "Get Players" → should show 10 players
4. Click "Test Subscribe" → should log subscription
5. Click "Simulate Eviction" → callback should fire with 9 players
6. Click "Open Settings Modal" → dropdown should show 9 players
7. With modal open, click "Simulate Return" → dropdown updates to 10 players
8. Close modal → subscription cleanup logged

### Manual Verification in Game
1. Start a new game with 12 players
2. Open Settings → Advanced tab
3. Verify "Self-evict player" dropdown shows all 12 players
4. Keep modal open
5. In console: `PlayerService.setAlivePlayers(window.g.game.players.slice(0, 10))`
6. Verify dropdown updates to show 10 players
7. Close modal
8. Verify no errors in console

## Screenshots

### PlayerService Test Suite
![Test Suite](https://github.com/user-attachments/assets/0e461992-20e0-4934-8d1a-00055bd6c024)

*Test suite showing module loading, API tests, and event logging*

### Settings Modal with Self-Evict Dropdown
![Settings Modal](https://github.com/user-attachments/assets/58ce8cf5-56be-4fea-bdf1-3098e7759dbc)

*Settings → Advanced showing self-evict dropdown populated with 9 alive players (after one eviction)*

## Integration Points (Future Work)

This PR intentionally does not modify core game files. To enable live updates throughout the game, add `PlayerService.setAlivePlayers()` calls in these locations:

1. **Game initialization** - When players array is first populated
2. **After eviction** - When a player is marked as evicted
3. **After return twist** - When an evicted player returns
4. **After self-eviction** - When self-eviction handler completes

Example:
```javascript
// In eviction handler
player.evicted = true;
if (window.PlayerService) {
  PlayerService.setAlivePlayers(game.players);
}
```

## Benefits

1. **Better UX** - No stale data in dropdowns
2. **Extensible** - Easy to add more subscribers in other UI components
3. **Testable** - Comprehensive test suite included
4. **Clean Code** - Separates state management from UI code
5. **Memory Safe** - Proper cleanup prevents leaks
6. **Maintainable** - Well-documented with clear API

## Notes

- Implementation is intentionally minimal and non-invasive
- PlayerService is purely additive - existing code continues to work
- No runtime breaking changes - defensive error handling throughout
- Integration with core game files can be done incrementally
- Falls back gracefully if PlayerService unavailable

## Checklist

- [x] Code follows project style guidelines
- [x] Comprehensive error handling and logging
- [x] Backwards compatible - no breaking changes
- [x] Test suite included and passing
- [x] Documentation complete (PLAYERSERVICE_IMPLEMENTATION.md)
- [x] Screenshots provided
- [x] Integration guide for future PRs

---

**Ready for review!** This PR provides the foundation for live-updating UIs throughout the application. Future PRs can integrate PlayerService into core game flows.
