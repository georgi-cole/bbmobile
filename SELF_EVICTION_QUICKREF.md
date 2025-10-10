# Self-Eviction Quick Reference

## How It Works

### For Players
1. **Exit Button** appears in top-right corner during active gameplay (🚪 door icon)
2. Click button to trigger self-eviction
3. Confirm action in modal (or cancel to stay)
4. Player is immediately evicted and removed from game

### For Developers

#### Main API
```javascript
// Request human self-eviction (shows confirmation)
await window.selfEviction.requestHuman(playerId);

// Direct self-eviction (no confirmation)
window.selfEviction.handle(playerId, origin);
// origin: 'human', 'ai', 'manual', 'admin'

// Check if AI can self-evict now
window.selfEviction.isAISafeWindow(); // true if safe

// Get player's current role
window.selfEviction.getPlayerRole(playerId);
// returns: { isNominee, isHOH, isPOV, isNone }

// Get current phase context
window.selfEviction.getPhaseContext();
// returns: { phase, aliveCount, isEndgame, beforeVeto, afterVeto, ... }
```

#### Backward Compatibility
```javascript
// Legacy API still works
window.handleSelfEviction(playerId, 'self');
```

## Phase-Specific Behavior

### Nominee Self-Evicts
- **Before veto**: HOH must renominate replacement
- **After veto/during vote**: Votes invalidated, null eviction, week ends

### HOH Self-Evicts
- Week cancelled
- All nominations cleared
- No other eviction occurs

### POV Holder Self-Evicts
- **Before ceremony**: Veto ceremony skipped, proceed to voting
- **After ceremony**: Week continues normally
- **At F4**: Skip directly to F3

### Non-Role Player
- Standard eviction
- Week continues

## Safety Features

### Idempotency
- Can't evict same player twice
- Safe to call multiple times
- Guard flags prevent race conditions

### AI Restrictions
- AI can only self-evict during intermission (between eviction and HOH)
- Attempts in other phases show warning and are blocked

### UX Safety
- Exit button only visible for active human player
- Hidden during lobby and finale
- Confirmation modal prevents accidents
- Clear warning about irreversible action

## Testing

### Run Test Suite
1. Open `test_self_eviction.html` in browser
2. Click "Run All Tests"
3. Verify all 9 tests pass

### Manual Testing
1. Start game with human player
2. Look for 🚪 button in topbar (appears after lobby)
3. Click to trigger confirmation
4. Confirm to test eviction
5. Verify player evicted and count decreases

## Configuration

### Enable AI Self-Eviction
In Settings → Twists:
- Set "Auto-eviction %" to desired chance (0-2%)
- AI players will randomly self-evict during intermission

### Admin/Debug Access
In Settings → Quick Actions:
- Select player from dropdown
- Click "Self-Evict Selected Player"
- Confirm action

## Troubleshooting

### Exit button not appearing?
- Check if game is in active phase (not lobby/finale)
- Verify human player is not already evicted
- Ensure self-eviction.js is loaded (check console)

### Self-eviction not working?
- Check console for errors
- Verify player ID is valid
- Ensure player is not already evicted
- Check if in safe window for AI

### Tests failing?
- Ensure self-eviction.js loads before test
- Check for JavaScript errors in console
- Verify mock functions are working

## Edge Cases Handled

✅ Duplicate eviction attempts blocked  
✅ Already-evicted players rejected  
✅ Invalid player IDs handled gracefully  
✅ Vote invalidation when nominee self-evicts during voting  
✅ Badge clearing after all eviction types  
✅ Jury integration for applicable players  
✅ Final rank assignment based on remaining count  
✅ F4 → F3 transition when POV holder self-evicts  
✅ Week cancellation when HOH self-evicts  
✅ Renomination when nominee self-evicts pre-veto

## Code Locations

- **Main logic**: `js/self-eviction.js`
- **Exit button**: `index.html` (topbar), `js/bootstrap.js` (handler)
- **Integration**: `js/eviction.js`, `js/twists.js`, `js/ui.config-and-settings.js`
- **Tests**: `test_self_eviction.html`
- **Documentation**: `SELF_EVICTION_IMPLEMENTATION.md`
