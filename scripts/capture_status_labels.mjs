#!/usr/bin/env node

/**
 * Screenshot Automation Script for Status Labels Testing
 * 
 * Usage: node scripts/capture_status_labels.mjs [--port PORT] [--output DIR]
 * 
 * This script:
 * 1. Launches test_status_labels.html in a headless browser
 * 2. Steps through each test scenario by clicking buttons
 * 3. Waits for status pills to appear
 * 4. Captures screenshots at each step
 * 5. Saves to screenshots/status/ directory
 */

import { spawn } from 'child_process';
import { mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Parse command line args
const args = process.argv.slice(2);
const portArg = args.find(a => a.startsWith('--port='));
const outputArg = args.find(a => a.startsWith('--output='));

const PORT = portArg ? portArg.split('=')[1] : '8080';
const OUTPUT_DIR = outputArg ? outputArg.split('=')[1] : join(rootDir, 'screenshots', 'status');

// Check if puppeteer is available
let puppeteer;
try {
  puppeteer = await import('puppeteer');
} catch (err) {
  console.error('❌ Puppeteer not installed');
  console.error('   Install it with: npm install --save-dev puppeteer');
  console.error('   Or use npx: npx puppeteer@latest ...');
  process.exit(1);
}

console.log('📸 Status Labels Screenshot Automation');
console.log('=====================================\n');

// Ensure output directory exists
try {
  await access(OUTPUT_DIR);
} catch {
  console.log(`📁 Creating output directory: ${OUTPUT_DIR}`);
  await mkdir(OUTPUT_DIR, { recursive: true });
}

// Start a simple HTTP server
console.log(`🌐 Starting HTTP server on port ${PORT}...`);
const server = spawn('python3', ['-m', 'http.server', PORT, '--directory', rootDir], {
  stdio: ['ignore', 'pipe', 'pipe']
});

// Wait for server to start
await new Promise(resolve => setTimeout(resolve, 2000));

if (server.exitCode !== null) {
  console.error('❌ Failed to start HTTP server');
  process.exit(1);
}

console.log(`✓ Server running at http://localhost:${PORT}\n`);

// Launch browser
console.log('🚀 Launching headless browser...');
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

// Navigate to test page
const testUrl = `http://localhost:${PORT}/test_status_labels.html`;
console.log(`📄 Loading test page: ${testUrl}`);

try {
  await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 10000 });
  console.log('✓ Test page loaded\n');
} catch (err) {
  console.error('❌ Failed to load test page:', err.message);
  await browser.close();
  server.kill();
  process.exit(1);
}

// Test scenarios
const scenarios = [
  {
    name: '01-initial',
    label: 'Initial State',
    button: null,
    wait: 500
  },
  {
    name: '02-hoh',
    label: 'HOH Win',
    button: '#btnHOH',
    wait: 500
  },
  {
    name: '03-noms',
    label: 'Nominations',
    button: '#btnNoms',
    wait: 500
  },
  {
    name: '04-pov',
    label: 'POV Win (Different Player)',
    button: '#btnPOV',
    wait: 500
  },
  {
    name: '05-hoh-pov',
    label: 'HOH Also Has POV',
    button: '#btnHOHPOV',
    wait: 500
  },
  {
    name: '06-eviction',
    label: 'Eviction',
    button: '#btnEvict',
    wait: 500
  },
  {
    name: '07-finale',
    label: 'Finale',
    button: '#btnFinale',
    wait: 500
  }
];

console.log('📸 Capturing screenshots...\n');

for (const scenario of scenarios) {
  console.log(`   ${scenario.label}...`);
  
  // Click button if specified
  if (scenario.button) {
    try {
      await page.click(scenario.button);
      await page.waitForTimeout(scenario.wait);
    } catch (err) {
      console.error(`   ⚠ Failed to click ${scenario.button}:`, err.message);
      continue;
    }
  }
  
  // Wait for any animations to complete
  await page.waitForTimeout(scenario.wait);
  
  // Capture screenshot
  const filename = `${scenario.name}.png`;
  const filepath = join(OUTPUT_DIR, filename);
  
  try {
    await page.screenshot({
      path: filepath,
      fullPage: false
    });
    console.log(`   ✓ Saved: ${filename}`);
  } catch (err) {
    console.error(`   ✗ Failed to save ${filename}:`, err.message);
  }
}

console.log('\n✨ Screenshot capture complete!');
console.log(`📁 Screenshots saved to: ${OUTPUT_DIR}`);

// Cleanup
await browser.close();
server.kill();

console.log('\n✓ Done\n');
process.exit(0);
