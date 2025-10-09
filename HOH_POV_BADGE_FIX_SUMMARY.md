# HOH/POV Badge Regression Fix

## Problem
There was a regression where single HOH or single POV badges were converted to emojis on mobile. This caused inconsistency and violated the intended design.

## Intended Behavior
- **Single HOH only**: Show text label "HOH" with gold gradient background
- **Single POV only**: Show text label "POV" with green gradient background  
- **Both HOH and POV**: Show emojis 👑🛡️ side by side (space-saving on mobile)
- **Winner/Runner-up**: Continue using emojis 🥇🥈 (unchanged)
- **Nominated**: Text label "NOM" with red gradient (unchanged)

## Root Cause
In `js/ui.hud-and-router.js`, the single HOH and POV cases were using:
- `labelText = '👑'` with `statusClass = 'status-icon-label hoh-icon'` for HOH
- `labelText = '🛡'` with `statusClass = 'status-icon-label veto-icon'` for POV

This caused emojis to display instead of text labels.

## Solution
Changed the single HOH and POV cases to use text labels:

### Before
```javascript
} else if(hasHOH){
  labelText = '👑';
  statusClass = 'status-icon-label hoh-icon';
  ariaLabel = `${p.name} (Head of Household)`;
} else if(hasVeto){
  labelText = '🛡';
  statusClass = 'status-icon-label veto-icon';
  ariaLabel = `${p.name} (Veto Holder)`;
}
```

### After
```javascript
} else if(hasHOH){
  labelText = 'HOH';
  statusClass = 'status-hoh';
  ariaLabel = `${p.name} (Head of Household)`;
} else if(hasVeto){
  labelText = 'POV';
  statusClass = 'status-pov';
  ariaLabel = `${p.name} (Veto Holder)`;
}
```

## CSS Classes Used
The fix leverages existing CSS classes that were already defined in `styles.css`:

- `.top-tile-name.status-hoh` - Gold gradient background for HOH
- `.top-tile-name.status-pov` - Green gradient background for POV
- `.top-tile-name.status-nom` - Red gradient background for NOM (unchanged)
- `.top-tile-name.status-icon-label.hoh-pov-icons` - Emoji display for dual HOH+POV (unchanged)

## Files Modified
1. **js/ui.hud-and-router.js** (4 lines changed)
   - Line 596: Changed labelText from emoji to 'HOH'
   - Line 597: Changed statusClass from 'status-icon-label hoh-icon' to 'status-hoh'
   - Line 600: Changed labelText from emoji to 'POV'
   - Line 601: Changed statusClass from 'status-icon-label veto-icon' to 'status-pov'

2. **test_hoh_pov_badges.html** (new file)
   - Comprehensive test page validating all badge scenarios
   - Tests single HOH, single POV, dual HOH+POV, Winner/Runner-up, and NOM
   - Confirms correct rendering with proper CSS styling

## Testing
- ✅ Created test page demonstrating correct rendering
- ✅ Verified on desktop and mobile widths (375px)
- ✅ All existing tests pass (npm run test:all)
- ✅ Accessibility maintained (aria-labels correct)
- ✅ Winner/Runner-up behavior unchanged
- ✅ NOM behavior unchanged

## Visual Verification
Screenshots confirm:
- Single HOH displays as text "HOH" with gold gradient
- Single POV displays as text "POV" with green gradient
- Dual HOH+POV displays as emojis 👑🛡️ side by side
- All labels maintain proper styling and accessibility

## Impact
- **Minimal change**: Only 4 lines modified in the core file
- **No breaking changes**: Uses existing CSS classes
- **Improved consistency**: Aligns with original design intent
- **Better mobile UX**: Text labels are clearer than single emojis
- **Accessibility preserved**: All aria-labels remain intact
