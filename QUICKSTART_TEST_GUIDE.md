# 🎮 Automated Social Maneuvers Test Suite - Quick Start Guide

## 📋 Overview

This test suite provides **automated end-to-end testing** for the Social Maneuvers module, simulating complete game progression through all phases and verifying:

✅ Social Maneuvers module is enabled and active  
✅ Legacy social module is bypassed  
✅ UI renders correctly during social phase  
✅ Screenshots captured for visual verification  

## 🚀 Quick Start

### Option 1: Browser-Based Test (No Installation Required) ⭐ RECOMMENDED

1. **Start a local web server:**
   ```bash
   python3 -m http.server 8090
   ```

2. **Open in your browser:**
   ```
   http://localhost:8090/test_game_progression_social_automated.html
   ```

3. **Click "▶️ Run Full Test"**

4. **Watch the automated test progress through all phases**

5. **Review verification results and capture screenshots manually using:**
   - Browser DevTools (F12) → Screenshot
   - Browser extension (Awesome Screenshot, Nimbus, etc.)

**Screenshots will show:**
- Game initialization
- Phase progression (intermission → HOH → nominations → veto → eviction → social)
- Social Maneuvers UI elements
- Energy system display
- Comparison with legacy mode

---

### Option 2: Playwright Automated Test (Full Automation)

1. **Install Playwright:**
   ```bash
   npm install
   npm run playwright:install
   ```

2. **Start local server (in one terminal):**
   ```bash
   python3 -m http.server 8080
   ```

3. **Run automated test (in another terminal):**
   ```bash
   npm run test:social
   ```

4. **View results:**
   - Screenshots: `test-screenshots/social-maneuvers/`
   - HTML Report: `npx playwright show-report`

---

## 📁 Files Created

### Test Files
- **`test_game_progression_social_automated.html`** - Interactive browser test (no installation)
- **`test_game_progression_social_automated.spec.js`** - Playwright automated test

### Documentation
- **`AUTOMATED_TEST_IMPLEMENTATION.md`** - Complete implementation summary
- **`PLAYWRIGHT_SETUP.md`** - Detailed Playwright setup guide
- **`TEST_SOCIAL_AUTOMATED.md`** - Test documentation and verification

### Configuration
- **`playwright.config.js`** - Playwright configuration
- **`scripts/capture-screenshots.mjs`** - Screenshot helper script
- **`package.json`** - Updated with test scripts

---

## 🎯 What Gets Tested

### Phase Progression
1. **Intermission** → Initial game state
2. **HOH** → Head of Household competition
3. **Nominations** → Nomination ceremony
4. **Veto Competition** → Power of Veto competition
5. **Veto Meeting** → Veto ceremony
6. **Eviction** → Eviction ceremony
7. **Social Phase** → 🎯 **Social Maneuvers activated**

### Social Maneuvers Verification
- ✅ Module loaded (`window.SocialManeuvers`)
- ✅ Feature flag enabled (`enableSocialManeuvers = true`)
- ✅ Energy system initialized (Map with player entries)
- ✅ UI elements rendered (energy bar, dropdowns, buttons)
- ✅ Legacy decision queue NOT used
- ✅ Console shows `[social-maneuvers]` logs

### Screenshots Captured
1. Game initialization
2. All game phases
3. Social phase UI (full page + close-ups)
4. Interactive elements
5. Comparison: Social Maneuvers vs Legacy mode

---

## ✅ Verification Checklist

After running the test, verify:

### Module Loading
- [ ] `window.SocialManeuvers` object exists
- [ ] `isEnabled()` function works
- [ ] Feature flag `enableSocialManeuvers` is true

### Energy System
- [ ] `game.__socialEnergy` is a Map
- [ ] Energy initialized for all players
- [ ] Default energy = 3, Max energy = 5

### UI Elements
- [ ] Social panel renders
- [ ] Energy bar visible (`.social-energy-bar`)
- [ ] Player dropdown present (`.social-player-select`)
- [ ] Action dropdown present (`.social-action-select`)
- [ ] Execute button present (`.social-action-button`)

### Legacy Bypass
- [ ] Energy system active (not decision queue)
- [ ] Console shows `[social-maneuvers]` logs
- [ ] Legacy decision queue is empty or unused

---

## 📸 Screenshot Capture

### Automatic (Playwright Test)
Screenshots are automatically saved to `test-screenshots/social-maneuvers/`

### Manual (Browser Test)
1. Run the browser test
2. Use browser tools to capture:
   - **Chrome/Edge**: F12 → Device Toolbar → Screenshot icon
   - **Firefox**: F12 → Screenshot icon (in toolbar)
   - **Safari**: Develop → Show Web Inspector → Screenshot
3. Or use browser extensions:
   - [Awesome Screenshot](https://www.awesomescreenshot.com/)
   - [Nimbus Screenshot](https://nimbusweb.me/screenshot.php)
   - [Full Page Screen Capture](https://chrome.google.com/webstore/detail/fdpohaocaechififmbbbbbknoalclacl)

---

## 🔧 npm Scripts

```bash
# Run Playwright tests
npm run test:playwright          # All Playwright tests
npm run test:playwright:ui       # With UI mode (recommended)
npm run test:playwright:headed   # See browser
npm run test:playwright:debug    # Debug mode

# Run specific test
npm run test:social              # Social Maneuvers test only

# Install Playwright browsers
npm run playwright:install       # Install Chromium

# Run all tests
npm run test:all                 # All test suites
```

---

## 🎨 Browser Test Features

The browser-based test includes:

- **Interactive Controls**: Step through phases or run full test
- **Real-Time Logging**: See progress as it happens
- **Visual Progress Bar**: Track test completion
- **Verification Lists**: Check off requirements
- **Screenshot Gallery**: Placeholder for captured images
- **Test Metrics**: Pass/fail counts, screenshot count
- **Download Log**: Save test output

---

## 🐛 Troubleshooting

### "Module not found" errors
**Solution**: Ensure you're in the repository root directory

### "Port already in use"
**Solution**: Use a different port:
```bash
python3 -m http.server 9090
# Then update BASE_URL or browser URL
```

### Playwright installation fails
**Solution**: Use the browser-based HTML test instead (no installation required)

### Screenshots not captured in Playwright test
**Solution**: 
- Check `test-screenshots/` directory exists
- Verify write permissions
- Check test ran to completion

---

## 📚 Documentation

For more details, see:

- **[AUTOMATED_TEST_IMPLEMENTATION.md](./AUTOMATED_TEST_IMPLEMENTATION.md)** - Complete implementation guide
- **[PLAYWRIGHT_SETUP.md](./PLAYWRIGHT_SETUP.md)** - Playwright installation and setup
- **[TEST_SOCIAL_AUTOMATED.md](./TEST_SOCIAL_AUTOMATED.md)** - Detailed test documentation

---

## 🎯 Next Steps

1. ✅ **Run the browser-based test** to verify everything works
2. 📸 **Capture screenshots** during the social phase
3. ✅ **Review verification checklist** to confirm all requirements met
4. 📋 **Document any issues** or observations
5. 🚀 **Optionally install Playwright** for full automation

---

## 🎉 Success Criteria

The test is successful when:

✅ All phases progress without errors  
✅ Social Maneuvers module is detected as enabled  
✅ Energy system is initialized for all players  
✅ UI elements render correctly (energy bar, dropdowns)  
✅ Legacy social logic is bypassed (no decision queue)  
✅ Screenshots captured showing Social Maneuvers UI  
✅ Test log shows all checks passing  

---

## 📝 Example Test Output

```
🚀 STARTING FULL AUTOMATED TEST
═══════════════════════════════════════

📍 Step 1: Initializing game...
✅ Game initialized
   Players: 12
   Social Maneuvers: ENABLED

📍 Step 2: Verifying Social Maneuvers module...
   ✓ SocialManeuvers object exists
   ✓ isEnabled() function exists
   ✓ Feature flag enabled
   ✓ Config value set
   ✓ USE_SOCIAL_MANEUVERS flag set

⏩ Progressing to phase: Intermission
   ✓ Intermission completed

⏩ Progressing to phase: HOH Competition
   ✓ HOH Competition completed

[... continues for all phases ...]

⏩ Progressing to phase: Social Phase (Social Maneuvers)
   Social Maneuvers phase start triggered
   ✓ Social Phase (Social Maneuvers) completed

📍 Step 4: Verifying Social Maneuvers is active...
   ✓ Energy system initialized
   ✓ Energy map has entries
   ✓ Players have energy
   ✓ Legacy decision queue NOT used
   ✓ Social Maneuvers active (not legacy)

📍 Step 5: Capturing screenshots...
   ✓ Screenshot: game-initialized.png
   ✓ Screenshot: social-phase-start.png
   [... 11 total screenshots ...]

═══════════════════════════════════════
✅ ALL TESTS COMPLETED SUCCESSFULLY
Tests Passed: 15
Tests Failed: 0
Screenshots: 11
═══════════════════════════════════════
```

---

## 🤝 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the documentation files
3. Check console for error messages
4. Verify Social Maneuvers module is loaded in `index.html`

---

**Ready to test? Start with the browser-based test!**

```bash
python3 -m http.server 8090
# Then open: http://localhost:8090/test_game_progression_social_automated.html
```
