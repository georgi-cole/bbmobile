# PlayerService Integration Testing Guide

## Overview
This document describes the PlayerService integration with core game logic and provides testing instructions.

## Integration Points

PlayerService.setAlivePlayers() is now called at all critical player state mutation points:

### 1. Game Initialization (bootstrap.js)
- **Location**: `buildCast()` function after player creation
- **Trigger**: When creating initial game cast
- **Code**:
  ```javascript
  if(typeof global.PlayerService?.setAlivePlayers === 'function'){
    global.PlayerService.setAlivePlayers(g.players || []);
  }
  ```

### 2. Game Rebuild (bootstrap.js)
- **Location**: `rebuildGame()` function after player reset
- **Trigger**: When rebuilding game with existing players
- **Code**:
  ```javascript
  if(typeof global.PlayerService?.setAlivePlayers === 'function'){
    global.PlayerService.setAlivePlayers(g.players || []);
  }
  ```

### 3. Eviction (eviction.js)
- **Location**: `handleEvictionLegacy()` function after marking player as evicted
- **Trigger**: After any vote-based eviction
- **Code**:
  ```javascript
  if(typeof global.PlayerService?.setAlivePlayers === 'function' && g.players){
    global.PlayerService.setAlivePlayers(g.players);
  }
  ```

### 4. Self-Eviction (self-eviction.js)
- **Location**: `processEviction()` function after marking player as evicted
- **Trigger**: After self-eviction processing
- **Code**:
  ```javascript
  if(typeof global.PlayerService?.setAlivePlayers === 'function' && g.players){
    global.PlayerService.setAlivePlayers(g.players);
  }
  ```

### 5. Return Twist (twists.js)
- **Location**: `finalizeAmericaReturnVote()` function after player returns
- **Trigger**: When evicted player wins America's Vote and returns
- **Code**:
  ```javascript
  if(typeof global.PlayerService?.setAlivePlayers === 'function' && g.players){
    global.PlayerService.setAlivePlayers(g.players);
  }
  ```

### 6. Save/Load (ui.config-and-settings.js)
- **Location**: Debug import file handler after loading game state
- **Trigger**: When importing a saved game
- **Code**:
  ```javascript
  if(typeof window.PlayerService?.setAlivePlayers === 'function' && g.game?.players){
    window.PlayerService.setAlivePlayers(g.game.players);
  }
  ```

## UI Integration

### Settings Modal (ui.config-and-settings.js)

#### Polling for PlayerService
To handle race conditions where the modal opens before PlayerService loads:

```javascript
function waitForPlayerService(maxAttempts = 10, interval = 50){
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      if(typeof window.PlayerService?.subscribe === 'function'){
        resolve(true);
        return;
      }
      attempts++;
      if(attempts >= maxAttempts){
        resolve(false);
        return;
      }
      setTimeout(check, interval);
    };
    check();
  });
}
```

#### Live Subscription
The Settings modal subscribes to PlayerService updates while open:

```javascript
async function setupPlayerServiceSubscription(modal){
  if(modal.__playerServiceWired) return;
  modal.__playerServiceWired = true;
  
  const available = await waitForPlayerService();
  if(!available) return;
  
  const unsubscribe = window.PlayerService.subscribe((players) => {
    populateSelfEvictDropdown(modal);
  });
  
  modal.__playerServiceUnsub = unsubscribe;
  // ... cleanup via MutationObserver
}
```

## Testing

### Automated Test Page
Open `test_playerservice_integration.html` to run comprehensive integration tests.

### Test Scenarios

1. **Module Loading**
   - ✓ PlayerService loads successfully
   - ✓ API methods are available

2. **Game Initialization**
   - ✓ buildCast() calls setAlivePlayers()
   - ✓ rebuildGame() calls setAlivePlayers()
   - ✓ PlayerService has correct player count

3. **Eviction Flow**
   - ✓ Regular eviction calls setAlivePlayers()
   - ✓ Self-eviction calls setAlivePlayers()
   - ✓ Player count updates correctly

4. **Return Twist**
   - ✓ Player return calls setAlivePlayers()
   - ✓ Player count increases correctly

5. **Save/Load**
   - ✓ Import calls setAlivePlayers()
   - ✓ PlayerService syncs with loaded state

6. **Live Subscriptions**
   - ✓ Subscription receives updates on player changes
   - ✓ Multiple events trigger callbacks correctly

### Manual Testing

1. **Open Settings Modal**
   ```
   1. Start game
   2. Open Settings modal (Advanced tab)
   3. Check Self Evict dropdown is populated
   ```

2. **Test Live Updates**
   ```
   1. Open Settings modal
   2. Keep modal open
   3. Trigger an eviction (via debug panel or game flow)
   4. Verify dropdown updates automatically
   ```

3. **Test Race Condition Handling**
   ```
   1. Open page in slow network mode
   2. Immediately open Settings modal
   3. Wait 500ms
   4. Verify dropdown populates after PlayerService loads
   ```

4. **Test Fallback**
   ```
   1. Remove PlayerService.js from index.html
   2. Open Settings modal
   3. Verify dropdown uses g.alivePlayers() fallback
   ```

## Defensive Coding

All integration points use defensive checks:

1. **Type checking**: `typeof global.PlayerService?.setAlivePlayers === 'function'`
2. **Null safety**: `&& g.players` or `&& g.game?.players`
3. **Fallback**: UI falls back to `g.alivePlayers()` if PlayerService unavailable
4. **Logging**: Informative console logs for debugging

## Expected Console Output

When PlayerService integration is working correctly:

```
[PlayerService] Module loaded and initialized
[PlayerService] Initialized with 12 alive players
[PlayerService] Players updated: 12 alive
[PlayerService] Players updated: 11 alive (after eviction)
[PlayerService] Players updated: 12 alive (after return)
[ui.config-and-settings] Using PlayerService for self-evict dropdown
[ui.config-and-settings] PlayerService update received: 11 players
```

## Troubleshooting

### Dropdown Not Populating
1. Check PlayerService loaded: `window.PlayerService`
2. Check players exist: `window.PlayerService.getAlivePlayers()`
3. Check console for errors
4. Verify modal subscription setup: Look for "[ui.config-and-settings] PlayerService not available"

### Updates Not Reflecting
1. Check subscription is active
2. Verify setAlivePlayers() is being called at integration points
3. Check for "[PlayerService] Players updated" messages in console
4. Ensure modal wasn't closed (subscription cleanup)

### Performance Issues
1. Polling uses brief 50ms intervals with max 10 attempts (500ms total)
2. Subscriptions auto-cleanup on modal close
3. MutationObserver monitors DOM removal for cleanup
4. No memory leaks from duplicate subscriptions (flag prevents)

## Future Enhancements

Consider adding PlayerService.setAlivePlayers() calls at:
- Finale winner determination
- Double/triple eviction flows
- Any custom game modes with player mutations
