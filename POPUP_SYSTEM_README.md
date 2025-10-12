# Popup System Refresh — Complete Implementation

## Overview

This PR introduces a modern, accessible, and theme-aware popup system to replace the legacy reveal card system. The new system provides:

- **Token-based theming**: All popup styles controlled via CSS variables
- **Queue management**: One-at-a-time popup display with configurable delays
- **Accessibility**: Full ARIA support, focus trapping, keyboard navigation
- **Portal rendering**: Popups render in dedicated `#popup-root` container
- **Feature-flagged**: Can be enabled/disabled via `popup_refresh_enabled` config

## What's New

### 1. CSS Tokens (styles.css)

All popup styling is now controlled via CSS variables:

```css
:root {
  --popup-bg-start: rgba(28,43,62,.94);
  --popup-bg-end: rgba(12,22,36,.90);
  --popup-border: rgba(110,160,220,.25);
  --popup-radius: 24px;
  --popup-shadow: 0 12px 36px -16px rgba(0,0,0,.8), ...;
  --popup-backdrop-blur: 16px;
  --popup-backdrop-opacity: 0.9;
  --popup-max-width: min(780px, 92vw);
  --popup-padding: 22px 26px 24px;
  --popup-transition-duration: 0.3s;
  --popup-inter-delay: 800ms;
}
```

Each theme (TV Studio, Modern House, Midnight) overrides these tokens for consistent branding.

### 2. BasePopup Component (js/popup/BasePopup.js)

A flexible popup component with:
- Header/body/footer slots
- Configurable close behavior (backdrop, ESC, close button)
- Full accessibility (role="dialog", ARIA attributes)
- Focus trap (Tab/Shift+Tab cycles through elements)
- Token-based styling (adapts to active theme)

### 3. PopupManager (js/popup/PopupManager.js)

Queue manager that handles:
- One-at-a-time display (queues excess popups)
- Portal rendering (in `#popup-root`)
- Scroll lock (body scroll disabled when popup shown)
- Inter-popup delay (800ms default, 100ms for reduced-motion)
- Context API (`enqueue`, `close`, `clearQueue`)

### 4. Integration (js/popup/PopupIntegration.js)

Helper functions for common popup patterns:
- `showInfoPopup(title, message)` - Simple info message
- `showConfirmPopup(title, message, onConfirm, onCancel)` - Confirmation dialog
- Auto welcome popup on game start (if feature enabled)

### 5. Examples (js/popup/ExampleInfoPopup.js)

Sample popups demonstrating the system:
- `showWelcomePopup()` - Welcome message with feature flag check
- `showInstructionsPopup()` - Game instructions with list

## File Changes

### Added Files
- `js/popup/BasePopup.js` - Base popup component
- `js/popup/PopupManager.js` - Queue manager
- `js/popup/ExampleInfoPopup.js` - Example popups
- `js/popup/PopupIntegration.js` - Game integration helpers
- `docs/popup-refresh-migration-guide.md` - Migration guide
- `test_popup_system.html` - Comprehensive test suite

### Modified Files
- `styles.css` - Added tokens, updated reveal cards to use tokens, added animations
- `index.html` - Added `#popup-root` portal, included new scripts
- `js/config/defaults.js` - Added `popup_refresh_enabled` feature flag
- `js/settings/registry.js` - Added settings UI toggle

## Usage

### Enable the Feature

In Settings → Gameplay:
```
☑ Use new popup system (BasePopup/Queue) - experimental
```

Or programmatically:
```javascript
game.cfg.popup_refresh_enabled = true;
```

### Show a Basic Popup

```javascript
PopupManager.enqueue(() => {
  return createBasePopup({
    headerText: 'Title',
    bodyContent: '<p>Message here</p>',
    footerContent: '<button class="btn" onclick="PopupManager.close()">OK</button>'
  });
});
```

### Show Multiple Popups (Queue)

```javascript
// These will display one at a time
PopupManager.enqueue(() => createBasePopup({ headerText: 'Popup 1', ... }));
PopupManager.enqueue(() => createBasePopup({ headerText: 'Popup 2', ... }));
PopupManager.enqueue(() => createBasePopup({ headerText: 'Popup 3', ... }));
```

### Use Helper Functions

```javascript
// Simple info popup
showInfoPopup('Success', 'Your changes have been saved!');

// Confirmation dialog
showConfirmPopup(
  'Delete Item?',
  'Are you sure you want to delete this item?',
  () => { console.log('Confirmed'); },
  () => { console.log('Cancelled'); }
);
```

### Feature Flag Fallback

All popup functions check the feature flag and fall back to legacy systems:

```javascript
function myPopup() {
  const cfg = game?.cfg || {};
  
  if (!cfg.popup_refresh_enabled) {
    // Fall back to legacy showCard()
    showCard('Title', ['Message'], 'neutral', 3000);
    return;
  }
  
  // Use new system
  PopupManager.enqueue(() => createBasePopup({ ... }));
}
```

## Accessibility

### ARIA Support
- `role="dialog"` and `aria-modal="true"`
- `aria-labelledby` links to header
- `aria-describedby` links to body
- Close button has `aria-label="Close popup"`

### Keyboard Navigation
- **Tab**: Cycle forward through focusable elements
- **Shift+Tab**: Cycle backward
- **ESC**: Close popup (if enabled)
- Focus is trapped within popup
- Focus is restored when popup closes

### Screen Readers
- Popup is announced when shown
- Header and body are properly labeled
- All interactive elements are keyboard accessible

### Reduced Motion
- Inter-popup delay reduced to 100ms
- Animations respect `prefers-reduced-motion`

## Testing

### Manual Testing (test_popup_system.html)

Comprehensive test page with:
- Feature flag toggle
- Theme switcher (default, TV Studio, Modern House, Midnight)
- Basic popup tests
- Queue tests (3 popups, 5 popups)
- Accessibility tests (focus trap, ESC, backdrop click)
- Content tests (long scrollable, forms, custom footer)
- Edge cases (minimal, no header, reduced motion)

### Test Checklist

When migrating a popup:
- [ ] Displays correctly in all themes
- [ ] Close button works
- [ ] ESC key closes popup (if enabled)
- [ ] Backdrop click closes popup (if enabled)
- [ ] Focus trap works (Tab/Shift+Tab)
- [ ] Focus is restored on close
- [ ] Queues correctly (one at a time)
- [ ] Inter-popup delay is respected
- [ ] Body scroll is locked when shown
- [ ] Responsive (mobile/tablet/desktop)
- [ ] Reduced motion is respected
- [ ] Screen reader announces correctly
- [ ] Feature flag works (falls back when disabled)

## Screenshots

### Dark Theme (Default)
![Basic Popup](https://github.com/user-attachments/assets/37977cf4-77a5-4218-845f-a718e857a8ed)

### Queue System
![Queued Popups](https://github.com/user-attachments/assets/9fce92f4-3305-46fc-90a7-ce41b4922568)

### Light Theme (Modern House)
![Light Theme](https://github.com/user-attachments/assets/37bed5bf-81de-4999-a679-99414b92cfca)

## Migration Guide

See `docs/popup-refresh-migration-guide.md` for detailed migration instructions.

### Quick Migration

**Before:**
```javascript
showCard('Title', ['Line 1', 'Line 2'], 'neutral', 3000);
```

**After:**
```javascript
if (!game.cfg.popup_refresh_enabled) {
  showCard('Title', ['Line 1', 'Line 2'], 'neutral', 3000);
  return;
}

PopupManager.enqueue(() => {
  return createBasePopup({
    headerText: 'Title',
    bodyContent: '<p>Line 1</p><p>Line 2</p>',
    footerContent: '<button class="btn" onclick="PopupManager.close()">OK</button>'
  });
});
```

## Performance

- **Portal rendering**: No layout shifts in main content
- **Queue processing**: One at a time, with configurable delay
- **Scroll lock**: Position preserved and restored
- **Focus management**: Automatic trap and restore
- **Z-index**: Centrally managed (999998-999999)

## Rollback

If issues arise:
1. Set `popup_refresh_enabled: false` in config (or uncheck in Settings)
2. All popups fall back to legacy `showCard()`
3. Legacy system remains fully functional

## Future Enhancements

Potential improvements:
- Animation presets (slide, fade, zoom)
- Multi-step wizards
- Popup templates (success, error, warning)
- Toast notifications (non-blocking)
- Custom animations per type

## Support

For questions or issues:
- Source code: `js/popup/*.js`
- Documentation: `docs/popup-refresh-migration-guide.md`
- Test page: `test_popup_system.html`
- This README

## Estimated Files Changed

- 12 files changed
- ~1,500 lines added (code + docs + tests)
- 0 files removed (backward compatible)
- Feature-flagged (no breaking changes)
