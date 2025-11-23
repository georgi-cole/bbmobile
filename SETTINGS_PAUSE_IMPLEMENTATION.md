# Settings Modal Pause Implementation

## Overview

This implementation fully pauses the game when the Settings modal is opened, preventing timer desync and game state corruption. It also implements a config change queue system that defers game-affecting changes until the next season.

## Features

### 1. Global Pause System

When the Settings modal is opened:
- ⏸️ **Phase timer pauses** - Timer stops at exact remaining time
- 🚫 **Game advancement blocked** - FFWD, skip buttons, and card manager disabled
- 📺 **Visual feedback** - "Game Paused" overlay appears on TV screen
- 💾 **State preserved** - Exact remaining time stored for resume

When the Settings modal is closed:
- ▶️ **Resume from exact state** - Timer continues from where it paused
- ✅ **UI re-enabled** - All game controls become interactive again
- 🎬 **Seamless continuation** - Game flows continue without interruption

### 2. Config Change Queue

Settings are classified into two categories:

#### Immediate Settings (Applied Instantly)
These are UI-only changes that don't affect game logic:
- Theme and visual styles
- Music and sound effects toggles
- Card reveal animations
- UI element visibility
- Accessibility settings

#### Deferred Settings (Queued for Next Season)
These are game-affecting changes that are deferred:
- Player roster size
- Phase durations (HOH, Veto, Live Vote, etc.)
- Twist probabilities (double eviction, triple eviction, etc.)
- Core game mechanics (jury house, public favorite)
- Competition durations

### 3. Pending Changes Notification

When deferred changes are made:
- ⚠️ **Warning banner** appears in settings modal
- 📋 **Change summary** lists all pending changes
- 💬 **Clear messaging** explains changes will apply on next season
- 💾 **Persistence** changes saved to localStorage and survive refresh

### 4. Debug Controls Protection

During active gameplay:
- 🔒 **Debug minigame launcher disabled** to prevent state corruption
- ⚠️ **Warning message** explains why launcher is disabled
- ✅ **Re-enables safely** when game returns to lobby or finale

## Technical Architecture

### PhaseTimerBridge Enhanced API

```javascript
// Pause the game globally
PhaseTimerBridge.pause(reason)
// Returns: boolean (true if paused successfully)

// Resume the game from paused state
PhaseTimerBridge.resume()
// Returns: boolean (true if resumed successfully)

// Force current phase timer to timeout
PhaseTimerBridge.forceTimeout()
// Returns: boolean (true if triggered successfully)

// Check if game is currently paused
PhaseTimerBridge.isGloballyPaused()
// Returns: boolean

// Get the reason for current pause
PhaseTimerBridge.getGlobalPauseReason()
// Returns: string | null
```

### PendingConfig API

```javascript
// Check if a setting should be applied immediately or deferred
PendingConfig.getSettingType(key)
// Returns: 'immediate' | 'deferred' | 'unknown'

// Check if game is in active gameplay phase
PendingConfig.isGameActive()
// Returns: boolean

// Apply a config change (immediate or queue as pending)
PendingConfig.applyConfigChange(key, value, cfg)
// Returns: boolean (true if applied immediately, false if deferred)

// Get all pending changes
PendingConfig.getPendingChanges()
// Returns: object { key: { value, type, timestamp } }

// Check if there are any pending changes
PendingConfig.hasPending()
// Returns: boolean

// Apply all pending changes to config
PendingConfig.applyAllPending(cfg)
// Returns: number (count of changes applied)

// Get human-readable summary of pending changes
PendingConfig.getPendingSummary()
// Returns: array of strings
```

## Implementation Details

### Game State Flags

```javascript
// Global pause flag
game.isGloballyPaused: boolean

// Timer pause state (existing)
game.timerPaused: boolean

// Remaining time when paused (milliseconds)
game.pausedTimeRemaining: number | null

// Phase end timestamp
game.endAt: number

// Phase timeout callback
game.phaseTimeoutCallback: function
```

### Settings Modal Integration

The settings modal automatically:
1. Calls `PhaseTimerBridge.pause('settings')` on open
2. Calls `PhaseTimerBridge.resume()` on close
3. Displays pending changes notification if any exist
4. Uses `PendingConfig.applyConfigChange()` for all setting changes

### New Season Integration

When starting a new season:
1. `buildCast()` and `rebuildGame()` call `PendingConfig.applyAllPending(cfg)`
2. All pending changes are atomically applied to game config
3. Pending queue is cleared
4. User is notified of applied changes

## File Structure

```
js/
├── flow/
│   └── phaseTimerBridge.js         # Enhanced pause/resume API
├── settings/
│   ├── pending-config.js           # Config queue management (NEW)
│   ├── effects.js                  # Setting effects
│   ├── registry.js                 # Setting registry
│   └── render.js                   # Settings UI rendering
├── ui.config-and-settings.js       # Settings modal lifecycle
└── bootstrap.js                    # Game initialization

test_settings_pause.html             # Test suite (NEW)
```

## Benefits

### Prevents Timer Issues
- ✅ No more negative timers from settings interactions
- ✅ No more stuck phases or phase advancement bugs
- ✅ No more desynchronization between UI and game state

### Safe Configuration Changes
- ✅ Game-affecting changes can't break active gameplay
- ✅ Clear separation between safe and unsafe settings
- ✅ User always knows when changes will take effect

### Better User Experience
- ✅ Clear visual feedback when game is paused
- ✅ Explicit notification of pending changes
- ✅ No unexpected game behavior after closing settings

### Developer Safety
- ✅ Debug tools protected during active gameplay
- ✅ Centralized pause/resume logic
- ✅ Comprehensive API for future features

## Testing

### Automated Tests
Run the test suite with:
```bash
npm run test:all
```

### Manual Testing
Open `test_settings_pause.html` in a browser to run:
- PhaseTimerBridge API validation
- PendingConfig system validation
- Global pause flag testing
- Timer pause/resume mechanics
- UI blocking verification
- Config change queue testing
- Persistence testing
- Settings modal integration

### Test Scenarios
1. **Pause during HOH competition**
   - Open settings → Timer pauses at 23s
   - Close settings → Timer resumes from 23s

2. **Change phase duration mid-game**
   - Set tHOH to 60s during week 3
   - Change is queued as pending
   - Start new season → tHOH = 60s applied

3. **Change theme during competition**
   - Select new theme → Applied immediately
   - Game continues without interruption

4. **Try to launch debug minigame during active phase**
   - Launcher is disabled
   - Warning message displayed

## Security

- ✅ CodeQL scan: 0 vulnerabilities found
- ✅ No injection points in config handling
- ✅ Safe DOM manipulation (no innerHTML with user input)
- ✅ localStorage access properly wrapped in try/catch
- ✅ All user input validated and sanitized

## Migration Notes

### For Existing Code
This implementation is **backward compatible**:
- Existing timer code continues to work
- Settings modal behavior enhanced, not replaced
- Game initialization hooks added, not modified
- All changes are additive

### For Future Development
When adding new settings:
1. Add key to either `IMMEDIATE_SETTINGS` or `DEFERRED_SETTINGS` in `pending-config.js`
2. Setting will automatically be handled correctly
3. No changes needed to settings modal code

## Troubleshooting

### Game Stays Paused After Closing Settings
Check browser console for errors. Ensure:
- `PhaseTimerBridge.resume()` is being called
- `game.isGloballyPaused` is set to `false`
- `game.timerPaused` is set to `false`

### Pending Changes Not Applying
Check:
- `PendingConfig.applyAllPending()` is called in `buildCast()` and `rebuildGame()`
- localStorage is accessible (check browser privacy settings)
- Config object is being persisted after applying changes

### Timer Desync Issues
Verify:
- `game.pausedTimeRemaining` is being calculated correctly
- `game.endAt` is being updated on resume
- No other code is modifying timer state during pause

## Future Enhancements

Potential improvements:
- Visual countdown of remaining pause time
- Auto-resume after X minutes of inactivity
- Multiple pause sources (settings, help, other modals)
- Pause history/audit log
- Setting change preview before applying

## References

- Issue: "Settings Modal Should Fully Pause Game and Defer Gameflow-Affecting Changes Until New Season/Refresh"
- Implementation PR: copilot/fix-game-settings-modal
- Test File: `test_settings_pause.html`
- Documentation: This file

## Credits

Implemented by GitHub Copilot AI Agent
Repository: georgi-cole/bbmobile
Date: November 2025
