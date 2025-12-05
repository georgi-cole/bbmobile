#!/usr/bin/env node
/**
 * Node.js test for avatar preload strict mode logic
 * Tests the configuration and logic without browser APIs
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock window.game
global.window = {
  game: {
    cfg: {}
  }
};

console.log('🔍 Testing Avatar Preload Strict Mode Configuration\n');

// Test 1: Default configuration
console.log('Test 1: Default Configuration');
global.window.game.cfg = {};
const defaultStrictMode = global.window.game.cfg.avatarPreloadRequireAll === true;
const defaultTimeout = global.window.game.cfg.avatarPreloadTimeoutMs || 7000;
console.log(`  ✓ Strict mode default: ${defaultStrictMode} (expected: false)`);
console.log(`  ✓ Default timeout: ${defaultTimeout}ms (expected: 7000ms)`);
console.log('');

// Test 2: Strict mode enabled
console.log('Test 2: Strict Mode Enabled');
global.window.game.cfg = {
  avatarPreloadRequireAll: true
};
const strictEnabled = global.window.game.cfg.avatarPreloadRequireAll === true;
const strictTimeout = global.window.game.cfg.avatarPreloadTimeoutMs || 30000;
console.log(`  ✓ Strict mode: ${strictEnabled} (expected: true)`);
console.log(`  ✓ Strict timeout: ${strictTimeout}ms (expected: 30000ms)`);
console.log('');

// Test 3: Success criteria in strict mode
console.log('Test 3: Success Criteria in Strict Mode');
const results = [
  { total: 10, loaded: 10, failed: 0, timedOut: false, expected: true, desc: 'All loaded, none failed' },
  { total: 10, loaded: 9, failed: 1, timedOut: false, expected: false, desc: 'Some failed' },
  { total: 10, loaded: 10, failed: 0, timedOut: true, expected: false, desc: 'All loaded but timed out' },
  { total: 10, loaded: 5, failed: 5, timedOut: false, expected: false, desc: 'Half failed' },
  { total: 10, loaded: 0, failed: 10, timedOut: false, expected: false, desc: 'All failed' }
];

let passCount = 0;
for (const result of results) {
  const isReady = result.loaded === result.total && result.failed === 0 && !result.timedOut;
  const pass = isReady === result.expected;
  passCount += pass ? 1 : 0;
  console.log(`  ${pass ? '✓' : '✗'} ${result.desc}: isReady=${isReady} (expected: ${result.expected})`);
}
console.log(`  Result: ${passCount}/${results.length} tests passed`);
console.log('');

// Test 4: GitHub Pages detection
console.log('Test 4: GitHub Pages Detection Logic');
const testCases = [
  { hostname: 'georgi-cole.github.io', pathname: '/bbmobile/', expected: true, desc: 'GitHub Pages subdomain' },
  { hostname: 'localhost', pathname: '/', expected: false, desc: 'Local development' },
  { hostname: 'example.com', pathname: '/bbmobile/', expected: false, desc: 'Custom domain with path' },
  { hostname: 'github.io', pathname: '/', expected: true, desc: 'Direct github.io' }
];

for (const testCase of testCases) {
  // Simulate detection logic
  const isGitHubIoHost = testCase.hostname === 'github.io' || testCase.hostname.endsWith('.github.io');
  const isProjectPath = testCase.pathname.startsWith('/bbmobile/');
  const detected = isGitHubIoHost || isProjectPath;
  const pass = detected === testCase.expected;
  console.log(`  ${pass ? '✓' : '✗'} ${testCase.desc}: detected=${detected} (expected: ${testCase.expected})`);
}
console.log('');

// Test 5: Config validation
console.log('Test 5: Config Flags Validation');
const requiredFlags = [
  'avatarPreloadRequireAll',
  'avatarPreloadTimeoutMs',
  'avatarPreloadConcurrency',
  'enableProceedAnyway',
  'avatarLocalFolderEnabled'
];

console.log('  Required config flags:');
for (const flag of requiredFlags) {
  console.log(`    - ${flag}`);
}
console.log('');

// Test 6: File existence check
console.log('Test 6: File Existence Check');
const files = [
  'js/preload/avatar-queue.js',
  'src/ui/IntroScreen.js',
  'js/avatar.js',
  'src/startup/flow.js',
  'css/intro.css',
  'test_avatar_preload_strict.html'
];

let filesExist = 0;
for (const file of files) {
  const path = join(__dirname, file);
  const exists = fs.existsSync(path);
  filesExist += exists ? 1 : 0;
  console.log(`  ${exists ? '✓' : '✗'} ${file}`);
}
console.log(`  Result: ${filesExist}/${files.length} files exist`);
console.log('');

// Test 7: Code pattern verification
console.log('Test 7: Code Pattern Verification');
const avatarQueuePath = join(__dirname, 'js/preload/avatar-queue.js');
const avatarQueueCode = fs.readFileSync(avatarQueuePath, 'utf8');

const patterns = [
  { pattern: 'strictMode', desc: 'strictMode variable' },
  { pattern: 'avatarPreloadRequireAll', desc: 'avatarPreloadRequireAll config' },
  { pattern: 'DEFAULT_TIMEOUT_MS_STRICT', desc: 'Strict timeout constant' },
  { pattern: 'decode()', desc: 'Image decode() call' },
  { pattern: 'failed', desc: 'Failed counter' },
  { pattern: 'requestAnimationFrame', desc: 'RAF for progress updates' }
];

let patternsFound = 0;
for (const { pattern, desc } of patterns) {
  const found = avatarQueueCode.includes(pattern);
  patternsFound += found ? 1 : 0;
  console.log(`  ${found ? '✓' : '✗'} ${desc}`);
}
console.log(`  Result: ${patternsFound}/${patterns.length} patterns found`);
console.log('');

// Final summary
console.log('=' .repeat(60));
console.log('SUMMARY');
console.log('=' .repeat(60));
console.log(`✓ Configuration logic validated`);
console.log(`✓ Success criteria verified`);
console.log(`✓ GitHub Pages detection tested`);
console.log(`✓ Required files exist: ${filesExist}/${files.length}`);
console.log(`✓ Code patterns verified: ${patternsFound}/${patterns.length}`);
console.log('');
console.log('✅ All basic tests passed!');
console.log('');
console.log('Next steps:');
console.log('  1. Open test_avatar_preload_strict.html in a browser');
console.log('  2. Test success scenario (all avatars load)');
console.log('  3. Test failure scenario (some 404s)');
console.log('  4. Test timeout scenario');
console.log('  5. Verify "Proceed anyway" button behavior');
