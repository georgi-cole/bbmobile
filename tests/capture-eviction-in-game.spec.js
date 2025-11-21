// @ts-check
import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Capture screenshots of the eviction modal in the actual game
 */

test.describe('Eviction Modal - In-Game Screenshots', () => {
  test('capture eviction modal during actual game play', async ({ page }) => {
    // Set desktop viewport for better visibility
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Navigate to main game
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for game to initialize
    await page.waitForTimeout(2000);
    
    console.log('Game loaded, checking for start game options...');
    
    // Try to start a quick game
    const startBtn = page.locator('#btnStartQuick, button:has-text("Start"), button:has-text("Quick Start")');
    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.first().click();
      console.log('Clicked start game button');
      await page.waitForTimeout(2000);
    }
    
    // Wait for game to be initialized
    await page.waitForFunction(() => window.game && window.game.players, { timeout: 10000 });
    console.log('Game initialized');
    
    // Skip intro sequences if any
    const skipBtn = page.locator('button:has-text("Skip"), .skip-btn, #skipBtn');
    if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await skipBtn.first().click();
      console.log('Skipped intro');
      await page.waitForTimeout(500);
    }
    
    // Fast forward to eviction phase
    console.log('Fast forwarding to eviction phase...');
    
    // Use game's phase advancement to get to live vote
    await page.evaluate(async () => {
      // Fast forward through phases until we hit live vote
      const maxAttempts = 50;
      let attempts = 0;
      
      while (attempts < maxAttempts && window.game.phase !== 'livevote') {
        // Skip any active phase
        if (typeof window.skipPhase === 'function') {
          window.skipPhase();
        } else if (typeof window.game.skipPhase === 'function') {
          window.game.skipPhase();
        } else if (window.phaseTimer) {
          window.phaseTimer.skip();
        }
        
        // Small delay to let phase transition
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
        
        // If we're in a minigame or competition, try to end it
        if (window.game.phase === 'comp' || window.game.phase === 'veto') {
          // Award win to first player
          if (window.game.humanId && typeof window.endComp === 'function') {
            window.endComp(window.game.humanId);
          }
        }
        
        // If nominations needed, nominate someone
        if (window.game.phase === 'noms' && window.game.nominees.length < 2) {
          const players = window.game.players.filter(p => !p.evicted && p.id !== window.game.hohId);
          if (players.length >= 2) {
            window.game.nominees = [players[0].id, players[1].id];
          }
        }
      }
      
      console.log(`Reached phase: ${window.game.phase} after ${attempts} attempts`);
    });
    
    // Wait a bit for UI to stabilize
    await page.waitForTimeout(1000);
    
    // Check if we're in live vote phase
    const currentPhase = await page.evaluate(() => window.game?.phase);
    console.log(`Current phase: ${currentPhase}`);
    
    if (currentPhase !== 'livevote') {
      console.log('Not in livevote phase, manually triggering eviction modal for screenshot...');
      
      // Manually trigger the eviction modal for screenshot purposes
      await page.evaluate(() => {
        if (window.EvictionModal && typeof window.EvictionModal.show === 'function') {
          window.EvictionModal.show({
            title: 'Eviction Result',
            lines: [
              'By a vote of 5 to 2,',
              'Alice, you have been evicted from the Big Brother house.'
            ],
            tone: 'evict',
            duration: 0 // Don't auto-dismiss
          });
        }
      });
      
      console.log('Manually triggered eviction modal');
    } else {
      console.log('In livevote phase, waiting for eviction result...');
      
      // Wait for eviction to complete and modal to show
      await page.waitForSelector('.eviction-modal-card', { state: 'visible', timeout: 15000 }).catch(() => {
        console.log('Modal not shown automatically, triggering manually...');
      });
    }
    
    // Wait for modal to appear
    await page.waitForSelector('.eviction-modal-card', { state: 'visible', timeout: 5000 });
    console.log('Eviction modal is visible!');
    
    // Wait for animations to complete
    await page.waitForTimeout(800);
    
    // Create screenshots directory
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    // Take full page screenshot showing the modal
    console.log('Taking screenshot 1: Full page with modal');
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction-modal-in-game-full.png'),
      fullPage: false
    });
    
    // Take screenshot focused on just the modal
    console.log('Taking screenshot 2: Modal close-up');
    const modal = page.locator('.eviction-modal-card');
    await modal.screenshot({
      path: path.join(screenshotDir, 'eviction-modal-in-game-closeup.png')
    });
    
    // Get modal position info
    const modalBox = await modal.boundingBox();
    const viewportSize = page.viewportSize();
    console.log(`Modal: ${modalBox.width}x${modalBox.height} at (${modalBox.x}, ${modalBox.y})`);
    console.log(`Viewport: ${viewportSize.width}x${viewportSize.height}`);
    console.log(`Modal is centered: ${Math.abs((modalBox.x + modalBox.width/2) - viewportSize.width/2) < 10 ? 'Yes' : 'No'}`);
    
    // Take one more screenshot with mobile viewport
    console.log('Taking screenshot 3: Mobile viewport');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // Let modal adjust to new viewport
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'eviction-modal-in-game-mobile.png'),
      fullPage: false
    });
    
    console.log('✓ All screenshots captured successfully');
    console.log('  - eviction-modal-in-game-full.png (desktop full page)');
    console.log('  - eviction-modal-in-game-closeup.png (modal detail)');
    console.log('  - eviction-modal-in-game-mobile.png (mobile viewport)');
    
    // Close modal before test ends
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });
});
