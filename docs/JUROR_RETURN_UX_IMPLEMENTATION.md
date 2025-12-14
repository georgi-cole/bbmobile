# Juror Return UX Implementation

## Overview

This document describes the implementation of UX fixes and animations for the America's Vote juror-return flow, as implemented in PR #XXX.

## Features

1. **Game Pause During Voting**: Game timers pause while the juror voting modal is active, preventing time progression.
2. **Immediate Modal Hide**: The voting modal disappears instantly when vote percentages stop changing.
3. **Compact Winner Announcement**: Winner is announced with a small faux-TV card and compact modal (Fan Favorite style).
4. **Revival Animation**: Winning juror's avatar animates from grayscale to color in the faux-TV.
5. **HUD/Roster Update**: Game state updates to show the juror restored.
6. **Game Resumption**: Game resumes automatically after the animation completes.

## Architecture

### 1. GameControl Module (`js/game-control.js`)

**Purpose**: Provides a lightweight API for pausing and resuming the game during cinematic moments.

**API**:
- `GameControl.pauseForVoting()` - Pauses the game, saves timer state
- `GameControl.resumeFromVoting()` - Resumes the game, restores timer state
- `GameControl.isPaused()` - Checks if game is paused
- `GameControl.getState()` - Gets current pause state for debugging

**Implementation Details**:
- Saves `game.endAt` and `game.phaseEndsAt` timestamps
- Calculates remaining time before pause
- Sets `game.__jurorVotingPaused` flag
- Adds `juror-voting-active` class to document body for visual debugging
- Restores timers by adding remaining time to current timestamp

**Integration**:
- Non-invasive: only touches specific timer fields
- Safe fallbacks if fields don't exist
- Compatible with existing PauseController

### 2. JurorReturnController Module (`js/juror-return-controller.js`)

**Purpose**: Orchestrates the entire juror-return voting flow with enhanced UX.

**Workflow**:

1. **Detection Phase**
   - MutationObserver watches for overlay insertion
   - Detects elements matching: `.juror-overlay`, `#juror-overlay`, `.juror-vote-container`
   - Auto-initializes on DOMContentLoaded

2. **Pause Phase**
   - Calls `GameControl.pauseForVoting()` when overlay appears
   - Starts percentage stability polling

3. **Stability Detection**
   - Polls percentage text nodes every 100ms
   - Looks for `.avPct` elements or text matching `/(\d+)%/`
   - Percentages must be stable (unchanged) for 300ms
   - Minimum vote duration: 700ms before checking

4. **Finalization Phase**
   - Immediately hides overlay (multiple strategies)
   - Determines winner from `game.__juryReturn.scores` Map or overlay data
   - Announces winner with `showCard()` and `TvStatus.set()`
   - Triggers revival animation via `global.animateRevivalAvatar()`
   - Updates HUD with `global.updateHud()`
   - Resumes game with `GameControl.resumeFromVoting()`
   - Emits `juror:return:completed` event

**Configuration**:
```javascript
JurorReturnController.POLL_INTERVAL_MS = 100;      // Poll frequency
JurorReturnController.STABLE_WINDOW_MS = 300;      // Stability duration
JurorReturnController.MIN_VOTE_DURATION_MS = 700;  // Minimum vote time
```

**Fallback Strategies**:
- Overlay hiding: API → classList → style properties → DOM removal
- Winner determination: game state → overlay data → null
- Animations: global function → simulated delay
- API calls: optional chaining with fallbacks

### 3. Revival Animation (`js/eviction-visuals.js`)

**Function**: `animateRevivalAvatar(returningId)`

**Purpose**: Animates the returning juror's avatar in the faux-TV from grayscale to full color.

**Animation Sequence**:
1. Find TV container using robust selector chain
2. Create temporary avatar element (starts grayscale)
3. Append to TV container
4. **Phase 1**: Colorize (0.8s) - grayscale(100%) → grayscale(0%)
5. **Phase 2**: Pulse (0.4s) - scale(1.0) → scale(1.1) → scale(1.0)
6. Remove element
7. Total duration: ~1.2s

**Integration**:
- Uses existing `getTvContainer()` helper for robust container detection
- Uses existing `getDicebearUrl()` for avatar fallback
- Exported to `global.animateRevivalAvatar` for external access
- Non-blocking, promise-based

**Styling**:
```javascript
position: absolute
top: 50%, left: 50%
transform: translate(-50%, -50%)
width: 200px, height: 200px
border-radius: 50%
box-shadow: glowing effect
transition: 0.8s ease-out
```

### 4. Integration (`index.html`)

**Script Load Order**:
```html
<!-- Base dependencies -->
<script defer src="js/flow/PauseController.js"></script>

<!-- ... other scripts ... -->

<!-- Jury system -->
<script src="js/jury_return.js"></script>
<script src="js/jury_return_vote.js"></script>

<!-- NEW: Juror return UX enhancements -->
<script defer src="js/game-control.js"></script>
<script defer src="js/juror-return-controller.js"></script>
```

**Why this order**:
- `game-control.js` loads after PauseController (compatible pause system)
- `juror-return-controller.js` loads after jury files (can detect their UI)
- Both use `defer` for non-blocking load

## Testing

### Manual Testing

Use existing test files:
- `test_juror_return_ui_update.html` - Tests UI appearance
- `test_juror_return_visual_flow.html` - Tests complete flow

### Test Steps

1. **Setup**: Navigate to a test file
2. **Trigger**: Click "Start Juror Return Vote"
3. **Verify Pause**: Check that game timers stop (HUD timer frozen)
4. **Verify Vote**: Vote percentages should randomize
5. **Verify Hide**: Modal should disappear immediately when percentages stabilize
6. **Verify Announcement**: Small card should show winner
7. **Verify Animation**: Avatar should colorize in faux-TV
8. **Verify HUD**: Roster should update to show juror restored
9. **Verify Resume**: Game timers should resume

### Debugging

**Visual Indicators**:
- `body.juror-voting-active` class applied during pause
- Console logs prefixed with `[GameControl]` and `[JurorReturnController]`

**Console Commands**:
```javascript
// Check if paused
GameControl.isPaused()

// Get pause state
GameControl.getState()

// Manually trigger watch
JurorReturnController.startWatch()

// Check controller state
JurorReturnController.isActive
JurorReturnController.overlayElement
```

**Event Listening**:
```javascript
window.game.bus.on('juror:return:completed', (data) => {
  console.log('Juror return completed:', data);
});
```

## Compatibility

### Required Dependencies

- `window.game` - Game state object
- `window.getP(id)` - Player lookup function
- `window.safeName(id)` - Safe name resolver

### Optional Dependencies

All optional with fallbacks:
- `window.GameControl` - Created by this module
- `window.JurorReturnOverlay` - Used if available for hiding
- `window.TvStatus.set()` - Used for TV announcements
- `window.showCard()` - Used for card announcements
- `window.updateHud()` - Used for HUD updates
- `window.animateRevivalAvatar()` - Created by this module
- `window.game.bus.emit()` - Used for event emission
- `window.game.__juryReturn.scores` - Used for winner determination

### Browser Support

- Requires ES6+ features (arrow functions, promises, async/await)
- Requires MutationObserver (all modern browsers)
- Requires Map (all modern browsers)
- Requires Promise (all modern browsers)

## Performance

### Memory Impact

- **Minimal**: ~2KB total JavaScript (minified)
- No persistent watchers after voting completes
- Automatic cleanup of temporary DOM elements

### CPU Impact

- **Polling**: 10 checks per second during voting (negligible)
- **MutationObserver**: Passive, only triggers on DOM changes
- **Animation**: CSS-based transitions (GPU-accelerated)

### Network Impact

- **Zero**: No external API calls
- All resources loaded from local files

## Error Handling

### Graceful Degradation

1. **Missing GameControl**: Controller will log warning, continue without pause
2. **Missing overlay**: Controller will not activate, no errors
3. **Missing winner data**: Controller will log warning, still resume game
4. **Missing animation function**: Controller will use fallback delay
5. **Missing showCard API**: Controller will skip announcement, continue flow

### Error Logging

All errors logged with module prefix:
- `[GameControl]` - Pause/resume operations
- `[JurorReturnController]` - Orchestration flow
- `[eviction-visuals]` - Animation operations

## Future Enhancements

Potential improvements:
1. Configurable polling/stability parameters via game.cfg
2. Sound effects during revival animation
3. Particle effects (confetti) during announcement
4. Customizable animation duration
5. Support for multiple simultaneous jurors returning
6. Analytics/telemetry for vote duration and stability

## Changelog

### Version 1.0 (Initial Implementation)

**Added**:
- GameControl module with pause/resume API
- JurorReturnController with stability detection
- Revival animation in eviction-visuals module
- Integration in index.html

**Changed**:
- Extended eviction-visuals.js with revival function
- No changes to existing jury_return.js or jury_return_vote.js

**Security**:
- CodeQL scan: 0 alerts
- ESLint: 0 errors
- No external dependencies added

## Support

For issues or questions:
1. Check console logs for error messages
2. Verify script load order in index.html
3. Test with existing test HTML files
4. Review this documentation for API usage
5. Check browser console for JavaScript errors
