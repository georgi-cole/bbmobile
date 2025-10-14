# Automated Social Maneuvers Test Suite

This document describes the automated end-to-end test suite for verifying the Social Maneuvers module integration in the BB Mobile game.

## Overview

The test suite simulates a complete game cycle through all phases and verifies that:

1. ✅ Social Maneuvers module is loaded and functional
2. ✅ Feature flag (`enableSocialManeuvers`) controls activation
3. ✅ Social Maneuvers UI renders correctly during social phase
4. ✅ Legacy social logic is bypassed when Social Maneuvers is enabled
5. ✅ Energy system is initialized and functional
6. ✅ Interactive elements (player/action selection) are present
7. ✅ Screenshots are captured for visual verification

## Test Files

### Main Test File
- **`test_game_progression_social_automated.spec.js`** - Full automated test suite using Playwright

### Configuration Files
- **`playwright.config.js`** - Playwright test runner configuration
- **`PLAYWRIGHT_SETUP.md`** - Detailed setup and usage instructions

### Test Artifacts
- **`test-screenshots/social-maneuvers/`** - Screenshot captures during test execution
- **`test-results/`** - Test results, HTML reports, and artifacts

## Quick Start

### 1. Install Playwright

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

### 2. Start Local Server

Open a terminal and start a local web server:

```bash
# Option 1: Python 3
python3 -m http.server 8080

# Option 2: Node.js http-server
npx http-server -p 8080
```

### 3. Run Tests

In a separate terminal:

```bash
# Run all Playwright tests
npm run test:playwright

# Or run specific social test
npm run test:social

# Or with UI mode (recommended)
npm run test:playwright:ui
```

## Test Phases

The automated test progresses through all game phases:

### Phase 1: Game Initialization
- Load game page
- Verify Social Maneuvers module is loaded
- Enable Social Maneuvers feature flag
- Start new game
- **Screenshot**: `01-game-loaded.png`, `02-game-started.png`

### Phase 2: Feature Flag Verification
- Verify `enableSocialManeuvers` config is set
- Check `SocialManeuvers.isEnabled()` returns true
- Validate `USE_SOCIAL_MANEUVERS` global flag
- **Screenshot**: Feature flag status logged to console

### Phase 3: Phase Progression
Automatically progress through each game phase:
- Intermission
- HOH (Head of Household)
- Nominations
- Veto Competition
- Veto Meeting
- Eviction
- **Screenshots**: `03-phase-{phaseName}.png` for each phase

### Phase 4: Social Phase Entry
- Trigger social phase via `startSocialIntermission()`
- Wait for UI to render
- **Screenshot**: `04-social-phase-start.png`

### Phase 5: Social Maneuvers UI Verification
Check for UI elements:
- Social panel content
- Energy bar (`.social-energy-bar`)
- Player selection dropdown (`.social-player-select`)
- Action selection dropdown (`.social-action-select`)
- Execute action button (`.social-action-button`)
- **Screenshot**: `05-social-ui-full.png`, `05-social-ui-panel.png`

### Phase 6: Legacy Social Bypass Verification
Verify that when Social Maneuvers is enabled:
- Energy system (`__socialEnergy` Map) is initialized
- Decision queue is NOT used (legacy system)
- Console logs show `[social-maneuvers]` messages
- **Test**: Comparison test runs with feature on/off

### Phase 7: Interactive Elements Test
- Verify player dropdown has options
- Verify action dropdown has options
- Verify energy is displayed correctly
- **Screenshot**: `07-interactive-elements.png`

### Phase 8: Final State & Summary
- Generate comprehensive test summary
- Log all feature flags and game state
- **Screenshot**: `06-final-state.png`

## Test Results

After running tests, you'll see:

### Console Output
```
🎬 Starting automated game progression test...
📍 Step 1: Loading game page...
✅ Game page loaded
📍 Step 2: Verifying Social Maneuvers module...
✅ Social Maneuvers module loaded
📍 Step 3: Initializing game with Social Maneuvers enabled...
✅ Game initialized with Social Maneuvers enabled
...
✅ All tests completed successfully!
```

### Test Summary
```
============================================================
TEST SUMMARY:
============================================================
Social Maneuvers Enabled: true
Current Game Phase: social_intermission
Players Count: 12
Energy System Initialized: true
Feature Flags: { enableSocialManeuvers: true, useSocialManeuvers: true }
============================================================
Screenshots saved to: test-screenshots/social-maneuvers
============================================================
```

### Screenshot Gallery

All screenshots are saved with descriptive names:

1. `01-game-loaded.png` - Initial game page load
2. `02-game-started.png` - Game started with Social Maneuvers enabled
3. `03-phase-{name}.png` - Each game phase
4. `04-social-phase-start.png` - Social phase triggered
5. `05-social-ui-full.png` - Full page during social phase
6. `05-social-ui-panel.png` - Close-up of social panel
7. `06-final-state.png` - Final game state
8. `07-interactive-elements.png` - Interactive UI elements
9. `comparison-maneuvers-enabled.png` - With Social Maneuvers
10. `comparison-legacy-mode.png` - Legacy mode (feature off)

## Verification Checklist

Use this checklist to verify test results:

### Social Maneuvers Module ✓
- [ ] Module loaded: `window.SocialManeuvers` exists
- [ ] Feature flag: `isEnabled()` returns true
- [ ] Config value: `game.cfg.enableSocialManeuvers` is true
- [ ] Global flag: `window.USE_SOCIAL_MANEUVERS` is true

### Energy System ✓
- [ ] Energy map exists: `game.__socialEnergy instanceof Map`
- [ ] Energy initialized for all players
- [ ] Energy displayed in UI
- [ ] Energy bar visible

### UI Elements ✓
- [ ] Social panel renders
- [ ] Player selection dropdown present
- [ ] Action selection dropdown present
- [ ] Execute button present
- [ ] Energy display visible

### Legacy Social Bypass ✓
- [ ] Energy system active (not decision queue)
- [ ] Console shows `[social-maneuvers]` logs
- [ ] Legacy decision queue NOT used
- [ ] UI differs from legacy social phase

### Screenshots ✓
- [ ] All phase screenshots captured
- [ ] Social UI screenshots clear and complete
- [ ] Interactive elements visible in screenshots
- [ ] Comparison screenshots show difference

## Troubleshooting

### Test Fails at Game Load
**Issue**: Game page doesn't load or times out
**Solution**: 
- Ensure local server is running on port 8080
- Check `BASE_URL` environment variable
- Verify `index.html` path is correct

### Social Maneuvers Not Enabled
**Issue**: `isEnabled()` returns false
**Solution**:
- Check `game.cfg.enableSocialManeuvers` is being set
- Verify module loads before test runs
- Check for JavaScript errors in console

### Screenshots Not Captured
**Issue**: Screenshot directory empty
**Solution**:
- Check write permissions on `test-screenshots/` directory
- Verify Playwright has permission to save files
- Check disk space

### UI Elements Not Found
**Issue**: Test can't find `.social-energy-bar` or other elements
**Solution**:
- Verify Social Maneuvers is actually enabled
- Check if UI has rendered (wait longer)
- Inspect actual HTML structure in screenshot
- Verify CSS selectors match current implementation

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/test.yml`:

```yaml
name: Automated Tests
on: [push, pull_request]

jobs:
  playwright-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          npm install
          npx playwright install --with-deps chromium
      - name: Start server
        run: python3 -m http.server 8080 &
      - name: Wait for server
        run: sleep 5
      - name: Run Playwright tests
        run: npm run test:social
      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-screenshots
          path: test-screenshots/
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

## Manual Visual Verification

Even with automated tests, manual visual verification is recommended:

1. Review screenshots in `test-screenshots/social-maneuvers/`
2. Verify Social Maneuvers UI looks correct
3. Check that energy bars are displayed
4. Confirm player and action dropdowns are populated
5. Compare with legacy social screenshots (if available)

## Future Enhancements

Potential test improvements:

- [ ] Add tests for specific actions (small talk, strategize, etc.)
- [ ] Test energy consumption when actions are executed
- [ ] Verify affinity changes after actions
- [ ] Test multiple social phases in one game
- [ ] Add performance benchmarks
- [ ] Test on mobile viewports
- [ ] Add accessibility tests (ARIA labels, keyboard navigation)
- [ ] Test with different player counts
- [ ] Verify social memory persistence between weeks

## Related Documentation

- `PLAYWRIGHT_SETUP.md` - Detailed Playwright installation and usage
- `docs/SOCIAL_MANEUVERS_README.md` - Social Maneuvers feature documentation
- `docs/E2E_TEST_GUIDE.md` - General E2E testing guide

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Playwright logs in `test-results/`
3. Check screenshots for visual clues
4. Verify Social Maneuvers feature flag is enabled
5. Open an issue with test output and screenshots
