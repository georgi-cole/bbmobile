#!/usr/bin/env node

/**
 * Startup Flow Screenshot Generation Script
 * 
 * Generates four screenshots showing the startup flow:
 * 1. intro-hub.png - Initial intro hub with background and buttons
 * 2. rules-modal.png - Rules modal opened from hub
 * 3. profile-modal.png - Profile modal opened from hub
 * 4. game-after-play.png - Game after Play pressed with cast present
 * 
 * Requires Puppeteer. Install with: npm install --save-dev puppeteer
 * 
 * Usage:
 *   node scripts/startup_flow_screenshots.mjs [--headless]
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if Puppeteer is available
let puppeteer;
try {
  puppeteer = await import('puppeteer');
  console.log('✓ Puppeteer loaded');
} catch (err) {
  console.error('✗ Puppeteer not installed');
  console.error('  Install with: npm install --save-dev puppeteer');
  console.error('  Or manually capture screenshots using browser DevTools');
  process.exit(1);
}

// Configuration
const CONFIG = {
  baseURL: 'http://localhost:8080', // Adjust if using different port
  outputDir: join(dirname(__dirname), 'screenshots', 'startup-flow'),
  viewport: {
    width: 1280,
    height: 800
  },
  headless: process.argv.includes('--headless') ? 'new' : false,
  screenshots: [
    {
      name: '1-intro-hub.png',
      description: 'Intro Hub initial state',
      waitFor: '#introScreen',
      action: null
    },
    {
      name: '2-rules-modal.png',
      description: 'Rules modal opened from hub',
      waitFor: '#introScreen',
      action: async (page) => {
        // Click Rules button
        await page.click('#intro-btn-rules');
        await page.waitForTimeout(500);
        // Wait for modal (try multiple selectors)
        try {
          await page.waitForSelector('.rules-modal, #rulesModal, [data-modal="rules"]', {
            visible: true,
            timeout: 2000
          });
        } catch (err) {
          console.warn('  Rules modal not found, screenshot may show placeholder');
        }
      }
    },
    {
      name: '3-profile-modal.png',
      description: 'Profile modal opened from hub',
      waitFor: '#introScreen',
      action: async (page) => {
        // Close any existing modals first
        try {
          await page.evaluate(() => {
            document.querySelectorAll('.modal, [data-modal]').forEach(modal => {
              modal.style.display = 'none';
            });
          });
        } catch {}
        
        await page.waitForTimeout(200);
        
        // Click Profile button
        await page.click('#intro-btn-profile');
        await page.waitForTimeout(500);
        // Wait for modal
        try {
          await page.waitForSelector('.profile-modal, #profileModal, [data-modal="profile"]', {
            visible: true,
            timeout: 2000
          });
        } catch (err) {
          console.warn('  Profile modal not found, screenshot may show placeholder');
        }
      }
    },
    {
      name: '4-game-after-play.png',
      description: 'Game after Play pressed',
      waitFor: '#introScreen',
      action: async (page) => {
        // Close any modals
        try {
          await page.evaluate(() => {
            document.querySelectorAll('.modal, [data-modal]').forEach(modal => {
              modal.style.display = 'none';
            });
          });
        } catch {}
        
        await page.waitForTimeout(200);
        
        // Click Play button
        console.log('  Clicking Play button...');
        await page.click('#intro-btn-play');
        
        // Wait for game to build (check for multiple indicators)
        console.log('  Waiting for game to build...');
        await page.waitForTimeout(1000);
        
        try {
          await page.waitForFunction(
            () => {
              // Check if main screen built or player tiles exist
              return document.body.classList.contains('main-screen-built') ||
                     document.querySelectorAll('.playerTile, .top-roster-tile:not(.placeholder-tile)').length > 0 ||
                     document.querySelector('#introScreen').style.display === 'none';
            },
            { timeout: 5000 }
          );
          console.log('  Game built successfully');
        } catch (err) {
          console.warn('  Game may not have fully built, capturing current state');
        }
        
        await page.waitForTimeout(1000);
      }
    }
  ]
};

// Utility: Ensure output directory exists
function ensureOutputDir() {
  if (!existsSync(CONFIG.outputDir)) {
    console.log(`Creating output directory: ${CONFIG.outputDir}`);
    mkdirSync(CONFIG.outputDir, { recursive: true });
  }
}

// Main screenshot capture function
async function captureScreenshots() {
  console.log('\n=== Startup Flow Screenshot Generation ===\n');
  console.log(`Output directory: ${CONFIG.outputDir}`);
  console.log(`Headless mode: ${CONFIG.headless ? 'yes' : 'no'}`);
  console.log('');

  ensureOutputDir();

  let browser;
  try {
    // Launch browser
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: CONFIG.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✓ Browser launched\n');

    const page = await browser.newPage();
    await page.setViewport(CONFIG.viewport);

    // Navigate to game
    console.log(`Navigating to ${CONFIG.baseURL}/index.html`);
    await page.goto(`${CONFIG.baseURL}/index.html`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    console.log('✓ Page loaded\n');

    // Wait for intro hub to appear (skip video or wait for it)
    console.log('Waiting for intro hub...');
    try {
      await page.waitForSelector('#introScreen', {
        visible: true,
        timeout: 15000
      });
      console.log('✓ Intro hub visible\n');
    } catch (err) {
      console.error('✗ Intro hub did not appear');
      console.error('  Make sure skipIntros setting is enabled or video completes');
      throw err;
    }

    // Capture each screenshot
    for (const screenshot of CONFIG.screenshots) {
      console.log(`Capturing: ${screenshot.name}`);
      console.log(`  Description: ${screenshot.description}`);

      // Wait for required element
      if (screenshot.waitFor) {
        await page.waitForSelector(screenshot.waitFor, {
          visible: true,
          timeout: 5000
        });
      }

      // Perform action if specified
      if (screenshot.action) {
        await screenshot.action(page);
      }

      // Capture screenshot
      const outputPath = join(CONFIG.outputDir, screenshot.name);
      await page.screenshot({
        path: outputPath,
        fullPage: false
      });
      console.log(`✓ Saved: ${outputPath}\n`);
    }

    console.log('=== Screenshot Generation Complete ===\n');
    console.log('Screenshots saved to:');
    CONFIG.screenshots.forEach(s => {
      console.log(`  - ${s.name}`);
    });
    console.log('');

  } catch (err) {
    console.error('\n✗ Error during screenshot capture:');
    console.error(err.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure local server is running on', CONFIG.baseURL);
    console.error('  2. Check that skipIntros setting is enabled in game config');
    console.error('  3. Verify all required DOM elements exist');
    console.error('  4. Try running with --headless flag to see browser interactions');
    throw err;
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
}

// Manual capture instructions (fallback if Puppeteer not available)
function printManualInstructions() {
  console.log('\n=== Manual Screenshot Capture Instructions ===\n');
  console.log('Since Puppeteer is not installed, capture screenshots manually:\n');
  console.log('1. Open index.html in your browser');
  console.log('2. Open browser DevTools (F12)');
  console.log('3. Set viewport to 1280x800 (Device Toolbar)');
  console.log('4. Capture screenshots at these stages:\n');
  
  CONFIG.screenshots.forEach((screenshot, index) => {
    console.log(`   ${index + 1}. ${screenshot.name}`);
    console.log(`      ${screenshot.description}`);
    if (screenshot.action) {
      console.log(`      Action: ${screenshot.action.toString().split('\n')[0]}`);
    }
    console.log('');
  });
  
  console.log(`5. Save screenshots to: ${CONFIG.outputDir}/\n`);
}

// Check if running as a server
async function checkServerRunning() {
  try {
    const response = await fetch(CONFIG.baseURL);
    return response.ok;
  } catch {
    return false;
  }
}

// Main execution
async function main() {
  // Check if local server is running
  console.log('Checking if local server is running...');
  const serverRunning = await checkServerRunning();
  
  if (!serverRunning) {
    console.error('\n✗ Local server not running at', CONFIG.baseURL);
    console.error('\nPlease start a local server first:');
    console.error('  Using Python: python -m http.server 8080');
    console.error('  Using Node: npx http-server -p 8080');
    console.error('  Using Live Server (VS Code): Open index.html and click "Go Live"\n');
    console.error('Then adjust CONFIG.baseURL in this script if needed.\n');
    process.exit(1);
  }
  
  console.log('✓ Server is running\n');

  try {
    await captureScreenshots();
    process.exit(0);
  } catch (err) {
    console.error('\nFailed to capture screenshots automatically');
    printManualInstructions();
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { captureScreenshots, printManualInstructions };
