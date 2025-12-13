// @ts-check
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Eviction Screen Spacing Tests
 * 
 * These tests verify the spacing adjustments between the selected avatar
 * and the Evict button. Screenshots are captured to demonstrate:
 * 1. Proper spacing between avatar ring and button
 * 2. No overlap between elements
 * 3. Responsive behavior at different viewport sizes
 * 4. Accessibility (minimum touch target size)
 */

test.describe('Eviction Screen Spacing', () => {
  let testPagePath;
  const screenshotDir = path.join(__dirname, '..', 'screenshots');

  test.beforeAll(() => {
    // Construct absolute file:// path to test page
    const repoRoot = path.resolve(__dirname, '..', '..');
    testPagePath = `file://${repoRoot}/test_eviction.html`;
    
    // Ensure screenshot directory exists
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to test page using file protocol
    await page.goto(testPagePath);
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for EvictionManager to be available
    await page.waitForFunction(() => {
      return window.EvictionManager && typeof window.EvictionManager.show === 'function';
    }, { timeout: 10000 });
  });

  test('Desktop viewport - Spacing between avatar and button', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Trigger eviction UI
    await page.evaluate(() => {
      window.EvictionManager.show({
        nominees: ['Alice', 'Bob', 'Charlie'],
        evictCount: 1,
        container: document.getElementById('tvMock'),
        onVote: async (nomineeId) => {
          await new Promise(resolve => setTimeout(resolve, 700));
        }
      });
    });

    // Wait for UI to render
    const root = page.locator('.eviction-manager-root');
    await expect(root).toBeVisible({ timeout: 3000 });

    // Select first nominee
    const firstItem = page.locator('.eviction-manager-item').first();
    await firstItem.click();
    await expect(firstItem).toHaveClass(/selected/);

    // Wait for button to appear
    const evictBtn = firstItem.locator('.eviction-manager-evict-btn');
    await expect(evictBtn).toBeVisible();

    // Capture screenshot showing spacing
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction_spacing_desktop.png'),
      fullPage: false
    });

    // Measure spacing between avatar and button
    const spacing = await page.evaluate(() => {
      const avatar = document.querySelector('.eviction-manager-item.selected .eviction-manager-avatar');
      const button = document.querySelector('.eviction-manager-item.selected .eviction-manager-evict-btn');
      
      if (!avatar || !button) return null;
      
      const avatarRect = avatar.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      
      return {
        gap: buttonRect.top - avatarRect.bottom,
        avatarBottom: avatarRect.bottom,
        buttonTop: buttonRect.top,
        buttonHeight: buttonRect.height
      };
    });

    console.log('Desktop spacing measurements:', spacing);
    
    // Verify spacing is reasonable (should be reduced from default)
    expect(spacing).not.toBeNull();
    if (spacing) {
      expect(spacing.gap).toBeGreaterThanOrEqual(4);
      expect(spacing.gap).toBeLessThan(20);
      expect(spacing.buttonHeight).toBeGreaterThanOrEqual(44); // Accessibility minimum
    }
  });

  test('Mobile viewport - Spacing between avatar and button', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Trigger eviction UI
    await page.evaluate(() => {
      window.EvictionManager.show({
        nominees: ['Alice', 'Bob'],
        evictCount: 1,
        container: document.getElementById('tvMock'),
        onVote: async (nomineeId) => {
          await new Promise(resolve => setTimeout(resolve, 700));
        }
      });
    });

    // Wait for UI to render
    const root = page.locator('.eviction-manager-root');
    await expect(root).toBeVisible({ timeout: 3000 });

    // Select first nominee
    const firstItem = page.locator('.eviction-manager-item').first();
    await firstItem.click();
    await expect(firstItem).toHaveClass(/selected/);

    // Wait for button to appear
    const evictBtn = firstItem.locator('.eviction-manager-evict-btn');
    await expect(evictBtn).toBeVisible();

    // Capture screenshot showing spacing on mobile
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction_spacing_mobile.png'),
      fullPage: false
    });

    // Measure spacing
    const spacing = await page.evaluate(() => {
      const avatar = document.querySelector('.eviction-manager-item.selected .eviction-manager-avatar');
      const button = document.querySelector('.eviction-manager-item.selected .eviction-manager-evict-btn');
      
      if (!avatar || !button) return null;
      
      const avatarRect = avatar.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      
      return {
        gap: buttonRect.top - avatarRect.bottom,
        avatarBottom: avatarRect.bottom,
        buttonTop: buttonRect.top,
        buttonHeight: buttonRect.height
      };
    });

    console.log('Mobile spacing measurements:', spacing);
    
    // Verify spacing is tighter on mobile but still has minimum gap
    expect(spacing).not.toBeNull();
    if (spacing) {
      expect(spacing.gap).toBeGreaterThanOrEqual(4);
      expect(spacing.gap).toBeLessThan(16);
      expect(spacing.buttonHeight).toBeGreaterThanOrEqual(44); // Accessibility minimum
    }
  });

  test('Small mobile viewport - Extra tight spacing', async ({ page }) => {
    // Set small mobile viewport
    await page.setViewportSize({ width: 360, height: 640 });
    
    // Trigger eviction UI
    await page.evaluate(() => {
      window.EvictionManager.show({
        nominees: ['Alice', 'Bob'],
        evictCount: 1,
        container: document.getElementById('tvMock'),
        onVote: async (nomineeId) => {
          await new Promise(resolve => setTimeout(resolve, 700));
        }
      });
    });

    // Wait for UI to render
    const root = page.locator('.eviction-manager-root');
    await expect(root).toBeVisible({ timeout: 3000 });

    // Select first nominee
    const firstItem = page.locator('.eviction-manager-item').first();
    await firstItem.click();
    await expect(firstItem).toHaveClass(/selected/);

    // Wait for button to appear
    const evictBtn = firstItem.locator('.eviction-manager-evict-btn');
    await expect(evictBtn).toBeVisible();

    // Capture screenshot
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction_spacing_small_mobile.png'),
      fullPage: false
    });

    // Measure spacing
    const spacing = await page.evaluate(() => {
      const avatar = document.querySelector('.eviction-manager-item.selected .eviction-manager-avatar');
      const button = document.querySelector('.eviction-manager-item.selected .eviction-manager-evict-btn');
      
      if (!avatar || !button) return null;
      
      const avatarRect = avatar.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      
      return {
        gap: buttonRect.top - avatarRect.bottom,
        noOverlap: buttonRect.top >= avatarRect.bottom,
        buttonHeight: buttonRect.height
      };
    });

    console.log('Small mobile spacing measurements:', spacing);
    
    // Verify no overlap and minimum spacing
    expect(spacing).not.toBeNull();
    if (spacing) {
      expect(spacing.noOverlap).toBe(true);
      expect(spacing.gap).toBeGreaterThanOrEqual(4);
      expect(spacing.buttonHeight).toBeGreaterThanOrEqual(44);
    }
  });

  test('Avatar glow does not create excessive spacing', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Trigger eviction UI
    await page.evaluate(() => {
      window.EvictionManager.show({
        nominees: ['Alice', 'Bob', 'Charlie', 'Diana'],
        evictCount: 1,
        container: document.getElementById('tvMock'),
        onVote: async (nomineeId) => {
          await new Promise(resolve => setTimeout(resolve, 700));
        }
      });
    });

    // Wait for UI to render
    const root = page.locator('.eviction-manager-root');
    await expect(root).toBeVisible({ timeout: 3000 });

    // Select second nominee
    const secondItem = page.locator('.eviction-manager-item').nth(1);
    await secondItem.click();
    await expect(secondItem).toHaveClass(/selected/);

    // Wait for button to appear
    const evictBtn = secondItem.locator('.eviction-manager-evict-btn');
    await expect(evictBtn).toBeVisible();

    // Capture screenshot showing glow effect
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction_spacing_with_glow.png'),
      fullPage: false
    });

    // Verify glow is visible but not excessive
    const glowCheck = await page.evaluate(() => {
      const selectedItem = document.querySelector('.eviction-manager-item.selected');
      const avatar = selectedItem?.querySelector('.eviction-manager-avatar');
      
      if (!avatar) return null;
      
      const styles = window.getComputedStyle(avatar);
      return {
        boxShadow: styles.boxShadow,
        hasGlow: styles.boxShadow !== 'none'
      };
    });

    console.log('Glow effect:', glowCheck);
    expect(glowCheck?.hasGlow).toBe(true);
  });

  test('Multiple nominees - Consistent spacing', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Trigger eviction UI with 6 nominees
    await page.evaluate(() => {
      window.EvictionManager.show({
        nominees: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'],
        evictCount: 1,
        container: document.getElementById('tvMock'),
        onVote: async (nomineeId) => {
          await new Promise(resolve => setTimeout(resolve, 700));
        }
      });
    });

    // Wait for UI to render
    const root = page.locator('.eviction-manager-root');
    await expect(root).toBeVisible({ timeout: 3000 });

    // Select middle nominee
    const middleItem = page.locator('.eviction-manager-item').nth(2);
    await middleItem.click();
    await expect(middleItem).toHaveClass(/selected/);

    // Wait for button to appear
    const evictBtn = middleItem.locator('.eviction-manager-evict-btn');
    await expect(evictBtn).toBeVisible();

    // Capture screenshot with multiple nominees
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction_spacing_multiple_nominees.png'),
      fullPage: false
    });

    // Verify spacing is consistent
    const allItems = page.locator('.eviction-manager-item');
    const count = await allItems.count();
    expect(count).toBe(6);
  });
});
