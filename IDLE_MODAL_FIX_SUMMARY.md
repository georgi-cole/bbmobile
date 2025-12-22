# Idle Modal Consistency Fix - Implementation Summary

## Overview
This PR fixes the inconsistent idle/"You cannot compete" modal on mobile, ensures the "No" action triggers a clock fast-forward, and adds global button CSS rules so button labels are centered and prefer a single-line layout when the text fits.

## Files Added

### 1. `js/ui/idleCard.js`
A canonical idle modal component used across the app with the following features:
- **Consistent DOM structure** with stable class names (`.game-modal`, `.idle-modal`, `.standard-idle`)
- **Event emission** for integration with other systems
  - Emits `idle:choice` event when user makes a choice (yes/no)
  - Emits `clock:request-fast-forward` event when user presses "No" button
- **Backwards compatibility** with direct clock API calls
- **Defensive coding** - checks for presence of `window.game.bus` and `window.game.clock` before use
- **Accessible** - Uses proper ARIA attributes (`role="dialog"`, `aria-modal="true"`, `aria-label`)
- **Flexible API** - Accepts custom title, message, button labels, and callbacks

**Usage:**
```javascript
import { IdleCard } from './js/ui/idleCard.js';

IdleCard.show({
  title: 'You cannot compete',
  message: 'The competition is in progress. Would you like to fast-forward?',
  yesLabel: 'Yes',
  noLabel: 'No',
  onYes: () => { /* custom callback */ },
  onNo: () => { /* custom callback */ }
});

// Hide the modal programmatically
IdleCard.hide();
```

### 2. `js/bootstrap.idleClockListener.js`
A bootstrap listener that handles clock fast-forward requests:
- **Listens for events**:
  - `clock:request-fast-forward` (primary event name)
  - `idle:request-fast-forward` (legacy compatibility)
- **Defensive clock API calls**:
  - Tries `window.game.clock.fastForward()` first
  - Falls back to `window.game.clock.setSpeed(5)` if available
  - Emits `clock:fast-forward` event as final fallback
- **Auto-retry** - Waits for `window.game.bus` to be initialized if not present
- **Non-blocking** - Uses IIFE pattern to execute immediately without blocking bootstrap

**Integration:**
This file should be loaded after `js/bbGameBus.js` is initialized. It can be:
1. Loaded via `<script>` tag in HTML
2. Imported in bootstrap.js
3. Loaded dynamically during game initialization

### 3. `css/ui/buttons.css`
Global button styling for game modals with the following features:
- **Centered labels** - Both horizontally and vertically
- **Single-line preference** - Uses `white-space: nowrap` to keep labels on one line when possible
- **Responsive wrapping** - Allows wrapping when container width forces it
- **Consistent sizing**:
  - Desktop: `min-width: 110px`, `padding: 10px 18px`
  - Mobile (≤480px): `min-width: 95px`, `padding: 10px 12px`
- **Flex layout** - Buttons in `.action-row` use flexbox with `gap: 12px` (10px on mobile)
- **Visual hierarchy**:
  - `.btn-primary` - Green gradient for primary actions
  - `.btn-secondary` - Gray for secondary actions
- **Pointer-events fix** - `.btn-label` has `pointer-events: none` to prevent click interception

**CSS Structure:**
```css
.game-modal .action-row {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.game-modal .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  min-width: 110px;
  padding: 10px 18px;
}

.game-modal .btn .btn-label {
  text-align: center;
  pointer-events: none;
}
```

## Testing

### Manual Testing
A comprehensive test file `test_idle_card_modal.html` has been created to verify:
1. **Basic modal display** - Shows modal with default settings
2. **Custom messages** - Shows modal with custom title, message, and button labels
3. **Callback execution** - Verifies custom callbacks are triggered
4. **Event emission** - Logs all events emitted by the modal and clock listener
5. **Clock fast-forward** - Verifies clock speed changes when "No" is pressed
6. **Mobile responsiveness** - Buttons are properly sized and centered on mobile viewports

### Test Results
✅ Modal displays correctly on desktop and mobile<br>
✅ Buttons are centered and prefer single-line layout<br>
✅ "No" button emits `clock:request-fast-forward` event<br>
✅ Clock listener responds to fast-forward requests<br>
✅ Clock speed changes from 1x to 5x when "No" is pressed<br>
✅ Custom callbacks are executed correctly<br>
✅ Backdrop click closes the modal<br>
✅ Modal is accessible with proper ARIA attributes

## Screenshots

### Desktop View - Initial State
![Initial state](https://github.com/user-attachments/assets/bd3af2d2-9a32-4171-a1bf-45aee1886fcb)

### Desktop View - Modal Shown
![Modal shown](https://github.com/user-attachments/assets/a9054ca7-9ff6-49e4-9e39-7f8dc005bf4e)

### Desktop View - After "No" Click
![After No click](https://github.com/user-attachments/assets/55f8277f-c195-4fa1-948a-ece03150c43f)

Events captured:
- `clock:request-fast-forward` event emitted
- `clock.fastForward` called by listener
- Clock speed changed from 1x to 5x
- Last fast-forward request timestamp updated

### Mobile View (375×667)
![Mobile view](https://github.com/user-attachments/assets/88c43344-fd9c-4c88-8952-81c4ff05e195)

Buttons are properly sized and centered on mobile with appropriate padding and spacing.

## Integration Points

### For Existing Code
To use the new idle modal in existing code, replace current idle modal implementations with:

```javascript
import { IdleCard } from './js/ui/idleCard.js';

// Old code (example):
// showCustomModal('You cannot compete', 'Message here', onYes, onNo);

// New code:
IdleCard.show({
  title: 'You cannot compete',
  message: 'Message here',
  onYes: onYes,
  onNo: onNo
});
```

### For Clock System
The clock system should listen for `clock:request-fast-forward` events and implement fast-forward logic:

```javascript
window.game.bus.on('clock:request-fast-forward', (payload) => {
  // Implement clock fast-forward logic here
  // E.g., increase clock speed, skip idle time, etc.
});
```

Alternatively, the clock object can expose `fastForward()` or `setSpeed(speed)` methods which will be called directly by the listener.

## Backwards Compatibility
- The implementation is **fully backwards compatible**
- The `.standard-idle` class allows CSS to target only new modals
- Existing idle modals will continue to work without modification
- The clock listener is defensive and won't break if clock APIs aren't available
- Custom callbacks (`onYes`, `onNo`) are optional and wrap the built-in event emission

## Future Work
- Migrate existing idle modal implementations to use `IdleCard`
- Implement clock fast-forward logic in the clock system
- Add animations for modal show/hide transitions
- Add unit tests for the idle card component
- Consider adding a "Don't show again" option for idle modals

## Notes
- The CSS targets `.game-modal` class, so it will apply to all game modals
- Button styles can be customized by overriding CSS variables or adding theme-specific classes
- The modal is appended to `document.body` to ensure it's always on top
- The backdrop can be clicked to close the modal (accessibility feature)
- ESC key support can be added in the future if needed
