# TV Cards Module Migration Guide

## Overview

The TV card presentation logic has been extracted from `js/veto.js` into a shared module `js/ui/tv-cards.js` to standardize all in-TV ceremony cards across the game.

## What Changed

### New Module: `js/ui/tv-cards.js`

All TV card scaffolding and display functions are now in this shared module:

- `ensureTVOverlay()` - Create TV overlay scaffold
- `clearTVOverlay()` - Clear TV overlay content
- `showTVCard()` - Basic text card
- `showTVCardWithAvatars()` - Card with player avatars
- `showTVDecision()` - Decision card with buttons
- `showTVNomineeSavePanel()` - Veto nominee selection panel
- `showInlineCard()` - Generic ceremony message

### Updated Files

1. **js/veto.js** - Now delegates to TVCards module (maintains backward compatibility)
2. **js/nominations.js** - Updated to use TVCards functions
3. **index.html** - Loads tv-cards.js before veto.js
4. **styles.css** - Added documentation comments

## Migration Examples

### Before: Inline Card Creation

```javascript
const host = document.getElementById('tvOverlay');
host.innerHTML = '';

const card = document.createElement('div');
card.className = 'revealCard diaryRoomCard';
card.style.cssText = 'width: 90%; max-width: 450px; padding: 20px 24px; text-align: center;';

const title = document.createElement('h3');
title.textContent = 'Ceremony Title';
card.appendChild(title);

const message = document.createElement('p');
message.className = 'big';
message.textContent = 'Ceremony message';
card.appendChild(message);

host.appendChild(card);
document.getElementById('tv').classList.add('tvTall');
```

### After: Using TVCards Module

```javascript
await window.TVCards.showTVCard({
  title: 'Ceremony Title',
  lines: ['Ceremony message'],
  tone: 'noms',
  duration: 2400
});
```

## API Reference

### showTVCard(options)

Display a basic text card.

```javascript
await TVCards.showTVCard({
  title: 'Nomination Ceremony',           // Card title
  lines: ['This ceremony is adjourned.'], // Array of text lines
  tone: 'noms',                          // Optional: tone/style
  duration: 2400                         // Display duration in ms
});
```

### showTVCardWithAvatars(options)

Display a card with player avatars.

```javascript
await TVCards.showTVCardWithAvatars({
  title: 'Veto Ceremony',
  lines: ['Alice uses the Power of Veto on Bob.'],
  tone: 'veto',
  duration: 3000,
  actorIds: 1,        // Actor player ID (or array)
  subjectIds: [2]     // Subject player ID(s)
});
```

### showInlineCard(options)

Generic ceremony message (with optional auto-dismiss).

```javascript
await TVCards.showInlineCard({
  title: 'System Message',
  content: 'Nominations are locked.',  // String or array
  tone: 'info',
  duration: 0  // 0 = no auto-dismiss
});
```

### showTVDecision(options)

Decision card with buttons.

```javascript
const result = await TVCards.showTVDecision({
  title: 'Use Power of Veto?',
  message: 'Will you use the Power of Veto?',
  buttons: [
    { label: 'Use Veto', value: 'use', primary: true },
    { label: 'Do Not Use', value: 'no_use' }
  ]
});
// Returns: selected button value ('use' or 'no_use')
```

### showTVNomineeSavePanel(options)

Veto nominee selection panel.

```javascript
const savedId = await TVCards.showTVNomineeSavePanel({
  title: 'Save a Nominee',
  nominees: [2, 3],  // Array of nominee IDs
  povId: 1           // POV holder ID
});
// Returns: selected nominee ID
```

## CSS Standardization

All TV cards now use consistent styling:

### Typography
- **Title (h3)**: 0.95rem
- **Body (p)**: 0.86rem, line-height 1.45
- **Emphasized (.big)**: 0.92rem, weight 500

### Layout
- **Max width**: `min(92%, 520px)`
- **Max height**: 78% of TV container
- **Padding**: 24px 28px (desktop), 14px 16px (mobile <400px)
- **Overflow**: Internal scroll only (`overflow-y: auto`)
- **Z-index**: Layered within TV frame (not global)

### Classes
- `.tvCardBody` - Typography standardization
- `.tvDim` - Backdrop blur
- `.tvOverlayContent` - Content container
- `.revealCard.diaryRoomCard` - Card styling

## Testing

Run existing tests to verify no regressions:

```bash
npm run test:all
```

Test the new module interactively:

```
open test_tv_cards_module.html
```

## Backward Compatibility

All legacy function names remain available on the global scope:

- `window.ensureTVOverlayScaffold()` → `TVCards.ensureTVOverlay()`
- `window.clearTVOverlayContent()` → `TVCards.clearTVOverlay()`
- `window.showTVCard()` - Delegates to `TVCards.showTVCard()`
- `window.showTVCardWithAvatars()` - Delegates to `TVCards.showTVCardWithAvatars()`

## Non-Goals

The following were intentionally NOT modified:

- Full-screen modals (body-level backdrops)
- Twist/house shock overlays
- Custom eviction vote cards (have unique visualization)
- Screenshot/reference HTML files (standalone visuals)

## Benefits

✅ **Consistency**: All ceremony cards share identical styling  
✅ **Maintainability**: Single source of truth for TV card logic  
✅ **Reusability**: Easy to add new ceremony cards  
✅ **Type Safety**: Clear function signatures  
✅ **Backward Compatible**: Existing code continues to work  

## Inline Card Standardization

### Overview

All inline TV overlay cards now use the unified `.tv-inline-card` class for consistent visual styling, theme inheritance, and accessibility. This standardization applies to:
- Ceremony messages (nominations, veto, evictions)
- Decision/adjournment cards
- Generic inline announcements
- Status notifications

**Note**: Full-screen modals (event modals, rules, intermission, vote overlays, player profiles, eviction modals) remain unchanged.

### New CSS File: `css/tv-inline-cards.css`

Provides:
- **Semi-transparent backgrounds** with `backdrop-filter: blur(6px)`
- **Theme-aware coloring** using `--theme-primary` and `--theme-on-primary`
- **No borders** except `:focus-visible` ring for accessibility
- **Responsive sizing** and mobile optimizations
- **Graceful degradation** for browsers without `backdrop-filter`

### New Utility Module: `js/ui/tv-inline-cards.js`

Exports `spawnInlineCard()` for programmatic card creation:

```javascript
// Basic usage
window.spawnInlineCard({
  title: 'Nomination Ceremony',
  body: 'The ceremony is adjourned.',
  dismissible: true,
  duration: 2400
});

// With action buttons
const card = window.spawnInlineCard({
  title: 'Power of Veto Decision',
  body: 'Will you use the Power of Veto?',
  actions: [
    {
      label: 'Use Veto',
      primary: true,
      onClick: () => { /* handle action */ }
    },
    {
      label: 'Do Not Use',
      onClick: () => { /* handle action */ }
    }
  ],
  dismissible: true
});

// Programmatic dismiss
card.dismiss();

// Dismiss callback
card.onDismiss(() => {
  console.log('Card was dismissed');
});
```

### Options

- `title` (required): Card title text
- `body` (optional): String or array of strings for body content
- `actions` (optional): Array of `{label, onClick, primary?}` button configs
- `kind` (optional): Card kind - 'info', 'warning', 'success', 'error'
- `managed` (optional): Use CardManager for lifecycle (default: false)
- `dismissible` (optional): Allow ESC key dismiss (default: true)
- `duration` (optional): Auto-dismiss after N milliseconds (0 = no auto-dismiss)

### Accessibility Features

- **ARIA roles**: `role="dialog"` with actions, `role="status"` without
- **Keyboard navigation**: TAB between buttons, ESC to dismiss
- **Focus management**: Auto-focus on card, focus ring on `:focus-visible`
- **Screen reader support**: `aria-live="polite"` and `aria-atomic="true"` for status cards

### Testing

Interactive test page available:
```
open test_tv_inline_cards.html
```

Features:
- Test all card variants
- Theme switching to verify color inheritance
- Keyboard navigation testing
- Sequential card testing
- CardManager integration testing

### Migration Notes

Existing `TVCards.showTVCard()` and related functions automatically include `.tv-inline-card` class, so no code changes are required for existing ceremony cards. They now benefit from the new unified styling.

## Questions?

See the implementation in:
- `js/ui/tv-cards.js` - Main module
- `js/ui/tv-inline-cards.js` - Utility API
- `css/tv-inline-cards.css` - Unified styling
- `js/veto.js` - Example usage (veto ceremony)
- `js/nominations.js` - Example usage (nomination ceremony)
- `test_tv_cards_module.html` - Interactive test file
- `test_tv_inline_cards.html` - Inline card standardization tests
