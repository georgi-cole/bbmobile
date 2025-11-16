# TV Inline Status Bar Guide

## Overview

The TV Inline Status Bar is a unified system for displaying short, informational status messages in the TV header, replacing the deprecated below-TV status strip pattern.

**Location**: Status messages appear as a small pill beside the Skip/Timer control in the `.tvHead` container.

**Purpose**: Consolidate all ephemeral, single-line status messages into a consistent, accessible inline display that doesn't clutter the main panel area.

---

## API Reference

The `TVInlineStatus` module provides a simple API for setting and clearing status messages.

### `TVInlineStatus.set(message, tone)`

Display a status message in the inline status bar.

**Parameters:**
- `message` (string): The status text to display. Keep concise (≤80 characters recommended).
- `tone` (string, optional): Visual tone. Default: `'muted'`
  - `'muted'` - Neutral gray (default)
  - `'warn'` - Warning yellow/orange
  - `'error'` - Error red
  - `'success'` - Success green

**Example:**
```javascript
// Show a neutral status
window.TVInlineStatus?.set('Loading minigame system…', 'muted');

// Show a success status
window.TVInlineStatus?.set('Submission received. Waiting for others…', 'success');

// Show an error status
window.TVInlineStatus?.set('Error loading minigames. Please refresh the page.', 'error');

// Show a warning status
window.TVInlineStatus?.set('Minigame engine not available.', 'warn');
```

### `TVInlineStatus.clear()`

Clear the currently displayed status message.

**Example:**
```javascript
window.TVInlineStatus?.clear();
```

**Note**: Status messages are automatically cleared on phase changes via the `bb:phase:changed` event.

---

## Usage Guidelines

### When to Use Inline Status

✅ **DO use inline status for:**
- Short, single-line informational messages
- Transient status updates (loading, waiting, observing)
- Eligibility messages (blocked, evicted, already submitted)
- Simple error messages
- Completion acknowledgments

❌ **DON'T use inline status for:**
- Multi-line instructions or explanations
- Interactive UI elements (buttons, forms, controls)
- Complex error details that need multiple sentences
- Permanent information that should persist across phases

### Message Length

- **Recommended**: ≤80 characters
- **Maximum visual display**: Varies by screen width (truncates with ellipsis on mobile)
- **Accessibility**: Full text is always announced to screen readers regardless of visual truncation

### Tone Selection

- **`muted`**: Default for neutral information (loading, waiting, observing)
- **`success`**: Positive feedback (submission received, action completed)
- **`warn`**: Important information that needs attention (unavailable features, limitations)
- **`error`**: Critical errors that prevent functionality (system failures, loading errors)

---

## Migration from Legacy Status

### Old Pattern (Deprecated)

```javascript
// DON'T: Legacy below-TV status strip
panel.innerHTML = '<div class="tiny muted">Loading competition...</div>';
```

### New Pattern (Recommended)

```javascript
// DO: Inline status with fallback
if (global.TVInlineStatus?.set) {
  global.TVInlineStatus.set('Loading competition…', 'muted');
} else {
  // Graceful fallback if module not loaded
  host.innerHTML = '<div class="tiny muted">Loading competition...</div>';
}
```

### Detection Pattern

Search for legacy status messages using this regex pattern:

```regex
/#panel[^{;]*innerHTML\s*=\s*'[^']*tiny muted[^']*'|
className\s*=\s*['"]tiny muted['"]|
innerHTML\s*=\s*['"][^'"]*tiny muted[^'"]*['"]
```

---

## Common Scenarios

### Competition Loading

```javascript
if (!isMinigameSystemReady()) {
  if (global.TVInlineStatus?.set) {
    global.TVInlineStatus.set('Loading minigame system…', 'muted');
  }
  // ... retry logic
}
```

### Eligibility Messages

```javascript
// Player not eligible
if (global.TVInlineStatus?.set) {
  global.TVInlineStatus.set('Not eligible this week or already submitted.', 'muted');
}

// Player evicted
if (global.TVInlineStatus?.set) {
  global.TVInlineStatus.set('You are evicted and cannot compete.', 'muted');
}
```

### Observer Status

```javascript
// Juror observing
if (global.TVInlineStatus?.set) {
  global.TVInlineStatus.set('You are not a juror. Observing…', 'muted');
}

// Vote observer
if (global.TVInlineStatus?.set) {
  global.TVInlineStatus.set('You are observing this vote.', 'muted');
}
```

### Submission Feedback

```javascript
// Success
if (global.TVInlineStatus?.set) {
  global.TVInlineStatus.set('Submission received. Waiting for others…', 'success');
}
```

### Error States

```javascript
// System failure
if (global.TVInlineStatus?.set) {
  global.TVInlineStatus.set('Error loading minigames. Please refresh the page.', 'error');
}

// Feature unavailable
if (global.TVInlineStatus?.set) {
  global.TVInlineStatus.set('Minigame engine not available.', 'warn');
}
```

---

## Accessibility

The inline status bar includes built-in accessibility features:

### Screen Reader Support

- **Aria-live region**: Off-screen element with `aria-live="polite"` announces status changes
- **Atomic updates**: Status changes are announced without reading entire page
- **Polite announcements**: Won't interrupt user's current screen reader context

### Visual Accessibility

- **High contrast mode**: Border styles adapt for better visibility
- **Text shadows**: Multi-layer shadows ensure readability over animated backgrounds
- **Color-blind friendly**: Tone variants use distinct visual patterns, not just color

---

## Phase Change Integration

Status messages are automatically cleared on phase changes via the `bb:phase:changed` custom event.

### Event Details

- **Event name**: `bb:phase:changed`
- **Dispatch location**: `js/ui.hud-and-router.js` → `setPhase()` function
- **Event detail**: `{ phase: string, previousPhase: number }`

### Manual Phase-Specific Status

To set a new status after phase change:

```javascript
// In phase render function
function renderHOH(panel) {
  // Status will be cleared automatically on phase change
  // Set new status specific to this phase
  if (!eligible) {
    global.TVInlineStatus?.set('Not eligible this week.', 'muted');
  }
}
```

---

## Browser Compatibility

- **Modern browsers**: Full support (Chrome, Firefox, Safari, Edge)
- **Older browsers**: Graceful degradation (falls back to legacy status if TVInlineStatus not available)
- **Mobile**: Responsive text sizing and truncation

---

## Debugging

### Check if Module Loaded

```javascript
if (window.TVInlineStatus) {
  console.log('TVInlineStatus module loaded');
} else {
  console.warn('TVInlineStatus module not available');
}
```

### Get Current Status

```javascript
const status = window.TVInlineStatus?.getStatus();
console.log('Current status:', status);
// { message: 'Loading competition…', tone: 'muted' }
```

### Force Re-initialization

```javascript
// Only needed if DOM structure changed dynamically
window.TVInlineStatus?.init();
```

---

## CSS Customization

Status bar styles are defined in `css/tv-inline-status.css`.

### CSS Custom Properties

```css
:root {
  --tv-status-bg-muted: rgba(100, 100, 100, 0.2);
  --tv-status-text-muted: rgba(255, 255, 255, 0.75);
  --tv-status-bg-warn: rgba(255, 193, 7, 0.25);
  --tv-status-text-warn: rgba(255, 235, 59, 1);
  --tv-status-bg-error: rgba(244, 67, 54, 0.25);
  --tv-status-text-error: rgba(255, 138, 128, 1);
  --tv-status-bg-success: rgba(76, 175, 80, 0.25);
  --tv-status-text-success: rgba(129, 199, 132, 1);
}
```

### Responsive Breakpoints

- **Desktop**: Default sizing
- **Tablet (≤768px)**: Reduced font size, smaller max-width
- **Mobile (≤480px)**: Further reduced, more aggressive truncation
- **Small mobile (≤360px)**: Extra compact sizing

---

## Testing Checklist

When adding or modifying status messages:

- [ ] Message is ≤80 characters
- [ ] Appropriate tone selected (muted/warn/error/success)
- [ ] Fallback provided for graceful degradation
- [ ] Tested on mobile viewport (responsive truncation)
- [ ] Screen reader announcement verified
- [ ] Status clears appropriately on phase change
- [ ] No duplicate messages or status spam

---

## Example: Full Migration

**Before:**
```javascript
function renderHOH(panel) {
  const host = document.createElement('div');
  host.className = 'minigame-host';
  
  if (!isMinigameSystemReady()) {
    host.innerHTML = '<div class="tiny muted">Loading minigame system...</div>';
    panel.appendChild(host);
    return;
  }
  
  if (you && you.evicted) {
    host.innerHTML = '<div class="tiny muted">You are evicted and cannot compete.</div>';
  } else if (!eligible) {
    host.innerHTML = '<div class="tiny muted">Not eligible this week or already submitted.</div>';
  }
  
  panel.appendChild(host);
}
```

**After:**
```javascript
function renderHOH(panel) {
  const host = document.createElement('div');
  host.className = 'minigame-host';
  
  if (!isMinigameSystemReady()) {
    // Use inline status instead of below-TV message
    if (global.TVInlineStatus?.set) {
      global.TVInlineStatus.set('Loading minigame system…', 'muted');
    }
    return;
  }
  
  if (you && you.evicted) {
    // Use inline status instead of below-TV message
    if (global.TVInlineStatus?.set) {
      global.TVInlineStatus.set('You are evicted and cannot compete.', 'muted');
    }
  } else if (!eligible) {
    // Use inline status instead of below-TV message
    if (global.TVInlineStatus?.set) {
      global.TVInlineStatus.set('Not eligible this week or already submitted.', 'muted');
    }
  }
  
  panel.appendChild(host);
}
```

---

## Future Enhancements

Potential improvements for future versions:

- **Multiple status slots**: Support for secondary status messages
- **Icon support**: Add emoji or icon prefixes programmatically
- **Animation options**: Fade-in/fade-out transitions
- **Persistent status**: Option to prevent auto-clear on phase change
- **Status history**: Debug panel showing recent status messages

---

## Support

For questions or issues:

1. Check this guide first
2. Search codebase for existing usage patterns
3. Review test files (e.g., `test_tv_skip.html`)
4. Create an issue with reproduction steps

---

## Related Files

- **Module**: `js/runtime/tv-inline-status.js`
- **Styles**: `css/tv-inline-status.css`
- **Phase Events**: `js/ui.hud-and-router.js` (setPhase function)
- **Skip Integration**: `js/tv-skip.js`

---

*Last updated: Implementation of unified TV inline status bar system*
