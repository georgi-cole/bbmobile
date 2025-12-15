#!/usr/bin/env node

/**
 * Test script to validate the compact LiveVoteOverlay changes
 * Takes screenshots of eviction UI on laptop and mobile viewports
 */

import { chromium } from 'playwright';
import { writeFile } from 'fs/promises';

const BASE_URL = 'http://localhost:9090';

const TEST_FILES = [
  'test_evict_button_visibility.html',
  'test_vote_overlay_improvements.html',
  'test_eviction_layout.html',
  'test_mobile_eviction_ui_fix.html'
];

const VIEWPORTS = {
  laptop: { width: 1366, height: 768 },
  mobile: { width: 375, height: 667 }
};

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  
  for (const testFile of TEST_FILES) {
    console.log(`\n📋 Testing: ${testFile}`);
    
    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
      try {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        
        // Navigate to test file
        const url = `${BASE_URL}/${testFile}`;
        console.log(`  📱 ${viewportName} (${viewport.width}x${viewport.height})`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
        
        // Wait for page to be ready
        await page.waitForTimeout(1000);
        
        // Try to trigger the vote overlay if there's a button
        try {
          // Look for buttons that might open the overlay
          const startButton = await page.locator('button:has-text("Start"), button:has-text("Open"), button:has-text("Show")').first();
          if (await startButton.isVisible({ timeout: 1000 })) {
            await startButton.click();
            await page.waitForTimeout(1500);
          }
        } catch (e) {
          // Button not found or couldn't click - that's OK
        }
        
        // Check if overlay is visible
        const overlay = page.locator('.lv-overlay, .lv2-overlay');
        const isVisible = await overlay.isVisible().catch(() => false);
        
        if (isVisible) {
          // Get overlay dimensions
          const box = await overlay.boundingBox();
          const evictBtn = page.locator('.lv-overlay__evict-btn, .lv2-evict-btn').first();
          const btnVisible = await evictBtn.isVisible().catch(() => false);
          const btnBox = btnVisible ? await evictBtn.boundingBox() : null;
          
          console.log(`    ✅ Overlay visible`);
          if (btnBox) {
            console.log(`    ✅ Evict button visible at y=${Math.round(btnBox.y)}`);
            console.log(`    📏 Button position: top=${Math.round(btnBox.y)}px, bottom=${Math.round(btnBox.y + btnBox.height)}px`);
            console.log(`    📐 Viewport height: ${viewport.height}px`);
            
            // Check if button is within viewport
            if (btnBox.y + btnBox.height <= viewport.height) {
              console.log(`    ✅ Button is fully visible (no scroll needed)`);
            } else {
              console.log(`    ⚠️  Button extends beyond viewport by ${Math.round((btnBox.y + btnBox.height) - viewport.height)}px`);
            }
          } else {
            console.log(`    ❌ Evict button not visible`);
          }
          
          // Take screenshot
          const screenshotPath = `/tmp/screenshot_${testFile.replace('.html', '')}_${viewportName}.png`;
          await page.screenshot({ path: screenshotPath, fullPage: false });
          console.log(`    📸 Screenshot saved: ${screenshotPath}`);
          
          results.push({
            testFile,
            viewport: viewportName,
            overlayVisible: true,
            buttonVisible: btnVisible,
            buttonInViewport: btnBox ? (btnBox.y + btnBox.height <= viewport.height) : false,
            screenshotPath
          });
        } else {
          console.log(`    ⚠️  Overlay not visible in this test`);
          results.push({
            testFile,
            viewport: viewportName,
            overlayVisible: false,
            buttonVisible: false,
            buttonInViewport: false
          });
        }
        
        await context.close();
      } catch (error) {
        console.error(`    ❌ Error: ${error.message}`);
        results.push({
          testFile,
          viewport: viewportName,
          error: error.message
        });
      }
    }
  }
  
  await browser.close();
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  const overlayTests = results.filter(r => r.overlayVisible);
  const buttonVisible = overlayTests.filter(r => r.buttonVisible);
  const buttonInViewport = overlayTests.filter(r => r.buttonInViewport);
  
  console.log(`\n✅ Overlay visible: ${overlayTests.length}/${results.length} tests`);
  console.log(`✅ Button visible: ${buttonVisible.length}/${overlayTests.length} overlays`);
  console.log(`✅ Button in viewport: ${buttonInViewport.length}/${buttonVisible.length} buttons`);
  
  if (buttonInViewport.length === buttonVisible.length && buttonVisible.length > 0) {
    console.log('\n🎉 SUCCESS: All visible buttons are within viewport bounds!');
  } else if (overlayTests.length === 0) {
    console.log('\n⚠️  No overlays were visible in the tests.');
    console.log('   This may be normal if the tests require manual interaction.');
  } else {
    console.log('\n⚠️  Some buttons may extend beyond viewport. Check screenshots.');
  }
  
  // Write results to file
  await writeFile('/tmp/test_results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Detailed results saved to: /tmp/test_results.json\n');
}

takeScreenshots().catch(console.error);
