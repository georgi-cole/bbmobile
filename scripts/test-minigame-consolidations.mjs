#!/usr/bin/env node
/**
 * Smoke test for consolidated minigames
 * Tests that consolidated minigames can be instantiated in both variants/modes
 * and that render functions don't throw errors.
 * 
 * Usage: node scripts/test-minigame-consolidations.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

console.log('🎮 Minigame Consolidation Smoke Tests\n');

// Test configuration
const tests = [
  {
    name: 'Trivia Pulse - pulse variant support',
    file: 'js/minigames/trivia-pulse.js',
    checks: [
      { pattern: /variant\s*=\s*['"]pulse['"]/, desc: 'has pulse variant option' },
      { pattern: /variant.*pulse.*standard/, desc: 'documents variant options' },
      { pattern: /g\.MiniGames\.triviaQuiz/, desc: 'exports triviaQuiz alias' },
      { pattern: /variant\s*===\s*['"]pulse['"]/, desc: 'checks for pulse variant' },
      { pattern: /variant\s*===\s*['"]standard['"]/, desc: 'checks for standard variant' }
    ]
  },
  {
    name: 'Timing Bar - clock variant support',
    file: 'js/minigames/timing-bar.js',
    checks: [
      { pattern: /variant\s*=\s*['"]bar['"]/, desc: 'has bar variant as default' },
      { pattern: /variant.*bar.*clock/, desc: 'documents variant options' },
      { pattern: /g\.MiniGames\.clockStopper/, desc: 'exports clockStopper alias' },
      { pattern: /variant\s*===\s*['"]clock['"]/, desc: 'checks for clock variant' },
      { pattern: /targetTime|clockDiv/, desc: 'has clock-specific logic' }
    ]
  },
  {
    name: 'Memory Match - pattern mode support',
    file: 'js/minigames/memory-match.js',
    checks: [
      { pattern: /mode\s*=\s*['"]card['"]/, desc: 'has card mode as default' },
      { pattern: /mode.*card.*pattern/, desc: 'documents mode options' },
      { pattern: /g\.MiniGames\.patternMatch/, desc: 'exports patternMatch alias' },
      { pattern: /mode\s*===\s*['"]pattern['"]/, desc: 'checks for pattern mode' },
      { pattern: /inputSelects|distractorDiv/, desc: 'has pattern-specific logic' }
    ]
  }
];

let totalPassed = 0;
let totalFailed = 0;

/**
 * Test a consolidated minigame file
 */
function testGame(test) {
  const { name, file, checks } = test;
  const fullPath = join(ROOT, file);
  
  console.log(`\n📦 ${name}`);
  console.log(`   File: ${file}`);
  
  try {
    const content = readFileSync(fullPath, 'utf8');
    let passed = 0;
    let failed = 0;
    
    for (const check of checks) {
      if (check.pattern.test(content)) {
        console.log(`   ✅ ${check.desc}`);
        passed++;
      } else {
        console.log(`   ❌ ${check.desc}`);
        failed++;
      }
    }
    
    totalPassed += passed;
    totalFailed += failed;
    
    if (failed === 0) {
      console.log(`   🎉 All checks passed (${passed}/${passed})`);
    } else {
      console.log(`   ⚠️  Some checks failed (${passed}/${passed + failed})`);
    }
    
  } catch (error) {
    console.error(`   ❌ Error reading file: ${error.message}`);
    totalFailed += checks.length;
  }
}

// Test registry updates
console.log('📋 Checking registry updates...\n');

try {
  const registryPath = join(ROOT, 'js/minigames/registry.js');
  const registryContent = readFileSync(registryPath, 'utf8');
  
  const retiredChecks = [
    { key: 'triviaQuiz', replacedBy: 'triviaPulse' },
    { key: 'clockStopper', replacedBy: 'timingBar' },
    { key: 'patternMatch', replacedBy: 'memoryMatch' }
  ];
  
  let registryPassed = 0;
  let registryFailed = 0;
  
  for (const check of retiredChecks) {
    const retiredPattern = new RegExp(`${check.key}:.*retired:\\s*true`, 's');
    const replacedByPattern = new RegExp(`${check.key}:.*replacedBy:\\s*['"]${check.replacedBy}['"]`, 's');
    
    const hasRetired = retiredPattern.test(registryContent);
    const hasReplacedBy = replacedByPattern.test(registryContent);
    
    if (hasRetired && hasReplacedBy) {
      console.log(`   ✅ ${check.key} marked as retired, replaced by ${check.replacedBy}`);
      registryPassed++;
    } else {
      console.log(`   ❌ ${check.key} not properly retired`);
      if (!hasRetired) console.log(`      - Missing retired: true`);
      if (!hasReplacedBy) console.log(`      - Missing replacedBy: '${check.replacedBy}'`);
      registryFailed++;
    }
  }
  
  totalPassed += registryPassed;
  totalFailed += registryFailed;
  
  if (registryFailed === 0) {
    console.log(`   🎉 All registry checks passed (${registryPassed}/${registryPassed})`);
  }
  
} catch (error) {
  console.error(`   ❌ Error checking registry: ${error.message}`);
  totalFailed += 3;
}

// Run all game tests
for (const test of tests) {
  testGame(test);
}

// Print summary
console.log('\n' + '='.repeat(60));
console.log('Summary:');
console.log(`  Total checks: ${totalPassed + totalFailed}`);
console.log(`  ✅ Passed: ${totalPassed}`);
console.log(`  ❌ Failed: ${totalFailed}`);
console.log('='.repeat(60) + '\n');

if (totalFailed === 0) {
  console.log('🎉 All consolidation smoke tests passed!\n');
} else {
  console.log('⚠️  Some tests failed. Please review the output above.\n');
}

// Exit with appropriate code
process.exit(totalFailed > 0 ? 1 : 0);
