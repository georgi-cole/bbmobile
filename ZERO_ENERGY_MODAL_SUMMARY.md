# Zero Energy Modal Implementation Summary

## Overview
This PR implements a new modal that appears when the player has 0 social energy at the start of the social phase, replacing the legacy "no social energy" flash message.

## Features

### Modal Design
- **Empty Battery Icon (🔋)**: Prominently displayed with a blinking animation
- **Clear Message**: "No Social Energy" with explanatory text
- **Professional Styling**: Blue gradient background with red border, matching game aesthetics

### Actions
1. **SKIP Button**
   - Advances to the next game phase immediately
   - Gray styling to indicate neutral action
   - Accessible via keyboard (default focus)

2. **Recharge Button (🎬)**
   - Movie ad icon to indicate future ad integration
   - Orange/gold gradient styling to draw attention
   - Grants immediate rewards:
     - +5 Social Energy
     - +5 Influence
     - +5 Information
   - Updates the social energy bank for persistence
   - Restarts the phase timer
   - Returns user to social phase UI

## Implementation Details

### Files Modified

#### 1. `js/social-maneuvers.js`
- **Added**: `showZeroEnergyModal()` function (lines 2973-3230)
  - Creates and displays the modal overlay
  - Implements SKIP action (advances phase)
  - Implements Recharge action (grants resources)
  - Manages phase timer lifecycle
  - Handles UI state (hides/shows social launcher)
  - Sets idempotency flags to prevent double-execution
  
- **Modified**: `onSocialPhaseStart()` function (line 3442)
  - Replaced call to `showEmptyEnergyOverlayAndSkip()` with `showZeroEnergyModal()`
  - Maintains AI burst functionality during modal interaction

- **Preserved**: `showEmptyEnergyOverlayAndSkip()` function (line 3235)
  - Marked as legacy with eslint-disable comment
  - Kept for potential rollback or debugging

#### 2. `js/socialize-mobile.js`
- **Removed**: Legacy 0 energy check in `openSocializeModal()` (lines 325-329)
  - Deleted the `global.addLog?.('No energy remaining for social actions.', 'warn')` flash message
  - Added comment explaining removal
  - Kept `res` variable for modal HUD display

### Test Files Created

#### 1. `test_zero_energy_modal.html`
- Interactive test environment
- Buttons to:
  - Show the modal directly
  - Set energy to 0 and trigger phase start
  - Check current energy levels
  - Reset energy
- Status logging for debugging
- Mock game environment for isolated testing

#### 2. `screenshot_zero_energy_modal.html`
- Static visual demonstration
- Shows modal appearance and styling
- Includes feature documentation
- Mobile-responsive design
- Can be opened in any browser for visual inspection

## Technical Details

### Modal Styling
- Uses inline styles for maximum compatibility
- Z-index: 9999999 (ensures it appears above all other UI)
- Backdrop blur effect for modern browsers
- Responsive padding and sizing
- Smooth fade-in/fade-out animations
- Battery icon blink animation (0.3-1.0 opacity, 1s cycle)

### Resource Management
- Uses existing `SocialResources.earn()` API
- Updates `SocialEnergyBank` for persistence
- Integrates with `SocializeMobile.updateHUD()` for UI updates
- Dispatches 'social-resources-changed' event

### Phase Timer Handling
- Stops timer on modal open (prevents far-future values)
- Restarts timer if user chooses Recharge
- Default duration: 180 seconds (3 minutes) - defined in `SOCIAL_PHASE_DEFAULT_DURATION_SECONDS`
- Properly sets both `game.endAt` and `game.phaseEndsAt`

### Configuration Constants
The implementation uses named constants for easy configuration:
```javascript
const ZERO_ENERGY_RECHARGE_REWARDS = {
  energy: 5,
  influence: 5,
  information: 5
};
const SOCIAL_PHASE_DEFAULT_DURATION_SECONDS = 180; // 3 minutes
```

### Accessibility
- Keyboard navigation support
- Focus management (default focus on SKIP button)
- ARIA attributes for screen readers
- Clear, descriptive button labels

## Integration Points

### Entry Point
The modal is triggered in `social-maneuvers.js` at the start of the social phase:
```javascript
// In onSocialPhaseStart() around line 3442
if(phaseEnergy <= 0) {
  showZeroEnergyModal(humanId);
  return;
}
```

### Resource Flow
1. Social phase starts
2. Energy is seeded from bank
3. If energy === 0, modal appears
4. User choice:
   - **SKIP**: Phase advances, no resources changed
   - **Recharge**: +5 to all resources, bank updated, phase continues

### AI Behavior
- AI burst continues during modal interaction
- AI players still execute actions in background
- Background executor remains active

## Testing

### Manual Testing
1. Open `test_zero_energy_modal.html` in a browser
2. Click "Show Zero Energy Modal" to see the modal
3. Test both SKIP and Recharge buttons
4. Verify resources update correctly
5. Check console logs for detailed execution trace

### Visual Testing
1. Open `screenshot_zero_energy_modal.html` in a browser
2. Verify modal appearance matches design
3. Test mobile responsiveness
4. Check animation smoothness

### Integration Testing
1. Set social energy bank to 0 for human player
2. Start social phase
3. Verify modal appears
4. Test SKIP: verify phase advances
5. Test Recharge: verify resources granted and phase continues

### Automated Testing
- All existing tests pass (`npm run test:all`)
- No linting errors introduced
- Pre-existing warnings unchanged

## Future Enhancements

### Ad Integration (Placeholder)
The Recharge button is designed as an anchor for future ad integration:
- Movie icon (🎬) indicates video ad
- When ads are implemented:
  1. Click Recharge
  2. Show video ad
  3. On ad completion, grant resources
  4. Continue to social phase

### Reward Configuration
Reward amounts are defined in `ZERO_ENERGY_RECHARGE_REWARDS` constant:
```javascript
const ZERO_ENERGY_RECHARGE_REWARDS = {
  energy: 5,
  influence: 5,
  information: 5
};
```

### Potential Improvements
- Multiple ad types (video, banner, rewarded)
- Daily ad limits
- Variable reward amounts based on ad type
- Alternative recharge methods (in-app purchases, achievements)
- Analytics tracking for modal interactions

## Browser Compatibility
- Modern browsers with ES6+ support
- Backdrop blur may not work in older browsers (graceful degradation)
- Animations respect `prefers-reduced-motion` media query
- Mobile-first responsive design

## Performance
- No performance impact when energy > 0
- Modal creation is lightweight (DOM manipulation only)
- No external dependencies
- Animations use CSS (GPU-accelerated)

## Security
- No external API calls
- No data transmission
- Client-side only implementation
- No XSS vulnerabilities (uses textContent, not innerHTML where appropriate)

## Backwards Compatibility
- Legacy function preserved with eslint-disable comment
- No breaking changes to existing APIs
- Graceful fallback if modules not loaded
- Works with both legacy and modern social systems

## Documentation
- Inline code comments explaining key decisions
- JSDoc-style function documentation
- README-style test file documentation
- This comprehensive summary document

## Credits
- Implemented as per issue requirements
- Battery icon animation inspired by existing empty energy overlay
- Modal styling consistent with game's confirm modal system
- Button styling follows game's existing patterns
