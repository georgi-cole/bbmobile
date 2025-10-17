const { test, expect } = require('@playwright/test');

test.describe('bb:pov:finished Event Dispatch', () => {
  test('should dispatch bb:pov:finished event after POV competition', async ({ page }) => {
    // Navigate to the test page
    await page.goto('file://' + __dirname + '/test_pov_event_dispatch.html');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Set up event listener to capture the event
    const eventPromise = page.evaluate(() => {
      return new Promise((resolve) => {
        window.addEventListener('bb:pov:finished', (event) => {
          resolve({
            captured: true,
            detail: event.detail
          });
        }, { once: true });
        
        // Also set a timeout in case event is never dispatched
        setTimeout(() => {
          resolve({ captured: false });
        }, 5000);
      });
    });
    
    // Click the run test button
    await page.click('button:has-text("Run Test")');
    
    // Wait for the event
    const eventResult = await eventPromise;
    
    // Verify event was captured
    expect(eventResult.captured).toBe(true);
    
    // Verify event detail structure
    expect(eventResult.detail).toBeDefined();
    expect(eventResult.detail.winnerId).toBeDefined();
    expect(eventResult.detail.result).toBeDefined();
    
    // Verify winnerId is a number
    expect(typeof eventResult.detail.winnerId).toBe('number');
    
    // Verify result object has expected properties
    expect(eventResult.detail.result.winnerId).toBeDefined();
    expect(Array.isArray(eventResult.detail.result.participants)).toBe(true);
    expect(Array.isArray(eventResult.detail.result.scores)).toBe(true);
    
    // Check that test results show passes
    const resultsText = await page.textContent('#results');
    expect(resultsText).toContain('✓');
    
    // Log the event detail for debugging
    console.log('Event detail:', JSON.stringify(eventResult.detail, null, 2));
  });
  
  test('should include correct winner information in event', async ({ page }) => {
    await page.goto('file://' + __dirname + '/test_pov_event_dispatch.html');
    await page.waitForLoadState('networkidle');
    
    // Capture event detail
    const eventDetail = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.addEventListener('bb:pov:finished', (event) => {
          resolve(event.detail);
        }, { once: true });
        
        // Trigger the test
        window.runTest();
      });
    });
    
    // Verify the winner is Charlie (id: 3) who has the highest score
    expect(eventDetail.winnerId).toBe(3);
    expect(eventDetail.result.winnerId).toBe(3);
    
    // Verify participants array contains all 4 players
    expect(eventDetail.result.participants).toHaveLength(4);
    expect(eventDetail.result.participants).toContain(1);
    expect(eventDetail.result.participants).toContain(2);
    expect(eventDetail.result.participants).toContain(3);
    expect(eventDetail.result.participants).toContain(4);
  });
});
