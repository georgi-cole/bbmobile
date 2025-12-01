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

## Integration Verification

The unified inline TV overlay card design has been integrated into all factory functions. All inline ceremony cards now use the `.tv-inline-card` class with themed backgrounds and accessibility features.

### Automated Testing

Run the Playwright screenshot test to verify the integration:

```bash
npx playwright test tests/inline-cards-screenshot.spec.js --project=chromium
```

This will generate screenshots in `tests/screenshots/` for visual verification.

### Manual Testing

Open the test page in a browser:

```bash
open test_tv_inline_cards.html
```

Or start a local server:

```bash
npx http-server -p 8080
# Then visit http://localhost:8080/test_tv_inline_cards.html
```

### Manual Verification Checklist

After integration, verify the following:

- [ ] Open game, trigger nomination ceremony – card has `.tv-inline-card` & themed background
- [ ] Trigger veto decision – decision buttons inside themed card
- [ ] Fast-forward phases – only one inline card visible at a time (CardManager intact)
- [ ] Inspect computed styles: `backdrop-filter: blur(6px)` applied (or fallback if unsupported)
- [ ] Toggle light theme – text switches to dark foreground if base color luminance > 0.65
- [ ] Press ESC during dismissible card – card gracefully fades out (for decision cards)
- [ ] Verify status chip (if present) adopts theme variant without breaking layout
- [ ] Check high contrast mode adds outline (via dev tools emulation)
- [ ] Check reduced motion disables entrance animation (via dev tools emulation)

### What Changed in Integration

1. **CSS Added**: `css/tv-inline-cards.css` - Unified styling for all inline cards
2. **JS Added**: `js/theme-inline-contrast.js` - Automatic contrast adjustment
3. **TV Cards Updated**: All factory functions now add `.tv-inline-card` class
4. **Status Chip Updated**: Now uses `.tv-inline-theme` class for harmonization
5. **Accessibility**: ARIA roles, focus management, ESC dismissal added

### Theme Variables

The following CSS variables are used:

- `--theme-primary`: Base theme color (defaults to `--accent`)
- `--theme-on-primary`: Text color on theme background (auto-adjusted for contrast)
- `--tv-inline-focus-ring`: Focus ring color for accessibility
- `--tv-inline-card-bg`: Card background (semi-transparent theme color)
- `--tv-inline-card-backdrop`: Backdrop filter value

### Backward Compatibility

All legacy classes are preserved on card elements:
- `.revealCard`
- `.diaryRoomCard`
- `.tvCardBody`

This ensures existing CSS rules continue to work while the new unified styling is applied on top.

## Card Splitting and Ceremony Title Omission

### Card Content Splitting

When card content would overflow the visible TV overlay area, the TV cards module can automatically split content into multiple sequential cards. This ensures all content remains readable without requiring internal scrolling.

**How it works:**
1. When `enableSplit: true` is passed to `showTVCardWithAvatars()`, the module measures the content height
2. If content would exceed the available overlay height (minus safe margins), lines are split into chunks
3. Each chunk is displayed as a separate card with the specified duration
4. By default, avatars appear on all split cards (`avatarsOnAll: true`) to maintain context

**Example usage:**
```javascript
await TVCards.showTVCardWithAvatars({
  title: 'Ceremony Update',
  lines: ['Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5'],
  duration: 2400,
  actorIds: 1,
  enableSplit: true,      // Enable automatic splitting
  avatarsOnAll: true      // Show avatars on all split cards (default)
});
```

**Helper functions exposed:**
- `computeOverlayAvailableHeight()` - Get available height for cards
- `measureAndSplitLines(lines, opts)` - Measure and split lines into chunks
- `emitCardsFromChunks(chunks, options)` - Display chunks as sequential cards

### Ceremony Title Omission

For ceremony-labeled cards, the `<h3>` title element is automatically omitted to keep the focus on avatars and message content. This applies when the title contains any of these keywords (case-insensitive):

- `ceremony`
- `veto`
- `nomination`
- `eviction`
- `results`
- `adjourned`
- `nominees`
- `saved`
- `replacement`

**Automatic behavior:**
- Title omission is automatic for `showTVCard()`, `showTVCardWithAvatars()`, and `showInlineCard()`
- The `isCeremonyTitle(title)` helper can be used to check if a title matches ceremony keywords

**Manual override:**
```javascript
await TVCards.showTVCard({
  title: 'Veto Ceremony',
  lines: ['This is the content.'],
  omitCeremonyTitle: false  // Force title to render even if it matches keywords
});
```

### Visual Style Consistency

All TV overlay inline cards now have:
- **No borders/outlines** - Clean, borderless appearance
- **75% background transparency** - Consistent opacity across themes
- **Max-width: 780px** - Constrained width for readability
- **Max-height constraint** - Cards never overflow the visible TV overlay

These styles are applied via CSS in `css/tv-inline-cards.css` and scoped to `#tvOverlay`.

## Questions?

See the implementation in:
- `js/ui/tv-cards.js` - Main module with inline card integration
- `js/theme-inline-contrast.js` - Theme contrast adjustment
- `css/tv-inline-cards.css` - Unified inline card styling
- `js/veto.js` - Example usage (veto ceremony)
- `js/nominations.js` - Example usage (nomination ceremony)
- `test_tv_cards_module.html` - Interactive test file
- `test_tv_inline_cards.html` - Integration verification page
