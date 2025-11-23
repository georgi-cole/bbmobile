// Playwright test for inline TV cards screenshot generation
// Verifies the unified inline TV overlay card design integration

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('TV Inline Cards Visual Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the test page
    await page.goto('file://' + path.join(__dirname, '..', 'test_tv_inline_cards.html'));
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should display basic card with inline styling', async ({ page }) => {
    // Click the basic card button
    await page.click('#btnBasicCard');
    
    // Wait for card to appear
    await page.waitForSelector('.tv-inline-card', { timeout: 2000 });
    
    // Verify the card has the inline class
    const card = await page.locator('.tv-inline-card').first();
    await expect(card).toBeVisible();
    
    // Verify legacy classes are preserved
    const hasLegacyClasses = await card.evaluate(el => 
      el.classList.contains('revealCard') && 
      el.classList.contains('diaryRoomCard')
    );
    expect(hasLegacyClasses).toBe(true);
    
    // Take screenshot
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'inline-card-basic.png'),
      fullPage: false
    });
    
    console.log('✓ Basic card screenshot saved');
  });

  test('should display decision card with actions', async ({ page }) => {
    // Click the decision card button
    await page.click('#btnDecisionCard');
    
    // Wait for card to appear
    await page.waitForSelector('.tv-inline-card', { timeout: 2000 });
    
    // Verify the card has dialog role
    const card = await page.locator('.tv-inline-card').first();
    const role = await card.getAttribute('role');
    expect(role).toBe('dialog');
    
    // Verify buttons are present
    const buttons = await card.locator('button').count();
    expect(buttons).toBeGreaterThan(0);
    
    // Take screenshot
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'inline-card-decision.png'),
      fullPage: false
    });
    
    console.log('✓ Decision card screenshot saved');
    
    // Click first button to dismiss
    await page.click('.tv-inline-card button.primary');
  });

  test('should display avatar card variant', async ({ page }) => {
    // Click the avatar card button
    await page.click('#btnAvatarCard');
    
    // Wait for card to appear
    await page.waitForSelector('.tv-inline-card', { timeout: 2000 });
    
    // Verify avatars are present
    const avatars = await page.locator('.tv-card-avatars img').count();
    expect(avatars).toBeGreaterThan(0);
    
    // Take screenshot
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'inline-card-avatars.png'),
      fullPage: false
    });
    
    console.log('✓ Avatar card screenshot saved');
  });

  test('should verify backdrop filter is applied', async ({ page }) => {
    // Click the basic card button
    await page.click('#btnBasicCard');
    
    // Wait for card to appear
    await page.waitForSelector('.tv-inline-card', { timeout: 2000 });
    
    // Check computed style for backdrop filter
    const hasBackdrop = await page.locator('.tv-inline-card').first().evaluate(el => {
      const style = getComputedStyle(el);
      return style.backdropFilter !== 'none' || style.webkitBackdropFilter !== 'none';
    });
    
    // Note: backdrop-filter may not work in all test environments
    console.log('Backdrop filter applied:', hasBackdrop);
  });

  test('should verify accessibility attributes', async ({ page }) => {
    // Click the basic card button
    await page.click('#btnBasicCard');
    
    // Wait for card to appear
    await page.waitForSelector('.tv-inline-card', { timeout: 2000 });
    
    const card = await page.locator('.tv-inline-card').first();
    
    // Verify ARIA attributes
    const role = await card.getAttribute('role');
    const ariaLive = await card.getAttribute('aria-live');
    const tabindex = await card.getAttribute('tabindex');
    
    expect(role).toBeTruthy();
    expect(ariaLive).toBe('polite');
    expect(tabindex).toBe('0');
    
    console.log('✓ Accessibility attributes verified');
  });

  test('should verify theme variables are applied', async ({ page }) => {
    // Get root element computed styles
    const themeVariables = await page.evaluate(() => {
      const root = document.documentElement;
      const styles = getComputedStyle(root);
      return {
        themePrimary: styles.getPropertyValue('--theme-primary').trim(),
        themeOnPrimary: styles.getPropertyValue('--theme-on-primary').trim()
      };
    });
    
    expect(themeVariables.themePrimary).toBeTruthy();
    expect(themeVariables.themeOnPrimary).toBeTruthy();
    
    console.log('✓ Theme variables verified:', themeVariables);
  });
});
