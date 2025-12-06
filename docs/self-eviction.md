# Self-Eviction Feature

## Overview

The self-eviction feature allows human players to voluntarily leave the Big Brother game at any time during active gameplay. This feature provides a graceful exit mechanism while maintaining game flow and preventing self-evicted players from joining the jury house.

## User Interface

### Accessing Self-Eviction

1. **Action Menu Button**: Located in the compact HUD (three vertical dots ⋮)
2. **Click the Menu**: Opens a near-fullscreen modal with action options
3. **Select "Self-evict"**: Triggers the confirmation dialog
4. **Confirm**: Choose "Yes" to proceed or "No" to cancel

### Action Menu Design

- **Near-Fullscreen Modal**: Takes up most of the viewport (`calc(100vw - 32px)` width, max 600px)
- **Dimmed Backdrop**: Semi-transparent background (`rgba(0, 0, 0, 0.75)`) keeps the game visible
- **Blur Effect**: `backdrop-filter: blur(3px)` adds depth to the modal
- **Large Touch Targets**: 56px minimum height for better mobile accessibility
- **Keyboard Navigation**: 
  - `Escape` to close menu
  - Arrow keys to navigate options
  - `Enter` to select

### Confirmation Dialog

- **Title**: "Self-Eviction"
- **Message**: "Are you sure you want to leave the house?"
- **Buttons**: 
  - "Yes" (danger tone, proceeds with eviction)
  - "No" (neutral tone, cancels and returns to game)
- **Tone**: Danger (red) to emphasize the irreversible nature
- **Keyboard Shortcuts**:
  - `Enter` to confirm
  - `Escape` to cancel (if cancel button present)

## Technical Implementation

### Core Module: `js/self-eviction.js`

The centralized self-eviction handler provides phase-aware branching logic for different player roles.

#### API

```javascript
// Request human self-eviction (with confirmation)
await window.selfEviction.requestHuman(playerId);

// Direct self-eviction (no confirmation, specify origin)
window.selfEviction.handle(playerId, origin);
// origin: 'human', 'ai', 'manual', 'admin'

// Check if AI can self-evict in current phase
window.selfEviction.isAISafeWindow(); // true if safe

// Get player's current role
window.selfEviction.getPlayerRole(playerId);
// returns: { isNominee, isHOH, isPOV, isNone }

// Get current phase context
window.selfEviction.getPhaseContext();
// returns: { phase, aliveCount, isEndgame, beforeVeto, afterVeto, ... }
```

### Player Flags

When a player self-evicts, the following flags are set:

- **`player.evicted`**: `true` - Marks player as evicted
- **`player.selfEvicted`**: `true` - Marks as self-eviction (excludes from jury)
- **`player.autoMode`**: `true` - Enables auto-play for remaining game phases
- **`player.weekEvicted`**: Current week number
- **`player.finalRank`**: Placement based on remaining alive players

### Jury Exclusion

Self-evicted players are **NOT** added to the jury house. The logic checks `player.selfEvicted` flag:

```javascript
// In eviction processing
if (aliveCount <= JURY_START_AT && game.cfg.enableJuryHouse && !player.selfEvicted) {
  // Only add to jury if NOT self-evicted
  game.juryHouse.push(playerId);
}
```

This ensures self-evicted players cannot vote in the final jury vote.

## Phase-Specific Behavior

### Nominee Self-Eviction

- **Before Veto Competition**: HOH must renominate a replacement nominee
- **During Veto Ceremony**: Nominations adjust, week continues
- **After Veto/During Voting**: Votes are invalidated, null eviction occurs, week ends

### HOH Self-Eviction

- Week is cancelled
- All nominations are cleared
- No other player is evicted
- All role badges are cleared
- Game proceeds to next week

### POV Holder Self-Eviction

- **Before Veto Ceremony**: Veto ceremony is skipped, proceeds to live vote
- **After Veto Ceremony**: Week continues normally
- **At Final 4**: Skips directly to Final 3

### Non-Role Player Self-Eviction

- Standard eviction processing
- Week continues as normal
- Proper final rank assignment

### Endgame Handling

- **Final 4 (F4)**: Special logic for veto holder
- **Final 3 (F3)**: Proceeds to appropriate endgame phase
- **Final 2 (F2)**: Triggers jury vote

## Safety Features

### Idempotency Guards

- Prevents duplicate self-eviction processing
- Already-evicted players cannot be evicted again
- Guard flag: `selfEvictionInProgress`

### AI Self-Eviction Restrictions

AI players can only self-evict during **safe windows**:

- **Safe Phases**: `intermission`, `lobby`
- **Unsafe Phases**: All competition and ceremony phases
- Blocked attempts show warning message

### Vote Invalidation

If a nominee self-evicts during or after voting has started:

- All cast votes are cleared
- Vote sequence is reset
- Null eviction occurs (week ends without voting)

### Confirmation Dialog

- Prevents accidental self-evictions
- Clear warning about irreversible action
- Simple Yes/No choice

## Integration Points

### UI Components

- **Action Menu** (`js/ui/actionMenu.js`): Menu button and "Self-evict" option
- **Compact HUD** (`src/ui/compactHud.js`): Three-dot button in header
- **Confirmation Modal** (`js/ui.confirm-modal.js`): Custom styled dialog

### Game Systems

- **Eviction System** (`js/eviction.js`): Delegates to centralized handler
- **Twists** (`js/twists.js`): AI random self-eviction events
- **Settings** (`js/ui.config-and-settings.js`): Admin panel self-eviction
- **Bootstrap** (`js/bootstrap.js`): Game initialization and state management

## Testing

### Manual Testing Steps

1. Start a new game with at least 4 players
2. Advance past the lobby phase (to week 1)
3. Click the three-dot menu (⋮) in the compact HUD
4. Verify the menu appears as a near-fullscreen modal
5. Click "Self-evict" option
6. Verify confirmation dialog appears
7. Click "Yes" to confirm
8. Verify:
   - Player is marked as evicted
   - Player count decreases (e.g., 12/12 → 11/12)
   - `selfEvicted` flag is set to `true`
   - `autoMode` flag is set to `true`
   - Player is NOT added to jury house
   - Game continues to next phase

### Automated Tests

Run the test suite:

```bash
# Open test file in browser
open test/test_self_eviction.html

# Or run all automated tests
npm run test:all
```

Test coverage includes:

- ✅ Menu rendering and modal display
- ✅ Confirmation dialog flow
- ✅ Self-eviction processing
- ✅ Player flag verification (`selfEvicted`, `autoMode`)
- ✅ Jury exclusion logic
- ✅ Keyboard navigation
- ✅ Idempotency guards
- ✅ Phase-specific branching
- ✅ Vote invalidation

## Troubleshooting

### Menu doesn't appear

- **Check phase**: Menu is hidden during lobby and finale
- **Check player status**: Human player must be active (not evicted)
- **Check console**: Look for JavaScript errors

### Self-eviction doesn't work

- **Verify module loaded**: Check that `js/self-eviction.js` is loaded
- **Check player ID**: Ensure `game.humanId` is set correctly
- **Check console**: Review error messages for clues

### Player added to jury despite self-eviction

- **Verify flag**: Check that `player.selfEvicted === true`
- **Check integration**: Ensure jury logic checks the flag
- **Review logs**: Check console for jury addition messages

### Confirmation dialog doesn't show

- **Verify modal module**: Ensure `js/ui.confirm-modal.js` is loaded
- **Check for conflicts**: Other modals may interfere
- **Fallback**: Native `confirm()` used if custom modal unavailable

## Developer Notes

### Adding Self-Eviction to New Contexts

To add self-eviction functionality to a new UI element:

```javascript
// Import the module (already loaded globally)

// Call with player ID
if (typeof window.selfEviction?.requestHuman === 'function') {
  const humanId = window.game?.humanId;
  if (humanId) {
    await window.selfEviction.requestHuman(humanId);
  }
}
```

### Customizing Confirmation Message

To change the confirmation message, edit `js/self-eviction.js`:

```javascript
async function showSelfEvictionConfirmation(playerName) {
  if (typeof global.showConfirm === 'function') {
    return await global.showConfirm(
      'Your custom message here',
      {
        title: 'Your Custom Title',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        tone: 'danger'
      }
    );
  }
  // ...
}
```

### Extending Phase-Specific Logic

To add custom behavior for a specific phase:

1. Check phase context in `handleSelfEviction()`
2. Branch to appropriate handler (nominee, HOH, POV, non-role)
3. Add new logic in the relevant handler function
4. Update tests to cover new behavior

### Bus Events

The self-eviction system can emit bus events for integration:

```javascript
// Example: Emit custom event after self-eviction
if (window.game?.bus?.emit) {
  window.game.bus.emit('player:selfEvict', {
    playerId: playerId,
    selfEvicted: true,
    week: game.week,
    phase: game.phase
  });
}
```

## Future Enhancements

Potential improvements for future versions:

1. **Analytics Tracking**: Track self-eviction frequency and patterns
2. **Cooldown Period**: Prevent self-eviction in first X days/weeks
3. **Penalty System**: XP or score penalties for self-eviction
4. **Replacement Logic**: Auto-replace self-evicted HOH/POV in some modes
5. **Farewell Messages**: Allow players to leave custom goodbye messages
6. **Undo Window**: Brief window to reverse accidental self-eviction
7. **Reason Tracking**: Optional reason selection for self-eviction

## References

- **Implementation Details**: `/SELF_EVICTION_IMPLEMENTATION.md`
- **Quick Reference**: `/SELF_EVICTION_QUICKREF.md`
- **Test Files**: 
  - `/test_self_eviction.html` - Original test suite
  - `/test_self_eviction_modal.html` - Modal-focused tests (existing)
  - `/test/test_self_eviction.html` - Comprehensive test suite (new)
- **Related Documentation**:
  - `/docs/eviction-modal.md` - Eviction modal system
  - `/EVICTION_FLOW_DIAGRAM.md` - Overall eviction flow

## Summary

The self-eviction feature provides a robust, user-friendly way for players to voluntarily leave the game. Key highlights:

- ✅ Near-fullscreen modal with intuitive UI
- ✅ Comprehensive confirmation dialog
- ✅ Phase-aware logic for all game scenarios
- ✅ Automatic jury exclusion for self-evicted players
- ✅ Auto-mode enables seamless game continuation
- ✅ Idempotent and atomic operations
- ✅ Keyboard accessible
- ✅ Mobile-optimized
- ✅ Thoroughly tested

The implementation follows repository patterns and integrates cleanly with existing game systems.
