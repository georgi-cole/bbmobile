#!/usr/bin/env node
/**
 * Screenshot capture script for social reopen features
 * Captures evidence that all three features are working
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  console.log('📸 Starting screenshot capture...\n');

  try {
    // Navigate to the test file
    const testFilePath = join(__dirname, 'test_social_reopen_and_dr_log.html');
    await page.goto(`file://${testFilePath}`);
    await page.waitForLoadState('networkidle');

    // Screenshot 1: Test page overview
    console.log('1️⃣ Capturing test page overview...');
    await page.screenshot({ 
      path: 'screenshot_1_test_overview.png',
      fullPage: true 
    });

    // Screenshot 2: Setup environment
    console.log('2️⃣ Setting up test environment...');
    await page.click('button:has-text("Setup Environment")');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'screenshot_2_setup_complete.png',
      fullPage: true 
    });

    // Screenshot 3: Task 1 - Launcher Reopen Test
    console.log('3️⃣ Testing launcher reopen...');
    await page.click('button:has-text("Test Launcher Reopen")');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'screenshot_3_launcher_reopen.png',
      fullPage: true 
    });

    // Screenshot 4: Task 2 - DR Action Log Test
    console.log('4️⃣ Testing DR action log...');
    await page.click('button:has-text("Test DR Action Log")');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'screenshot_4_dr_action_log.png',
      fullPage: true 
    });

    // Screenshot 5: Task 3 - Timer Pause Test
    console.log('5️⃣ Testing timer pause...');
    await page.click('button:has-text("Test Timer Pause")');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'screenshot_5_timer_pause.png',
      fullPage: true 
    });

    // Screenshot 6: Inspect Game State
    console.log('6️⃣ Inspecting game state...');
    await page.click('button:has-text("Inspect Game State")');
    await page.waitForTimeout(300);
    await page.screenshot({ 
      path: 'screenshot_6_game_state.png',
      fullPage: true 
    });

    // Screenshot 7: Inspect DR Entries
    console.log('7️⃣ Inspecting DR entries...');
    await page.click('button:has-text("Inspect DR Entries")');
    await page.waitForTimeout(300);
    await page.screenshot({ 
      path: 'screenshot_7_dr_entries_detail.png',
      fullPage: true 
    });

    console.log('\n✅ All screenshots captured successfully!\n');
    console.log('Screenshots saved:');
    console.log('  - screenshot_1_test_overview.png');
    console.log('  - screenshot_2_setup_complete.png');
    console.log('  - screenshot_3_launcher_reopen.png (Task 1)');
    console.log('  - screenshot_4_dr_action_log.png (Task 2)');
    console.log('  - screenshot_5_timer_pause.png (Task 3)');
    console.log('  - screenshot_6_game_state.png');
    console.log('  - screenshot_7_dr_entries_detail.png');

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the script
captureScreenshots().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
