# Popup Theme Refactor Summary

## Overview
Refactored all popups, overlays, confirm modals, and card popups to use theme CSS variables instead of hardcoded colors. This ensures visual consistency when switching between themes (TV Studio, Modern House, etc.).

## Files Modified

### JavaScript Modules
1. **js/results-popup.js** - Competition results popup
   - Background: `var(--card-2)`
   - Border: `var(--line)`
   - Title text: `var(--warn)`
   - Primary text: `var(--ink)`
   - Secondary text: `var(--muted)` and `var(--muted-2)`
   - Winner border/shadow: `var(--warn)`
   - Runner-up border/shadow: `var(--good)`
   - Score text: `var(--good)`
   - Place text: `var(--accent)`

2. **js/ui.confirm-modal.js** - Confirmation dialog system
   - Overlay background: rgba with backdrop blur
   - Modal background: `var(--card-2)`
   - Border colors: `var(--warn)`, `var(--bad)`, or `var(--line)` (based on tone)
   - Title text: `var(--ink)`
   - Message text: `var(--muted-2)`
   - Button backgrounds: `var(--card)`, `var(--primary-1)`, tone-specific
   - Button text: `var(--ink)`, `var(--muted-2)`

3. **js/competitions.js** - Competition and eviction modals
   - Results popup: Uses theme variables for all colors
   - Final week announcement modal: `var(--bg)`, `var(--card-2)`, `var(--warn)`
   - Eviction justification modal: `var(--card-2)`, `var(--bad)` border, `var(--line)` borders

4. **js/jury.js** - Jury-related overlays
   - America's Vote card: `var(--card-2)`, `var(--accent)` border, `var(--warn)` title
   - Juror phrase overlay: `var(--card-2)`, `var(--line)` border, `var(--ink)` text

5. **js/eviction.js** - Diary room voting cards
   - Card background: `var(--card-2)`
   - Border: `var(--line)`
   - Title: `var(--warn)`
   - Voter avatar border: `var(--good)`
   - Target avatar border: `var(--bad)`
   - Arrow color: `var(--bad)`

### HTML Test Files
1. **test_diary_room_modal.html** - Updated to use theme variables
2. **test_popup_themes.html** - NEW comprehensive theme testing page

## Excluded from Changes
- **js/ui.event-modal.js** - Twist announcement modals intentionally kept with original styling per requirements
- **js/end-credits.js** - End game credits screen (special visual design)

## Theme Variables Used

### Backgrounds
- `var(--bg)` - Main background
- `var(--card)` - Primary card background
- `var(--card-2)` - Secondary card background

### Borders & Lines
- `var(--line)` - Primary border color
- `var(--line-2)` - Secondary border color

### Text Colors
- `var(--ink)` - Primary text color
- `var(--muted)` - Muted/secondary text
- `var(--muted-2)` - Less muted text

### Semantic Colors
- `var(--accent)` - Accent/highlight color
- `var(--accent-2)` - Secondary accent
- `var(--good)` - Success/positive (green)
- `var(--warn)` - Warning/attention (yellow/orange)
- `var(--bad)` - Error/negative (red)

### Structural Colors
- `var(--primary-1)`, `var(--primary-2)`, `var(--primary-3)` - Structural/UI elements

## Testing
Use `test_popup_themes.html` to verify theme changes:
1. Open the test page in a browser
2. Switch between themes (TV Studio, Modern House, Midnight, Miami)
3. Test each popup/modal type
4. Verify colors update correctly with theme changes

## Benefits
1. **Consistency** - All popups now follow the active theme
2. **Maintainability** - Color changes happen in one place (CSS variables)
3. **User Experience** - Seamless visual experience across theme changes
4. **Accessibility** - Proper contrast maintained per theme design

## Notes
- Event modals (twist announcements) retain original hardcoded styling as per requirements
- All overlays are appended to `document.body` and inherit theme via `body[data-theme]`
- No references to "blurred face" exist in the codebase
