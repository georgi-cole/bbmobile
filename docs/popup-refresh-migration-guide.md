# Popup System Refresh — Migration Guide

## Overview

The new popup system provides a modern, accessible, and queue-managed approach to displaying popups in the Big Brother Mobile game. It replaces the legacy reveal card system with a token-based, theme-aware popup infrastructure.

## Key Features

### 1. Theme Tokens
All popup styling is now controlled via CSS variables (tokens) defined in `styles.css`:

```css
:root {
  /* Popup/Modal tokens */
  --popup-bg-start: rgba(28,43,62,.94);
  --popup-bg-end: rgba(12,22,36,.90);
  --popup-border: rgba(110,160,220,.25);
  --popup-radius: 24px;
  --popup-shadow: 0 12px 36px -16px rgba(0,0,0,.8), ...;
  --popup-shadow-inset: 0 0 32px -10px var(--accent) inset;
  --popup-backdrop-blur: 16px;
  --popup-backdrop-opacity: 0.9;
  --popup-max-width: min(780px, 92vw);
  --popup-padding: 22px 26px 24px;
  --popup-transition-duration: 0.3s;
  --popup-inter-delay: 800ms; /* delay between popups */
}
```

These tokens are overridden per-theme (TV Studio, Modern House, Midnight, etc.) to match the active theme's color scheme.

### 2. BasePopup Component
Located in `js/popup/BasePopup.js`, this provides:

- **Header/Body/Footer slots** for flexible content layout
- **Accessibility features**:
  - `role="dialog"` and `aria-modal="true"`
  - `aria-labelledby` and `aria-describedby`
  - Focus trap (keyboard navigation contained within popup)
  - ESC key to close
- **Configurable behavior**:
  - Close on backdrop click (optional)
  - Close on ESC key (optional)
  - Show/hide close button
  - Custom onClose callback

#### Basic Usage

```javascript
const popup = createBasePopup({
  id: 'my-popup',
  headerText: 'Popup Title',
  bodyContent: '<p>This is the body content.</p>',
  footerContent: '<button class="btn">OK</button>',
  onClose: () => console.log('Popup closed'),
  closeOnBackdrop: true,
  closeOnEsc: true,
  showCloseButton: true
});

// Append to popup root
document.getElementById('popup-root').appendChild(popup);
```

### 3. PopupManager with Queue
Located in `js/popup/PopupManager.js`, this provides:

- **One-at-a-time display**: Only one popup visible at a time
- **Queue management**: Popups are queued and shown sequentially
- **Portal rendering**: All popups render in `#popup-root` (outside main DOM flow)
- **Scroll lock**: Body scroll is locked when popup is shown
- **Inter-popup delay**: Configurable delay between popups (default 800ms)
- **Reduced motion support**: Respects `prefers-reduced-motion` (100ms delay instead)
- **Context API**: Simple enqueue/close/clear methods

#### Usage with PopupManager

```javascript
// Enqueue a popup (will show after current popup closes)
PopupManager.enqueue(() => {
  return createBasePopup({
    headerText: 'Queued Popup',
    bodyContent: '<p>This will show after previous popup closes.</p>'
  });
});

// Close current popup
PopupManager.close();

// Clear all queued popups
PopupManager.clearQueue();

// Check if popup is shown
if (PopupManager.isPopupShown()) {
  console.log('A popup is currently displayed');
}

// Get queue length
const count = PopupManager.getQueueLength();
```

### 4. Feature Flag
The new system is controlled by the `popup_refresh_enabled` feature flag in `js/config/defaults.js`:

```javascript
{
  popup_refresh_enabled: false  // Default: OFF (uses legacy system)
}
```

When `false`, code should fall back to the legacy `showCard()` function. When `true`, use the new `BasePopup` and `PopupManager`.

## Migration Steps

### For Simple Informational Popups

**Before (Legacy):**
```javascript
showCard('Title', ['Line 1', 'Line 2'], 'neutral', 3000);
```

**After (New System):**
```javascript
function showMyPopup() {
  const cfg = game?.cfg || {};
  
  // Check feature flag
  if (!cfg.popup_refresh_enabled) {
    // Fall back to legacy
    showCard('Title', ['Line 1', 'Line 2'], 'neutral', 3000);
    return;
  }
  
  // Use new system
  PopupManager.enqueue(() => {
    return createBasePopup({
      headerText: 'Title',
      bodyContent: '<p>Line 1</p><p>Line 2</p>',
      footerContent: '<button class="btn" onclick="PopupManager.close()">OK</button>'
    });
  });
}
```

### For Complex Modals

For complex modals with forms, buttons, or interactive elements:

1. Create body content as an HTML string or DOM element
2. Add event listeners after popup is rendered (use `setTimeout` or `onClose`)
3. Use footer slot for action buttons

**Example:**
```javascript
PopupManager.enqueue(() => {
  const popup = createBasePopup({
    id: 'settings-popup',
    headerText: 'Settings',
    bodyContent: `
      <div>
        <label>
          <input type="checkbox" id="myCheckbox">
          Enable feature
        </label>
      </div>
    `,
    footerContent: `
      <button class="btn" id="cancelBtn">Cancel</button>
      <button class="btn" id="saveBtn">Save</button>
    `
  });
  
  // Add event listeners after render
  setTimeout(() => {
    document.getElementById('saveBtn')?.addEventListener('click', () => {
      // Save logic
      PopupManager.close();
    });
    
    document.getElementById('cancelBtn')?.addEventListener('click', () => {
      PopupManager.close();
    });
  }, 100);
  
  return popup;
});
```

## Accessibility Guidelines

### Focus Management
- Focus is automatically moved to the first focusable element in the popup
- Focus is trapped within the popup (Tab/Shift+Tab cycles through elements)
- Focus is restored to previously focused element when popup closes

### Keyboard Navigation
- **ESC**: Close popup (if `closeOnEsc: true`)
- **Tab**: Move to next focusable element
- **Shift+Tab**: Move to previous focusable element
- **Enter**: Activate focused button/link

### Screen Readers
- Popup has `role="dialog"` and `aria-modal="true"`
- Header is linked via `aria-labelledby`
- Body is linked via `aria-describedby`
- Close button has `aria-label="Close popup"`

### Best Practices
1. Always provide a way to close the popup (close button, ESC, or explicit close action)
2. Keep body content concise and scannable
3. Use semantic HTML in body content (headings, lists, paragraphs)
4. Ensure sufficient color contrast (tokens handle this per theme)
5. Test with keyboard-only navigation

## Theme Integration

### Theme-Specific Tokens
Each theme can override popup tokens for consistent styling:

**TV Studio (Dark/Neon):**
```css
body[data-theme="tvstudio"] {
  --popup-bg-start: rgba(26,26,47,.96);
  --popup-bg-end: rgba(16,16,32,.92);
  --popup-border: rgba(0,217,255,.35);
  --popup-shadow: 0 12px 36px -16px rgba(0,0,0,.9), ...;
}
```

**Modern House (Light):**
```css
body[data-theme="modernhouse"] {
  --popup-bg-start: rgba(255,255,255,.98);
  --popup-bg-end: rgba(248,248,252,.96);
  --popup-border: rgba(107,143,255,.4);
  --popup-shadow: 0 12px 36px -16px rgba(0,0,0,.15), ...;
  --popup-backdrop-opacity: 0.85;
}
```

## Performance Considerations

### Queue Processing
- Popups are processed sequentially (one at a time)
- Inter-popup delay prevents overwhelming users
- Reduced motion users get minimal delay (100ms)

### Portal Rendering
- All popups render in `#popup-root` (fixed positioned, outside main layout)
- No layout shifts in main content
- Z-index managed centrally (999998-999999)

### Scroll Lock
- Body scroll is locked when popup is shown
- Scroll position is preserved and restored
- No layout shifts due to scrollbar removal

## Testing Checklist

When migrating a popup:

- [ ] Popup displays correctly in all themes (TV Studio, Modern House, Midnight)
- [ ] Close button works
- [ ] ESC key closes popup (if enabled)
- [ ] Clicking backdrop closes popup (if enabled)
- [ ] Focus trap works (Tab/Shift+Tab cycles through elements)
- [ ] Focus is restored when popup closes
- [ ] Multiple popups queue correctly (one at a time)
- [ ] Inter-popup delay is respected
- [ ] Body scroll is locked when popup is shown
- [ ] Popup is responsive (mobile/tablet/desktop)
- [ ] Reduced motion is respected (animations are simplified)
- [ ] Screen reader announces popup correctly
- [ ] Feature flag works (falls back to legacy when disabled)

## Examples

See `js/popup/ExampleInfoPopup.js` for working examples:
- `showWelcomePopup()` - Simple welcome message
- `showInstructionsPopup()` - Instructions with list

## Rollback Strategy

If issues arise:

1. Set `popup_refresh_enabled: false` in config
2. All migrated popups should fall back to legacy `showCard()`
3. Legacy system remains fully functional

## Future Enhancements

Potential future improvements:
- Animation presets (slide, fade, zoom, etc.)
- Multi-step wizards (pagination within popup)
- Nested popups (if needed)
- Popup templates (success, error, confirm, etc.)
- Toast notifications (non-blocking)
- Custom animations per popup type

## Support

For questions or issues, refer to:
- `js/popup/BasePopup.js` - Component source
- `js/popup/PopupManager.js` - Queue manager source
- `styles.css` - Token definitions
- This migration guide
