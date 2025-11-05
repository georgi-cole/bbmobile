#!/usr/bin/env node

/**
 * Houseguests Grid Screenshot Capture Script
 * 
 * Captures screenshots of the houseguests grid and TV HUD at multiple mobile viewports
 * for visual verification and documentation.
 * 
 * Viewports tested:
 * - 375×667 (iPhone 7, 8, SE 2nd gen)
 * - 390×844 (iPhone 12/13 mini)
 * - 414×896 (iPhone 11, XR, 11 Pro Max)
 * 
 * Output: screenshots/houseguests_grid_*.png
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const screenshotsDir = join(rootDir, 'screenshots');
const testFile = join(rootDir, 'test_houseguests_grid_tv_hud.html');

// Ensure screenshots directory exists
if (!existsSync(screenshotsDir)) {
  mkdirSync(screenshotsDir, { recursive: true });
}

// Test viewports - mobile devices
const viewports = [
  { name: 'iPhone 7', width: 375, height: 667 },
  { name: 'iPhone 12/13 mini', width: 390, height: 844 },
  { name: 'iPhone 11/XR', width: 414, height: 896 }
];

console.log('\n=== Houseguests Grid Screenshot Capture ===\n');
console.log(`Test file: ${testFile}`);
console.log(`Output directory: ${screenshotsDir}\n`);

async function captureScreenshots() {
  console.log('Launching Chromium browser...');
  const browser = await chromium.launch({
    headless: true
  });
  
  try {
    for (const viewport of viewports) {
      console.log(`\n📱 Capturing ${viewport.name} (${viewport.width}×${viewport.height})...`);
      
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 2 // Retina display
      });
      
      const page = await context.newPage();
      
      // Navigate to test page
      await page.goto(`file://${testFile}`, {
        waitUntil: 'networkidle',
        timeout: 10000
      });
      
      // Wait for content to load
      await page.waitForSelector('.hg-grid', { timeout: 5000 });
      await page.waitForSelector('.tv-hud', { timeout: 5000 });
      
      // Give a moment for any animations to settle
      await page.waitForTimeout(500);
      
      // Capture screenshot
      const filename = `houseguests_grid_${viewport.width}x${viewport.height}.png`;
      const filepath = join(screenshotsDir, filename);
      
      await page.screenshot({
        path: filepath,
        fullPage: false
      });
      
      console.log(`   ✓ Saved: ${filename}`);
      
      // Close context
      await context.close();
    }
    
    console.log('\n✅ All screenshots captured successfully!\n');
    console.log('Screenshots saved to:', screenshotsDir);
    console.log('\nGenerated files:');
    viewports.forEach(vp => {
      console.log(`  - houseguests_grid_${vp.width}x${vp.height}.png`);
    });
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error capturing screenshots:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run capture
captureScreenshots().then(() => {
  console.log('Screenshot capture complete.\n');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
