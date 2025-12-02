# TV Cards Migration Guide

This guide documents the TV inline card system used for ceremony and intermission cards displayed inside the faux TV overlay.

## Overview

TV inline cards are semi-transparent popups shown inside the `#tvOverlay` element during game ceremonies and competition intermissions. They are designed to be:

- **Responsive**: Adapts to mobile, tablet, and desktop viewports
- **Accessible**: Proper ARIA roles, keyboard navigation, focus management
- **Consistent**: Unified styling across all card types
- **Non-overflow**: Cards and buttons never overflow the TV overlay

## Card Types

### 1. Basic TV Card (`showTVCard`)
Simple text card with optional tone styling.

```javascript
TVCards.showTVCard({
  title: 'Card Title',
  lines: ['Line 1', 'Line 2'],
  tone: 'success', // optional
  duration: 2400 // auto-dismiss after ms
});
```

### 2. Avatar Card (`showTVCardWithAvatars`)
Card with player avatar display for ceremonies.

```javascript
TVCards.showTVCardWithAvatars({
  title: 'Nomination Ceremony',
  lines: ['Player nominated successfully'],
  actorIds: [1], // nominator
  subjectIds: [2, 3], // nominees
  enableSplit: true // split long content into multiple cards
});
```

### 3. Decision Card (`showTVDecision`)
Card with action buttons for user interaction.

```javascript
TVCards.showTVDecision({
  title: 'Confirm Action',
  message: 'Are you sure you want to proceed?',
  buttons: [
    { label: 'Yes', value: 'yes', primary: true },
    { label: 'No', value: 'no', primary: false }
  ]
});
```

### 4. Intermission Card (`showTVIntermissionCard`)
Card shown when player cannot compete in HOH/POV competitions.

```javascript
TVCards.showTVIntermissionCard({
  title: 'You cannot compete',
  lines: ['You are ineligible for this competition.'],
  buttons: [
    { label: 'Watch', value: 'watch', primary: true },
    { label: 'Skip', value: 'skip', primary: false }
  ],
  compType: 'HOH' // or 'Veto'
});
```

### 5. Veto Wait Card (Legacy)
Compact inline card offering intermission games during Veto competition.

```javascript
// Show veto wait card
window.showVetoWaitCard();

// Dismiss veto wait card
window.dismissVetoWaitCard();
```

## Styling Specifications

### Card Container
All TV inline cards follow these styling rules:

| Property | Value | Notes |
|----------|-------|-------|
| `max-width` | `min(780px, 92%)` | Never exceeds 780px or 92% of parent |
| `background` | `rgba(28, 43, 62, 0.75)` | 75% transparency |
| `border` | `none` | No outline or border |
| `border-radius` | `14px` | Rounded shape |
| `max-height` | `calc(100vh - 120px)` | Relative to viewport, with safe margins |
| `overflow-y` | `auto` | Scrollable if content overflows |

### Button Row
Button rows use flex layout for responsive wrapping:

| Property | Value | Notes |
|----------|-------|-------|
| `display` | `flex` | Flex container |
| `flex-wrap` | `wrap` | Buttons wrap to new lines |
| `gap` | `12px` | Consistent spacing |
| `justify-content` | `center` | Center-justified buttons |

### Buttons
Individual buttons have these constraints:

| Property | Value | Notes |
|----------|-------|-------|
| `min-height` | `44px` | Touch-friendly target |
| `max-height` | `44px` | Consistent height |
| `min-width` | `80px` | Minimum touch target |
| `max-width` | `180px` | Prevents overly wide buttons |
| `flex` | `1 1 auto` | Flexible sizing |
| `font-size` | `clamp(0.8rem, 3vw, 0.95rem)` | Scales on narrow screens |

## Responsive Breakpoints

### Mobile (max-width: 480px)
- Reduced padding: `14px 16px`
- Smaller max-height: `calc(100vh - 100px)`
- Button font-size: `clamp(0.75rem, 3.5vw, 0.85rem)`
- Button max-width: `160px`

### Landscape Mobile (max-height: 500px)
- Further reduced max-height: `calc(100vh - 80px)`
- Compact padding: `12px 14px`
- Smaller typography for titles and descriptions

### Very Narrow (max-width: 300px)
- Buttons stack vertically (`flex-direction: column`)

## CSS Files

The TV card styling is distributed across these files:

1. **`styles.css`** - Base TV overlay styles and intermission card rules
2. **`css/tv-inline-cards.css`** - Core inline card styling and theming
3. **`css/veto-wait-card.css`** - Veto wait card specific styling

## Testing

### Test Pages
- `test_tv_cards_module.html` - Full TV cards API testing
- `test_intermission_card_responsive.html` - Responsive layout testing for intermission cards
- `test_veto_wait_card.html` - Veto wait card specific testing

### Manual Testing Checklist
1. ✅ Card renders within TV overlay bounds
2. ✅ Buttons wrap to new lines on narrow screens
3. ✅ Card scrolls if content exceeds max-height
4. ✅ Button font-size scales down on mobile
5. ✅ Landscape orientation maintains visibility
6. ✅ Focus management works (first button focused)
7. ✅ ESC key dismisses card
8. ✅ No horizontal overflow at any viewport size

## Migration Notes

### From Popup System to TV Cards
When migrating ceremony cards from the popup system to TV inline cards:

1. Replace `showCard()` calls with appropriate `TVCards.*` method
2. Use `showTVIntermissionCard()` for "cannot compete" messages
3. Ensure button handlers resolve the Promise properly
4. Test at 320px, 375px, 480px, 768px, and 1024px widths

### Version History
- **v1.0**: Initial TV cards implementation with avatar support
- **v1.1**: Added content splitting for overflow prevention
- **v1.2**: Added `showTVIntermissionCard` for unified HOH/POV idle popups
- **v1.3**: Fixed button overflow styling, added responsive max-height (current)
