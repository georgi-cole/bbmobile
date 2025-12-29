import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureScreenshots() {
  console.log('Starting Playwright screenshot capture...');
  
  const browser = await chromium.launch({
    headless: true
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Navigate to the test page
  const filePath = path.join(__dirname, 'screenshot_finale_ui.html');
  const fileUrl = `file://${filePath}`;
  console.log('Navigating to:', fileUrl);
  
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  
  // Wait for the page to be ready
  await page.waitForTimeout(2000);
  
  // Screenshot 1: Fullscreen overlay with human voting UI
  console.log('Waiting for voting UI...');
  await page.waitForFunction(() => window.screenshotStage === 'voting-ready', { timeout: 10000 });
  await page.waitForTimeout(500); // Let animations settle
  
  console.log('Capturing Screenshot 1: Human Voting UI in Fullscreen Overlay');
  await page.screenshot({ 
    path: 'screenshot_1_voting_ui_fullscreen.png',
    fullPage: false
  });
  
  // Screenshot 2: After vote is cast (confirmation shown)
  console.log('Waiting for vote to be cast...');
  await page.waitForFunction(() => window.screenshotStage === 'voted', { timeout: 10000 });
  await page.waitForTimeout(500);
  
  console.log('Capturing Screenshot 2: Vote Confirmation');
  await page.screenshot({ 
    path: 'screenshot_2_vote_confirmation.png',
    fullPage: false
  });
  
  // Screenshot 3: Vote reveal phase with faceoff
  console.log('Waiting for reveal phase...');
  await page.waitForFunction(() => window.screenshotStage === 'revealing', { timeout: 10000 });
  await page.waitForTimeout(1000);
  
  console.log('Capturing Screenshot 3: Vote Reveal with Faceoff');
  await page.screenshot({ 
    path: 'screenshot_3_vote_reveal_faceoff.png',
    fullPage: false
  });
  
  // Check that panel is empty
  const panelContent = await page.$eval('#panel', el => el.textContent.trim());
  console.log('Panel content:', panelContent);
  
  // Check that overlay exists
  const overlayExists = await page.$('.finale-fullscreen-overlay') !== null;
  console.log('Fullscreen overlay exists:', overlayExists);
  
  // Check that voting UI is in overlay (not in panel)
  const votingInOverlay = await page.$('.finale-fullscreen-overlay #humanJuryVoteOverlay') !== null;
  console.log('Voting UI in overlay:', votingInOverlay);
  
  // Check that no jury ballots panel in #panel
  const juryPanelInPanel = await page.$('#panel .juryPanelHost') !== null;
  console.log('Jury panel in #panel (should be false):', juryPanelInPanel);
  
  await browser.close();
  
  console.log('\n✅ Screenshots captured successfully!');
  console.log('  - screenshot_1_voting_ui_fullscreen.png');
  console.log('  - screenshot_2_vote_confirmation.png');
  console.log('  - screenshot_3_vote_reveal_faceoff.png');
  
  // Validation summary
  console.log('\n📊 Validation Results:');
  console.log(`  ✅ Fullscreen overlay exists: ${overlayExists}`);
  console.log(`  ✅ Voting UI in overlay: ${votingInOverlay}`);
  console.log(`  ✅ No jury panel in #panel: ${!juryPanelInPanel}`);
  console.log(`  ✅ Panel remains empty: ${panelContent.includes('should be empty')}`);
}

captureScreenshots().catch(error => {
  console.error('Error capturing screenshots:', error);
  process.exit(1);
});
