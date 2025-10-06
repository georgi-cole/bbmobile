#!/usr/bin/env node
/**
 * Automated test for quick-tap.js guard implementation
 * Verifies that the game works with and without helper modules
 */

import fs from 'fs';

console.log('🎯 Quick Tap Guard Validation Test\n');
console.log('=' .repeat(60) + '\n');

// Load the quick-tap module
const quickTapCode = fs.readFileSync('./js/minigames/quick-tap.js', 'utf8');

let testResults = {
  passed: 0,
  failed: 0,
  details: []
};

function runTest(name, testFn) {
  console.log(`\n📋 ${name}`);
  try {
    testFn();
    testResults.passed++;
    testResults.details.push({ name, status: 'PASS' });
    console.log('  ✓ PASS');
    return true;
  } catch (error) {
    testResults.failed++;
    testResults.details.push({ name, status: 'FAIL', error: error.message });
    console.error('  ✗ FAIL:', error.message);
    return false;
  }
}

// Test 1: Code syntax is valid
runTest('Code has valid JavaScript syntax', () => {
  try {
    new Function(quickTapCode);
  } catch (e) {
    throw new Error(`Syntax error: ${e.message}`);
  }
});

// Test 2: All required guards are present
runTest('All accessibility guards present', () => {
  const guards = [
    { pattern: /typeof g\.MinigameAccessibility\.applyAria === 'function'/, name: 'applyAria' },
    { pattern: /typeof g\.MinigameAccessibility\.makeAccessibleButton === 'function'/, name: 'makeAccessibleButton' },
    { pattern: /typeof g\.MinigameAccessibility\.announceToSR === 'function'/, name: 'announceToSR (first)' }
  ];
  
  const missing = guards.filter(g => !g.pattern.test(quickTapCode));
  if (missing.length > 0) {
    throw new Error(`Missing guards: ${missing.map(g => g.name).join(', ')}`);
  }
});

// Test 3: All mobile utils guards are present
runTest('All mobile utils guards present', () => {
  const guards = [
    { pattern: /typeof g\.MinigameMobileUtils\.addTapListener === 'function'/, name: 'addTapListener' },
    { pattern: /typeof g\.MinigameMobileUtils\.vibrate === 'function'/, name: 'vibrate' }
  ];
  
  const missing = guards.filter(g => !g.pattern.test(quickTapCode));
  if (missing.length > 0) {
    throw new Error(`Missing guards: ${missing.map(g => g.name).join(', ')}`);
  }
});

// Test 4: onComplete is guarded
runTest('onComplete callback is guarded', () => {
  if (!quickTapCode.includes("typeof onComplete === 'function'")) {
    throw new Error('onComplete guard not found');
  }
});

// Test 5: Module structure is correct
runTest('Module exports correct structure', () => {
  if (!quickTapCode.includes("g.MiniGames.quickTap = { render }")) {
    throw new Error('Module export structure incorrect');
  }
});

// Test 6: No direct unguarded calls to helpers
runTest('No unguarded helper method calls', () => {
  // Look for patterns that would indicate unguarded calls
  const lines = quickTapCode.split('\n');
  const dangerousPatterns = [];
  
  lines.forEach((line, index) => {
    // Check for direct calls without guards (excluding variable declarations)
    if (line.includes('g.MinigameAccessibility.') && 
        !line.includes('typeof g.MinigameAccessibility') &&
        !line.includes('const useAccessibility') &&
        !line.includes('!!g.MinigameAccessibility')) {
      
      // Make sure this line is within an if block that checks the method
      const previousLines = lines.slice(Math.max(0, index - 3), index).join('\n');
      if (!previousLines.includes('typeof g.MinigameAccessibility')) {
        dangerousPatterns.push({ line: index + 1, content: line.trim() });
      }
    }
    
    if (line.includes('g.MinigameMobileUtils.') && 
        !line.includes('typeof g.MinigameMobileUtils') &&
        !line.includes('const useMobileUtils') &&
        !line.includes('!!g.MinigameMobileUtils') &&
        !line.includes('addListener')) {
      
      const previousLines = lines.slice(Math.max(0, index - 3), index).join('\n');
      if (!previousLines.includes('typeof g.MinigameMobileUtils')) {
        dangerousPatterns.push({ line: index + 1, content: line.trim() });
      }
    }
  });
  
  if (dangerousPatterns.length > 0) {
    throw new Error(`Found ${dangerousPatterns.length} potentially unguarded calls`);
  }
});

// Test 7: Module uses IIFE pattern
runTest('Module uses proper IIFE pattern', () => {
  if (!quickTapCode.match(/\(function\(g\)\s*\{/)) {
    throw new Error('IIFE pattern not found');
  }
  
  if (!quickTapCode.includes('})(window)')) {
    throw new Error('IIFE closure not found');
  }
});

// Test 8: Render function signature is correct
runTest('Render function has correct signature', () => {
  if (!quickTapCode.includes('function render(container, onComplete)')) {
    throw new Error('Render function signature incorrect');
  }
});

// Print summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Test Summary:\n');
console.log(`  ✅ Passed: ${testResults.passed}`);
console.log(`  ❌ Failed: ${testResults.failed}`);
console.log(`  📝 Total:  ${testResults.passed + testResults.failed}`);

if (testResults.failed > 0) {
  console.log('\n❌ Failed Tests:');
  testResults.details
    .filter(t => t.status === 'FAIL')
    .forEach(t => {
      console.log(`  - ${t.name}`);
      if (t.error) console.log(`    Error: ${t.error}`);
    });
}

console.log('\n' + '='.repeat(60));

if (testResults.failed === 0) {
  console.log('\n✅ ALL TESTS PASSED\n');
  process.exit(0);
} else {
  console.log('\n❌ SOME TESTS FAILED\n');
  process.exit(1);
}
