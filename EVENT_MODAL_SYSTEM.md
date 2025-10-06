# Event Modal System Implementation

## Overview
The event modal system provides a robust, generalized modal component for displaying important game announcements, twists, and special events. It features a queue system to ensure only one modal is visible at a time, with sequential display for multiple events.

## Features

### Core Functionality
- **Customizable Content**: Support for title, emojis/badge, subtitle, and tone
- **Auto-dismiss**: Configurable duration with automatic dismissal
- **Manual Dismissal**: Click/tap to dismiss (with minimum display time protection)
- **Queue System**: Ensures only one modal is visible at a time; multiple modals display sequentially
- **Tone-based Styling**: Five different color schemes (neutral, warn, danger, ok, special)
- **Accessibility**: ESC key support and proper ARIA attributes
- **Callbacks**: Optional callback function when modal is dismissed

### Visual Design
- Prominent centered display with backdrop blur
- Large emojis or badge for visual impact
- Bold title with shadow for emphasis
- Descriptive subtitle for context
- Dismiss hint that appears after minimum display time
- Smooth fade-in/fade-out animations

## API Reference

### `showEventModal(options)`

Display an event modal with customizable content.

**Parameters:**
```javascript
{
  title: string,           // Main title text (default: 'Event')
  emojis: string,          // Emoji(s) to display (default: '⭐')
  subtitle: string,        // Subtitle/description (default: '')
  badge: string,           // Alternative to emojis - text badge (default: '')
  duration: number,        // Auto-dismiss time in ms (default: 4000)
  minDisplayTime: number,  // Min time before dismissible (default: 500)
  callback: function,      // Called after dismissal (default: null)
  tone: string            // Color scheme (default: 'neutral')
}
```

**Tone Options:**
- `'neutral'` - Blue tones (default)
- `'warn'` - Yellow/orange tones
- `'danger'` - Red tones
- `'ok'` - Green tones
- `'special'` - Purple tones

**Returns:** `Promise` - Resolves when modal is dismissed

**Example:**
```javascript
await window.showEventModal({
  title: 'House Shock!',
  emojis: '⚠️😱',
  subtitle: 'Double Eviction Week!! Three nominees — two leave.',
  tone: 'danger',
  duration: 4000
});
```

### `clearEventModalQueue()`

Clear any pending modals from the queue and close the current modal.

**Example:**
```javascript
window.clearEventModalQueue();
```

## Integration Points

### Twist Announcements (js/ui.week-intro.js)
Twist modals appear after the inter-week modal, before HOH competition:
- **Double Eviction**: ⚠️😱 "Double Eviction Week!!"
- **Triple Eviction**: ⚠️💥😱 "Triple Eviction Week!!!"
- **Juror Return**: 👁️⚖️🔙 "A jury member re-enters the house!"

The `showTwistAnnouncementIfNeeded()` function checks game state and displays the appropriate twist modal.

### Public Favourite (js/jury.js)
The Public Favourite announcement now uses a celebratory event modal:
- **Emojis**: 🏆⭐🥇
- **Title**: "Fan Favourite!"
- **Subtitle**: "Public vote to determine favourite houseguest!"
- **Tone**: special (purple)

This replaces the previous card-based announcement while keeping all voting logic intact.

## File Structure

```
js/
  ui.event-modal.js          # Core event modal system
  ui.week-intro.js           # Twist announcement integration
  jury.js                    # Public Favourite integration
  jury_return.js             # Juror return twist support
```

## Testing

A comprehensive test page is available at `test_event_modals.html` with:
- Individual twist modal tests
- Public Favourite modal test
- Custom modal tests with all tones
- Queue system test

## Usage Examples

### Double Eviction Announcement
```javascript
await window.showEventModal({
  title: 'House Shock!',
  emojis: '⚠️😱',
  subtitle: 'Double Eviction Week!! Three nominees — two leave.',
  tone: 'danger',
  duration: 4000
});
```

### Public Favourite
```javascript
await window.showEventModal({
  title: 'Fan Favourite!',
  emojis: '🏆⭐🥇',
  subtitle: 'Public vote to determine favourite houseguest!',
  tone: 'special',
  duration: 4000
});
```

### Custom Success Message
```javascript
await window.showEventModal({
  title: 'Challenge Complete!',
  emojis: '✅',
  subtitle: 'You successfully completed the HOH competition.',
  tone: 'ok',
  duration: 3000
});
```

### Sequential Modals (Queue)
```javascript
// All three modals will display one after another
window.showEventModal({
  title: 'First Event',
  emojis: '1️⃣',
  subtitle: 'First modal',
  duration: 2000
});

window.showEventModal({
  title: 'Second Event',
  emojis: '2️⃣',
  subtitle: 'Second modal',
  duration: 2000
});

await window.showEventModal({
  title: 'Third Event',
  emojis: '3️⃣',
  subtitle: 'Third modal',
  duration: 2000
});
```

## Implementation Notes

### Queue System
The modal queue ensures that multiple modals display sequentially rather than overlapping:
1. Modals are added to a queue when `showEventModal()` is called
2. The queue processor displays one modal at a time
3. Each modal waits for dismissal before the next one appears
4. The queue can be cleared at any time with `clearEventModalQueue()`

### Dismissal Protection
Modals have a minimum display time (`minDisplayTime`, default 500ms) before they can be dismissed by the user. This prevents accidental dismissals and ensures the content is visible long enough to be read.

### Auto-dismiss
Modals automatically dismiss after the specified `duration`. The dismiss hint ("Click to dismiss") appears after `minDisplayTime` to inform users they can manually dismiss.

### Integration with Game Flow
The event modal system integrates seamlessly with the existing game flow:
- Does not block game logic
- Respects existing card queue system
- Works with existing FX toggles
- Maintains existing callback patterns

## Browser Compatibility
- Modern browsers with ES6+ support
- CSS backdrop-filter support (graceful degradation)
- Touch and mouse input support
- Keyboard navigation (ESC key)

## Performance Considerations
- Lightweight DOM manipulation
- CSS-based animations for smooth performance
- No external dependencies
- Minimal memory footprint
- Automatic cleanup on dismissal
