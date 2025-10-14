# PopupManager System - Standard Game Popups

## Overview

The PopupManager provides a centralized API for displaying all standard game popup cards (HOH, POV, nominations, eviction, social, live vote). This system ensures consistent styling, behavior, and future maintainability across all popup types.

## Key Features

- **Unified API**: Single `PopupManager.show(config)` method for all standard popups
- **Consistent Styling**: All popups use base CSS classes (`.popupCard`, `.gameCard`) with extensible variants
- **Feature Flag Support**: Automatic fallback to legacy `showCard()` when disabled
- **Type-Safe Config**: CardConfig structure provides consistent popup configuration
- **Theme-Aware**: Popups automatically adapt to active theme (TV Studio, Modern House, Midnight)
- **Telemetry Integration**: Built-in tracking for analytics and debugging

## Architecture

### PopupManager.show(config)

The centralized method for showing standard game popups.

**CardConfig Structure:**
```javascript
{
  type: 'hoh' | 'pov' | 'nominations' | 'eviction' | 'social' | 'live-vote' | 'info',
  title: 'Card Title',
  lines: ['Line 1', 'Line 2'],           // Content lines
  duration: 3000,                         // Auto-close duration (0 = manual close)
  tone: 'neutral' | 'good' | 'bad' | 'live' | 'noms' | 'veto' | 'evict',
  variant: 'hoh' | 'pov' | 'nominations' | etc,  // For CSS class
  closeOnBackdrop: true,                  // Optional
  closeOnEsc: true,                       // Optional
  showCloseButton: true,                  // Optional (default: duration === 0)
  onClose: callback                       // Optional
}
```

### CSS Classes

All popups use a base class with optional variants:

**Base Classes:**
- `.popupCard` - Standard popup card styling
- `.gameCard` - Alternative base class (same styling)

**Variants (applied as modifiers):**
- `.popupCard--hoh` - Head of Household popups
- `.popupCard--pov` / `.popupCard--veto` - Power of Veto popups
- `.popupCard--nominations` - Nomination ceremony popups
- `.popupCard--eviction` - Eviction result popups
- `.popupCard--social` - Social event popups
- `.popupCard--live-vote` - Live voting/diary room popups

**Theme Classes (applied automatically based on tone):**
- `.popup-theme-good` - Good news (green header)
- `.popup-theme-bad` - Bad news (red header)
- `.popup-theme-live` - Live events (live color header)
- `.popup-theme-noms` - Nominations (accent color header)
- `.popup-theme-veto` - Veto (veto color header)
- `.popup-theme-evict` - Eviction (red header)

## Usage Examples

### Head of Household

```javascript
// HOH Winner
PopupManager.show({
  type: 'hoh',
  variant: 'hoh',
  title: 'Head of Household',
  lines: ['Taylor is the new HOH!'],
  tone: 'good',
  duration: 3000
});

// HOH Ceremony
PopupManager.show({
  type: 'hoh',
  variant: 'hoh',
  title: 'HOH Ceremony',
  lines: ['The HOH is ready to address the house.'],
  tone: 'noms',
  duration: 2500
});
```

### Power of Veto

```javascript
// POV Winner
PopupManager.show({
  type: 'pov',
  variant: 'pov',
  title: 'Veto Winner 🛡️',
  lines: ['Joseph has won the Power of Veto!'],
  tone: 'veto',
  duration: 3200
});

// POV Decision
PopupManager.show({
  type: 'pov',
  variant: 'pov',
  title: 'Veto Decision',
  lines: ['I have decided to use the Power of Veto!'],
  tone: 'good',
  duration: 3000
});
```

### Nominations

```javascript
// Nomination Ceremony
PopupManager.show({
  type: 'nominations',
  variant: 'nominations',
  title: 'Nomination Ceremony',
  lines: ['The HOH addresses the house.'],
  tone: 'noms',
  duration: 2400
});

// Nominee Reveal
PopupManager.show({
  type: 'nominations',
  variant: 'nominations',
  title: 'First Nominee',
  lines: ['Michael'],
  tone: 'noms',
  duration: 2600
});
```

### Eviction

```javascript
// Eviction Result
PopupManager.show({
  type: 'eviction',
  variant: 'eviction',
  title: 'Eviction Result',
  lines: ['By a vote of 4 to 2, Michael, you have been evicted.'],
  tone: 'evict',
  duration: 3800
});

// Tiebreak
PopupManager.show({
  type: 'eviction',
  variant: 'eviction',
  title: 'Tiebreak',
  lines: ['We have a tie! The HOH must break it.'],
  tone: 'live',
  duration: 3000
});
```

### Social Events

```javascript
// Alliance Formed
PopupManager.show({
  type: 'social',
  variant: 'social',
  title: 'Alliance Formed',
  lines: ['The Leftovers have officially formed!'],
  tone: 'good',
  duration: 3000
});

// Social Interaction
PopupManager.show({
  type: 'social',
  variant: 'social',
  title: 'Social Update',
  lines: ['Taylor and Joseph shared a calm chat about the week.'],
  tone: 'good',
  duration: 2800
});
```

### Live Vote / Diary Room

```javascript
// Diary Room
PopupManager.show({
  type: 'live-vote',
  variant: 'live-vote',
  title: 'Diary Room',
  lines: ['Please cast your vote to evict.'],
  tone: 'live',
  duration: 2000
});

// Vote Cast
PopupManager.show({
  type: 'live-vote',
  variant: 'live-vote',
  title: 'Vote Cast',
  lines: ['Your vote has been recorded.'],
  tone: 'good',
  duration: 2000
});
```

## Migration Guide

### Converting from showCard()

**Before (Legacy):**
```javascript
global.showCard('Nomination Ceremony', ['The HOH addresses the house.'], 'noms', 2400, true);
```

**After (PopupManager):**
```javascript
if(global.PopupManager && g.cfg?.popup_refresh_enabled){
  global.PopupManager.show({
    type: 'nominations',
    variant: 'nominations',
    title: 'Nomination Ceremony',
    lines: ['The HOH addresses the house.'],
    tone: 'noms',
    duration: 2400
  });
} else {
  global.showCard('Nomination Ceremony', ['The HOH addresses the house.'], 'noms', 2400, true);
}
```

### Migration Pattern

All migrations should follow this pattern for backward compatibility:

```javascript
if(global.PopupManager && global.game?.cfg?.popup_refresh_enabled){
  // Use new PopupManager
  global.PopupManager.show({
    type: 'popup-type',
    variant: 'variant-name',
    title: 'Title',
    lines: ['Content'],
    tone: 'tone',
    duration: 3000
  });
} else {
  // Fallback to legacy showCard
  global.showCard('Title', ['Content'], 'tone', 3000, true);
}
```

## Feature Flag

The popup system is controlled by the `popup_refresh_enabled` feature flag:

```javascript
// In game config
game.cfg.popup_refresh_enabled = true;  // Enable new system
game.cfg.popup_refresh_enabled = false; // Use legacy system
```

When disabled, all `PopupManager.show()` calls automatically fall back to the legacy `showCard()` function.

## Special Overlays (NOT Affected)

The following overlays are **NOT** standard event popups and should **NOT** be migrated:

- Week intro overlays (full-screen week reveals)
- Twist reveal overlays (special announcement overlays)
- Competition intro overlays (full-screen competition setup)
- Public's Favorite overlay (voting interface)
- Reality TV intro sequence (opening credits)

These use their own dedicated systems and should remain unchanged.

## Testing

A comprehensive test page is available: **test_popup_manager.html**

The test page includes:
- Feature flag control
- All popup types (HOH, POV, nominations, eviction, social, live vote)
- Individual popup tests
- Full sequence tests (nomination ceremony, eviction sequence, POV sequence)
- Theme switcher (test all themes)
- System info (queue length, status)

## CSS Customization

### Adding New Variants

To add a new popup variant:

1. **Add CSS class in styles.css:**
```css
.popupCard--custom {
  border-color: var(--custom-color);
  box-shadow: var(--popup-shadow), 
              0 0 32px -10px var(--custom-color) inset;
}
```

2. **Use in PopupManager.show():**
```javascript
PopupManager.show({
  type: 'custom',
  variant: 'custom',
  title: 'Custom Popup',
  lines: ['Content'],
  tone: 'neutral',
  duration: 3000
});
```

### Theme Adaptation

All popups automatically adapt to the active theme using CSS tokens:
- `--popup-bg-start` / `--popup-bg-end` - Background gradient
- `--popup-border` - Border color
- `--popup-radius` - Border radius
- `--popup-shadow` - Box shadow
- `--popup-backdrop-blur` - Backdrop blur amount
- Theme-specific colors (--hoh, --veto, --live, --good, --bad, etc.)

## Files Modified

- `js/popup/PopupManager.js` - Added `show()` method
- `styles.css` - Added `.popupCard` and variant classes
- `js/nominations.js` - Migrated nomination ceremony popups
- `js/veto.js` - Migrated POV competition popups
- `js/eviction.js` - Migrated tiebreak and eviction popups
- `test_popup_manager.html` - New comprehensive test page

## Future Enhancements

Potential future improvements:
- Additional popup variants for special events
- Animation presets (slide, fade, zoom)
- Custom positioning options
- Multi-step popup sequences
- Enhanced accessibility features
- Mobile-specific optimizations

## Support

For questions or issues:
- See `POPUP_SYSTEM_README.md` - Complete popup system documentation
- See `docs/popup-refresh-migration-guide.md` - Migration guide
- See `test_popup_manager.html` - Visual examples of all popup types
