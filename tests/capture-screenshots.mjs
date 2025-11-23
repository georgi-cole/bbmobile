// Simple screenshot capture script for inline TV cards
// Usage: node tests/capture-screenshots.mjs

import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureScreenshots() {
  console.log('Starting screenshot capture...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 900 }
  });

  try {
    // Navigate to test page
    const testUrl = `file://${path.join(__dirname, '..', 'test_tv_inline_cards.html')}`;
    console.log(`Navigating to: ${testUrl}`);
    await page.goto(testUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Screenshot 1: Basic card
    console.log('Capturing basic card...');
    await page.click('#btnBasicCard');
    await page.waitForSelector('.tv-inline-card', { timeout: 3000 });
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'inline-card-basic.png'),
      fullPage: false
    });
    console.log('✓ Saved inline-card-basic.png');
    await page.waitForTimeout(3500); // Let card auto-dismiss

    // Screenshot 2: Decision card
    console.log('Capturing decision card...');
    await page.click('#btnDecisionCard');
    await page.waitForSelector('.tv-inline-card', { timeout: 3000 });
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'inline-card-decision.png'),
      fullPage: false
    });
    console.log('✓ Saved inline-card-decision.png');
    
    // Dismiss using ESC key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Screenshot 3: Avatar card
    console.log('Capturing avatar card...');
    await page.click('#btnAvatarCard');
    await page.waitForSelector('.tv-inline-card', { timeout: 3000 });
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'inline-card-avatars.png'),
      fullPage: false
    });
    console.log('✓ Saved inline-card-avatars.png');

    console.log('\nAll screenshots captured successfully!');
    console.log(`Screenshots saved to: ${path.join(__dirname, 'screenshots')}`);

  } catch (error) {
    console.error('Error capturing screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(err => {
  console.error('Failed to capture screenshots:', err);
  process.exit(1);
});
