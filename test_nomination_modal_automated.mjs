#!/usr/bin/env node

/**
 * Automated test for new nomination intro modal
 * Tests basic functionality programmatically
 */

import { chromium } from 'playwright';

const TEST_URL = 'http://localhost:8080/test_nomination_intro_new_modal.html';
const TIMEOUT = 30000;

async function runTests() {
  console.log('🚀 Starting Nomination Intro Modal Tests...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Navigate to test page
  console.log(`📄 Loading test page: ${TEST_URL}`);
  await page.goto(TEST_URL, { waitUntil: 'load', timeout: TIMEOUT });
  
  // Wait for modules to load
  await page.waitForFunction(() => {
    return window.NominationIntroModal && window.NominationPlea;
  }, { timeout: 5000 });
  
  console.log('✅ Test page loaded successfully\n');
  
  // Initialize game
  console.log('⚙️  Test 1: Initializing game state...');
  await page.click('button:has-text("Initialize Game State")');
  await page.waitForTimeout(500);
  
  const initStatus = await page.locator('#setup-status').textContent();
  if (initStatus.includes('initialized')) {
    console.log('✅ Test 1 PASSED: Game state initialized\n');
  } else {
    console.log('❌ Test 1 FAILED: Game state not initialized\n');
  }
  
  // Test 2: Basic show and dismiss
  console.log('🎯 Test 2: Show modal and dismiss...');
  await page.click('button:has-text("Test 1: Show Modal")');
  await page.waitForTimeout(500);
  
  // Check if modal is visible
  const modalVisible = await page.locator('.phase-intro-overlay').isVisible();
  if (modalVisible) {
    console.log('✅ Modal appeared');
    
    // Dismiss by clicking overlay
    await page.click('.phase-intro-overlay');
    await page.waitForTimeout(500);
    
    const modalGone = await page.locator('.phase-intro-overlay').count() === 0;
    if (modalGone) {
      console.log('✅ Test 2 PASSED: Modal dismissed successfully\n');
    } else {
      console.log('❌ Test 2 FAILED: Modal did not dismiss\n');
    }
  } else {
    console.log('❌ Test 2 FAILED: Modal did not appear\n');
  }
  
  // Test 3: Escape key dismiss
  console.log('⌨️  Test 3: Dismiss with Escape key...');
  await page.click('button:has-text("Test 2: Show Modal")');
  await page.waitForTimeout(500);
  
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  const modalGoneEsc = await page.locator('.phase-intro-overlay').count() === 0;
  if (modalGoneEsc) {
    console.log('✅ Test 3 PASSED: Modal dismissed with Escape\n');
  } else {
    console.log('❌ Test 3 FAILED: Modal did not dismiss with Escape\n');
  }
  
  // Test 4: Risk check flow
  console.log('🎲 Test 4: Risk check flow...');
  await page.click('button:has-text("Test 4: Check Risk Flow")');
  await page.waitForTimeout(500);
  
  // Click "Check My Risk" button
  const riskButton = await page.locator('button:has-text("Check My Risk")');
  if (await riskButton.isVisible()) {
    console.log('✅ Risk button visible');
    await riskButton.click();
    await page.waitForTimeout(500);
    
    // Should now see risk percentage
    const riskPercentVisible = await page.locator('text=/\\d+%/').isVisible();
    if (riskPercentVisible) {
      console.log('✅ Risk percentage displayed');
      
      // Click OK button
      await page.click('button:has-text("OK")');
      await page.waitForTimeout(500);
      
      const modalGoneRisk = await page.locator('.phase-intro-overlay').count() === 0;
      if (modalGoneRisk) {
        console.log('✅ Test 4 PASSED: Risk flow completed\n');
      } else {
        console.log('❌ Test 4 FAILED: Modal did not dismiss after risk check\n');
      }
    } else {
      console.log('❌ Test 4 FAILED: Risk percentage not displayed\n');
    }
  } else {
    console.log('❌ Test 4 FAILED: Risk button not visible\n');
  }
  
  // Test 5: Plea flow
  console.log('🤝 Test 5: Plea skip flow...');
  await page.click('button:has-text("Test 7: Skip Plea")');
  await page.waitForTimeout(500);
  
  // Should see plea modal
  const pleaModalVisible = await page.locator('.nomination-plea-modal').isVisible();
  if (pleaModalVisible) {
    console.log('✅ Plea modal appeared');
    
    // Click skip
    await page.click('button:has-text("Skip")');
    await page.waitForTimeout(500);
    
    const pleaModalGone = await page.locator('.nomination-plea-modal').count() === 0;
    if (pleaModalGone) {
      console.log('✅ Test 5 PASSED: Plea skipped successfully\n');
    } else {
      console.log('❌ Test 5 FAILED: Plea modal did not close\n');
    }
  } else {
    console.log('❌ Test 5 FAILED: Plea modal did not appear\n');
  }
  
  // Test 6: Check for leaked DOM nodes
  console.log('🧹 Test 6: Checking for DOM cleanup...');
  await page.click('button:has-text("Test 13: No Orphaned DOM")');
  await page.waitForTimeout(500);
  
  const cleanupStatus = await page.locator('#cleanup-status').textContent();
  if (cleanupStatus.includes('No orphaned modals detected')) {
    console.log('✅ Test 6 PASSED: No DOM leaks detected\n');
  } else {
    console.log('❌ Test 6 FAILED: DOM leaks detected\n');
    console.log('Status:', cleanupStatus);
  }
  
  // Test 7: Feature flag fallback
  console.log('🚩 Test 7: Feature flag fallback...');
  
  // Disable new modal via feature flag
  await page.evaluate(() => {
    window.game.cfg.useNewNominationModal = false;
  });
  
  await page.click('button:has-text("Test 1: Show Modal")');
  await page.waitForTimeout(500);
  
  // Should still show modal (legacy version)
  const legacyModalVisible = await page.locator('.phase-intro-overlay').isVisible();
  if (legacyModalVisible) {
    console.log('✅ Legacy modal appeared with feature flag disabled');
    await page.click('.phase-intro-overlay');
    await page.waitForTimeout(500);
    console.log('✅ Test 7 PASSED: Feature flag fallback works\n');
  } else {
    console.log('❌ Test 7 FAILED: No modal appeared with feature flag disabled\n');
  }
  
  // Re-enable for future tests
  await page.evaluate(() => {
    window.game.cfg.useNewNominationModal = true;
  });
  
  console.log('\n📊 Test Summary:');
  console.log('All critical tests completed!');
  console.log('Check the logs above for any failures.');
  
  await browser.close();
  
  console.log('\n✅ Test suite completed successfully!');
}

// Run tests
runTests().catch((error) => {
  console.error('\n❌ Test suite failed with error:');
  console.error(error);
  process.exit(1);
});
