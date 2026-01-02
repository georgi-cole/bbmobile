#!/usr/bin/env node

/**
 * Mobile Screenshot Capture Script
 * Captures mobile viewport screenshots of the jury batched reveal feature
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

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
  console.log('Starting mobile screenshot capture for jury batched reveal...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  
  const page = await context.newPage();
  
  // Navigate to test page
  const testPagePath = join(__dirname, 'test_jury_batched_reveal.html');
  await page.goto(`file://${testPagePath}`);
  
  console.log('✓ Loaded test page');
  
  // Wait for page to be ready
  await page.waitForTimeout(1000);
  
  const screenshotsDir = join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  // 1. Capture initial test page view
  console.log('Capturing: Initial test page...');
  await page.screenshot({
    path: join(screenshotsDir, 'jury_batched_mobile_1_test_page.png'),
    fullPage: true
  });
  
  // 2. Trigger 7 jurors test and capture batched votes
  console.log('Capturing: 7 jurors - batched votes...');
  await page.click('button:has-text("Test 7 Jurors")');
  await page.waitForTimeout(1000); // Wait for faceoff to mount
  
  // Capture after first batch displays
  await page.screenshot({
    path: join(screenshotsDir, 'jury_batched_mobile_2_vote_cards.png'),
    fullPage: true
  });
  
  // Wait for tally screen
  await page.waitForTimeout(3500); // After batch display duration
  console.log('Capturing: Tally screen...');
  await page.screenshot({
    path: join(screenshotsDir, 'jury_batched_mobile_3_tally_screen.png'),
    fullPage: true
  });
  
  // Wait for next batch
  await page.waitForTimeout(2500);
  console.log('Capturing: Second batch of votes...');
  await page.screenshot({
    path: join(screenshotsDir, 'jury_batched_mobile_4_second_batch.png'),
    fullPage: true
  });
  
  // Reset and test batched votes only
  await page.click('button:has-text("Clear/Reset")');
  await page.waitForTimeout(500);
  
  console.log('Capturing: Batched votes only test...');
  await page.click('button:has-text("Test Batched Votes Only")');
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: join(screenshotsDir, 'jury_batched_mobile_5_votes_only.png'),
    fullPage: true
  });
  
  // Reset and test tally screen only
  await page.click('button:has-text("Clear/Reset")');
  await page.waitForTimeout(500);
  
  console.log('Capturing: Tally screen scenarios...');
  await page.click('button:has-text("Test Tally Screen Only")');
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: join(screenshotsDir, 'jury_batched_mobile_6_tally_only.png'),
    fullPage: true
  });
  
  // Capture tied scenario
  await page.waitForTimeout(3500);
  await page.screenshot({
    path: join(screenshotsDir, 'jury_batched_mobile_7_tied_votes.png'),
    fullPage: true
  });
  
  // Reset and test 9 jurors
  await page.click('button:has-text("Clear/Reset")');
  await page.waitForTimeout(500);
  
  console.log('Capturing: 9 jurors test...');
  await page.click('button:has-text("Test 9 Jurors")');
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: join(screenshotsDir, 'jury_batched_mobile_8_nine_jurors.png'),
    fullPage: true
  });
  
  // Capture the #tv element specifically (just the display area)
  await page.click('button:has-text("Clear/Reset")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Test Batched Votes Only")');
  await page.waitForTimeout(1500);
  
  console.log('Capturing: Vote cards close-up...');
  const tvElement = await page.$('#tv');
  if (tvElement) {
    await tvElement.screenshot({
      path: join(screenshotsDir, 'jury_batched_mobile_9_cards_closeup.png')
    });
  }
  
  await browser.close();
  
  console.log('\n✅ Mobile screenshot capture complete!');
  console.log(`Screenshots saved to: ${screenshotsDir}`);
  console.log('\nCaptured screenshots:');
  console.log('  1. jury_batched_mobile_1_test_page.png - Initial test page');
  console.log('  2. jury_batched_mobile_2_vote_cards.png - Batched vote cards');
  console.log('  3. jury_batched_mobile_3_tally_screen.png - Tally screen');
  console.log('  4. jury_batched_mobile_4_second_batch.png - Second batch');
  console.log('  5. jury_batched_mobile_5_votes_only.png - Votes only test');
  console.log('  6. jury_batched_mobile_6_tally_only.png - Tally screen test');
  console.log('  7. jury_batched_mobile_7_tied_votes.png - Tied scenario');
  console.log('  8. jury_batched_mobile_8_nine_jurors.png - 9 jurors test');
  console.log('  9. jury_batched_mobile_9_cards_closeup.png - Cards close-up');
}

captureScreenshots().catch(err => {
  console.error('❌ Error capturing screenshots:', err);
  process.exit(1);
});
