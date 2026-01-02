#!/usr/bin/env node

/**
 * Capture screenshots after fixing the overlay issues
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mobile viewport configuration (iPhone 12 Pro)
const MOBILE_VIEWPORT = {
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true
};

async function captureScreenshots() {
  console.log('Capturing fixed jury reveal screenshots...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  
  const page = await context.newPage();
  
  const testPagePath = join(__dirname, 'test_jury_batched_reveal.html');
  await page.goto(`file://${testPagePath}`);
  await page.waitForTimeout(1000);
  
  const screenshotsDir = join(__dirname, 'screenshots');
  
  // Test 7 jurors with the fix
  console.log('Testing 7 jurors...');
  await page.click('button:has-text("Test 7 Jurors")');
  await page.waitForTimeout(1500);
  
  // Capture vote cards (should NOT show faceoff behind)
  console.log('Capturing: Vote cards (no background)...');
  await page.screenshot({
    path: join(screenshotsDir, 'jury_fixed_mobile_1_vote_cards.png'),
    fullPage: true
  });
  
  // Wait for tally
  await page.waitForTimeout(3500);
  console.log('Capturing: Tally screen...');
  await page.screenshot({
    path: join(screenshotsDir, 'jury_fixed_mobile_2_tally_screen.png'),
    fullPage: true
  });
  
  // Wait for second batch
  await page.waitForTimeout(3500);
  console.log('Capturing: Second batch...');
  await page.screenshot({
    path: join(screenshotsDir, 'jury_fixed_mobile_3_second_batch.png'),
    fullPage: true
  });
  
  await browser.close();
  
  console.log('\n✅ Fixed screenshots captured!');
  console.log('  1. jury_fixed_mobile_1_vote_cards.png');
  console.log('  2. jury_fixed_mobile_2_tally_screen.png');
  console.log('  3. jury_fixed_mobile_3_second_batch.png');
}

captureScreenshots().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
