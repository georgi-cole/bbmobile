# Week 1 Social Energy Seeding & Auto-Skip Implementation

## Summary

This implementation adds two key features to the Social Maneuvers system:
1. **Week 1 Energy Seeding**: New players start Week 1 with 5 energy
2. **Auto-Skip for Zero Energy**: When a player has 0 energy, the Social phase auto-skips with a visual overlay

## Files Modified

### js/social-maneuvers.js
- **SocialEnergyBank.init()**: Modified to seed Week 1 with 5 energy, Week 2+ with 0
- **showEmptyEnergyOverlayAndSkip()**: New function to display overlay and auto-advance
- **onSocialPhaseStart()**: Enhanced to check for zero energy and trigger auto-skip

### css/social-maneuvers.css
- Added `.sm-empty-energy-overlay` styling
- Includes battery icon animation (`sm-battery-blink`)
- Fade-in animation for smooth entrance
- Responsive design for mobile devices

### Test Files (New)
- **test_week1_energy_seeding.html**: Unit tests for individual features
- **test_social_energy_integration.html**: Integration tests for full game scenarios

## Implementation Details

### Week 1 Bank Seeding

```javascript
// In SocialEnergyBank.init()
if(!g.__sm_bankEnergy.has(playerId)) {
  const week = g.week || 1;
  const initialEnergy = (week === 1) ? RESOURCE_CONFIG.energy.default : 0;
  g.__sm_bankEnergy.set(playerId, initialEnergy);
  console.info(`[social-bank] 🏦 Bank initialized for player ${playerId}: ${initialEnergy} (week ${week})`);
}
```

### Auto-Skip Logic

```javascript
// In onSocialPhaseStart()
if(phaseEnergy <= 0) {
  console.info(`[sm-phase-skip] Human player has zero energy (${phaseEnergy}) - triggering auto-skip`);
  showEmptyEnergyOverlayAndSkip(humanId);
  return; // Exit early, don't set up normal phase
}
```

### Event Emission

```javascript
window.dispatchEvent(new CustomEvent('sm-phase-skip-empty', {
  detail: { playerId, week }
}));
```

## Testing

### Unit Tests
- ✅ Week 1 bank initialization (5 energy)
- ✅ Week 2+ bank initialization (0 energy)
- ✅ Overlay display and auto-removal
- ✅ Event emission verification

### Integration Tests
- ✅ Fresh Week 1 game scenario
- ✅ Zero energy auto-skip scenario
- ✅ Week 2 energy accumulation scenario

### Existing Tests
- ✅ All 9 social phase requirements tests pass
- ✅ No regressions detected

## Usage

### Normal Gameplay
- Week 1 players automatically start with 5 energy
- If energy reaches 0, phase shows overlay for 3 seconds then auto-advances

### Debugging/Testing
```javascript
// Set energy to 0 to test auto-skip
window.__smDebug.setBank('player1', 0);

// Listen for auto-skip events
window.addEventListener('sm-phase-skip-empty', (e) => {
  console.log('Phase skipped for:', e.detail.playerId, 'Week:', e.detail.week);
});
```

## Accessibility

- Overlay uses `aria-live="polite"` for screen reader announcements
- Descriptive `aria-label` on overlay element
- Clear visual feedback with battery icon animation
- Auto-advances after 3 seconds (no user interaction trap)

## Performance Impact

- **Minimal**: Only adds ~70 lines to social-maneuvers.js
- **CSS**: +90 lines for styling (includes animations)
- **Runtime**: Zero-energy check adds negligible overhead at phase start
- **No bundle size impact**: Pure JavaScript/CSS, no new dependencies

## Backward Compatibility

- ✅ Existing games continue to work normally
- ✅ Week 2+ initialization unchanged (still 0)
- ✅ Weekly bonus/penalty system unaffected
- ✅ All existing Social Maneuvers features preserved

## Known Limitations

- Auto-skip requires `window.advancePhase()` or `window.nextPhase()` to be available
- If neither function exists, overlay shows but manual phase advance is needed
- Multiple event listeners may receive the `sm-phase-skip-empty` event (by design for telemetry)

## Future Enhancements

Potential improvements for future iterations:
- Configurable overlay duration (currently hardcoded to 3000ms)
- Custom battery icon or animated SVG
- Sound effect on auto-skip
- Configurable Week 1 starting energy (currently hardcoded to 5)
- Localization support for overlay messages
