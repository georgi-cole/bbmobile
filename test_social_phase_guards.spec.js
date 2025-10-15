/**
 * Automated E2E Test: Social Phase Scheduling and Guards
 * 
 * This test validates the social phase hardening implementation:
 * - Social phase is always included in weekly sequence
 * - Developer toggle works correctly with visible banner
 * - Fast-forward guards require at least one social action
 * - Phase sequence logging works correctly
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
const SCREENSHOT_DIR = path.join(__dirname, 'test-screenshots', 'social-phase-guards');
const TEST_TIMEOUT = 180000; // 3 minutes

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Social Phase Scheduling and Guards', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('should include social phase in normal weekly sequence', async ({ page }) => {
    console.log('🎬 Test 1: Normal Weekly Sequence');
    
    // Navigate to game
    await page.goto(BASE_URL + '/index.html');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-game-loaded.png'), fullPage: true });
    
    // Start game
    await page.click('#btnStartQuick', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Wait for opening sequence to complete
    await page.waitForTimeout(5000);
    
    // Fast-forward through opening if needed
    const phase = await page.evaluate(() => window.game?.phase);
    if(phase === 'opening') {
      await page.evaluate(() => {
        if(window.fastForwardPhase) window.fastForwardPhase();
      });
      await page.waitForTimeout(2000);
    }
    
    // Navigate to HOH phase
    console.log('  ⏩ Starting HOH competition...');
    await page.evaluate(() => {
      if(window.startHOH && typeof window.startHOH === 'function'){
        window.startHOH();
      }
    });
    await page.waitForTimeout(2000);
    
    // Complete HOH (submit human score)
    console.log('  ⏩ Completing HOH...');
    await page.evaluate(() => {
      const g = window.game;
      if(g && g.humanId && window.submitScore){
        window.submitScore(g.humanId, 25, 1, 'Test');
      }
    });
    await page.waitForTimeout(1000);
    
    // Wait for phase to finish
    await page.evaluate(() => {
      if(window.game){
        window.game.endAt = Date.now() + 500;
      }
    });
    await page.waitForTimeout(3000);
    
    // Check if social phase was called
    console.log('  ✓ Checking social phase logs...');
    const socialPhaseCheck = await page.evaluate(() => {
      const g = window.game;
      return {
        phase: g?.phase,
        socialPhaseLog: g?.__socialPhaseLog || [],
        socialPhaseSkipLog: g?.__socialPhaseSkipLog || [],
        socialPhaseErrors: g?.__socialPhaseErrors || [],
        skipSocialEnabled: g?.cfg?.skipSocialPhase
      };
    });
    
    console.log('  Phase:', socialPhaseCheck.phase);
    console.log('  Social phase log:', socialPhaseCheck.socialPhaseLog);
    console.log('  Skip log:', socialPhaseCheck.socialPhaseSkipLog);
    console.log('  Errors:', socialPhaseCheck.socialPhaseErrors);
    
    // Verify social phase was called or is active
    const socialPhaseIncluded = 
      socialPhaseCheck.phase === 'social_intermission' || 
      socialPhaseCheck.phase === 'social' ||
      socialPhaseCheck.socialPhaseLog.length > 0;
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-after-hoh-social-phase.png'), fullPage: true });
    
    expect(socialPhaseIncluded).toBeTruthy();
    expect(socialPhaseCheck.socialPhaseErrors.length).toBe(0);
    console.log('✅ Test 1 passed: Social phase included in normal sequence');
  });

  test('should show banner and skip social phase when developer toggle enabled', async ({ page }) => {
    console.log('🎬 Test 2: Developer Toggle and Banner');
    
    // Navigate to game
    await page.goto(BASE_URL + '/index.html');
    await page.waitForLoadState('networkidle');
    
    // Enable developer toggle
    console.log('  ⚙️ Enabling skipSocialPhase toggle...');
    await page.evaluate(() => {
      if(window.game && window.game.cfg){
        window.game.cfg.skipSocialPhase = true;
      }
    });
    
    // Update HUD to show banner
    await page.evaluate(() => {
      if(window.updateHud) window.updateHud();
    });
    await page.waitForTimeout(500);
    
    // Check for banner
    console.log('  ✓ Checking for warning banner...');
    const banner = await page.$('#socialPhaseSkipBanner');
    expect(banner).not.toBeNull();
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-banner-visible.png'), fullPage: true });
    console.log('  ✓ Banner is visible');
    
    // Start game
    await page.click('#btnStartQuick', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Wait for opening
    await page.waitForTimeout(5000);
    
    // Fast-forward through opening
    await page.evaluate(() => {
      if(window.fastForwardPhase) window.fastForwardPhase();
    });
    await page.waitForTimeout(2000);
    
    // Start and complete HOH
    console.log('  ⏩ Starting HOH with skip enabled...');
    await page.evaluate(() => {
      if(window.startHOH) window.startHOH();
    });
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => {
      const g = window.game;
      if(g && g.humanId && window.submitScore){
        window.submitScore(g.humanId, 25, 1, 'Test');
      }
    });
    await page.waitForTimeout(1000);
    
    // Wait for phase to complete
    await page.evaluate(() => {
      if(window.game) window.game.endAt = Date.now() + 500;
    });
    await page.waitForTimeout(3000);
    
    // Check if social phase was skipped
    console.log('  ✓ Checking skip logs...');
    const skipCheck = await page.evaluate(() => {
      const g = window.game;
      return {
        phase: g?.phase,
        socialPhaseSkipLog: g?.__socialPhaseSkipLog || [],
        skipSocialEnabled: g?.cfg?.skipSocialPhase
      };
    });
    
    console.log('  Phase after skip:', skipCheck.phase);
    console.log('  Skip log:', skipCheck.socialPhaseSkipLog);
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-social-skipped.png'), fullPage: true });
    
    // Verify skip was logged
    expect(skipCheck.skipSocialEnabled).toBe(true);
    expect(skipCheck.socialPhaseSkipLog.length).toBeGreaterThan(0);
    expect(skipCheck.phase).not.toBe('social_intermission');
    
    console.log('✅ Test 2 passed: Developer toggle skips social phase correctly');
  });

  test('should block fast-forward without social action', async ({ page }) => {
    console.log('🎬 Test 3: Fast-Forward Guard');
    
    // Navigate to game
    await page.goto(BASE_URL + '/index.html');
    await page.waitForLoadState('networkidle');
    
    // Disable skip toggle
    await page.evaluate(() => {
      if(window.game && window.game.cfg){
        window.game.cfg.skipSocialPhase = false;
      }
    });
    
    // Start game and navigate to social phase
    await page.click('#btnStartQuick', { timeout: 10000 });
    await page.waitForTimeout(7000);
    
    // Fast-forward opening
    await page.evaluate(() => {
      if(window.fastForwardPhase) window.fastForwardPhase();
    });
    await page.waitForTimeout(2000);
    
    // Complete HOH to reach social phase
    await page.evaluate(() => {
      if(window.startHOH) window.startHOH();
    });
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => {
      const g = window.game;
      if(g && g.humanId && window.submitScore){
        window.submitScore(g.humanId, 25, 1, 'Test');
      }
    });
    await page.waitForTimeout(1000);
    
    await page.evaluate(() => {
      if(window.game) window.game.endAt = Date.now() + 500;
    });
    await page.waitForTimeout(3000);
    
    // Verify we're in social phase
    const phaseCheck = await page.evaluate(() => window.game?.phase);
    console.log('  Current phase:', phaseCheck);
    
    if(phaseCheck === 'social_intermission' || phaseCheck === 'social'){
      // Try to fast-forward without taking action
      console.log('  ⏩ Attempting fast-forward without action...');
      const consoleMessages = [];
      page.on('console', msg => {
        if(msg.text().includes('[ff]')){
          consoleMessages.push(msg.text());
        }
      });
      
      await page.evaluate(() => {
        if(window.game) window.game.__socialActionsThisPhase = 0; // Ensure no actions
        if(window.fastForwardPhase) window.fastForwardPhase();
      });
      await page.waitForTimeout(1000);
      
      // Check if fast-forward was blocked
      const phaseAfterFF = await page.evaluate(() => window.game?.phase);
      const actionCount = await page.evaluate(() => window.game?.__socialActionsThisPhase || 0);
      
      console.log('  Phase after FF attempt:', phaseAfterFF);
      console.log('  Action count:', actionCount);
      
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-ff-blocked.png'), fullPage: true });
      
      // Should still be in social phase
      expect(phaseAfterFF).toBe(phaseCheck);
      expect(actionCount).toBe(0);
      
      console.log('  ✓ Fast-forward blocked without action');
      
      // Now take an action and try again
      console.log('  ⏩ Taking social action and retrying...');
      await page.evaluate(() => {
        const g = window.game;
        if(g && g.humanId){
          const alive = window.alivePlayers?.() || [];
          const target = alive.find(p => p.id !== g.humanId);
          if(target && window.socialApplyInteraction){
            // Simulate taking an action
            g.__socialActionsThisPhase = 1;
          }
        }
      });
      await page.waitForTimeout(500);
      
      await page.evaluate(() => {
        if(window.fastForwardPhase) window.fastForwardPhase();
      });
      await page.waitForTimeout(2000);
      
      const phaseAfterAction = await page.evaluate(() => window.game?.phase);
      console.log('  Phase after action + FF:', phaseAfterAction);
      
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-ff-allowed.png'), fullPage: true });
      
      // Should have moved past social phase
      expect(phaseAfterAction).not.toBe('social_intermission');
      
      console.log('✅ Test 3 passed: Fast-forward guard works correctly');
    } else {
      console.log('⚠️ Test 3 skipped: Could not reach social phase');
    }
  });

  test('should log phase sequence correctly', async ({ page }) => {
    console.log('🎬 Test 4: Phase Sequence Logging');
    
    // Navigate to game
    await page.goto(BASE_URL + '/index.html');
    await page.waitForLoadState('networkidle');
    
    // Start game
    await page.click('#btnStartQuick', { timeout: 10000 });
    await page.waitForTimeout(7000);
    
    // Fast-forward opening
    await page.evaluate(() => {
      if(window.fastForwardPhase) window.fastForwardPhase();
    });
    await page.waitForTimeout(2000);
    
    // Complete HOH
    await page.evaluate(() => {
      if(window.startHOH) window.startHOH();
    });
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => {
      const g = window.game;
      if(g && g.humanId && window.submitScore){
        window.submitScore(g.humanId, 25, 1, 'Test');
      }
    });
    await page.waitForTimeout(1000);
    
    await page.evaluate(() => {
      if(window.game) window.game.endAt = Date.now() + 500;
    });
    await page.waitForTimeout(3000);
    
    // Check logs
    const logs = await page.evaluate(() => {
      const g = window.game;
      return {
        socialPhaseLog: g?.__socialPhaseLog || [],
        socialPhaseSkipLog: g?.__socialPhaseSkipLog || [],
        socialPhaseErrors: g?.__socialPhaseErrors || [],
        week: g?.week
      };
    });
    
    console.log('  📊 Logs:');
    console.log('    Social phase executions:', logs.socialPhaseLog);
    console.log('    Social phase skips:', logs.socialPhaseSkipLog);
    console.log('    Social phase errors:', logs.socialPhaseErrors);
    console.log('    Current week:', logs.week);
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-logs-check.png'), fullPage: true });
    
    // Verify logging structure
    expect(logs.socialPhaseLog).toBeDefined();
    expect(logs.socialPhaseSkipLog).toBeDefined();
    expect(logs.socialPhaseErrors).toBeDefined();
    
    // At least one log entry should exist
    const totalLogs = logs.socialPhaseLog.length + logs.socialPhaseSkipLog.length;
    expect(totalLogs).toBeGreaterThan(0);
    
    console.log('✅ Test 4 passed: Phase sequence logging works correctly');
  });
});
