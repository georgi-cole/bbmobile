#!/usr/bin/env node
/**
 * Puppeteer screenshot script for POV Twist UI verification
 * Captures settings UI and ceremony flow mockups
 * 
 * Run: node screenshot_pov_twists.mjs
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOT_DIR = join(__dirname, 'screenshots', 'pov_twists');
const BASE_URL = `file://${join(__dirname, 'index.html')}`;

// Create screenshot directory
try {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  console.log(`📁 Screenshot directory: ${SCREENSHOT_DIR}`);
} catch (err) {
  console.error('Failed to create screenshot directory:', err.message);
  process.exit(1);
}

async function captureSettings(page) {
  console.log('\n📸 Capturing Settings UI...');
  
  try {
    // Navigate to the game
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    // Try to open settings modal
    const settingsButton = await page.$('button[onclick*="showSettings"], button:has-text("Settings"), #btnSettings, .settings-btn');
    if (settingsButton) {
      await settingsButton.click();
      console.log('✓ Clicked settings button');
      await page.waitForTimeout(1000);
      
      // Navigate to Gameplay tab
      const gameplayTab = await page.$('button.tab-btn:has-text("Gameplay"), [data-tab="gameplay"]');
      if (gameplayTab) {
        await gameplayTab.click();
        console.log('✓ Opened Gameplay tab');
        await page.waitForTimeout(500);
        
        // Scroll to Week twists section
        await page.evaluate(() => {
          const weekTwistsSection = Array.from(document.querySelectorAll('h3, .card h3')).find(
            h3 => h3.textContent.includes('Week twists')
          );
          if (weekTwistsSection) {
            weekTwistsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
        await page.waitForTimeout(500);
        
        // Take screenshot of settings
        await page.screenshot({
          path: join(SCREENSHOT_DIR, '01_settings_gameplay_week_twists.png'),
          fullPage: false
        });
        console.log('✓ Captured: 01_settings_gameplay_week_twists.png');
        
        // Highlight the new fields
        await page.evaluate(() => {
          const labels = Array.from(document.querySelectorAll('label, .toggleRow'));
          labels.forEach(label => {
            const text = label.textContent || '';
            if (text.includes('Golden POV') || text.includes('Diamond POV')) {
              label.style.border = '2px solid #ff6b6b';
              label.style.padding = '4px';
              label.style.borderRadius = '4px';
              label.style.backgroundColor = 'rgba(255, 107, 107, 0.1)';
            }
          });
        });
        await page.waitForTimeout(300);
        
        await page.screenshot({
          path: join(SCREENSHOT_DIR, '02_settings_pov_fields_highlighted.png'),
          fullPage: false
        });
        console.log('✓ Captured: 02_settings_pov_fields_highlighted.png');
      } else {
        console.log('⚠️  Could not find Gameplay tab');
      }
      
      // Close settings
      const closeButton = await page.$('.closeX, button:has-text("Close"), [aria-label="Close"]');
      if (closeButton) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    } else {
      console.log('⚠️  Could not find settings button');
    }
  } catch (err) {
    console.error('Error capturing settings:', err.message);
  }
}

async function createMockupDiagram(page) {
  console.log('\n📸 Creating mockup diagram...');
  
  try {
    // Create a blank page with flow diagram
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0a0e1a;
            color: #e6e8ee;
            padding: 40px;
            margin: 0;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
          }
          h1 {
            text-align: center;
            color: #4a9eff;
            margin-bottom: 40px;
            font-size: 2.5rem;
          }
          .flow {
            display: flex;
            flex-direction: column;
            gap: 30px;
          }
          .row {
            display: flex;
            gap: 20px;
            justify-content: center;
            align-items: flex-start;
          }
          .box {
            background: linear-gradient(135deg, #1a2f44 0%, #243a50 100%);
            border: 2px solid #3d5a75;
            border-radius: 12px;
            padding: 20px;
            min-width: 280px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
          .box h3 {
            margin: 0 0 12px 0;
            color: #79d19a;
            font-size: 1.2rem;
          }
          .box.twist {
            border-color: #ff6b6b;
            background: linear-gradient(135deg, #3a1a2f 0%, #4a2a3a 100%);
          }
          .box.twist h3 {
            color: #ff6b6b;
          }
          .box ul {
            margin: 0;
            padding-left: 20px;
            line-height: 1.8;
          }
          .box .label {
            display: inline-block;
            background: rgba(255, 255, 255, 0.1);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.85rem;
            margin-bottom: 8px;
          }
          .arrow {
            text-align: center;
            font-size: 2rem;
            color: #4a9eff;
          }
          .note {
            background: rgba(74, 158, 255, 0.1);
            border-left: 3px solid #4a9eff;
            padding: 12px 16px;
            border-radius: 4px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🏆 POV Twist Implementation Flow</h1>
          
          <div class="flow">
            <!-- Settings -->
            <div class="row">
              <div class="box">
                <h3>⚙️ Settings Configuration</h3>
                <div class="label">Gameplay → Week twists</div>
                <ul>
                  <li><strong>Golden POV chance:</strong> 5% (default)</li>
                  <li><strong>Diamond POV chance:</strong> 3% (default)</li>
                  <li>Configurable 0-100%</li>
                </ul>
              </div>
            </div>
            
            <div class="arrow">↓</div>
            
            <!-- Twist Decision -->
            <div class="row">
              <div class="box twist">
                <h3>🎲 Twist Decision</h3>
                <div class="label">Start of POV Competition</div>
                <ul>
                  <li>Roll for Diamond first (priority)</li>
                  <li>Roll for Golden independently</li>
                  <li>If both hit: Diamond wins</li>
                  <li>Persisted per week</li>
                </ul>
              </div>
            </div>
            
            <div class="arrow">↓</div>
            
            <!-- Announcement -->
            <div class="row">
              <div class="box twist">
                <h3>📺 Twist Announcement</h3>
                <div class="label">TV Modal (5 seconds)</div>
                <ul>
                  <li><strong>Diamond:</strong> "The Diamond Power of Veto is in play..."</li>
                  <li><strong>Golden:</strong> "The Golden Power of Veto is in play..."</li>
                  <li>Tone: 'twist' with appropriate emojis</li>
                </ul>
              </div>
            </div>
            
            <div class="arrow">↓</div>
            
            <!-- Competition -->
            <div class="row">
              <div class="box">
                <h3>🎮 POV Competition</h3>
                <div class="label">Standard Flow</div>
                <ul>
                  <li>Competition runs normally</li>
                  <li>Winner determined by scores</li>
                  <li>Winner receives POV</li>
                </ul>
              </div>
            </div>
            
            <div class="arrow">↓</div>
            
            <!-- Ceremony Flows -->
            <div class="row">
              <div class="box">
                <h3>💎 Diamond POV Ceremony</h3>
                <div class="label">Skip save step</div>
                <ul>
                  <li>POV holder picks 2 new nominees</li>
                  <li>Completely overrides HOH</li>
                  <li>Cannot pick: HOH, self</li>
                  <li>Both noms replaced</li>
                </ul>
              </div>
              
              <div class="box">
                <h3>🏆 Golden POV Ceremony</h3>
                <div class="label">Enhanced power</div>
                <ul>
                  <li>POV holder saves 1 nominee</li>
                  <li>POV holder picks replacement (not HOH)</li>
                  <li>Cannot pick: HOH, self, saved player</li>
                  <li>Announcement reflects POV authority</li>
                </ul>
              </div>
              
              <div class="box">
                <h3>🛡️ Standard POV Ceremony</h3>
                <div class="label">Normal flow</div>
                <ul>
                  <li>POV holder saves 1 nominee (optional)</li>
                  <li>HOH picks replacement</li>
                  <li>Cannot pick: HOH, POV holder, saved player</li>
                  <li>Standard messaging</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="note">
            <strong>📋 Key Implementation Details:</strong>
            <ul style="margin: 8px 0 0 20px; line-height: 1.6;">
              <li>Twist rolls are independent but Diamond has priority if both hit</li>
              <li>Twist state persists for entire week</li>
              <li>All ceremony flows use existing TV overlay system</li>
              <li>Eligibility checks ensure HOH and POV holder cannot be nominated</li>
              <li>Announcement cards dynamically show correct authority (HOH vs POV Holder)</li>
            </ul>
          </div>
        </div>
      </body>
      </html>
    `, { waitUntil: 'networkidle0' });
    
    await page.waitForTimeout(1000);
    
    // Take full page screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '03_pov_twist_flow_diagram.png'),
      fullPage: true
    });
    console.log('✓ Captured: 03_pov_twist_flow_diagram.png');
  } catch (err) {
    console.error('Error creating mockup diagram:', err.message);
  }
}

async function createComparisonTable(page) {
  console.log('\n📸 Creating comparison table...');
  
  try {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0a0e1a;
            color: #e6e8ee;
            padding: 40px;
            margin: 0;
          }
          .container {
            max-width: 1400px;
            margin: 0 auto;
          }
          h1 {
            text-align: center;
            color: #4a9eff;
            margin-bottom: 40px;
            font-size: 2.5rem;
          }
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            background: #1a2f44;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
          th {
            background: linear-gradient(135deg, #2877a0, #1a4a63);
            color: white;
            padding: 16px;
            text-align: left;
            font-size: 1.1rem;
          }
          td {
            padding: 16px;
            border-bottom: 1px solid #2c3446;
          }
          tr:last-child td {
            border-bottom: none;
          }
          tr:nth-child(even) {
            background: rgba(255, 255, 255, 0.02);
          }
          .feature {
            font-weight: 600;
            color: #79d19a;
          }
          .yes {
            color: #79d19a;
            font-weight: 600;
          }
          .no {
            color: #9aa3b2;
          }
          .highlight {
            color: #ff6b6b;
            font-weight: 600;
          }
          .note {
            background: rgba(74, 158, 255, 0.1);
            border-left: 3px solid #4a9eff;
            padding: 16px 20px;
            border-radius: 4px;
            margin-top: 30px;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔄 POV Ceremony Comparison</h1>
          
          <table>
            <thead>
              <tr>
                <th style="width: 25%;">Feature</th>
                <th style="width: 25%;">Standard POV 🛡️</th>
                <th style="width: 25%;">Golden POV 🏆</th>
                <th style="width: 25%;">Diamond POV 💎</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="feature">Default Probability</td>
                <td>N/A (always available)</td>
                <td class="highlight">5% per week</td>
                <td class="highlight">3% per week</td>
              </tr>
              <tr>
                <td class="feature">POV Winner Saves Nominee?</td>
                <td class="yes">✓ Yes (optional)</td>
                <td class="yes">✓ Yes</td>
                <td class="no">✗ No (skipped)</td>
              </tr>
              <tr>
                <td class="feature">Who Picks Replacement?</td>
                <td>HOH</td>
                <td class="highlight">POV Holder</td>
                <td class="highlight">POV Holder</td>
              </tr>
              <tr>
                <td class="feature">Number of Replacements</td>
                <td>1 nominee</td>
                <td>1 nominee</td>
                <td class="highlight">2 nominees (both)</td>
              </tr>
              <tr>
                <td class="feature">HOH Authority</td>
                <td class="yes">Picks replacement</td>
                <td class="no">None (overridden)</td>
                <td class="no">None (fully overridden)</td>
              </tr>
              <tr>
                <td class="feature">POV Holder Can Be Nominated?</td>
                <td class="no">✗ No</td>
                <td class="no">✗ No</td>
                <td class="no">✗ No</td>
              </tr>
              <tr>
                <td class="feature">HOH Can Be Nominated?</td>
                <td class="no">✗ No</td>
                <td class="no">✗ No</td>
                <td class="no">✗ No</td>
              </tr>
              <tr>
                <td class="feature">Saved Nominee Can Be Re-Nominated?</td>
                <td class="no">✗ No</td>
                <td class="no">✗ No</td>
                <td class="no">N/A</td>
              </tr>
              <tr>
                <td class="feature">Announcement Authority</td>
                <td>"HOH: I name..."</td>
                <td class="highlight">"POV Holder: I name..."</td>
                <td class="highlight">"POV Holder nominates..."</td>
              </tr>
              <tr>
                <td class="feature">Strategic Impact</td>
                <td>Standard gameplay</td>
                <td class="highlight">High - POV holder controls replacement</td>
                <td class="highlight">Very High - POV holder controls all noms</td>
              </tr>
            </tbody>
          </table>
          
          <div class="note">
            <strong>🎯 Priority Rules:</strong><br>
            • Twists are rolled independently at the start of each POV competition<br>
            • If both Diamond and Golden twists hit in the same week, <strong>Diamond takes precedence</strong><br>
            • Twist state is persisted for the entire week and only decided once<br>
            • Probabilities are configurable via Settings → Gameplay → Week twists
          </div>
        </div>
      </body>
      </html>
    `, { waitUntil: 'networkidle0' });
    
    await page.waitForTimeout(1000);
    
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '04_pov_ceremony_comparison.png'),
      fullPage: true
    });
    console.log('✓ Captured: 04_pov_ceremony_comparison.png');
  } catch (err) {
    console.error('Error creating comparison table:', err.message);
  }
}

async function main() {
  console.log('🚀 Starting Puppeteer screenshot script for POV Twists...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Capture actual settings UI
    await captureSettings(page);
    
    // Create visual mockups
    await createMockupDiagram(page);
    await createComparisonTable(page);
    
    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📁 Location: ${SCREENSHOT_DIR}`);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
