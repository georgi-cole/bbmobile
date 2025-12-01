#!/usr/bin/env node
/**
 * audit-background-assets.js
 * 
 * CLI tool to validate background assets exist on disk
 * Reads from the asset manifest and checks each file
 * 
 * Usage:
 *   node scripts/audit-background-assets.js
 * 
 * Exit codes:
 *   0 - All assets found
 *   1 - One or more assets missing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Colors for console output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log(`${CYAN}=== Background Asset Audit ===${RESET}\n`);

// Asset manifest - should match backgroundTheme.js ASSET_MANIFEST
const ASSETS_BASE = path.join(PROJECT_ROOT, 'assets/skins/');
const ASSET_MANIFEST = [
  'sunrise-background.png',
  'daily-background.png',
  'sunset-background.png',
  'night-background.png',
  'rainy-background.png',
  'night-snow-background.png',
  'snowday-background.png',
  'thunderstorm-background.png',
  'xmas-day-background.png',
  'xmas-eve-background.png',
  'xmasy-night-background.png'
];

// Also check for the manifest JSON file
const manifestPath = path.join(PROJECT_ROOT, 'assets/background-manifest.json');

console.log(`Base path: ${ASSETS_BASE}`);
console.log(`Checking ${ASSET_MANIFEST.length} assets...\n`);

let passed = 0;
let failed = 0;
const errors = [];

// Check each asset
for (const filename of ASSET_MANIFEST) {
  const fullPath = path.join(ASSETS_BASE, filename);
  
  try {
    const stats = fs.statSync(fullPath);
    if (stats.isFile()) {
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`${GREEN}✓${RESET} ${filename} (${sizeKB} KB)`);
      passed++;
    } else {
      console.log(`${RED}✗${RESET} ${filename} (not a file)`);
      failed++;
      errors.push({ filename, error: 'Not a file' });
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`${RED}✗${RESET} ${filename} (not found)`);
      failed++;
      errors.push({ filename, error: 'File not found' });
    } else {
      console.log(`${RED}✗${RESET} ${filename} (error: ${err.message})`);
      failed++;
      errors.push({ filename, error: err.message });
    }
  }
}

console.log('\n' + '─'.repeat(50) + '\n');

// Check manifest JSON
console.log('Checking manifest JSON...');
try {
  const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = JSON.parse(manifestContent);
  const manifestAssets = manifest.assets.map(a => a.filename);
  
  console.log(`${GREEN}✓${RESET} Manifest JSON exists with ${manifestAssets.length} entries`);
  
  // Cross-reference
  const missingInManifest = ASSET_MANIFEST.filter(f => !manifestAssets.includes(f));
  const extraInManifest = manifestAssets.filter(f => !ASSET_MANIFEST.includes(f));
  
  if (missingInManifest.length > 0) {
    console.log(`${YELLOW}⚠${RESET} Assets in code but not in manifest JSON:`);
    missingInManifest.forEach(f => console.log(`   - ${f}`));
  }
  
  if (extraInManifest.length > 0) {
    console.log(`${YELLOW}⚠${RESET} Assets in manifest JSON but not in code:`);
    extraInManifest.forEach(f => console.log(`   - ${f}`));
  }
  
} catch (err) {
  console.log(`${YELLOW}⚠${RESET} Could not read manifest JSON: ${err.message}`);
}

console.log('\n' + '─'.repeat(50) + '\n');

// Summary
console.log(`${CYAN}Summary:${RESET}`);
console.log(`  Total assets: ${ASSET_MANIFEST.length}`);
console.log(`  ${GREEN}Passed:${RESET} ${passed}`);
console.log(`  ${RED}Failed:${RESET} ${failed}`);

if (errors.length > 0) {
  console.log(`\n${RED}Errors:${RESET}`);
  errors.forEach(({ filename, error }) => {
    console.log(`  - ${filename}: ${error}`);
  });
}

console.log('');

// Exit with appropriate code
if (failed > 0) {
  console.log(`${RED}✗ AUDIT FAILED: ${failed} asset(s) missing${RESET}`);
  process.exit(1);
} else {
  console.log(`${GREEN}✓ AUDIT PASSED: All ${passed} assets present${RESET}`);
  process.exit(0);
}
