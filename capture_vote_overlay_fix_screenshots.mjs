#!/usr/bin/env node

/**
 * Capture vote overlay screenshots showing the fixes:
 * - Transparent backdrop
 * - Compact pill-shaped Evict button
 * - Properly aligned arrows and button in CTA
 * - No safe-area padding asymmetry
 * - Layout-pixel-safe centering
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667, label: 'Mobile (iPhone SE)' },
  { name: 'laptop', width: 1366, height: 768, label: 'Laptop (1366x768)' }
];

async function captureScreenshots() {
  console.log('🚀 Starting screenshot capture for vote overlay fix...\n');

  const browser = await chromium.launch({ headless: true });
  
  try {
    for (const viewport of VIEWPORTS) {
      console.log(`📱 Capturing ${viewport.label}...`);
      
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 2
      });
      
      const page = await context.newPage();
      
      // Navigate to the test page
      const testPagePath = join(__dirname, 'test_vote_overlay_centering_fix.html');
      await page.goto(`file://${testPagePath}`, { waitUntil: 'networkidle' });
      
      // Wait for page to load
      await page.waitForTimeout(1000);
      
      // Click the button to show 4 nominees (good test case)
      await page.click('button:has-text("Test 4 Nominees")');
      
      // Wait for overlay to appear and animations to settle
      await page.waitForTimeout(2000);
      
      // Click on the first nominee (Alice) to select and show the CTA
      await page.click('.lv-overlay__nominee[data-index="0"]');
      
      // Wait for CTA to appear
      await page.waitForTimeout(1000);
      
      // Take full page screenshot
      const screenshotPath = join(__dirname, `vote_overlay_fix_${viewport.name}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });
      
      console.log(`✅ Saved: vote_overlay_fix_${viewport.name}.png`);
      
      // Also take a screenshot of just the #tv container for clarity
      const tvElement = await page.$('#tv');
      if (tvElement) {
        const tvScreenshotPath = join(__dirname, `vote_overlay_fix_${viewport.name}_tv_only.png`);
        await tvElement.screenshot({ path: tvScreenshotPath });
        console.log(`✅ Saved: vote_overlay_fix_${viewport.name}_tv_only.png`);
      }
      
      await context.close();
      console.log('');
    }
    
    console.log('🎉 All screenshots captured successfully!');
    console.log('\nGenerated files:');
    VIEWPORTS.forEach(v => {
      console.log(`  - vote_overlay_fix_${v.name}.png`);
      console.log(`  - vote_overlay_fix_${v.name}_tv_only.png`);
    });
    
  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
