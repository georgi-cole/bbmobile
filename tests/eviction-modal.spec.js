// @ts-check
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Eviction Modal Tests
 * 
 * These tests verify that the eviction result modal:
 * 1. Renders above all TV overlay content (not clipped)
 * 2. Centers properly in the viewport on desktop and mobile
 * 3. Is fully visible and scrollable if needed
 * 4. Handles keyboard navigation (ESC to close)
 * 5. Handles backdrop clicks
 * 6. Supports accessibility features
 */

test.describe('Eviction Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test page
    await page.goto('/test_eviction_modal.html');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for modal module to load and verify it's usable
    await page.waitForFunction(() => window.EvictionModal && typeof window.EvictionModal.show === 'function', { timeout: 10000 });
  });

  test('should display eviction modal centered and fully visible', async ({ page }) => {
    // Trigger standard eviction modal
    await page.evaluate(() => {
      return window.EvictionModal.show({
        title: 'Eviction Result',
        lines: ['By a vote of 5 to 2, Alice, you have been evicted.'],
        tone: 'evict',
        duration: 0 // Don't auto-dismiss for testing
      });
    });

    // Wait for modal to appear
    const modal = page.locator('.eviction-modal-card');
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Get viewport and modal dimensions
    const viewportSize = page.viewportSize();
    const modalBox = await modal.boundingBox();

    // Verify modal is within viewport bounds
    expect(modalBox.y).toBeGreaterThanOrEqual(0);
    expect(modalBox.x).toBeGreaterThanOrEqual(0);
    expect(modalBox.y + modalBox.height).toBeLessThanOrEqual(viewportSize.height);
    expect(modalBox.x + modalBox.width).toBeLessThanOrEqual(viewportSize.width);

    // Verify modal is centered horizontally (within 50px tolerance)
    const centerX = modalBox.x + modalBox.width / 2;
    const viewportCenterX = viewportSize.width / 2;
    expect(Math.abs(centerX - viewportCenterX)).toBeLessThan(50);

    // Verify modal has high z-index
    const zIndex = await modal.evaluate((el) => {
      return parseInt(window.getComputedStyle(el.parentElement).zIndex, 10);
    });
    expect(zIndex).toBeGreaterThanOrEqual(9000);

    // Take screenshot
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction-modal-centered.png'),
      fullPage: false
    });

    // Close modal with ESC key
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 2000 });
  });

  test('should close on backdrop click', async ({ page }) => {
    // Show modal
    await page.evaluate(() => {
      return window.EvictionModal.show({
        title: 'Eviction Result',
        lines: ['Test backdrop click'],
        tone: 'evict',
        duration: 0
      });
    });

    const modal = page.locator('.eviction-modal-card');
    await expect(modal).toBeVisible();

    // Click backdrop
    const backdrop = page.locator('.eviction-modal-backdrop');
    await backdrop.click({ position: { x: 10, y: 10 } });

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 2000 });
  });

  test('should close on close button click', async ({ page }) => {
    // Show modal
    await page.evaluate(() => {
      return window.EvictionModal.show({
        title: 'Eviction Result',
        lines: ['Test close button'],
        tone: 'evict',
        duration: 0
      });
    });

    const modal = page.locator('.eviction-modal-card');
    await expect(modal).toBeVisible();

    // Click close button
    const closeBtn = page.locator('.eviction-modal-close');
    await closeBtn.click();

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 2000 });
  });

  test('should auto-dismiss after duration', async ({ page }) => {
    // Show modal with short duration
    await page.evaluate(() => {
      return window.EvictionModal.show({
        title: 'Eviction Result',
        lines: ['Auto-dismiss test'],
        tone: 'evict',
        duration: 1000 // 1 second
      });
    });

    const modal = page.locator('.eviction-modal-card');
    await expect(modal).toBeVisible();

    // Wait for auto-dismiss
    await expect(modal).not.toBeVisible({ timeout: 2000 });
  });

  test('should display multi-line content correctly', async ({ page }) => {
    // Show modal with multiple lines
    await page.evaluate(() => {
      return window.EvictionModal.show({
        title: 'Eviction Results',
        lines: [
          'Double Eviction: Alice, Bob',
          'Final votes: Alice 4 — Bob 3 — Charlie 1'
        ],
        tone: 'evict',
        duration: 0
      });
    });

    const modal = page.locator('.eviction-modal-card');
    await expect(modal).toBeVisible();

    // Verify both lines are present
    await expect(modal.locator('text=Double Eviction: Alice, Bob')).toBeVisible();
    await expect(modal.locator('text=Final votes: Alice 4')).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
  });

  test('should handle keyboard focus properly', async ({ page }) => {
    // Show modal
    await page.evaluate(() => {
      return window.EvictionModal.show({
        title: 'Eviction Result',
        lines: ['Focus test'],
        tone: 'evict',
        duration: 0
      });
    });

    const modal = page.locator('.eviction-modal-card');
    await expect(modal).toBeVisible();

    // Verify modal or close button has focus
    const closeBtn = page.locator('.eviction-modal-close');
    const isFocused = await page.evaluate(() => {
      const activeElement = document.activeElement;
      const modalCard = document.querySelector('.eviction-modal-card');
      const closeButton = document.querySelector('.eviction-modal-close');
      return activeElement === modalCard || activeElement === closeButton;
    });

    expect(isFocused).toBe(true);

    // Close modal
    await page.keyboard.press('Escape');
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    // Show modal
    await page.evaluate(() => {
      return window.EvictionModal.show({
        title: 'Eviction Result',
        lines: ['Mobile viewport test'],
        tone: 'evict',
        duration: 0
      });
    });

    const modal = page.locator('.eviction-modal-card');
    await expect(modal).toBeVisible();

    // Verify modal is within mobile viewport
    const viewportSize = page.viewportSize();
    const modalBox = await modal.boundingBox();

    expect(modalBox.y).toBeGreaterThanOrEqual(0);
    expect(modalBox.x).toBeGreaterThanOrEqual(0);
    expect(modalBox.y + modalBox.height).toBeLessThanOrEqual(viewportSize.height);
    expect(modalBox.x + modalBox.width).toBeLessThanOrEqual(viewportSize.width);

    // Take mobile screenshot
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction-modal-mobile.png'),
      fullPage: false
    });

    // Close modal
    await page.keyboard.press('Escape');
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    // Show modal
    await page.evaluate(() => {
      return window.EvictionModal.show({
        title: 'Eviction Result',
        lines: ['Accessibility test'],
        tone: 'evict',
        duration: 0
      });
    });

    // Verify ARIA attributes
    const layer = page.locator('.eviction-modal-layer');
    await expect(layer).toHaveAttribute('role', 'dialog');
    await expect(layer).toHaveAttribute('aria-modal', 'true');
    await expect(layer).toHaveAttribute('aria-labelledby', 'eviction-modal-title');

    const title = page.locator('#eviction-modal-title');
    await expect(title).toBeVisible();

    const closeBtn = page.locator('.eviction-modal-close');
    await expect(closeBtn).toHaveAttribute('aria-label', 'Close modal');

    // Close modal
    await page.keyboard.press('Escape');
  });

  test('should render above TV container (not clipped)', async ({ page }) => {
    // Show modal from TV container context
    await page.evaluate(() => {
      // Simulate showing modal from within TV overlay
      return window.EvictionModal.show({
        title: 'Eviction Result',
        lines: ['Rendered from TV container context'],
        tone: 'evict',
        duration: 0
      });
    });

    const modal = page.locator('.eviction-modal-card');
    await expect(modal).toBeVisible();

    // Verify modal is in #eviction-modal-root (body-level)
    const modalRoot = page.locator('#eviction-modal-root');
    await expect(modalRoot).toBeVisible();

    // Verify modal is not inside #tv or #tvOverlay
    const isInTv = await page.evaluate(() => {
      const modalCard = document.querySelector('.eviction-modal-card');
      const tv = document.getElementById('tv');
      return tv ? tv.contains(modalCard) : false;
    });
    expect(isInTv).toBe(false);

    // Take screenshot showing modal above TV
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction-modal-above-tv.png'),
      fullPage: false
    });

    // Close modal
    await page.keyboard.press('Escape');
  });
});
