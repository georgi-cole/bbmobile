# Social Phase Timer Improvements

## Overview

This document describes the timer improvements implemented for the social maneuvers system in PR #[TBD].

## Features Implemented

### 1. Default Timer - 3 Minutes (180 seconds)

**Location:** `js/social.js`

The default social phase timer has been updated from 30 seconds to 180 seconds (3 minutes), providing players with adequate time to execute social actions.

```javascript
// Updated default fallback
const duration = g.cfg?.tSocial || g.cfg?.tComms || 180; // Was: 30
```

**Why 3 minutes?**
- Provides enough time for meaningful social interactions
- Balances engagement with game pacing
- Aligns with typical social strategy time requirements

### 2. Auto-Advance on Energy Depletion

**Location:** `js/social-maneuvers.js`

When a player spends all their social energy, the phase automatically advances after a 3-second delay.

**Flow:**
1. Player executes an action via `executeAction()`
2. After action completes, `checkEnergyDepletionAndAdvance()` is called
3. If player's energy reaches 0, `scheduleFastAdvance()` is triggered
4. After 3 seconds (3000ms), phase advances automatically

**Key Functions:**

```javascript
function checkEnergyDepletionAndAdvance(playerId) {
  // Only checks human player
  if (playerId !== humanId) return;
  
  const energyRemaining = SocialResources.get(playerId, 'energy');
  
  if (energyRemaining === 0) {
    scheduleFastAdvance(3000); // 3 second delay
  }
}
```

### 3. Timer API Fallback Chain

The implementation tries multiple timer APIs in order of preference:

1. **`schedulePhaseAdvanceIn(ms)`** - Dedicated phase scheduling API (future)
2. **`GameTimer.shortenCurrentByMs(ms)`** - Shorten current timer (future)
3. **`GameTimer.setRemainingMs(ms)`** - Set remaining time directly (future)
4. **`setPhaseDurationMs(ms)`** - Set phase duration (future)
5. **`setTimeout()`** - Fallback using direct timer manipulation (current)

**Current Implementation:**

Since none of the preferred APIs exist yet, the fallback uses `setTimeout` to manipulate `game.endAt`:

```javascript
g.__socialFastAdvanceTimeout = setTimeout(() => {
  if (g.endAt && typeof g.endAt === 'number') {
    // Shorten the timer to expire very soon
    g.endAt = Date.now() + 100; // 100ms buffer
  }
}, 3000);
```

### 4. Proper Cleanup

**Phase Start Hook:**
```javascript
function onSocialPhaseStart() {
  // Clear any pending fast-advance timeout
  if (g.__socialFastAdvanceTimeout) {
    clearTimeout(g.__socialFastAdvanceTimeout);
    g.__socialFastAdvanceTimeout = null;
  }
  // ... rest of initialization
}
```

**Phase End Hook:**
```javascript
function onSocialPhaseEnd() {
  // Clear any pending fast-advance timeout
  if (g?.__socialFastAdvanceTimeout) {
    clearTimeout(g.__socialFastAdvanceTimeout);
    g.__socialFastAdvanceTimeout = null;
  }
  // ... rest of cleanup
}
```

## Integration Points

### 1. Social Phase Start
- Clears any existing fast-advance timeouts
- Initializes player resources (energy, influence, information)
- Sets up session tracking

### 2. Action Execution
- Executes social action
- Spends resources (energy, influence, information)
- **Checks for energy depletion** ← New
- Tracks telemetry and session data

### 3. Social Phase End
- Clears fast-advance timeout
- Generates phase summary
- Exports session logs
- Displays summary panel

## Compatibility

### Desktop Flow
- ✅ Works with existing phase management
- ✅ Integrates with setPhase() timer system
- ✅ Compatible with fast-forward guards

### Mobile Flow
- ✅ Compatible with mobile UI (socialize-mobile.js)
- ✅ No UI/UX changes required
- ✅ Engine-level changes only

## Testing

### Manual Testing

1. **Test Default Timer:**
   ```
   Open: test_social_timer_improvements.html
   Click: "Start Social Phase"
   Verify: Timer shows appropriate duration
   ```

2. **Test Energy Depletion:**
   ```
   Click: "Start Social Phase"
   Click: "Deplete All Energy"
   Verify: Fast-advance scheduled (status updates)
   Wait: 3 seconds
   Verify: Phase advances
   ```

3. **Test Cleanup:**
   ```
   Click: "Start Social Phase"
   Click: "Deplete All Energy"
   Click: "End Phase Manually"
   Verify: No timeout remains (status shows "No")
   ```

### Automated Testing

Run the logic verification:
```bash
node test_timer_logic.js
```

Run Playwright tests (when available):
```bash
npm run test:playwright -- test_social_timer_improvements.spec.js
```

## Configuration

The timer behavior can be configured via game settings:

- **`game.cfg.tSocial`** - Override social phase duration (seconds)
- **`game.cfg.enableSocialManeuvers`** - Enable/disable social maneuvers system

## Future Enhancements

1. **Timer API Implementation:**
   - Implement `schedulePhaseAdvanceIn()` for cleaner phase advancement
   - Add `GameTimer` object with timer manipulation methods

2. **Configurable Fast-Advance Delay:**
   - Allow customization of the 3-second delay
   - Add to game configuration

3. **Energy Warning:**
   - Show UI notification when energy is low (e.g., 1 remaining)
   - Alert player before auto-advance triggers

4. **AI Player Support:**
   - Extend fast-advance to AI players (optional)
   - Configure different behavior for AI vs human

## Technical Notes

### Why setTimeout Fallback?

The `setTimeout` approach directly manipulates `game.endAt`, which is the canonical timer state used by the phase tick system in `ui.hud-and-router.js`. This ensures:

1. **Reliability:** Works with existing timer infrastructure
2. **Minimal Changes:** No modifications to core timer system needed
3. **Compatibility:** Works across desktop and mobile flows
4. **Clean Cleanup:** Easy to clear with `clearTimeout()`

### Race Condition Prevention

The implementation prevents race conditions by:
1. Clearing existing timeouts before scheduling new ones
2. Cleaning up on both phase start and phase end
3. Storing timeout handle in game state for accessibility
4. Using atomic operations (clearTimeout/setTimeout)

### Energy Tracking

Energy depletion is checked on the **human player only** to prevent AI actions from triggering auto-advance. This ensures:
- Players maintain control over pacing
- AI can continue playing without forcing phase end
- Only player actions trigger fast-advance

## References

- **Issue:** Timer Improvements & Fast-Advance for Social Phase
- **Files Modified:**
  - `js/social.js` - Default timer update
  - `js/social-maneuvers.js` - Fast-advance logic
- **Files Added:**
  - `test_social_timer_improvements.html` - Manual test page
  - `test_social_timer_improvements.spec.js` - Automated tests
  - `test_timer_logic.js` - Logic verification
  - `SOCIAL_TIMER_IMPROVEMENTS.md` - This document
