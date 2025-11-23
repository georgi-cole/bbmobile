/**
 * Screenshot script for mobile roster enhancements
 */
import { chromium } from '@playwright/test';

async function takeScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 414, height: 896 }, // iPhone 11 Pro size
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    console.log('📸 Taking screenshots...');
    
    // Navigate to test page
    await page.goto('http://localhost:8080/test_mobile_roster_enhancements.html');
    await page.waitForTimeout(2000); // Wait for roster to initialize
    
    // Screenshot 1: Initial roster with mixed active/evicted players
    console.log('Screenshot 1: Initial roster view');
    await page.screenshot({
      path: 'screenshots/roster-enhancements-1-initial.png',
      fullPage: false
    });
    
    // Screenshot 2: Scroll to show evicted players in grid
    console.log('Screenshot 2: Roster with evicted players visible');
    await page.evaluate(() => window.scrollTo(0, 100));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'screenshots/roster-enhancements-2-evicted-in-grid.png',
      fullPage: false
    });
    
    // Screenshot 3: Simulate long press on active player
    console.log('Screenshot 3: Profile popover for active player');
    const kaiTile = await page.locator('[data-player-id="1"]').first();
    await kaiTile.dispatchEvent('pointerdown');
    await page.waitForTimeout(1600); // Wait for long press
    await page.waitForTimeout(500); // Wait for animation
    await page.screenshot({
      path: 'screenshots/roster-enhancements-3-profile-popover-active.png',
      fullPage: false
    });
    
    // Close popover
    await page.locator('.profile-popover-close').click();
    await page.waitForTimeout(500);
    
    // Screenshot 4: Profile popover for evicted player
    console.log('Screenshot 4: Profile popover for evicted player');
    const zedTile = await page.locator('[data-player-id="6"]').first();
    await zedTile.dispatchEvent('pointerdown');
    await page.waitForTimeout(1600); // Wait for long press
    await page.waitForTimeout(500); // Wait for animation
    await page.screenshot({
      path: 'screenshots/roster-enhancements-4-profile-popover-evicted.png',
      fullPage: false
    });
    
    // Close popover
    await page.locator('.profile-popover-close').click();
    await page.waitForTimeout(500);
    
    // Screenshot 5: After clicking eviction button
    console.log('Screenshot 5: After evicting another player');
    await page.locator('button:has-text("Test Evict Player")').click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'screenshots/roster-enhancements-5-after-eviction.png',
      fullPage: false
    });
    
    // Screenshot 6: Spotlight view
    console.log('Screenshot 6: Player spotlight in TV');
    const ariaTile = await page.locator('[data-player-id="2"]').first();
    await ariaTile.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'screenshots/roster-enhancements-6-spotlight.png',
      fullPage: false
    });
    
    // Screenshot 7: Full page overview
    console.log('Screenshot 7: Full page overview');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'screenshots/roster-enhancements-7-full-page.png',
      fullPage: true
    });
    
    console.log('✅ All screenshots captured successfully!');
    
  } catch (error) {
    console.error('❌ Error taking screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

takeScreenshots().catch(console.error);
