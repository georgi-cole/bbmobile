/**
 * Automated E2E Test: Socialize Launcher Auto-Remount
 * 
 * This test validates the launcher auto-remount implementation:
 * - Launcher is mounted during social_intermission phase
 * - Launcher is re-mounted if removed from DOM
 * - No duplicate launchers appear
 * - Observer lifecycle logs appear in console
 * 
 * Requirements:
 * - Playwright installed
 * - Local server running (e.g., python -m http.server 8080)
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const SCREENSHOT_DIR = path.join(__dirname, 'test-screenshots', 'launcher-auto-remount');
const TEST_TIMEOUT = 120000; // 2 minutes

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Socialize Launcher Auto-Remount', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('should auto-mount launcher during social phase', async ({ page }) => {
    console.log('🎬 Test 1: Auto-mount during social phase');
    
    // Capture console logs
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[social-launcher]') || text.includes('[social]')) {
        consoleLogs.push(text);
      }
    });
    
    // Navigate to game
    await page.goto(BASE_URL + '/index.html');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-game-loaded.png'), fullPage: true });
    
    // Start game
    await page.click('#btnStartQuick', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Enable Social Maneuvers if needed
    await page.evaluate(() => {
      if (window.game && window.game.cfg) {
        window.game.cfg.enableSocialManeuvers = true;
      }
    });
    
    // Navigate directly to social intermission
    console.log('  ⏩ Starting social intermission...');
    await page.evaluate(() => {
      if (window.startSocialIntermission && typeof window.startSocialIntermission === 'function') {
        window.startSocialIntermission();
      }
    });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-social-phase-started.png'), fullPage: true });
    
    // Verify launcher exists
    const launcherExists = await page.evaluate(() => {
      return document.querySelector('#socializeLauncher, .socialize-launcher, [data-sm-launcher]') !== null;
    });
    
    console.log(`  ✓ Launcher exists: ${launcherExists}`);
    expect(launcherExists).toBe(true);
    
    // Verify observer started log
    const observerStarted = consoleLogs.some(log => log.includes('[social-launcher] observer started'));
    console.log(`  ✓ Observer started log found: ${observerStarted}`);
    expect(observerStarted).toBe(true);
    
    // Check for duplicate launchers
    const launcherCount = await page.evaluate(() => {
      return document.querySelectorAll('#socializeLauncher, .socialize-launcher, [data-sm-launcher]').length;
    });
    
    console.log(`  ✓ Launcher count: ${launcherCount}`);
    expect(launcherCount).toBe(1);
  });

  test('should re-mount launcher after removal', async ({ page }) => {
    console.log('🎬 Test 2: Re-mount after removal');
    
    // Capture console logs
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[social-launcher]') || text.includes('[social]')) {
        consoleLogs.push(text);
      }
    });
    
    // Navigate to game
    await page.goto(BASE_URL + '/index.html');
    await page.waitForLoadState('networkidle');
    
    // Start game
    await page.click('#btnStartQuick', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Enable Social Maneuvers
    await page.evaluate(() => {
      if (window.game && window.game.cfg) {
        window.game.cfg.enableSocialManeuvers = true;
      }
    });
    
    // Navigate to social intermission
    console.log('  ⏩ Starting social intermission...');
    await page.evaluate(() => {
      if (window.startSocialIntermission && typeof window.startSocialIntermission === 'function') {
        window.startSocialIntermission();
      }
    });
    await page.waitForTimeout(3000);
    
    // Verify launcher exists initially
    let launcherExists = await page.evaluate(() => {
      return document.querySelector('#socializeLauncher, .socialize-launcher, [data-sm-launcher]') !== null;
    });
    console.log(`  ✓ Launcher exists initially: ${launcherExists}`);
    expect(launcherExists).toBe(true);
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-before-removal.png'), fullPage: true });
    
    // Remove the launcher manually
    console.log('  🗑️ Removing launcher...');
    await page.evaluate(() => {
      const launcher = document.querySelector('#socializeLauncher, .socialize-launcher, [data-sm-launcher]');
      if (launcher) {
        launcher.remove();
      }
    });
    
    await page.waitForTimeout(500);
    
    // Verify launcher was removed
    launcherExists = await page.evaluate(() => {
      return document.querySelector('#socializeLauncher, .socialize-launcher, [data-sm-launcher]') !== null;
    });
    console.log(`  ✓ Launcher removed: ${!launcherExists}`);
    expect(launcherExists).toBe(false);
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-after-removal.png'), fullPage: true });
    
    // Wait for observer to detect and re-mount (up to 2 seconds)
    console.log('  ⏳ Waiting for re-mount...');
    await page.waitForTimeout(1000);
    
    // Verify launcher was re-mounted
    launcherExists = await page.evaluate(() => {
      return document.querySelector('#socializeLauncher, .socialize-launcher, [data-sm-launcher]') !== null;
    });
    console.log(`  ✓ Launcher re-mounted: ${launcherExists}`);
    expect(launcherExists).toBe(true);
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-after-remount.png'), fullPage: true });
    
    // Verify re-mount log
    const remountLog = consoleLogs.some(log => log.includes('[social-launcher] re-mounted after DOM change'));
    console.log(`  ✓ Re-mount log found: ${remountLog}`);
    expect(remountLog).toBe(true);
    
    // Verify no duplicates
    const launcherCount = await page.evaluate(() => {
      return document.querySelectorAll('#socializeLauncher, .socialize-launcher, [data-sm-launcher]').length;
    });
    console.log(`  ✓ Launcher count after re-mount: ${launcherCount}`);
    expect(launcherCount).toBe(1);
  });

  test('should cleanup observer on phase end', async ({ page }) => {
    console.log('🎬 Test 3: Observer cleanup on phase end');
    
    // Capture console logs
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[social-launcher]') || text.includes('[social]')) {
        consoleLogs.push(text);
      }
    });
    
    // Navigate to game
    await page.goto(BASE_URL + '/index.html');
    await page.waitForLoadState('networkidle');
    
    // Start game
    await page.click('#btnStartQuick', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Enable Social Maneuvers
    await page.evaluate(() => {
      if (window.game && window.game.cfg) {
        window.game.cfg.enableSocialManeuvers = true;
      }
    });
    
    // Navigate to social intermission
    console.log('  ⏩ Starting social intermission...');
    await page.evaluate(() => {
      if (window.startSocialIntermission && typeof window.startSocialIntermission === 'function') {
        window.startSocialIntermission();
      }
    });
    await page.waitForTimeout(3000);
    
    // Verify observer started
    const observerStarted = consoleLogs.some(log => log.includes('[social-launcher] observer started'));
    console.log(`  ✓ Observer started: ${observerStarted}`);
    expect(observerStarted).toBe(true);
    
    // End the phase by fast-forwarding time
    console.log('  ⏩ Ending social phase...');
    await page.evaluate(() => {
      if (window.game) {
        window.game.endAt = Date.now() + 100;
      }
    });
    await page.waitForTimeout(2000);
    
    // Verify observer stopped log
    const observerStopped = consoleLogs.some(log => log.includes('[social-launcher] observer stopped'));
    console.log(`  ✓ Observer stopped: ${observerStopped}`);
    expect(observerStopped).toBe(true);
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-observer-cleanup.png'), fullPage: true });
  });

  test('should handle overlay rebuild gracefully', async ({ page }) => {
    console.log('🎬 Test 4: Handle overlay rebuild');
    
    // Capture console logs
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[social-launcher]') || text.includes('[social]')) {
        consoleLogs.push(text);
      }
    });
    
    // Navigate to game
    await page.goto(BASE_URL + '/index.html');
    await page.waitForLoadState('networkidle');
    
    // Start game
    await page.click('#btnStartQuick', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Enable Social Maneuvers
    await page.evaluate(() => {
      if (window.game && window.game.cfg) {
        window.game.cfg.enableSocialManeuvers = true;
      }
    });
    
    // Navigate to social intermission
    console.log('  ⏩ Starting social intermission...');
    await page.evaluate(() => {
      if (window.startSocialIntermission && typeof window.startSocialIntermission === 'function') {
        window.startSocialIntermission();
      }
    });
    await page.waitForTimeout(3000);
    
    // Verify launcher exists
    let launcherExists = await page.evaluate(() => {
      return document.querySelector('#socializeLauncher, .socialize-launcher, [data-sm-launcher]') !== null;
    });
    console.log(`  ✓ Launcher exists initially: ${launcherExists}`);
    expect(launcherExists).toBe(true);
    
    // Simulate overlay rebuild by removing and recreating tvOverlay
    console.log('  🔄 Simulating overlay rebuild...');
    await page.evaluate(() => {
      const tvOverlay = document.getElementById('tvOverlay');
      if (tvOverlay) {
        // Store parent
        const parent = tvOverlay.parentNode;
        // Remove overlay (this should also remove launcher)
        tvOverlay.remove();
        // Re-create overlay
        const newOverlay = document.createElement('div');
        newOverlay.id = 'tvOverlay';
        newOverlay.className = 'tvOverlay';
        parent.appendChild(newOverlay);
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Verify launcher was re-mounted after overlay rebuild
    launcherExists = await page.evaluate(() => {
      return document.querySelector('#socializeLauncher, .socialize-launcher, [data-sm-launcher]') !== null;
    });
    console.log(`  ✓ Launcher re-mounted after overlay rebuild: ${launcherExists}`);
    expect(launcherExists).toBe(true);
    
    // Verify no duplicates
    const launcherCount = await page.evaluate(() => {
      return document.querySelectorAll('#socializeLauncher, .socialize-launcher, [data-sm-launcher]').length;
    });
    console.log(`  ✓ Launcher count: ${launcherCount}`);
    expect(launcherCount).toBe(1);
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-after-overlay-rebuild.png'), fullPage: true });
  });
});
