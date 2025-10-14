#!/usr/bin/env node

/**
 * Automated Screenshot Capture Script
 * Uses Playwright to run the test and capture actual screenshots
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:8090';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-screenshots', 'social-maneuvers');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function captureScreenshots() {
  console.log('🎬 Starting automated screenshot capture...');
  
  let browser;
  try {
    // Launch browser
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    
    console.log('📍 Loading test page...');
    await page.goto(`${BASE_URL}/test_game_progression_social_automated.html`);
    await page.waitForLoadState('networkidle');
    
    // Screenshot 1: Initial page load
    console.log('📸 Capturing: 01-game-loaded.png');
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '01-game-loaded.png'),
      fullPage: true 
    });
    
    // Click "Run Full Test" button
    console.log('🚀 Running full test...');
    await page.click('#btnRunFull');
    
    // Wait a moment for test to start
    await page.waitForTimeout(2000);
    
    // Screenshot 2: Test started
    console.log('📸 Capturing: 02-test-started.png');
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '02-test-started.png'),
      fullPage: true 
    });
    
    // Wait for each phase to complete and capture screenshots
    const phases = [
      { name: 'intermission', label: 'Intermission' },
      { name: 'hoh', label: 'HOH' },
      { name: 'nominations', label: 'Nominations' },
      { name: 'veto_comp', label: 'Veto Competition' },
      { name: 'veto_meeting', label: 'Veto Meeting' },
      { name: 'eviction', label: 'Eviction' },
      { name: 'social_intermission', label: 'Social Phase' }
    ];
    
    // Wait for phases to progress
    for (let i = 0; i < phases.length; i++) {
      await page.waitForTimeout(2000);
      console.log(`📸 Capturing: 03-phase-${phases[i].name}.png`);
      await page.screenshot({ 
        path: path.join(SCREENSHOT_DIR, `03-phase-${phases[i].name}.png`),
        fullPage: true 
      });
    }
    
    // Wait for test to complete
    await page.waitForTimeout(3000);
    
    // Screenshot: Social phase start
    console.log('📸 Capturing: 04-social-phase-start.png');
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '04-social-phase-start.png'),
      fullPage: true 
    });
    
    // Screenshot: Full UI
    console.log('📸 Capturing: 05-social-ui-full.png');
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '05-social-ui-full.png'),
      fullPage: true 
    });
    
    // Screenshot: Panel only (if exists)
    const panel = await page.$('#panel');
    if (panel) {
      console.log('📸 Capturing: 05-social-ui-panel.png');
      await panel.screenshot({ 
        path: path.join(SCREENSHOT_DIR, '05-social-ui-panel.png')
      });
    }
    
    // Screenshot: Final state
    console.log('📸 Capturing: 06-final-state.png');
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '06-final-state.png'),
      fullPage: true 
    });
    
    console.log('✅ Screenshot capture complete!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOT_DIR}`);
    
    // List captured screenshots
    const files = fs.readdirSync(SCREENSHOT_DIR);
    console.log('\n📸 Captured screenshots:');
    files.forEach(file => {
      if (file.endsWith('.png')) {
        const stats = fs.statSync(path.join(SCREENSHOT_DIR, file));
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`  ✓ ${file} (${sizeKB} KB)`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the script
captureScreenshots()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
