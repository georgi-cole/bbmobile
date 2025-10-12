# Popup System — Accessibility & Telemetry

## Overview

This document describes the accessibility features and telemetry system for the popup refresh implementation.

## Accessibility Features

### ARIA Support

All popups created with BasePopup include full ARIA support:

- `role="dialog"` - Identifies the popup as a dialog
- `aria-modal="true"` - Indicates the popup is modal
- `aria-labelledby` - Links to the header text for screen readers
- `aria-describedby` - Links to the body content for screen readers

Example:
```html
<div role="dialog" aria-modal="true" aria-labelledby="popup-header" aria-describedby="popup-body">
  <div id="popup-header">Popup Title</div>
  <div id="popup-body">Popup content...</div>
</div>
```

### Keyboard Navigation

#### Focus Trap
When a popup is shown, keyboard focus is trapped within the popup. This ensures that:
- TAB moves forward through focusable elements
- SHIFT+TAB moves backward through focusable elements
- Focus cycles from last to first element (and vice versa)
- Background content cannot receive focus while popup is open

#### Keyboard Shortcuts
- **ESC** - Closes the popup (if `closeOnEsc: true`)
- **TAB** - Cycles forward through buttons/links
- **SHIFT+TAB** - Cycles backward through buttons/links
- **ENTER/SPACE** - Activates focused button

### Focus Management

When a popup opens:
1. Current focus is saved
2. Focus moves to first focusable element in popup
3. Focus is trapped within popup

When a popup closes:
1. Focus trap is released
2. Focus returns to previously focused element
3. Screen readers announce closure

### Reduced Motion Support

The popup system respects the `prefers-reduced-motion` media query:

```css
@media (prefers-reduced-motion: reduce) {
  /* Animations are simplified or disabled */
  --popup-transition-duration: 0.1s;
  --popup-inter-delay: 100ms;
}
```

Inter-popup delays are also reduced from 800ms to 100ms for users who prefer reduced motion.

### Screen Reader Compatibility

All popups are tested with:
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)

Best practices:
- Use clear, descriptive header text
- Provide meaningful button labels
- Include alt text for images
- Avoid time-based auto-dismissal for important information

### Color Contrast

All popup elements use theme tokens that ensure WCAG 2.1 AA compliance:
- Text on background: minimum 4.5:1 contrast ratio
- Button text on button background: minimum 4.5:1 contrast ratio
- Focus indicators: minimum 3:1 contrast ratio

### Readable Text

All popup text uses:
- Minimum 16px font size (1rem)
- 1.6 line height for readability
- System fonts or high-quality web fonts
- Proper paragraph spacing

## Telemetry System

### Overview

The popup telemetry system (`PopupTelemetry.js`) tracks all popup interactions for analytics and debugging.

### Event Types

#### 1. popup_shown
Logged when a popup is displayed.

**Data:**
- `popupType` - Type of popup (e.g., 'competition_result', 'diary_room')
- `queueLength` - Number of popups in queue
- `id` - Unique popup identifier
- `timestamp` - When shown

Example:
```javascript
PopupTelemetry.logPopupShown('competition_result', {
  queueLength: 0,
  id: 'hoh-winner-popup'
});
```

#### 2. popup_decision
Logged when user makes a decision in a popup (clicks a button).

**Data:**
- `popupType` - Type of popup
- `decision` - User's choice (button label or action)
- `timestamp` - When decision made

Example:
```javascript
PopupTelemetry.logPopupDecision('social_decision', 'Accept Alliance', {
  playerId: 'player5',
  weekNumber: 3
});
```

#### 3. popup_dismissed
Logged when a popup is closed.

**Data:**
- `popupType` - Type of popup
- `method` - How dismissed ('backdrop', 'esc', 'button', 'auto', 'programmatic')
- `timeShownMs` - How long popup was visible
- `timestamp` - When dismissed

Example:
```javascript
PopupTelemetry.logPopupDismissed('diary_room', 'esc', {
  timeShownMs: 3500
});
```

#### 4. popup_queue_depth
Logged when a popup is enqueued.

**Data:**
- `queueDepth` - Current queue size after enqueue
- `popupType` - Type of popup being enqueued
- `timestamp` - When enqueued

Example:
```javascript
PopupTelemetry.logQueueDepth(3, {
  popupType: 'nomination_ceremony'
});
```

### Using the Telemetry API

#### Basic Usage

```javascript
// Manually log events
PopupTelemetry.logPopupShown('custom_popup', {
  customData: 'value'
});

// Get recent events
const recent = PopupTelemetry.getRecentEvents(10);
console.log(recent);

// Get statistics
const stats = PopupTelemetry.getStats();
console.log(stats);
// {
//   totalShown: 45,
//   totalDecisions: 32,
//   totalDismissed: 45,
//   totalQueued: 8,
//   sessionDurationMs: 123456,
//   popupTypeStats: { ... }
// }

// Get stats for specific popup type
const competitionStats = PopupTelemetry.getTypeStats('competition_result');
console.log(competitionStats);
// {
//   shown: 12,
//   decisions: 0,
//   dismissed: 12,
//   queued: 2,
//   totalTimeShown: 45000
// }
```

#### Automatic Telemetry

When using `PopupManager.enqueue()` with a `popupType` option, telemetry is logged automatically:

```javascript
PopupManager.enqueue(() => {
  return createBasePopup({
    headerText: 'Competition Winner',
    bodyContent: '<p>Congratulations!</p>'
  });
}, {
  popupType: 'competition_result',  // Automatically tracked
  id: 'hoh-result'
});
```

### Console Helpers

For debugging in the browser console:

```javascript
// Get recent telemetry events
__getPopupTelemetry();

// Export all telemetry data
const json = __exportPopupTelemetry();
console.log(json);

// Clear telemetry
__clearPopupTelemetry();

// Get summary
console.log(PopupTelemetry.getSummary());
```

### GameBus Integration

All telemetry events are also emitted on the GameBus for external listeners:

```javascript
bbGameBus.on('popup:telemetry', (event) => {
  console.log('Popup telemetry event:', event);
  // {
  //   type: 'popup_shown',
  //   timestamp: 1696512345678,
  //   data: { popupType: 'social_decision', ... }
  // }
});
```

### Debug Panel

Enable the debug panel in config:

```javascript
game.cfg.enablePopupTelemetryPanel = true;
```

This will log all telemetry events to the console in real-time.

### Data Export

Export telemetry data for analysis:

```javascript
const data = PopupTelemetry.exportData();
// Download as JSON file
const blob = new Blob([data], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'popup-telemetry.json';
a.click();
```

## Accessibility Testing Checklist

### Manual Testing

- [ ] Navigate popup using only keyboard (no mouse)
- [ ] Verify focus trap works correctly
- [ ] Test ESC key closes popup
- [ ] Verify focus returns to previous element after close
- [ ] Test with screen reader (NVDA/JAWS/VoiceOver)
- [ ] Verify all interactive elements are announced
- [ ] Test with high contrast mode
- [ ] Test with browser zoom at 200%
- [ ] Test with reduced motion enabled

### Automated Testing

- [ ] Run axe DevTools accessibility scan
- [ ] Verify ARIA attributes are correct
- [ ] Check color contrast ratios (WCAG AA)
- [ ] Validate focus order
- [ ] Test keyboard navigation paths

### Screen Reader Testing

- [ ] Popup announcement on open
- [ ] Header text is read correctly
- [ ] Body content is navigable
- [ ] Button labels are clear
- [ ] Close events are announced

## Best Practices

### For Developers

1. **Always specify popupType** for telemetry tracking
2. **Use meaningful popup IDs** for debugging
3. **Provide clear button labels** for screen readers
4. **Avoid auto-dismissal** for critical information
5. **Test keyboard navigation** for every popup
6. **Use theme tokens** for colors (never hardcode)
7. **Respect reduced motion** preferences

### For Designers

1. **Ensure sufficient contrast** (4.5:1 minimum)
2. **Use readable fonts** (16px minimum)
3. **Provide clear visual focus** indicators
4. **Avoid relying on color alone** to convey information
5. **Design for zoom** (up to 200%)
6. **Keep popup content concise** and scannable

## Migration Examples

### Before (Legacy)
```javascript
showCard('Competition Winner', ['You won HOH!'], 'good', 3000);
```

### After (New System with Telemetry)
```javascript
if (!game.cfg.popup_refresh_enabled) {
  showCard('Competition Winner', ['You won HOH!'], 'good', 3000);
  return;
}

PopupManager.enqueue(() => {
  return createBasePopup({
    headerText: 'Competition Winner',
    bodyContent: '<p>You won HOH!</p>',
    footerContent: '<button class="btn" onclick="PopupManager.close()">OK</button>'
  });
}, {
  popupType: 'competition_result',
  id: 'hoh-winner'
});
```

## Troubleshooting

### Focus not trapped
- Verify popup has focusable elements
- Check that focus trap is initialized after DOM insertion

### Screen reader not announcing
- Verify ARIA attributes are present
- Check that role="dialog" is set
- Ensure aria-labelledby points to valid element

### Telemetry not logging
- Verify PopupTelemetry module is loaded
- Check that popupType is provided
- Ensure enablePopupTelemetryPanel is true for console logs

### Reduced motion not working
- Check browser supports prefers-reduced-motion
- Verify CSS media query is active
- Test with browser dev tools

## Resources

- [ARIA Authoring Practices - Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN: ARIA role="dialog"](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/dialog_role)
- [WebAIM: Keyboard Accessibility](https://webaim.org/techniques/keyboard/)
