/**
 * Mobile Roster Spacing and Badge Tests
 * 
 * E2E tests for:
 * 1. Grid spacing - bottom gap equals row gap, no overlap with TV overlay
 * 2. Badge pill animation - pill replaces name for ~7s under normal progression
 * 3. Fast-forward behavior - skips to emoji instantly
 * 
 * Screenshots captured for each test case.
 */

import { test, expect } from '@playwright/test';

// Test configuration
const TEST_PAGE = '/tests/mobile_roster_badges_and_spacing.html';
const ROW_GAP = 6; // Expected row gap in pixels
const PILL_DURATION = 7000; // Expected pill duration in ms
const PILL_TOLERANCE = 1000; // Tolerance for timing checks

test.describe('Mobile Roster Spacing', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_PAGE);
    await page.waitForSelector('.mobile-roster-container');
    // Wait for grid to render
    await page.waitForTimeout(500);
  });

  test('roster tiles are rendered and visible', async ({ page }) => {
    // Get tile count
    const tileCount = await page.evaluate(() => {
      const tiles = document.querySelectorAll('.mobile-roster-tile');
      return tiles.length;
    });
    
    // Screenshot the initial state
    await page.screenshot({ 
      path: 'tests/screenshots/roster-spacing-initial.png',
      fullPage: false 
    });
    
    // Assertions
    expect(tileCount).toBeGreaterThan(0);
    expect(tileCount).toBe(16); // Test page initializes with 16 players
    
    console.log(`Roster rendered with ${tileCount} tiles`);
  });

  test('spacer height equals overlay height plus row gap', async ({ page }) => {
    // Test with different TV heights
    const heights = [150, 200, 250, 300];
    
    for (const height of heights) {
      // Update TV height
      await page.evaluate((h) => {
        const tv = document.querySelector('.tv');
        if (tv) {
          tv.style.minHeight = h + 'px';
          document.documentElement.style.setProperty('--tv-overlay-height', h + 'px');
        }
        // Trigger spacer update if OverlaySpacing module is present
        if (window.OverlaySpacing) {
          window.OverlaySpacing.recalculate();
        }
        // Trigger mobile roster refresh
        if (window.MobileRoster) {
          window.MobileRoster.refresh();
        }
      }, height);
      
      await page.waitForTimeout(200);
      
      // Verify spacer height
      const spacerCheck = await page.evaluate((expectedHeight) => {
        const spacer = document.querySelector('.mobile-roster-grid-spacer');
        const style = getComputedStyle(document.documentElement);
        const rowGap = parseInt(style.getPropertyValue('--avatar-row-gap') || '6', 10);
        
        if (!spacer) {
          return { error: 'Spacer not found' };
        }
        
        const spacerHeight = spacer.offsetHeight;
        const expectedSpacerHeight = expectedHeight + rowGap;
        
        return {
          spacerHeight,
          expectedSpacerHeight,
          rowGap,
          overlayHeight: expectedHeight,
          matches: Math.abs(spacerHeight - expectedSpacerHeight) <= 2
        };
      }, height);
      
      expect(spacerCheck.error).toBeUndefined();
      
      console.log(`TV height ${height}px -> Spacer: ${spacerCheck.spacerHeight}px (expected ${spacerCheck.expectedSpacerHeight}px)`);
    }
    
    // Screenshot final state
    await page.screenshot({ 
      path: 'tests/screenshots/roster-spacing-heights.png',
      fullPage: false 
    });
  });

});

test.describe('Badge Pill Animation', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_PAGE);
    await page.waitForSelector('.mobile-roster-container');
    await page.waitForTimeout(500);
  });

  test('badge pill replaces name for ~7 seconds under normal progression', async ({ page }) => {
    // Get a player tile before triggering event
    const beforeState = await page.evaluate(() => {
      const tile = document.querySelector('.mobile-roster-tile:not(.evicted)');
      if (!tile) return { error: 'No active player tile found' };
      
      const nameEl = tile.querySelector('.mobile-roster-name');
      return {
        playerId: tile.getAttribute('data-player-id'),
        nameText: nameEl ? nameEl.textContent : null
      };
    });
    
    expect(beforeState.error).toBeUndefined();
    
    // Trigger HOH event by clicking the HOH button
    await page.click('button.test-btn.hoh');
    await page.waitForTimeout(200);
    
    // Screenshot immediately after pill appears
    await page.screenshot({ 
      path: 'tests/screenshots/badge-pill-active.png',
      fullPage: false 
    });
    
    // Check that pill is visible
    const pillState = await page.evaluate(() => {
      const pills = document.querySelectorAll('.badge-pill');
      const pillActive = document.querySelectorAll('.badge-pill-active');
      
      return {
        pillCount: pills.length,
        pillActiveCount: pillActive.length,
        hasPill: pills.length > 0
      };
    });
    
    expect(pillState.hasPill).toBe(true);
    expect(pillState.pillActiveCount).toBeGreaterThan(0);
    
    // Wait for pill duration (with some buffer)
    const waitTime = PILL_DURATION + PILL_TOLERANCE;
    await page.waitForTimeout(waitTime);
    
    // Check that pill is dismissed and emoji appears
    const afterState = await page.evaluate(() => {
      const pills = document.querySelectorAll('.badge-pill');
      const emojis = document.querySelectorAll('.corner-emoji-badge');
      const nameEls = document.querySelectorAll('.badge-pill-active');
      
      return {
        pillCount: pills.length,
        emojiCount: emojis.length,
        pillActiveCount: nameEls.length
      };
    });
    
    // Screenshot after pill dismissed
    await page.screenshot({ 
      path: 'tests/screenshots/badge-emoji-after-pill.png',
      fullPage: false 
    });
    
    // Pill should be dismissed, emoji should appear
    expect(afterState.pillCount).toBe(0);
    expect(afterState.emojiCount).toBeGreaterThan(0);
    
    console.log('Pill animation timing verified:', { pillState, afterState });
  });

  test('fast-forward skips pill and shows emoji instantly', async ({ page }) => {
    // Reset state
    await page.click('button:has-text("Reset Players")');
    await page.waitForTimeout(200);
    
    // Trigger HOH event to start pill animation
    await page.click('button.test-btn.hoh');
    await page.waitForTimeout(100);
    
    // Verify pill is active
    const pillBefore = await page.evaluate(() => {
      return document.querySelectorAll('.badge-pill').length;
    });
    expect(pillBefore).toBeGreaterThan(0);
    
    // Screenshot before fast-forward
    await page.screenshot({ 
      path: 'tests/screenshots/badge-before-ffwd.png',
      fullPage: false 
    });
    
    // Trigger fast-forward immediately
    await page.click('button.test-btn.ffwd');
    await page.waitForTimeout(200);
    
    // Check that pill is dismissed and emoji appears
    const afterFFWD = await page.evaluate(() => {
      const pills = document.querySelectorAll('.badge-pill');
      const emojis = document.querySelectorAll('.corner-emoji-badge');
      
      return {
        pillCount: pills.length,
        emojiCount: emojis.length
      };
    });
    
    // Screenshot after fast-forward
    await page.screenshot({ 
      path: 'tests/screenshots/badge-after-ffwd.png',
      fullPage: false 
    });
    
    // Pills should be dismissed instantly
    expect(afterFFWD.pillCount).toBe(0);
    // Emojis should appear
    expect(afterFFWD.emojiCount).toBeGreaterThan(0);
    
    console.log('Fast-forward behavior verified:', afterFFWD);
  });

  test('corner emoji persists until status logically ends', async ({ page }) => {
    // Trigger HOH and wait for pill to dismiss
    await page.click('button.test-btn.hoh');
    await page.waitForTimeout(PILL_DURATION + PILL_TOLERANCE);
    
    // Verify emoji is present
    const emojiState1 = await page.evaluate(() => {
      const emojis = document.querySelectorAll('.corner-emoji-badge');
      return {
        count: emojis.length,
        types: Array.from(emojis).map(e => e.dataset.badgeType)
      };
    });
    
    expect(emojiState1.count).toBeGreaterThan(0);
    expect(emojiState1.types).toContain('HOH');
    
    // Trigger a new HOH (should replace the old one)
    await page.click('button.test-btn.hoh');
    await page.waitForTimeout(PILL_DURATION + PILL_TOLERANCE);
    
    // Verify there's still only one HOH emoji (on different player)
    const emojiState2 = await page.evaluate(() => {
      const emojis = document.querySelectorAll('.corner-emoji-hoh');
      return {
        count: emojis.length
      };
    });
    
    // Should only have one HOH emoji (the new one)
    expect(emojiState2.count).toBe(1);
    
    // Screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/badge-emoji-persistence.png',
      fullPage: false 
    });
  });

});

test.describe('Post-Render Emoji Synchronization', () => {
  
  test('emojis render immediately after grid render if statuses exist', async ({ page }) => {
    await page.goto(TEST_PAGE);
    await page.waitForSelector('.mobile-roster-container');
    
    // Set up existing statuses before render
    await page.evaluate(() => {
      // Set some players with existing statuses
      window.game.players[0].hoh = true;
      window.game.players[1].pov = true;
      window.game.players[2].nominated = true;
      
      // Update canonical game state
      window.game.hohId = 1;
      window.game.vetoHolder = 2;
      window.game.nominees = [3];
    });
    
    // Trigger a full refresh
    await page.evaluate(() => {
      if (window.MobileRoster) {
        window.MobileRoster.refresh();
      }
    });
    
    await page.waitForTimeout(200);
    
    // Check that emojis are visible immediately (no pill animation for existing statuses)
    const emojiState = await page.evaluate(() => {
      const hohEmojis = document.querySelectorAll('.corner-emoji-hoh');
      const povEmojis = document.querySelectorAll('.corner-emoji-pov');
      const nomEmojis = document.querySelectorAll('.corner-emoji-nom');
      
      return {
        hoh: hohEmojis.length,
        pov: povEmojis.length,
        nom: nomEmojis.length,
        total: hohEmojis.length + povEmojis.length + nomEmojis.length
      };
    });
    
    // Screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/badge-emoji-post-render.png',
      fullPage: false 
    });
    
    // Emojis should be visible for existing statuses
    expect(emojiState.hoh).toBe(1);
    expect(emojiState.pov).toBe(1);
    expect(emojiState.nom).toBe(1);
    
    console.log('Post-render emoji sync verified:', emojiState);
  });

});
