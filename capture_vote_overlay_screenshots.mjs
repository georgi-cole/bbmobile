#!/usr/bin/env node

/**
 * Capture vote overlay screenshots at different viewport sizes
 * - Mobile: 375x667 (iPhone SE)
 * - Laptop: 1366x768 (common laptop resolution)
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667, label: 'Mobile (iPhone SE)' },
  { name: 'laptop', width: 1366, height: 768, label: 'Laptop (1366x768)' }
];

async function captureScreenshots() {
  console.log('🚀 Starting screenshot capture...\n');

  const browser = await chromium.launch({ headless: true });
  
  try {
    for (const viewport of VIEWPORTS) {
      console.log(`📱 Capturing ${viewport.label}...`);
      
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 2
      });
      
      const page = await context.newPage();
      
      // Navigate to the test page
      const testPagePath = join(__dirname, 'test_compact_vote_ui.html');
      await page.goto(`file://${testPagePath}`, { waitUntil: 'networkidle' });
      
      // Wait for page to load
      await page.waitForTimeout(1000);
      
      // Trigger the vote overlay with 3 nominees
      await page.evaluate(() => {
        // Mock the required functions
        window.game = window.game || {};
        
        const mockPlayers = {
          1: { id: 1, name: 'Alice', avatar: 'https://api.dicebear.com/6.x/bottts/svg?seed=Alice' },
          2: { id: 2, name: 'Bob', avatar: 'https://api.dicebear.com/6.x/bottts/svg?seed=Bob' },
          3: { id: 3, name: 'Charlie', avatar: 'https://api.dicebear.com/6.x/bottts/svg?seed=Charlie' }
        };
        
        window.getP = function(playerId) {
          return mockPlayers[playerId];
        };
        
        window.resolveAvatar = function(player) {
          return player?.avatar || `https://api.dicebear.com/6.x/bottts/svg?seed=${player?.name || 'player'}`;
        };
        
        window.safeName = function(name) {
          return name;
        };
        
        // Show the vote overlay
        if (window.LiveVoteOverlay) {
          window.LiveVoteOverlay.show({
            nominees: [1, 2, 3],
            onSubmit: (selectedId) => {
              console.log('Vote submitted for:', selectedId);
            },
            isTieBreak: false,
            allowClose: true,
            onCancel: () => {
              console.log('Vote cancelled');
            }
          });
        }
      });
      
      // Wait for overlay to appear and animations to settle
      await page.waitForTimeout(2000);
      
      // Take full page screenshot
      const screenshotPath = join(__dirname, `vote_overlay_${viewport.name}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });
      
      console.log(`✅ Saved: vote_overlay_${viewport.name}.png`);
      
      // Also take a screenshot of just the #tv container for clarity
      const tvElement = await page.$('#tv');
      if (tvElement) {
        const tvScreenshotPath = join(__dirname, `vote_overlay_${viewport.name}_tv_only.png`);
        await tvElement.screenshot({ path: tvScreenshotPath });
        console.log(`✅ Saved: vote_overlay_${viewport.name}_tv_only.png`);
      }
      
      await context.close();
      console.log('');
    }
    
    console.log('🎉 All screenshots captured successfully!');
    console.log('\nGenerated files:');
    VIEWPORTS.forEach(v => {
      console.log(`  - vote_overlay_${v.name}.png`);
      console.log(`  - vote_overlay_${v.name}_tv_only.png`);
    });
    
  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
