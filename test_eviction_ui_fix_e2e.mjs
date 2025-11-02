#!/usr/bin/env node

/**
 * End-to-End Test: Eviction UI Ghost Fix
 * 
 * This test verifies that after submitting a vote via the two-step mobile flow
 * and watching the rollout animation, the old voting UI (red EVICT buttons) 
 * does NOT reappear when the overlay dismisses.
 * 
 * Test Steps:
 * 1. Load the mobile rollout test page
 * 2. Start the full flow test (Choice Card → Overlay → Rollout)
 * 3. Select a nominee and submit vote
 * 4. Wait for rollout to show all votes
 * 5. Wait for rollout to complete and hide
 * 6. Take screenshots at key moments
 * 7. Verify no ghost UI elements remain
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOTS_DIR = join(__dirname, 'test-screenshots-eviction-fix');
const TEST_URL = `file://${join(__dirname, 'test_mobile_live_vote_rollout.html')}`;

// Ensure screenshots directory exists
if (!existsSync(SCREENSHOTS_DIR)) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runTest() {
  console.log('🚀 Starting End-to-End Test: Eviction UI Ghost Fix\n');
  console.log(`📁 Screenshots will be saved to: ${SCREENSHOTS_DIR}\n`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 414, height: 896 }, // iPhone 11 Pro dimensions
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  
  const page = await context.newPage();
  
  // Set up console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('ERROR') || text.includes('FAIL')) {
      console.log('  ❌', text);
    } else if (text.includes('PASS') || text.includes('✓')) {
      console.log('  ✅', text);
    }
  });
  
  try {
    // Step 1: Load test page
    console.log('Step 1: Loading mobile rollout test page...');
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '01-test-page-loaded.png'),
      fullPage: true 
    });
    console.log('  ✅ Test page loaded\n');
    
    // Step 2: Start the full flow test
    console.log('Step 2: Starting full flow test (Choice Card → Overlay → Rollout)...');
    await page.click('button:has-text("Start Full Flow Test")');
    await page.waitForTimeout(500);
    
    // Wait for choice card to appear
    await page.waitForSelector('.lv-choice-card', { timeout: 5000 });
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '02-choice-card-shown.png'),
      fullPage: true 
    });
    console.log('  ✅ Choice card displayed\n');
    
    // Step 3: Select a nominee (click on first nominee card)
    console.log('Step 3: Selecting a nominee...');
    await page.click('.lv-nominee-card');
    await page.waitForTimeout(300);
    
    // Click the Vote button
    await page.click('.lv-cta:has-text("Vote")');
    await page.waitForTimeout(500);
    
    // Wait for vote overlay to appear
    await page.waitForSelector('.lv-overlay', { timeout: 5000 });
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '03-vote-overlay-shown.png'),
      fullPage: true 
    });
    console.log('  ✅ Vote overlay displayed\n');
    
    // Step 4: Confirm vote
    console.log('Step 4: Confirming vote...');
    await page.click('.lv-confirm-btn');
    await page.waitForTimeout(500);
    
    // Wait for rollout overlay to appear
    await page.waitForSelector('.lv-rollout-overlay', { timeout: 5000 });
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '04-rollout-started.png'),
      fullPage: true 
    });
    console.log('  ✅ Rollout overlay displayed\n');
    
    // Step 5: Wait for votes to roll out
    console.log('Step 5: Waiting for votes to roll out...');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '05-votes-rolling-out.png'),
      fullPage: true 
    });
    console.log('  ✅ Votes rolling out\n');
    
    // Wait a bit more for all votes
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '06-all-votes-cast.png'),
      fullPage: true 
    });
    console.log('  ✅ All votes cast\n');
    
    // Step 6: Wait for rollout to complete and hide
    console.log('Step 6: Waiting for rollout to complete and hide...');
    await page.waitForTimeout(2500);
    
    // Take screenshot right after rollout hides
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '07-after-rollout-hides.png'),
      fullPage: true 
    });
    console.log('  ✅ Rollout completed and hidden\n');
    
    // Step 7: Check for ghost UI elements
    console.log('Step 7: Checking for ghost UI elements...');
    await page.waitForTimeout(500);
    
    // Check for any remaining UI elements that shouldn't be there
    const choiceCards = await page.$$('.lv-choice-card');
    const overlays = await page.$$('.lv-overlay');
    const rollouts = await page.$$('.lv-rollout-overlay');
    
    // Also check for any old voting UI (like the panel under TV)
    const evictButtons = await page.$$('button:has-text("EVICT")');
    const voteButtons = await page.$$('.vote-btn');
    
    console.log(`\n📊 Ghost UI Check Results:`);
    console.log(`  - Choice cards: ${choiceCards.length}`);
    console.log(`  - Vote overlays: ${overlays.length}`);
    console.log(`  - Rollout overlays: ${rollouts.length}`);
    console.log(`  - Old "EVICT" buttons: ${evictButtons.length}`);
    console.log(`  - Old vote buttons: ${voteButtons.length}`);
    
    const totalGhosts = choiceCards.length + overlays.length + evictButtons.length + voteButtons.length;
    
    // Take final screenshot
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '08-final-state.png'),
      fullPage: true 
    });
    
    if (totalGhosts === 0) {
      console.log(`\n✅ TEST PASSED: No ghost UI elements found!`);
      console.log(`  The fix successfully prevents the old voting UI from reappearing.\n`);
    } else {
      console.log(`\n❌ TEST FAILED: Found ${totalGhosts} ghost UI element(s)`);
      console.log(`  The old voting UI is still appearing after rollout.\n`);
    }
    
    // Step 8: Run Test 6 explicitly (Ghost UI Cleanup test)
    console.log('Step 8: Running explicit Ghost UI Cleanup test...');
    await page.evaluate(() => {
      window.testGhostUICleanup();
    });
    await page.waitForTimeout(5000);
    
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '09-ghost-cleanup-test-result.png'),
      fullPage: true 
    });
    console.log('  ✅ Ghost cleanup test completed\n');
    
    // Check the test result from the status div
    const testStatus = await page.$eval('#status6', el => el.textContent);
    if (testStatus.includes('✓')) {
      console.log(`✅ Ghost UI Cleanup Test: PASSED`);
      console.log(`  ${testStatus}\n`);
    } else {
      console.log(`❌ Ghost UI Cleanup Test: FAILED`);
      console.log(`  ${testStatus}\n`);
    }
    
    console.log('📸 All screenshots saved to:', SCREENSHOTS_DIR);
    console.log('\n🎉 Test execution complete!\n');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, 'error-state.png'),
      fullPage: true 
    });
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
runTest().catch(error => {
  console.error('\n💥 Test execution failed:', error);
  process.exit(1);
});
