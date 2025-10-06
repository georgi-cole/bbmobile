# Event Modal Quick Reference

## Quick Start

Include the script in your HTML:
```html
<script src="js/ui.event-modal.js"></script>
```

## Basic Usage

```javascript
// Simple modal
await window.showEventModal({
  title: 'Event Title',
  emojis: '⭐',
  subtitle: 'Event description',
  duration: 4000
});
```

## Common Examples

### Double Eviction
```javascript
await window.showEventModal({
  title: 'House Shock!',
  emojis: '⚠️😱',
  subtitle: 'Double Eviction Week!! Three nominees — two leave.',
  tone: 'danger',
  duration: 4000
});
```

### Triple Eviction
```javascript
await window.showEventModal({
  title: 'House Shock!',
  emojis: '⚠️💥😱',
  subtitle: 'Triple Eviction Week!!! Four nominees — three leave.',
  tone: 'danger',
  duration: 4000
});
```

### Juror Return
```javascript
await window.showEventModal({
  title: 'House Shock!',
  emojis: '👁️⚖️🔙',
  subtitle: 'A jury member re-enters the house!',
  tone: 'special',
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

### Success Message
```javascript
await window.showEventModal({
  title: 'Success!',
  emojis: '✅',
  subtitle: 'Action completed successfully',
  tone: 'ok',
  duration: 3000
});
```

### Warning Message
```javascript
await window.showEventModal({
  title: 'Warning',
  emojis: '⚠️',
  subtitle: 'Please confirm your action',
  tone: 'warn',
  duration: 3000
});
```

## Tone Options

| Tone | Color | Use Case |
|------|-------|----------|
| `neutral` | Blue | General info |
| `warn` | Yellow/Orange | Cautions |
| `danger` | Red | Critical events |
| `ok` | Green | Success |
| `special` | Purple | Celebrations |

## Queue System

Multiple modals display sequentially:

```javascript
// All three will show one after another
window.showEventModal({ title: 'First', emojis: '1️⃣', duration: 2000 });
window.showEventModal({ title: 'Second', emojis: '2️⃣', duration: 2000 });
await window.showEventModal({ title: 'Third', emojis: '3️⃣', duration: 2000 });
```

## With Callback

```javascript
await window.showEventModal({
  title: 'Event',
  emojis: '🎉',
  subtitle: 'Something happened',
  duration: 3000,
  callback: () => {
    console.log('Modal dismissed!');
    // Continue game logic here
  }
});
```

## Clear Queue

```javascript
window.clearEventModalQueue(); // Removes pending modals and closes current
```

## All Options

```javascript
await window.showEventModal({
  title: string,           // Main title (default: 'Event')
  emojis: string,          // Emoji(s) to show (default: '⭐')
  subtitle: string,        // Description (default: '')
  badge: string,           // Text badge instead of emojis (default: '')
  duration: number,        // Auto-dismiss time in ms (default: 4000)
  minDisplayTime: number,  // Min time before dismissible (default: 500)
  callback: function,      // Called after dismiss (default: null)
  tone: string            // Color scheme (default: 'neutral')
});
```

## Testing

Open `test_event_modals.html` in a browser to test all modal types.

## Integration Points

### After Inter-Week Modal (Auto)
Twist modals automatically show after inter-week modal if twist is active.

### In Jury Phase (Auto)
Public Favourite modal automatically shows after winner announcement if enabled.

### Manual Trigger
Call `showEventModal()` anywhere in your code when needed.

## Tips

1. **Duration**: 3-5 seconds is good for most messages
2. **Emojis**: Use 1-3 emojis for visual impact
3. **Subtitle**: Keep it short and clear (< 50 words)
4. **Tone**: Match the event mood (danger for bad news, ok for good news)
5. **Queue**: Modals auto-queue, no need to wait between calls

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers
- ✅ Touch and mouse
- ✅ Keyboard (ESC)

## Troubleshooting

**Modal not showing?**
- Check console for errors
- Verify script is loaded: `typeof window.showEventModal`
- Check FX settings (modals respect game FX toggles)

**Modal dismisses too fast?**
- Increase `duration` parameter
- Users can still dismiss early by clicking

**Multiple modals overlapping?**
- Queue system should prevent this
- Call `clearEventModalQueue()` if needed

## Performance

- Lightweight: < 10KB
- No external dependencies
- CSS animations (GPU accelerated)
- Auto cleanup on dismiss
- Minimal memory footprint

---

For more details, see `EVENT_MODAL_SYSTEM.md`
