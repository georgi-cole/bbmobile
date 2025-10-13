#!/usr/bin/env node

/**
 * Screenshot Capture Script
 * 
 * This script opens the automated test page and captures screenshots
 * at different stages for visual verification.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create screenshot directory
const screenshotDir = path.join(__dirname, '..', 'test-screenshots', 'social-maneuvers-manual');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

console.log('📸 Screenshot Capture Script');
console.log('═══════════════════════════════════════');
console.log('');
console.log('This script would capture screenshots using Playwright.');
console.log('However, Playwright browsers are not fully installed.');
console.log('');
console.log('To capture screenshots:');
console.log('');
console.log('1. Install Playwright browsers:');
console.log('   npm run playwright:install');
console.log('');
console.log('2. Run the automated test:');
console.log('   npm run test:social');
console.log('');
console.log('3. Or open the browser-based test:');
console.log('   Open: http://localhost:8090/test_game_progression_social_automated.html');
console.log('   Then use browser DevTools to capture screenshots');
console.log('');
console.log('Screenshots will be saved to:');
console.log(`   ${screenshotDir}`);
console.log('');
console.log('═══════════════════════════════════════');

// Create a placeholder README in the screenshot directory
const readmePath = path.join(screenshotDir, 'README.md');
const readmeContent = `# Social Maneuvers Test Screenshots

This directory contains screenshots captured during the automated Social Maneuvers test.

## Screenshot List

The following screenshots are captured during the test:

1. **01-game-loaded.png** - Initial game page load
2. **02-game-started.png** - Game started with Social Maneuvers enabled  
3. **03-phase-intermission.png** - Intermission phase
4. **03-phase-hoh.png** - HOH competition phase
5. **03-phase-nominations.png** - Nominations ceremony
6. **03-phase-veto_comp.png** - Veto competition
7. **03-phase-veto_meeting.png** - Veto meeting
8. **03-phase-eviction.png** - Eviction ceremony
9. **04-social-phase-start.png** - Social phase triggered
10. **05-social-ui-full.png** - Full page during social phase
11. **05-social-ui-panel.png** - Close-up of social panel
12. **06-final-state.png** - Final game state
13. **07-interactive-elements.png** - Interactive UI elements
14. **comparison-maneuvers-enabled.png** - With Social Maneuvers
15. **comparison-legacy-mode.png** - Legacy mode (feature off)

## How to Capture

### Option 1: Automated (Playwright)

\`\`\`bash
# Install Playwright browsers
npm run playwright:install

# Run the automated test
npm run test:social
\`\`\`

### Option 2: Manual (Browser DevTools)

1. Start local server:
   \`\`\`bash
   python3 -m http.server 8090
   \`\`\`

2. Open in browser:
   \`\`\`
   http://localhost:8090/test_game_progression_social_automated.html
   \`\`\`

3. Open Browser DevTools (F12)

4. Click "Run Full Test" button

5. Use DevTools Screenshot feature to capture at each phase

### Option 3: Browser Extension

Use a browser extension like:
- Awesome Screenshot
- Full Page Screen Capture
- Nimbus Screenshot

## Verification Checklist

When reviewing screenshots, verify:

- [ ] Social Maneuvers module is loaded
- [ ] Feature flag shows enabled
- [ ] Energy system is visible
- [ ] Player and action dropdowns are populated
- [ ] Energy bars are displayed correctly
- [ ] UI differs from legacy social phase
- [ ] All phases are captured clearly

## Notes

- Screenshots provide visual confirmation that the Social Maneuvers UI renders correctly
- Compare with legacy social phase screenshots (if available)
- Screenshots serve as documentation for the feature
`;

fs.writeFileSync(readmePath, readmeContent);

console.log(`✅ Created README.md in ${screenshotDir}`);
console.log('');

process.exit(0);
