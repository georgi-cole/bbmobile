# Zoom Lock Module

## Overview

The `zoom-lock` module provides a lightweight, reusable solution to prevent pinch-to-zoom and gesture zoom on specific elements or the entire document. This is particularly useful for maintaining a consistent user experience in game interfaces where zooming would disrupt gameplay.

## Location

`js/utils/zoom-lock.js`

## Current Integration

The zoom lock is currently integrated in two key areas:

1. **Intro Hub Screen** (`src/ui/IntroScreen.js`)
   - Attached when the intro screen is shown
   - Detached when the intro screen is hidden
   - Targets the intro screen container element

2. **Main Game Screen** (`src/startup/flow.js`)
   - Attached when the main game screen is built
   - Detached when returning to the intro hub
   - Targets the `.wrap` element (main game container)

## API Reference

### `ZoomLock.forElement(element)`

Creates a zoom lock instance for a specific element.

**Parameters:**
- `element` (HTMLElement, optional): The element to attach the lock to. Defaults to `document`.

**Returns:** An object with the following methods:
- `attach()`: Attaches event listeners to prevent zoom
- `detach()`: Removes event listeners
- `isAttached()`: Returns boolean indicating if lock is currently attached

**Example:**
```javascript
import { ZoomLock } from './js/utils/zoom-lock.js';

// Lock a specific element
const container = document.getElementById('myContainer');
const lock = ZoomLock.forElement(container);
lock.attach();

// Later, when you want to allow zooming again
lock.detach();
```

### `ZoomLock.lockDocument()`

Convenience method that creates and immediately attaches a lock to the entire document.

**Returns:** A zoom lock instance already attached to the document.

**Example:**
```javascript
import { ZoomLock } from './js/utils/zoom-lock.js';

const lock = ZoomLock.lockDocument();

// Later, detach if needed
lock.detach();
```

## How It Works

The zoom lock prevents pinch-to-zoom by:

1. **Touch Events**: Listening for `touchstart` and `touchmove` events with multiple touch points (fingers) and preventing the default behavior
2. **Gesture Events**: Listening for Safari's `gesturestart` event and preventing its default behavior
3. **Non-Passive Listeners**: Using `{ passive: false }` to ensure `preventDefault()` can be called

## Implementation Pattern

When integrating zoom lock into a new screen or component:

```javascript
// 1. Import dynamically (for non-module scripts)
let zoomLock = null;

async function attachZoomLock() {
  try {
    const targetElement = document.getElementById('myScreen');
    if (!targetElement) {
      console.warn('Cannot attach zoom lock - element not found');
      return;
    }

    // Skip if already attached
    if (zoomLock && zoomLock.isAttached()) {
      console.info('Zoom lock already attached, skipping');
      return;
    }

    // Dynamically import the module
    const { ZoomLock } = await import('../../js/utils/zoom-lock.js');
    
    // Create and attach lock
    zoomLock = ZoomLock.forElement(targetElement);
    zoomLock.attach();
    
    console.info('Zoom lock attached');
  } catch (err) {
    // Fail gracefully - zoom lock is a progressive enhancement
    console.warn('Failed to attach zoom lock:', err);
  }
}

function detachZoomLock() {
  try {
    if (zoomLock && zoomLock.isAttached()) {
      zoomLock.detach();
      console.info('Zoom lock detached');
    }
  } catch (err) {
    console.warn('Failed to detach zoom lock:', err);
  }
}

// 2. Use in screen lifecycle
function showScreen() {
  // ... show screen logic ...
  attachZoomLock();
}

function hideScreen() {
  detachZoomLock();
  // ... hide screen logic ...
}
```

## Accessibility Considerations

### Why JS-Only Approach?

This implementation uses JavaScript to prevent zoom rather than the global `viewport` meta tag with `user-scalable=no`. This approach offers several advantages:

1. **Targeted Control**: Only prevents zoom on specific screens (intro hub, main game) where it's needed
2. **Better Accessibility**: Allows zoom on other content like documentation, settings, or text-heavy screens
3. **Progressive Enhancement**: If JavaScript fails to load or the module import fails, the app remains functional (just with zoom enabled)
4. **Reversible**: Can be dynamically enabled/disabled based on screen transitions

### Accessibility Warning

⚠️ **Important**: While this implementation is more accessible than a global `user-scalable=no` setting, it still restricts zoom functionality on the affected screens. Consider:

- Users with vision impairments may need to zoom even on game screens
- Some jurisdictions have accessibility requirements that prohibit disabling zoom
- Consider adding a setting to allow users to disable zoom-lock if needed for accessibility

### Future Enhancement Ideas

- Add a user preference toggle in Settings to disable zoom-lock
- Detect system accessibility settings (e.g., large text mode) and automatically disable zoom-lock
- Provide alternative ways to increase UI element sizes without zooming

## Browser Compatibility

- **Modern Browsers**: Full support (Chrome, Firefox, Safari, Edge)
- **Safari/iOS**: Uses `gesturestart` event for additional coverage
- **Touch Devices**: Primary target, uses `touchstart` and `touchmove` events
- **Non-Touch Devices**: No impact (events won't fire)

## Troubleshooting

### Zoom lock not working

1. Check that the target element exists when `attach()` is called
2. Verify the module is being imported correctly (check console for errors)
3. Ensure the element has layout (not `display: none`)
4. Check browser console for any JavaScript errors

### Performance concerns

The zoom lock uses passive: false listeners, which can impact scroll performance. However:
- It only prevents default on multi-touch events (2+ fingers)
- Single-finger scrolling is not affected
- Performance impact is minimal in practice

## Testing

To test zoom lock functionality:

1. **Desktop**: Use browser DevTools device emulation with touch simulation
2. **Mobile Device**: 
   - Navigate to intro hub
   - Try to pinch-to-zoom (should be blocked)
   - Navigate to settings or another modal
   - Try to pinch-to-zoom (should work)
   - Start game (press Play)
   - Try to pinch-to-zoom in main game (should be blocked)

## Related Files

- `js/utils/zoom-lock.js` - Core module implementation
- `src/ui/IntroScreen.js` - Intro hub integration
- `src/startup/flow.js` - Main game screen integration
