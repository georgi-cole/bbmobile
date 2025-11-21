// @ts-check
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simple test to generate eviction modal screenshot
 */

test.describe('Eviction Modal Screenshot', () => {
  test('capture eviction modal centered', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Navigate to test page
    await page.goto('/test_eviction_modal.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Wait for modal module and verify it's usable
    await page.waitForFunction(() => window.EvictionModal && typeof window.EvictionModal.show === 'function', { timeout: 10000 });
    
    // Wait a bit for page to settle
    await page.waitForTimeout(500);
    
    // Show modal via page evaluation
    const modalPromise = page.evaluate(() => {
      return window.EvictionModal.show({
        title: 'Eviction Result',
        lines: ['By a vote of 5 to 2, Alice, you have been evicted.'],
        tone: 'evict',
        duration: 10000 // Give us time to screenshot
      });
    });
    
    // Wait for modal to be visible
    await page.waitForSelector('.eviction-modal-card', { state: 'visible', timeout: 5000 });
    
    // Wait a bit for animations to complete
    await page.waitForTimeout(500);
    
    // Create screenshots directory
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction-modal-centered.png'),
      fullPage: false
    });
    
    console.log('✓ Screenshot saved to tests/screenshots/eviction-modal-centered.png');
    
    // Verify modal is visible and centered
    const modal = page.locator('.eviction-modal-card');
    await expect(modal).toBeVisible();
    
    // Get dimensions
    const modalBox = await modal.boundingBox();
    const viewportSize = page.viewportSize();
    
    console.log(`Modal dimensions: ${modalBox.width}x${modalBox.height} at (${modalBox.x}, ${modalBox.y})`);
    console.log(`Viewport: ${viewportSize.width}x${viewportSize.height}`);
    
    // Verify not clipped
    expect(modalBox.y).toBeGreaterThanOrEqual(0);
    expect(modalBox.x).toBeGreaterThanOrEqual(0);
    expect(modalBox.y + modalBox.height).toBeLessThanOrEqual(viewportSize.height);
    expect(modalBox.x + modalBox.width).toBeLessThanOrEqual(viewportSize.width);
    
    console.log('✓ Modal is fully visible (not clipped)');
    
    // Verify roughly centered
    const centerX = modalBox.x + modalBox.width / 2;
    const viewportCenterX = viewportSize.width / 2;
    const horizontalOffset = Math.abs(centerX - viewportCenterX);
    
    console.log(`Horizontal offset from center: ${horizontalOffset}px`);
    expect(horizontalOffset).toBeLessThan(100); // Within 100px of center
    
    console.log('✓ Modal is centered');
  });
});
