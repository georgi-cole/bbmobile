import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(async () => {
  console.log('Starting browser...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    // Navigate to the test page
    const testPagePath = join(__dirname, 'test_self_eviction_modal.html');
    const testPageUrl = `file://${testPagePath}`;
    console.log(`Navigating to ${testPageUrl}`);
    await page.goto(testPageUrl);
    await page.waitForLoadState('networkidle');

    // Wait for page to be ready
    await page.waitForTimeout(1000);

    // Screenshot 1: Initial state
    console.log('Taking screenshot 1: Initial state...');
    await page.screenshot({ 
      path: 'screenshot_self_eviction_1_initial.png',
      fullPage: true 
    });

    // Screenshot 2: Open action menu
    console.log('Taking screenshot 2: Action menu open...');
    await page.click('button:has-text("Open Action Menu")');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'screenshot_self_eviction_2_menu_open.png',
      fullPage: false 
    });

    // Screenshot 3: Click self-evict to show confirmation
    console.log('Taking screenshot 3: Confirmation dialog...');
    await page.click('.action-menu-item button:has-text("Self-evict")');
    await page.waitForTimeout(300);
    await page.screenshot({ 
      path: 'screenshot_self_eviction_3_confirmation.png',
      fullPage: false 
    });

    // Screenshot 4: After confirming
    console.log('Taking screenshot 4: After self-eviction...');
    await page.click('.confirm-backdrop button:has-text("Yes")');
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'screenshot_self_eviction_4_complete.png',
      fullPage: true 
    });

    console.log('✓ All screenshots taken successfully!');
    console.log('  - screenshot_self_eviction_1_initial.png');
    console.log('  - screenshot_self_eviction_2_menu_open.png');
    console.log('  - screenshot_self_eviction_3_confirmation.png');
    console.log('  - screenshot_self_eviction_4_complete.png');

  } catch (error) {
    console.error('Error taking screenshots:', error);
  } finally {
    await browser.close();
  }
})();
