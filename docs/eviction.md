# Eviction Voting System

## Overview

The eviction voting system provides a ground-up implementation of the live eviction voting flow using double-tap/double-click interaction for a more intuitive mobile-first experience.

## Architecture

### Components

1. **DoubleTapUtil** (`js/ui/eviction/doubleTapUtil.js`)
   - Utility module for detecting double-tap/double-click gestures
   - Handles pointer, touch, and mouse events
   - Configurable timing window and movement tolerance
   - Prevents misfires and accidental activations

2. **EvictionUI** (`js/ui/eviction/evictionUI.js`)
   - Main eviction voting UI module
   - Manages vote casting flow
   - Handles eligible/ineligible voter states
   - Emits vote events to game bus
   - Integrates with existing faux-TV/diary-room flow

3. **Styles** (`css/eviction.css`)
   - Eviction UI styles with animated glow effects
   - Responsive design for mobile and desktop
   - Accessibility support (focus states, reduced motion)
   - High contrast mode support

## Event System

### Incoming Events

#### `phase:eviction:start`

Triggered when the eviction phase begins.

**Payload:**
```javascript
{
  nominees: [
    {
      id: number,           // Nominee player ID
      name: string,         // Nominee name
      avatarUrl: string,    // Avatar image URL
      seatId: number        // Seat position
    },
    // ... more nominees
  ],
  eligible: boolean,        // Whether local user can vote
  phaseId: string,         // Optional phase identifier
  timeoutMs: number        // Optional timeout duration
}
```

**Behavior:**
- If `eligible === true`: Shows voting UI with nominees
- If `eligible === false`: Skips voting UI, navigates to faux-TV view

### Outgoing Events

#### `eviction:vote:cast`

Emitted when the local user casts their vote.

**Payload:**
```javascript
{
  voterId: number,         // ID of the voting player
  nomineeId: number,       // ID of the nominee being voted for
  timestamp: number,       // Unix timestamp (milliseconds)
  phaseId: string          // Phase identifier (if provided)
}
```

**Guarantees:**
- Emitted exactly once per vote
- Only emitted after successful double-tap/double-click or keyboard activation
- Includes all required fields

#### `eviction:continue-to-faux-tv`

Emitted when navigation to faux-TV view is requested (fallback if `beginDiaryRoomSequence` not available).

## User Interaction

### Desktop (Mouse)

1. **Double-click** on a nominee avatar to cast vote
2. **Keyboard**: Tab to navigate between nominees, Enter/Space to cast vote

### Mobile (Touch)

1. **Double-tap** on a nominee avatar to cast vote (within 350ms window by default)
2. Single tap provides visual feedback but does not cast vote
3. Prevents accidental scrolling/zooming

### Visual Feedback

- **Glow effect**: All nominees have animated glow border
- **Hover state**: Nominee scales up and glows brighter
- **Focus state**: Blue focus ring for keyboard navigation
- **Voted state**: Green glow and confirmation message
- **Disabled state**: Faded out after vote cast

## Flow Diagram

```
┌─────────────────────────┐
│   Eviction Phase Start  │
│  (phase:eviction:start) │
└────────────┬────────────┘
             │
             ├─── eligible === false ──> Skip to Faux-TV View
             │
             └─── eligible === true
                  │
                  v
         ┌───────────────────┐
         │  Show Voting UI   │
         │  (Glow Nominees)  │
         └────────┬──────────┘
                  │
                  v
         ┌───────────────────────┐
         │  User Double-Taps or  │
         │  Keyboard Activates   │
         └────────┬──────────────┘
                  │
                  v
         ┌───────────────────────┐
         │ Emit eviction:vote:   │
         │     cast Event        │
         └────────┬──────────────┘
                  │
                  v
         ┌───────────────────────┐
         │  Show Confirmation    │
         │  (Toast + Visual)     │
         └────────┬──────────────┘
                  │
                  v
         ┌───────────────────────┐
         │  Navigate to Faux-TV  │
         │  (Observe Other Votes)│
         └───────────────────────┘
```

## Configuration

The eviction UI can be configured via:

```javascript
window.EvictionUI.configure({
  tapWindow: 350,           // Double-tap detection window (ms)
  glowDuration: 2000,       // Glow animation duration (ms)
  confirmationDelay: 800,   // Delay before continuing (ms)
  debugMode: false          // Enable debug logging
});
```

## Accessibility

### Keyboard Navigation

- **Tab/Shift+Tab**: Navigate between nominees
- **Enter/Space**: Cast vote for focused nominee
- **Focus indicator**: Blue ring around focused nominee

### Screen Readers

- ARIA roles: `region`, `button`, `alert`, `status`
- ARIA labels describe each nominee and action
- Live regions announce vote confirmation

### Reduced Motion

- Respects `prefers-reduced-motion` media query
- Disables animations for users who prefer reduced motion
- Maintains functionality without animations

### High Contrast

- Respects `prefers-contrast` media query
- Increased border widths in high contrast mode
- Enhanced focus indicators

## Testing

### Unit Tests

Located at `tests/unit/doubleTapUtil.test.js` (HTML-based):
- Double-tap detection within time window
- Single tap does not trigger
- Movement tolerance checks
- Timeout and reset behavior
- Touch and pointer event support

### Integration Tests

Located at `tests/integration/evictionEvent.test.html`:
- Event emission on double-tap
- Event payload validation
- Single click does not emit event
- Ineligible voter flow
- Keyboard activation

### Manual Testing

Located at `tests/test_eviction_manual.html`:
- Interactive test page for QA
- Configurable number of nominees
- Eligible/ineligible toggle
- Event log
- Desktop and mobile testing

## Edge Cases

### Duplicate Vote Prevention

- Vote can only be cast once per phase
- Double-tap detectors are destroyed after first activation
- UI becomes disabled after vote cast

### Phase Timeout

- If phase ends before local vote, UI should abort
- Call `window.EvictionUI.abort()` to clean up

### Network Failures

- Vote event emission is fire-and-forget
- Server should handle deduplication if event is resent
- No retry logic in client (keep it simple)

### Movement Tolerance

- Default: 10 pixels
- Prevents accidental vote if user moves finger between taps
- Configurable via `DoubleTapUtil` options

## API Reference

### EvictionUI

```javascript
// Initialize (auto-called on load)
window.EvictionUI.initialize();

// Update configuration
window.EvictionUI.configure({
  tapWindow: 350,
  debugMode: false
});

// Clean up UI
window.EvictionUI.cleanup();

// Emergency abort (if phase closes early)
window.EvictionUI.abort();

// Get current state (debugging)
const state = window.EvictionUI.getState();
```

### DoubleTapUtil

```javascript
// Create detector
const detector = window.DoubleTapUtil.createDoubleTapDetector(
  element,
  (event, data) => {
    console.log('Double-tap!', data);
  },
  {
    tapWindow: 350,      // Max time between taps (ms)
    moveTolerance: 10,   // Max movement allowed (px)
    preventScroll: true, // Prevent scroll on first tap
    debugMode: false     // Enable debug logging
  }
);

// Create single-use detector (auto-destroys after first activation)
const singleUse = window.DoubleTapUtil.createSingleUseDetector(
  element,
  callback,
  options
);

// Destroy detector
detector.destroy();

// Reset detector
detector.reset();

// Get first tap state
const firstTap = detector.getFirstTap();
```

## Migration Notes

This implementation completely replaces the old voting system. The old system has been removed including:

- `js/eviction.js` - Old eviction logic
- `js/livevote-ui.js` - Live Vote 2.0 UI
- `js/livevote-helpers.js` - Vote UI helpers
- `js/livevote-*.js` - All livevote modules
- `js/eviction-*.js` - All eviction modules
- `css/livevote-*.css` - Old voting styles
- Old test files

No feature flag was used - this is an immediate replacement.

## Acceptance Criteria

- ✅ Double-tap within configured window casts exactly ONE vote
- ✅ Single tap/click does NOT cast vote
- ✅ Keyboard activation (Enter/Space) casts vote immediately
- ✅ Only one `eviction:vote:cast` event emitted per vote
- ✅ Ineligible voters skip voting UI and go to faux-TV
- ✅ Visual confirmation shown after vote
- ✅ Glow effect animates on all nominees
- ✅ Accessible with keyboard and screen readers
- ✅ Responsive on mobile and desktop
- ✅ Integrates with existing post-vote flow

## Future Enhancements

Potential improvements for future iterations:

1. **Vote countdown timer**: Show time remaining to vote
2. **Nominee info cards**: Show details when tapping (not double-tapping)
3. **Vote animations**: More elaborate animations on vote cast
4. **Sound effects**: Audio feedback on tap and vote
5. **Haptic feedback**: Vibration on mobile devices
6. **Undo vote**: Allow changing vote before phase ends
7. **Vote preview**: Show which nominee will be voted for before confirmation

## Troubleshooting

### Vote not registering

- Check that double-tap is within the time window (default 350ms)
- Verify movement between taps is less than 10 pixels
- Try keyboard activation instead (Tab + Enter)
- Check browser console for errors

### UI not appearing

- Verify `phase:eviction:start` event is being emitted
- Check that `eligible === true` in event payload
- Ensure CSS file is loaded
- Check for JavaScript errors in console

### Multiple vote events

- This should not happen - report as bug
- Check `EvictionUI.getState()` to see if vote was already cast
- Verify single-use detectors are being used

## Support

For issues or questions:

1. Check browser console for errors and debug logs (enable `debugMode`)
2. Review manual test page at `tests/test_eviction_manual.html`
3. Run integration tests at `tests/integration/evictionEvent.test.html`
4. Check event payload structure matches expected format
