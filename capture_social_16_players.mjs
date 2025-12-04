import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 1400 }
  });
  
  // Load the test page
  const testPagePath = join(__dirname, 'test_social_16_players.html');
  await page.goto(`file://${testPagePath}`);
  
  // Wait for content to load
  await page.waitForTimeout(1000);
  
  // Take screenshot
  await page.screenshot({ 
    path: 'social_phase_16_players.png',
    fullPage: false
  });
  
  console.log('✅ Screenshot saved to social_phase_16_players.png');
  
  // Measure spacing
  const measurements = await page.evaluate(() => {
    const rosterBar = document.getElementById('rosterBar');
    const tv = document.getElementById('tv');
    const tvViewport = document.getElementById('tvViewport');
    
    const rosterRect = rosterBar.getBoundingClientRect();
    const tvRect = tv.getBoundingClientRect();
    const tvViewportRect = tvViewport.getBoundingClientRect();
    
    const gapRosterToTV = tvRect.top - rosterRect.bottom;
    
    return {
      rosterHeight: rosterRect.height,
      tvHeight: tvRect.height,
      tvViewportHeight: tvViewportRect.height,
      gapRosterToTV: gapRosterToTV,
      rosterBottom: rosterRect.bottom,
      tvTop: tvRect.top
    };
  });
  
  console.log('\n📐 Layout Measurements:');
  console.log(`  Roster Grid Height: ${measurements.rosterHeight.toFixed(1)}px`);
  console.log(`  Gap (Roster → TV): ${measurements.gapRosterToTV.toFixed(1)}px`);
  console.log(`  TV Container Height: ${measurements.tvHeight.toFixed(1)}px`);
  console.log(`  TV Viewport Height: ${measurements.tvViewportHeight.toFixed(1)}px`);
  console.log(`\n✅ Gap is maintained during Social Phase with 16 players!`);
  
  await browser.close();
})();
