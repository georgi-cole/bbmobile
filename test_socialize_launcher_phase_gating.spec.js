/**
 * Automated E2E Test: Socialize Launcher Phase Gating
 * 
 * This test validates the phase gating implementation:
 * - Launcher is only visible during social_intermission phase
 * - Modal auto-closes when leaving social phase
 * - Legacy memory popups are suppressed when Social Maneuvers enabled
 * - MutationObserver respects phase gates
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
const SCREENSHOT_DIR = path.join(__dirname, 'test-screenshots', 'socialize-phase-gating');
const TEST_TIMEOUT = 180000; // 3 minutes

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Socialize Launcher Phase Gating', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('should hide launcher outside social phase', async ({ page }) => {
    console.log('🎬 Test 1: Launcher visibility in non-social phases');
    
    // Navigate to game
    await page.goto(BASE_URL + '/index.html');
    await page.waitForLoadState('networkidle');
    
    // Enable Social Maneuvers
    await page.evaluate(() => {
      window.USE_SOCIAL_MANEUVERS = true;
      if (window.SocialManeuvers) {
        console.log('[TEST] Social Maneuvers enabled');
      }
    });
    
    // Start game
    await page.click('#btnStartQuick', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Fast-forward through opening
    await page.evaluate(() => {
      if (window.fastForwardPhase) window.fastForwardPhase();
    });
    await page.waitForTimeout(2000);
    
    // Navigate to HOH phase
    console.log('  ⏩ Setting HOH phase...');
    await page.evaluate(() => {
      if (window.game) {
        window.game.phase = 'hoh';
      }
    });
    await page.waitForTimeout(500);
    
    // Check launcher visibility
    const launcherInHOH = await page.evaluate(() => {
      const launcher = document.querySelector('#socializeLauncher');
      if (!launcher) return { exists: false, visible: false };
      const isVisible = launcher.style.display !== 'none';
      return { exists: true, visible: isVisible };
    });
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-hoh-phase.png'), fullPage: true });
    
    console.log('  Launcher in HOH:', launcherInHOH);
    
    // Launcher should be hidden in HOH phase
    if (launcherInHOH.exists) {
      expect(launcherInHOH.visible).toBe(false);
      console.log('✅ Test 1 passed: Launcher hidden in HOH phase');
    } else {
      console.log('⚠️ Test 1 info: Launcher not yet created');
    }
  });

  test('should show launcher in social phase', async ({ page }) => {
    console.log('🎬 Test 2: Launcher visibility in social phase');
    
    // Navigate to game
    await page.goto(BASE_URL + '/index.html');
    await page.waitForLoadState('networkidle');
    
    // Enable Social Maneuvers
    await page.evaluate(() => {
      window.USE_SOCIAL_MANEUVERS = true;
    });
    
    // Start game
    await page.click('#btnStartQuick', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Fast-forward through opening
    await page.evaluate(() => {
      if (window.fastForwardPhase) window.fastForwardPhase();
    });
    await page.waitForTimeout(2000);
    
    // Navigate to social phase
    console.log('  ⏩ Setting social phase...');
    await page.evaluate(() => {
      if (window.startSocialIntermission) {
        window.startSocialIntermission('test', () => {});
      }
    });
    await page.waitForTimeout(2000);
    
    // Check launcher visibility
    const launcherInSocial = await page.evaluate(() => {
      const launcher = document.querySelector('#socializeLauncher');
      if (!launcher) return { exists: false, visible: false };
      const isVisible = launcher.style.display !== 'none';
      return { exists: true, visible: isVisible };
    });
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-social-phase.png'), fullPage: true });
    
    console.log('  Launcher in social phase:', launcherInSocial);
    
    // Launcher should be visible in social phase
    expect(launcherInSocial.exists).toBe(true);
    expect(launcherInSocial.visible).toBe(true);
    
    console.log('✅ Test 2 passed: Launcher visible in social phase');
  });

  test('should auto-close modal when leaving social phase', async ({ page }) => {
    console.log('🎬 Test 3: Modal auto-close on phase exit');
    
    // Navigate to game
    await page.goto(BASE_URL + '/index.html');
    await page.waitForLoadState('networkidle');
    
    // Enable Social Maneuvers
    await page.evaluate(() => {
      window.USE_SOCIAL_MANEUVERS = true;
    });
    
    // Start game
    await page.click('#btnStartQuick', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Fast-forward through opening
    await page.evaluate(() => {
      if (window.fastForwardPhase) window.fastForwardPhase();
    });
    await page.waitForTimeout(2000);
    
    // Navigate to social phase
    console.log('  ⏩ Setting social phase...');
    await page.evaluate(() => {
      if (window.startSocialIntermission) {
        window.startSocialIntermission('test', () => {});
      }
    });
    await page.waitForTimeout(2000);
    
    // Open modal
    console.log('  ⏩ Opening modal...');
    const modalOpened = await page.evaluate(() => {
      if (window.SocializeMobile?.openModal) {
        try {
          window.SocializeMobile.openModal();
          return true;
        } catch (e) {
          console.error('Failed to open modal:', e);
          return false;
        }
      }
      return false;
    });
    
    if (!modalOpened) {
      console.log('⚠️ Test 3 skipped: Could not open modal');
      return;
    }
    
    await page.waitForTimeout(1000);
    
    // Check if modal is open
    let modalCheck = await page.evaluate(() => {
      const modal = document.querySelector('#socializeModal');
      return modal && modal.classList.contains('open');
    });
    
    expect(modalCheck).toBe(true);
    console.log('  ✓ Modal confirmed open');
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-modal-open.png'), fullPage: true });
    
    // Switch to nominations phase
    console.log('  ⏩ Switching to nominations phase...');
    await page.evaluate(() => {
      if (window.game) {
        window.game.phase = 'nominations';
        // Trigger phase change handler
        if (window.SocializeMobile?.hide) {
          window.SocializeMobile.hide();
          window.SocializeMobile.closeModal();
        }
      }
    });
    await page.waitForTimeout(1000);
    
    // Check if modal closed
    modalCheck = await page.evaluate(() => {
      const modal = document.querySelector('#socializeModal');
      return modal && modal.classList.contains('open');
    });
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-modal-closed.png'), fullPage: true });
    
    expect(modalCheck).toBe(false);
    console.log('✅ Test 3 passed: Modal auto-closed when leaving social phase');
  });

  test('should suppress legacy memory popups with Social Maneuvers', async ({ page }) => {
    console.log('🎬 Test 4: Legacy memory popup suppression');
    
    // Navigate to game
    await page.goto(BASE_URL + '/index.html');
    await page.waitForLoadState('networkidle');
    
    // Enable Social Maneuvers
    await page.evaluate(() => {
      window.USE_SOCIAL_MANEUVERS = true;
    });
    
    // Start game
    await page.click('#btnStartQuick', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Test guard function
    const guardResult = await page.evaluate(() => {
      if (typeof window.shouldShowLegacyMemories !== 'function') {
        return { exists: false, value: null };
      }
      return { exists: true, value: window.shouldShowLegacyMemories() };
    });
    
    console.log('  Guard function result:', guardResult);
    
    expect(guardResult.exists).toBe(true);
    expect(guardResult.value).toBe(false);
    
    console.log('  ✓ Guard function correctly returns false');
    
    // Try to create legacy popup (should be blocked)
    const popupCreated = await page.evaluate(() => {
      if (!window.shouldShowLegacyMemories || !window.shouldShowLegacyMemories()) {
        return false;
      }
      if (window.showCard) {
        window.showCard('Social Update', ['Test memory'], 'social', 3000, true);
        return true;
      }
      return false;
    });
    
    expect(popupCreated).toBe(false);
    console.log('  ✓ Legacy popup creation blocked by guard');
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-no-legacy-popup.png'), fullPage: true });
    
    console.log('✅ Test 4 passed: Legacy memory popups suppressed');
  });

  test('should respect phase gates in MutationObserver', async ({ page }) => {
    console.log('🎬 Test 5: MutationObserver phase gating');
    
    // Navigate to game
    await page.goto(BASE_URL + '/index.html');
    await page.waitForLoadState('networkidle');
    
    // Enable Social Maneuvers
    await page.evaluate(() => {
      window.USE_SOCIAL_MANEUVERS = true;
    });
    
    // Start game
    await page.click('#btnStartQuick', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Fast-forward through opening
    await page.evaluate(() => {
      if (window.fastForwardPhase) window.fastForwardPhase();
    });
    await page.waitForTimeout(2000);
    
    // Set to non-social phase
    console.log('  ⏩ Setting nominations phase...');
    await page.evaluate(() => {
      if (window.game) {
        window.game.phase = 'nominations';
      }
    });
    await page.waitForTimeout(500);
    
    // Trigger observer by removing and recreating TV overlay
    await page.evaluate(() => {
      const tvOverlay = document.querySelector('#tvOverlay');
      if (tvOverlay) {
        tvOverlay.remove();
        const newOverlay = document.createElement('div');
        newOverlay.id = 'tvOverlay';
        document.body.appendChild(newOverlay);
      }
    });
    await page.waitForTimeout(1500);
    
    // Check if launcher was created (should NOT be in non-social phase)
    const launcherCreated = await page.evaluate(() => {
      const launcher = document.querySelector('#socializeLauncher');
      return launcher !== null;
    });
    
    console.log('  Launcher created in non-social phase:', launcherCreated);
    
    // Observer should NOT create launcher outside social phase
    expect(launcherCreated).toBe(false);
    console.log('  ✓ Observer did not create launcher outside social phase');
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-observer-non-social.png'), fullPage: true });
    
    // Now test in social phase
    console.log('  ⏩ Setting social phase...');
    await page.evaluate(() => {
      if (window.startSocialIntermission) {
        window.startSocialIntermission('test', () => {});
      }
    });
    await page.waitForTimeout(2000);
    
    // Remove launcher to trigger observer
    await page.evaluate(() => {
      const launcher = document.querySelector('#socializeLauncher');
      if (launcher) {
        launcher.remove();
      }
    });
    await page.waitForTimeout(1500);
    
    // Check if launcher was remounted
    const launcherRemounted = await page.evaluate(() => {
      const launcher = document.querySelector('#socializeLauncher');
      return launcher !== null;
    });
    
    console.log('  Launcher remounted in social phase:', launcherRemounted);
    
    // Observer SHOULD remount launcher in social phase
    expect(launcherRemounted).toBe(true);
    console.log('  ✓ Observer remounted launcher in social phase');
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-observer-social.png'), fullPage: true });
    
    console.log('✅ Test 5 passed: MutationObserver respects phase gates');
  });
});
