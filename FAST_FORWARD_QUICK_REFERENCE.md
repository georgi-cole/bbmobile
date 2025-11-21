# Fast-Forward Quick Reference

## Overview

The Fast-Forward feature converts the existing "Skip" functionality into an intelligent acceleration system that **preserves all ceremony steps and callbacks** while **compressing their durations**. This prevents regressions like missing veto competitions or incomplete ceremony sequences.

## Key Differences: Skip vs Fast-Forward

| Aspect | Old Skip Behavior | New Fast-Forward Behavior |
|--------|------------------|---------------------------|
| **Cards** | Cancelled/skipped | All cards shown with compressed durations |
| **Timeouts** | Cleared/cancelled | Replayed with compressed delays |
| **Callbacks** | May not fire | All callbacks fire in order |
| **Animations** | Abruptly stopped | Completed quickly |
| **Sequences** | Steps omitted | All steps preserved |

## Architecture

### Core Components

1. **Global State Flags** (`js/state.js`)
   - `game.__ffActive` - Boolean indicating fast-forward is active
   - `game.__ffMultiplier` - Speed multiplier (default: 0.1 = 10x speed)

2. **Duration Normalization** (`js/state.js`)
   - `normalizeDuration(ms)` - Compresses durations with min/max caps
   - Used by all card display functions

3. **Fast-Forward Control** (`js/state.js`)
   - `activateFastForward({ multiplier, reason })` - Activates mode
   - `deactivateFastForward()` - Returns to normal speed

4. **CardManager Integration** (`js/ui/CardManager.js`)
   - Tracks timeout metadata (callback, originalDuration)
   - `acceleratePendingTimeouts()` - Replays callbacks with compression
   - Drainer intelligently handles fast-forward vs legacy skip

5. **TV Card Functions** (`js/ui/tv-cards.js`)
   - `showTVCard()` - Uses normalizeDuration for timeouts
   - `showTVCardWithAvatars()` - Uses normalizeDuration for timeouts

6. **Phase Management** (`js/ui.hud-and-router.js`)
   - `fastForwardPhase()` - Activates fast-forward and runs drain loop

## Configuration

All configuration is in `game.cfg`:

```javascript
{
  // Core fast-forward settings
  fastForwardEnabled: true,                    // Master enable/disable
  fastForwardMultiplier: 0.1,                  // 0.1 = 10x speed, 0.2 = 5x speed
  fastForwardMinDuration: 40,                  // Legacy: Minimum duration per step (ms)
  fastForwardMaxDuration: 300,                 // Legacy: Maximum duration per step (ms)
  fastForwardMinigameAutoSubmit: false,        // Auto-submit active minigames (not implemented yet)
  fastForwardSocialActionInterval: 200,        // AI action interval during fast-forward (not implemented yet)
  
  // UI & Playback Enhancements (NEW)
  fastForwardAlwaysEnable: true,               // Enable button in all phases (except lobby)
  fastForwardMinPhaseWindowMs: 1500,           // Minimum compressed phase duration (ensures perceptible playback)
  fastForwardPlaybackMinCardMs: 120,           // Per-card minimum duration (preferred over fastForwardMinDuration)
  fastForwardPlaybackMaxCardMs: 480            // Per-card maximum duration (preferred over fastForwardMaxDuration)
}
```

### Configuration Notes

- **fastForwardAlwaysEnable**: When `true`, the ⏩ FFWD button is enabled in any active phase (except lobby before game starts). When `false`, button is only enabled in SKIPPABLE_PHASES list.
- **fastForwardMinPhaseWindowMs**: Enforces a minimum "play-through window" so users can see the compressed sequence rather than an instant jump. Default 1500ms (1.5 seconds).
- **fastForwardPlaybackMinCardMs/MaxCardMs**: Preferred per-card duration clamps. If undefined, falls back to legacy `fastForwardMinDuration/MaxDuration`.
- Legacy min/max settings are maintained for backward compatibility but new settings take precedence when defined.

## Usage

### For End Users

Press the **⏩ FFWD** button in the TV header to activate fast-forward mode. All pending ceremony steps will play rapidly but completely.

### For Developers

#### Basic Usage

```javascript
// Activate fast-forward (10x speed)
window.activateFastForward({ multiplier: 0.1, reason: 'user' });

// Check if active
if (window.game.__ffActive) {
  console.log('Fast-forward is active');
}

// Deactivate
window.deactivateFastForward();
```

#### Using normalizeDuration in Card Functions

```javascript
function showMyCard(title, message, duration) {
  // Apply fast-forward compression
  const normalizedDuration = window.normalizeDuration 
    ? window.normalizeDuration(duration) 
    : duration;
  
  setTimeout(() => {
    // Card dismissal logic
  }, normalizedDuration);
}
```

#### Registering Timeouts with CardManager

```javascript
const originalDuration = 3000;
const normalizedDuration = window.normalizeDuration(originalDuration);

const callback = () => {
  // Your callback logic
};

const timeoutId = setTimeout(callback, normalizedDuration);

// Register for fast-forward acceleration
if (window.CardManager && window.CardManager.__pendingTimeoutData) {
  window.CardManager.__pendingTimeoutData.push({
    id: timeoutId,
    callback: callback,
    originalDuration: originalDuration
  });
}
```

## Logging

All fast-forward operations use the `[fast-forward]` prefix:

```
[fast-forward] activated (mult=0.1, phase=nominations, reason=user)
[fast-forward] duration 3200ms -> 320ms
[fast-forward] phase timer compressed: 18000ms -> 1800ms
[CardManager] Fast-forward: accelerating timeouts
[CardManager] Replaying callback: 3000ms -> 300ms
[fast-forward] deactivated (normal speed restored)
```

## Testing

### Automated Verification

```bash
node scripts/verify-fast-forward.mjs
```

Checks:
- ✓ Fast-forward config in game.cfg
- ✓ Runtime state flags
- ✓ normalizeDuration function
- ✓ activateFastForward/deactivateFastForward functions
- ✓ CardManager integration
- ✓ TV card function updates
- ✓ UI integration

### Manual Testing

Open `test_fast_forward_sequences.html` in a browser:

1. **Simple Sequence Test**
   - Run normal sequence (observe timing)
   - Run fast-forward sequence (observe compression)
   - Verify all steps shown

2. **Nomination Ceremony Test**
   - Compare normal vs fast-forward
   - Confirm all 4 ceremony steps appear

3. **Veto Ceremony Test**
   - Compare normal vs fast-forward
   - Confirm all 5 ceremony steps appear

4. **Utility Tests**
   - Test normalizeDuration() with various inputs
   - Test activateFastForward() idempotency

## Implementation Status

### ✅ Completed

- Core fast-forward infrastructure
- normalizeDuration utility
- activateFastForward/deactivateFastForward
- CardManager acceleration support
- TV card function integration
- UI button update (Skip → FFWD)
- Verification script
- Test suite

### 🔄 Future Enhancements

- Veto ceremony integration (update reveal sequences)
- Nominations ceremony integration (compress intro cards)
- Social phase AI action compression
- Minigame auto-submit option
- Toast notifications for mode activation
- Settings UI for multiplier adjustment
- Persistent fast-forward preference

## Backward Compatibility

The implementation is **fully backward compatible**:

- Works without fast-forward activation (normal behavior)
- Gracefully handles missing functions (fallback to original durations)
- Old skip behavior preserved when `__ffActive = false`
- No breaking changes to existing APIs

## Common Patterns

### Pattern 1: Card with Fast-Forward Support

```javascript
async function showCeremonyCard(title, lines, duration = 2400) {
  const originalDuration = duration;
  const normalizedDuration = window.normalizeDuration 
    ? window.normalizeDuration(originalDuration) 
    : originalDuration;
  
  // Show card
  const card = createCard(title, lines);
  document.body.appendChild(card);
  
  // Wait (compressed in fast-forward mode)
  await new Promise(resolve => {
    setTimeout(resolve, normalizedDuration);
  });
  
  // Remove card
  card.remove();
}
```

### Pattern 2: Ceremony Sequence

```javascript
async function runNominationCeremony() {
  // Activate fast-forward if user pressed skip
  // (handled by fastForwardPhase in ui.hud-and-router.js)
  
  // Show all cards with normalizeDuration
  await showCeremonyCard('HOH Speech', ['Welcome to the ceremony...'], 3000);
  await showCeremonyCard('First Nominee', ['I nominate...'], 2500);
  await showCeremonyCard('Second Nominee', ['And I nominate...'], 2500);
  await showCeremonyCard('Ceremony End', ['The ceremony is complete'], 2000);
  
  // Deactivate fast-forward after ceremony
  // (handled by fastForwardPhase)
}
```

### Pattern 3: Phase Timer Compression

```javascript
function startPhase(phase, duration) {
  const game = window.game;
  game.phase = phase;
  game.phaseEndsAt = Date.now() + duration;
  
  // If fast-forward is activated mid-phase, the timer will be compressed
  // by activateFastForward() automatically
}
```

## Troubleshooting

### Issue: Cards still being skipped

**Solution:** Ensure the card display function uses `normalizeDuration`:

```javascript
// ❌ Wrong - skips in fast-forward
setTimeout(callback, 3000);

// ✓ Correct - compresses in fast-forward
const duration = window.normalizeDuration ? window.normalizeDuration(3000) : 3000;
setTimeout(callback, duration);
```

### Issue: Callbacks not firing

**Solution:** Ensure timeouts are registered with CardManager for acceleration:

```javascript
const timeout = setTimeout(callback, normalizedDuration);

// Register for acceleration
if (window.CardManager && window.CardManager.__pendingTimeoutData) {
  window.CardManager.__pendingTimeoutData.push({
    id: timeout,
    callback: callback,
    originalDuration: originalDuration
  });
}
```

### Issue: Fast-forward not deactivating

**Solution:** Call `deactivateFastForward()` at phase boundaries:

```javascript
function endPhase() {
  // Cleanup
  if (window.deactivateFastForward) {
    window.deactivateFastForward();
  }
}
```

## Performance Considerations

- Minimum duration (40ms) prevents perceptual flicker
- Maximum duration (300ms) ensures reasonable upper bound
- Compression factor is configurable (default 10x)
- Acceleration is async to prevent blocking main thread

## Security & Anti-Cheat

- Fast-forward does not affect minigame results
- Competition scores remain unchanged
- Only affects timing, not game logic
- `fastForwardMinigameAutoSubmit` defaults to `false` for fairness

## Related Files

- `js/state.js` - Core infrastructure
- `js/ui/CardManager.js` - Timeout acceleration
- `js/ui/tv-cards.js` - Card display functions
- `js/ui.hud-and-router.js` - Phase management
- `js/tv-skip.js` - UI button
- `scripts/verify-fast-forward.mjs` - Verification script
- `test_fast_forward_sequences.html` - Test suite

## Support

For issues or questions:
1. Check verification: `node scripts/verify-fast-forward.mjs`
2. Run test suite: Open `test_fast_forward_sequences.html`
3. Check logs for `[fast-forward]` prefix
4. Verify configuration in `game.cfg`
