// @ts-check
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * EvictionManager UI Tests
 * 
 * These tests verify the EvictionManager module:
 * 1. Single eviction (2 nominees, evictCount = 1)
 * 2. Double eviction (3 nominees, evictCount = 2)
 * 3. Triple eviction (4 nominees, evictCount = 3)
 * 
 * Each test captures three screenshots:
 * - Before selection
 * - After selection (Evict button visible)
 * - After vote (UI hidden)
 */

test.describe('EvictionManager UI', () => {
  let testPagePath;

  test.beforeAll(() => {
    // Construct absolute file:// path to test page
    const repoRoot = path.resolve(__dirname, '..', '..');
    testPagePath = `file://${repoRoot}/test_eviction.html`;
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

  test('Single Eviction Flow (2 nominees)', async ({ page }) => {
    console.log('Starting single eviction test...');

    // Trigger single eviction
    await page.evaluate(() => {
      window.EvictionManager.show({
        nominees: ['Alice', 'Bob'],
        evictCount: 1,
        container: document.getElementById('tvMock'),
        onVote: async (nomineeId) => {
          // Simulate vote delay
          await new Promise(resolve => setTimeout(resolve, 700));
          console.log('Vote completed:', nomineeId);
        }
      });
    });

    // Wait for UI to render
    const root = page.locator('.eviction-manager-root');
    await expect(root).toBeVisible({ timeout: 3000 });

    // Wait for list to be populated
    const list = page.locator('.eviction-manager-list');
    await expect(list).toBeVisible();

    // Verify we have 2 nominees
    const items = page.locator('.eviction-manager-item');
    await expect(items).toHaveCount(2);

    // Screenshot 1: Before selection
    const screenshotDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction_single_before.png'),
      fullPage: false
    });

    // Click first avatar (Alice)
    const firstItem = items.first();
    await firstItem.click();

    // Wait for selection state
    await expect(firstItem).toHaveClass(/selected/);

    // Verify Evict button is visible
    const evictBtn = firstItem.locator('.eviction-manager-evict-btn');
    await expect(evictBtn).toBeVisible();
    await expect(evictBtn).toHaveText('Evict');

    // Screenshot 2: After selection (Evict button visible)
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction_single_selected.png'),
      fullPage: false
    });

    // Click Evict button
    await evictBtn.click();

    // Verify button is disabled
    await expect(evictBtn).toBeDisabled();
    await expect(evictBtn).toHaveText('Voting...');

    // Wait for vote to complete and UI to hide
    await expect(root).not.toBeVisible({ timeout: 2000 });

    // Screenshot 3: After vote (UI hidden)
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction_single_after_vote.png'),
      fullPage: false
    });
  });

  test('Double Eviction Flow (3 nominees)', async ({ page }) => {
    // Trigger double eviction
    await page.evaluate(() => {
      window.EvictionManager.show({
        nominees: ['Alice', 'Bob', 'Charlie'],
        evictCount: 2,
        container: document.getElementById('tvMock'),
        onVote: async (nomineeId) => {
          await new Promise(resolve => setTimeout(resolve, 700));
        }
      });
    });

    // Wait for UI to render
    const root = page.locator('.eviction-manager-root');
    await expect(root).toBeVisible({ timeout: 3000 });

    const list = page.locator('.eviction-manager-list');
    await expect(list).toBeVisible();

    // Verify we have 3 nominees
    const items = page.locator('.eviction-manager-item');
    await expect(items).toHaveCount(3);

    // Screenshot 1: Before selection
    const screenshotDir = path.join(__dirname, '..', 'screenshots');
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction_double_before.png'),
      fullPage: false
    });

    // Click second avatar (Bob)
    const secondItem = items.nth(1);
    await secondItem.click();

    // Wait for selection state
    await expect(secondItem).toHaveClass(/selected/);

    // Verify Evict button is visible
    const evictBtn = secondItem.locator('.eviction-manager-evict-btn');
    await expect(evictBtn).toBeVisible();

    // Screenshot 2: After selection
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction_double_selected.png'),
      fullPage: false
    });

    // Click Evict button
    await evictBtn.click();

    // Wait for vote to complete and UI to hide
    await expect(root).not.toBeVisible({ timeout: 2000 });

    // Screenshot 3: After vote
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction_double_after_vote.png'),
      fullPage: false
    });
  });

  test('Triple Eviction Flow (4 nominees)', async ({ page }) => {
    // Trigger triple eviction
    await page.evaluate(() => {
      window.EvictionManager.show({
        nominees: ['Alice', 'Bob', 'Charlie', 'Diana'],
        evictCount: 3,
        container: document.getElementById('tvMock'),
        onVote: async (nomineeId) => {
          await new Promise(resolve => setTimeout(resolve, 700));
        }
      });
    });

    // Wait for UI to render
    const root = page.locator('.eviction-manager-root');
    await expect(root).toBeVisible({ timeout: 3000 });

    const list = page.locator('.eviction-manager-list');
    await expect(list).toBeVisible();

    // Verify we have 4 nominees
    const items = page.locator('.eviction-manager-item');
    await expect(items).toHaveCount(4);

    // Screenshot 1: Before selection
    const screenshotDir = path.join(__dirname, '..', 'screenshots');
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction_triple_before.png'),
      fullPage: false
    });

    // Click third avatar (Charlie)
    const thirdItem = items.nth(2);
    await thirdItem.click();

    // Wait for selection state
    await expect(thirdItem).toHaveClass(/selected/);

    // Verify Evict button is visible
    const evictBtn = thirdItem.locator('.eviction-manager-evict-btn');
    await expect(evictBtn).toBeVisible();

    // Screenshot 2: After selection
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction_triple_selected.png'),
      fullPage: false
    });

    // Click Evict button
    await evictBtn.click();

    // Wait for vote to complete and UI to hide
    await expect(root).not.toBeVisible({ timeout: 2000 });

    // Screenshot 3: After vote
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction_triple_after_vote.png'),
      fullPage: false
    });
  });

  test('Validation Error Handling', async ({ page }) => {
    // Attempt to show UI with invalid configuration
    const result = await page.evaluate(() => {
      return window.EvictionManager.show({
        nominees: ['Alice', 'Bob', 'Charlie'],
        evictCount: 1, // Invalid: should be 2 for 3 nominees
        container: document.getElementById('tvMock'),
        onVote: async (nomineeId) => {}
      });
    });

    // Verify show() returned null (validation failed)
    expect(result).toBeNull();

    // Verify error message appeared temporarily
    const errorMsg = page.locator('.eviction-manager-error');
    
    // Error should be visible initially
    await expect(errorMsg).toBeVisible({ timeout: 1000 });

    // Error should disappear after 5 seconds
    await expect(errorMsg).not.toBeVisible({ timeout: 6000 });
  });

  test('Keyboard Navigation', async ({ page }) => {
    // Trigger single eviction
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

    const items = page.locator('.eviction-manager-item');
    await expect(items).toHaveCount(2);

    // First item should have focus initially
    const firstItem = items.first();
    await expect(firstItem).toBeFocused();

    // Press ArrowRight to move to second item
    await page.keyboard.press('ArrowRight');
    const secondItem = items.nth(1);
    await expect(secondItem).toBeFocused();

    // Press Enter to select
    await page.keyboard.press('Enter');
    await expect(secondItem).toHaveClass(/selected/);

    // Verify Evict button is visible
    const evictBtn = secondItem.locator('.eviction-manager-evict-btn');
    await expect(evictBtn).toBeVisible();

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(root).not.toBeVisible({ timeout: 1000 });
  });

  test('Prevents Double Voting', async ({ page }) => {
    // Trigger single eviction
    await page.evaluate(() => {
      window.EvictionManager.show({
        nominees: ['Alice', 'Bob'],
        evictCount: 1,
        container: document.getElementById('tvMock'),
        onVote: async (nomineeId) => {
          // Longer delay to allow testing
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      });
    });

    // Wait for UI
    const root = page.locator('.eviction-manager-root');
    await expect(root).toBeVisible();

    // Select first nominee
    const firstItem = page.locator('.eviction-manager-item').first();
    await firstItem.click();
    await expect(firstItem).toHaveClass(/selected/);

    // Click Evict button
    const evictBtn = firstItem.locator('.eviction-manager-evict-btn');
    await evictBtn.click();

    // Button should be disabled immediately
    await expect(evictBtn).toBeDisabled();
    await expect(evictBtn).toHaveText('Voting...');

    // Try to select another nominee (should not work)
    const secondItem = page.locator('.eviction-manager-item').nth(1);
    await secondItem.click();

    // Second item should NOT become selected
    await expect(secondItem).not.toHaveClass(/selected/);

    // Wait for vote to complete
    await expect(root).not.toBeVisible({ timeout: 3000 });
  });
});
