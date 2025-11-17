#!/usr/bin/env node

/**
 * Verification script for fast-forward feature implementation
 * Checks for presence of required functions and configuration
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('=== Fast-Forward Implementation Verification ===\n');

const checks = [];
let passCount = 0;
let failCount = 0;

function check(name, condition, details = '') {
  checks.push({ name, pass: condition, details });
  if (condition) {
    passCount++;
    console.log(`✓ ${name}`);
  } else {
    failCount++;
    console.log(`✗ ${name}`);
  }
  if (details) {
    console.log(`  ${details}`);
  }
}

// Check 1: state.js has fast-forward configuration
console.log('Checking state.js...');
const stateFile = readFileSync(join(rootDir, 'js/state.js'), 'utf8');
check(
  'Fast-forward config in game.cfg',
  stateFile.includes('fastForwardEnabled') &&
  stateFile.includes('fastForwardMultiplier') &&
  stateFile.includes('fastForwardMinDuration') &&
  stateFile.includes('fastForwardMaxDuration')
);
check(
  'Fast-forward runtime state flags',
  stateFile.includes('__ffActive') && stateFile.includes('__ffMultiplier')
);
check(
  'normalizeDuration function',
  stateFile.includes('function normalizeDuration')
);
check(
  'activateFastForward function',
  stateFile.includes('function activateFastForward')
);
check(
  'deactivateFastForward function',
  stateFile.includes('function deactivateFastForward')
);

// Check 2: CardManager has acceleration support
console.log('\nChecking CardManager.js...');
const cardManagerFile = readFileSync(join(rootDir, 'js/ui/CardManager.js'), 'utf8');
check(
  'CardManager timeout metadata tracking',
  cardManagerFile.includes('__pendingTimeoutData')
);
check(
  'CardManager acceleratePendingTimeouts method',
  cardManagerFile.includes('acceleratePendingTimeouts')
);
check(
  'CardManager drainer supports fast-forward',
  cardManagerFile.includes('game.__ffActive') || cardManagerFile.includes('isFastForward')
);

// Check 3: tv-cards.js uses normalizeDuration
console.log('\nChecking tv-cards.js...');
const tvCardsFile = readFileSync(join(rootDir, 'js/ui/tv-cards.js'), 'utf8');
check(
  'showTVCard uses normalizeDuration',
  tvCardsFile.includes('normalizeDuration') &&
  tvCardsFile.match(/showTVCard[\s\S]*?normalizeDuration/)
);
check(
  'showTVCardWithAvatars uses normalizeDuration',
  tvCardsFile.match(/showTVCardWithAvatars[\s\S]*?normalizeDuration/)
);

// Check 4: ui.hud-and-router.js integrates fast-forward
console.log('\nChecking ui.hud-and-router.js...');
const hudFile = readFileSync(join(rootDir, 'js/ui.hud-and-router.js'), 'utf8');
check(
  'fastForwardPhase calls activateFastForward',
  hudFile.includes('activateFastForward')
);
check(
  'fastForwardPhase calls deactivateFastForward',
  hudFile.includes('deactivateFastForward')
);
check(
  'fastForwardPhase checks __ffActive',
  hudFile.includes('game.__ffActive')
);

// Check 5: tv-skip.js has updated label
console.log('\nChecking tv-skip.js...');
const tvSkipFile = readFileSync(join(rootDir, 'js/tv-skip.js'), 'utf8');
check(
  'Skip button updated to FFWD',
  tvSkipFile.includes('FFWD') || tvSkipFile.includes('Fast-Forward')
);

// Check 6: Test file exists
console.log('\nChecking test files...');
try {
  readFileSync(join(rootDir, 'test_fast_forward_sequences.html'), 'utf8');
  check('test_fast_forward_sequences.html exists', true);
} catch (e) {
  check('test_fast_forward_sequences.html exists', false, 'File not found');
}

// Summary
console.log('\n=== Verification Summary ===');
console.log(`Total checks: ${checks.length}`);
console.log(`✓ Passed: ${passCount}`);
console.log(`✗ Failed: ${failCount}`);

if (failCount === 0) {
  console.log('\n✅ VERIFICATION PASSED');
  console.log('All required fast-forward components are present');
  process.exit(0);
} else {
  console.log('\n❌ VERIFICATION FAILED');
  console.log('Some required components are missing or incomplete');
  process.exit(1);
}
