// @ts-check
import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Capture screenshots of the eviction modal overlaying the actual game UI
 */

test.describe('Eviction Modal - Game UI Context', () => {
  test('capture eviction modal over full game interface', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Navigate to main game
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for game to load
    await page.waitForTimeout(3000);
    
    console.log('Game page loaded, waiting for initialization...');
    
    // Wait for game to be available
    await page.waitForFunction(() => window.game !== undefined, { timeout: 15000 });
    
    // Wait for eviction modal module to be loaded
    await page.waitForFunction(() => window.EvictionModal && typeof window.EvictionModal.show === 'function', { timeout: 10000 });
    
    console.log('Game and modal system loaded');
    
    // Show the eviction modal over the game UI
    await page.evaluate(() => {
      // Trigger the modal with realistic eviction data
      window.EvictionModal.show({
        title: 'Eviction Result',
        lines: [
          'By a vote of 5 to 2,',
          'Alice, you have been evicted from the Big Brother house.'
        ],
        tone: 'evict',
        duration: 0 // Don't auto-dismiss
      });
    });
    
    console.log('Eviction modal triggered over game UI');
    
    // Wait for modal to be fully visible
    await page.waitForSelector('.eviction-modal-card', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(800); // Wait for animations
    
    console.log('Modal is visible, capturing screenshots...');
    
    // Create screenshots directory
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    // Screenshot 1: Full page showing modal over game UI
    console.log('Taking screenshot 1: Full game page with modal overlay');
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction-modal-game-ui-full.png'),
      fullPage: false
    });
    
    // Screenshot 2: Modal close-up
    console.log('Taking screenshot 2: Modal detail');
    const modal = page.locator('.eviction-modal-card');
    await modal.screenshot({
      path: path.join(screenshotDir, 'eviction-modal-game-ui-detail.png')
    });
    
    // Screenshot 3: Mobile viewport
    console.log('Taking screenshot 3: Mobile viewport');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction-modal-game-ui-mobile.png'),
      fullPage: false
    });
    
    console.log('✓ All screenshots captured showing modal over game UI');
    console.log('  - eviction-modal-game-ui-full.png (desktop with game UI)');
    console.log('  - eviction-modal-game-ui-detail.png (modal detail)');
    console.log('  - eviction-modal-game-ui-mobile.png (mobile with game UI)');
    
    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });
});
