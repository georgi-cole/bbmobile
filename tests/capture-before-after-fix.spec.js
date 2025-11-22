// @ts-check
import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Capture BEFORE and AFTER screenshots showing the fix
 */

test.describe('Eviction Result - Before & After Fix', () => {
  test('capture broken old system vs fixed new modal', async ({ page }) => {
    // Set mobile viewport to match user's screenshot
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Navigate to comparison page
    await page.goto('/test_eviction_result_fixed.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    await page.waitForTimeout(2000);
    
    console.log('Comparison page loaded');
    
    // Create screenshots directory
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    // PART 1: Capture OLD (broken) behavior
    console.log('Capturing OLD (broken) behavior...');
    await page.click('button:has-text("Show OLD (Broken)")');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction-result-BEFORE-fix.png'),
      fullPage: false
    });
    console.log('✓ Captured BEFORE (broken - card clipped)');
    
    // Clear
    await page.click('button:has-text("Clear")');
    await page.waitForTimeout(500);
    
    // PART 2: Capture NEW (fixed) behavior
    console.log('Capturing NEW (fixed) behavior...');
    await page.click('button:has-text("Show NEW (Fixed)")');
    await page.waitForSelector('.eviction-modal-card', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction-result-AFTER-fix.png'),
      fullPage: false
    });
    console.log('✓ Captured AFTER (fixed - modal centered and visible)');
    
    // Also capture modal detail
    const modal = page.locator('.eviction-modal-card');
    await modal.screenshot({
      path: path.join(screenshotDir, 'eviction-result-modal-closeup.png')
    });
    console.log('✓ Captured modal close-up');
    
    // Desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction-result-AFTER-fix-desktop.png'),
      fullPage: false
    });
    console.log('✓ Captured desktop view');
    
    console.log('\n=== Screenshots Summary ===');
    console.log('BEFORE: eviction-result-BEFORE-fix.png (shows clipping issue)');
    console.log('AFTER: eviction-result-AFTER-fix.png (shows fix - modal centered)');
    console.log('DETAIL: eviction-result-modal-closeup.png');
    console.log('DESKTOP: eviction-result-AFTER-fix-desktop.png');
  });
});
