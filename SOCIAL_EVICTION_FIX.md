# Social Module Eviction Fix

## Problem
When the human player is evicted from the game, the Social Maneuvers module remains active and allows the evicted player to continue executing interactions. This is unintended behavior, as evicted players should not be able to participate in social interactions.

## Solution
Added eviction checks at multiple key points in the Social Maneuvers system to prevent evicted players from interacting with the social module.

## Changes Made

### 1. social-maneuvers.js

#### `onSocialPhaseStart()` - Line ~2729
**Before:**
```javascript
function onSocialPhaseStart(){
  if(!isEnabled()){ console.info('[social-maneuvers] Phase start called but feature is DISABLED'); return; }
  console.info('[social-maneuvers] ▶️ onSocialPhaseStart() - entering social_intermission phase');
  const alivePlayers = getAlivePlayers();
  const humanId = global.game?.humanId;
  // ... rest of function
```

**After:**
```javascript
function onSocialPhaseStart(){
  if(!isEnabled()){ console.info('[social-maneuvers] Phase start called but feature is DISABLED'); return; }
  console.info('[social-maneuvers] ▶️ onSocialPhaseStart() - entering social_intermission phase');
  const alivePlayers = getAlivePlayers();
  const humanId = global.game?.humanId;
  
  // Check if human player is evicted - skip social phase if they are
  const humanPlayer = global.getP?.(humanId);
  if(humanPlayer && humanPlayer.evicted){
    console.info('[social-maneuvers] ⏭️ Human player is evicted - skipping social phase');
    return;
  }
  // ... rest of function
```

**Impact:** Prevents the entire social phase from initializing if the human player has been evicted.

---

#### `renderSocialManeuversUI()` - Line ~1275
**Before:**
```javascript
function renderSocialManeuversUI(container, playerId){
  if(!isEnabled()){ console.info('[social-maneuvers] UI render requested but feature is DISABLED'); return; }
  console.info('[social-maneuvers] ✓ Rendering Social Maneuvers UI for player', playerId);
  if(!container){ console.warn('[social-maneuvers] No container provided for UI'); return; }

  const resources = SocialResources.getAll(playerId);
  const alivePlayers = global.alivePlayers?.() || [];
  // ... rest of function
```

**After:**
```javascript
function renderSocialManeuversUI(container, playerId){
  if(!isEnabled()){ console.info('[social-maneuvers] UI render requested but feature is DISABLED'); return; }
  console.info('[social-maneuvers] ✓ Rendering Social Maneuvers UI for player', playerId);
  if(!container){ console.warn('[social-maneuvers] No container provided for UI'); return; }

  // Check if player is evicted
  const player = global.getP?.(playerId);
  if(player && player.evicted){
    console.info('[social-maneuvers] Player', playerId, 'is evicted - showing eviction message');
    const evictedMessage = document.createElement('div');
    evictedMessage.className = 'social-evicted-message';
    evictedMessage.style.cssText = 'padding: 24px; text-align: center; color: #999; font-size: 1.1rem;';
    evictedMessage.innerHTML = `
      <h3 style="margin-bottom: 12px; color: #ff6b6b;">You Have Been Evicted</h3>
      <p>You can no longer participate in social interactions.</p>
    `;
    container.innerHTML = '';
    container.appendChild(evictedMessage);
    return;
  }

  const resources = SocialResources.getAll(playerId);
  const alivePlayers = global.alivePlayers?.() || [];
  // ... rest of function
```

**Impact:** Displays an eviction message instead of the social UI when an evicted player tries to view it.

---

### 2. socialize-mobile.js

#### `ensureSocializeLauncher()` - Line ~96
**Before:**
```javascript
function ensureSocializeLauncher() {
  // Prevent re-entrant calls during mounting
  if (_isCurrentlyMounting) {
    return null;
  }
  
  let launcher = $('#socializeLauncher');
  if (launcher) return launcher;
  // ... rest of function
```

**After:**
```javascript
function ensureSocializeLauncher() {
  // Prevent re-entrant calls during mounting
  if (_isCurrentlyMounting) {
    return null;
  }
  
  // Check if human player is evicted - hide launcher if they are
  const g = global.game || {};
  const humanId = g.humanId;
  const humanPlayer = global.getP?.(humanId);
  if(humanPlayer && humanPlayer.evicted){
    console.info('[socialize-mobile] Human player is evicted - not mounting launcher');
    return null;
  }
  
  let launcher = $('#socializeLauncher');
  if (launcher) return launcher;
  // ... rest of function
```

**Impact:** Prevents the social launcher button from being created/shown for evicted players.

---

#### `openSocializeModal()` - Line ~253
**Before:**
```javascript
function openSocializeModal() {
  const res = getResourceState();
  if (res.energy <= 0) {
    global.addLog?.('No energy remaining for social actions.', 'warn');
    return;
  }
  // ... rest of function
```

**After:**
```javascript
function openSocializeModal() {
  const g = global.game || {};
  const humanId = g.humanId;
  const humanPlayer = global.getP?.(humanId);
  
  // Check if player is evicted
  if(humanPlayer && humanPlayer.evicted){
    console.info('[socialize-mobile] Human player is evicted - cannot open modal');
    global.addLog?.('You have been evicted and can no longer participate in social interactions.', 'danger');
    return;
  }
  
  const res = getResourceState();
  if (res.energy <= 0) {
    global.addLog?.('No energy remaining for social actions.', 'warn');
    return;
  }
  // ... rest of function
```

**Impact:** Blocks the modal from opening and shows an error message if an evicted player tries to open it.

---

#### `executeAction()` - Line ~836
**Before:**
```javascript
function executeAction() {
  const selectedPlayers = Array.from($$('.player-card.selected'));
  const selectedAction = $('.action-btn.selected');
  const res = getResourceState();

  if (!selectedPlayers.length || !selectedAction || res.energy <= 0) {
    return;
  }

  const actionId = selectedAction.dataset.actionId;
  const minTargets = parseInt(selectedAction.dataset.minTargets) || 1;
  const g = global.game || {};
  const you = global.getP?.(g.humanId);

  if (!you) return;
  // ... rest of function
```

**After:**
```javascript
function executeAction() {
  const selectedPlayers = Array.from($$('.player-card.selected'));
  const selectedAction = $('.action-btn.selected');
  const res = getResourceState();
  
  const g = global.game || {};
  const humanId = g.humanId;
  const humanPlayer = global.getP?.(humanId);
  
  // Check if player is evicted
  if(humanPlayer && humanPlayer.evicted){
    console.info('[socialize-mobile] Human player is evicted - cannot execute action');
    global.addLog?.('You have been evicted and can no longer participate in social interactions.', 'danger');
    closeSocializeModal(false);
    return;
  }

  if (!selectedPlayers.length || !selectedAction || res.energy <= 0) {
    return;
  }

  const actionId = selectedAction.dataset.actionId;
  const minTargets = parseInt(selectedAction.dataset.minTargets) || 1;
  const you = global.getP?.(g.humanId);

  if (!you) return;
  // ... rest of function
```

**Impact:** Prevents any social actions from being executed by evicted players and closes the modal if they try.

---

#### `isInSocialPhase()` - Line ~1214
**Before:**
```javascript
function isInSocialPhase() {
  const g = global.game || {};
  return g.phase === 'social_intermission' || g.phase === 'social';
}
```

**After:**
```javascript
function isInSocialPhase() {
  const g = global.game || {};
  const isPhaseCorrect = g.phase === 'social_intermission' || g.phase === 'social';
  
  // Also check if human player is evicted
  const humanId = g.humanId;
  const humanPlayer = global.getP?.(humanId);
  const isNotEvicted = !(humanPlayer && humanPlayer.evicted);
  
  return isPhaseCorrect && isNotEvicted;
}
```

**Impact:** Makes the phase check also consider eviction status, so the launcher/UI won't be shown during social phase if player is evicted.

---

## Testing

A manual test file has been created at `test_social_eviction_fix.html` which includes:

1. **Test 1**: Social Phase Start with Evicted Player
2. **Test 2**: UI Render with Evicted Player
3. **Test 3**: Launcher Visibility with Evicted Player
4. **Test 4**: Modal Opening with Evicted Player
5. **Test 5**: isInSocialPhase with Evicted Player
6. **Integration Test**: Full Game Flow simulation

### How to Test Manually in Game

1. Start a game with the human player
2. Progress through the game normally
3. During any social_intermission phase, verify the social UI works
4. Use debug console to manually evict the human player:
   ```javascript
   const human = game.players.find(p => p.id === game.humanId);
   human.evicted = true;
   ```
5. Verify the following:
   - Social launcher button is hidden or removed
   - Attempting to open the social modal shows error message
   - The `isInSocialPhase()` function returns `false`
   - If social phase starts again, it is skipped with log message
   - UI shows "You Have Been Evicted" message if rendered

## Edge Cases Handled

1. **Player evicted during social phase**: The executeAction function will block any pending actions
2. **Phase transition with evicted player**: onSocialPhaseStart will skip initialization
3. **UI render after eviction**: Shows eviction message instead of UI
4. **Launcher remounting**: ensureSocializeLauncher prevents remounting for evicted players

## Backward Compatibility

The changes are backward compatible:
- All checks use optional chaining (`?.`) to avoid errors if functions don't exist
- Existing functionality for alive players is unchanged
- No breaking changes to APIs or function signatures

## Performance Impact

Minimal - the checks add only a few simple property lookups at key decision points:
- `global.getP(humanId)` - O(1) or O(n) depending on implementation
- `player.evicted` - O(1) property access

## Future Considerations

These checks could be extended to:
1. Add similar checks for AI players (if they should also be blocked from social interactions when evicted)
2. Add telemetry to track how often evicted players attempt to interact
3. Add UI feedback explaining why social actions are blocked (already partially implemented)
