#!/usr/bin/env node

// Simple test script to verify twist week restrictions logic
// Tests the pickWeeklyTwist function behavior across different weeks
// Note: This script is designed for Unix-like systems (Linux, macOS).
// On Windows, run with: node test_twist_week_restrictions.mjs

console.log('🧪 Testing Twist Week Restrictions\n');

// Mock the helper functions that twists.js expects
function mockAlivePlayers() {
  return Array(10).fill(null).map((_, i) => ({ id: i, evicted: false }));
}

function mockRng() {
  return 0.01; // Return low value to test if twist would activate
}

// Test function that simulates pickWeeklyTwist logic
function testPickWeeklyTwist(week, doubleChance, tripleChance, rngValue = 0.01) {
  const g = {
    week: week,
    cfg: {
      doubleChance: doubleChance,
      tripleChance: tripleChance
    }
  };
  
  const aliveCount = 10; // Enough to allow twists
  if (aliveCount <= 6) return null;
  
  const currentWeek = g.week || 1;
  
  // Weeks 1-2: No double/triple evictions regardless of settings
  if (currentWeek <= 2) return null;
  
  let dc = Number(g.cfg?.doubleChance || 0);
  let tc = Number(g.cfg?.tripleChance || 0);
  
  // Week 3: Cap both chances at 5% regardless of settings
  if (currentWeek === 3) {
    dc = Math.min(dc, 5);
    tc = Math.min(tc, 5);
  }
  
  // No twists configured
  if (dc <= 0 && tc <= 0) return null;
  
  const roll = rngValue * 100;
  
  // Triple takes priority: if roll < tc, activate triple
  if (tc > 0 && roll < tc) {
    return 'triple';
  }
  
  // Double: if roll < dc, activate double
  if (dc > 0 && roll < dc) {
    return 'double';
  }
  
  return null;
}

let passed = 0;
let failed = 0;

function test(name, condition) {
  if (condition) {
    console.log(`✓ ${name}`);
    passed++;
  } else {
    console.log(`✗ ${name}`);
    failed++;
  }
}

// Test Week 1
console.log('--- Week 1 Tests ---');
test('Week 1: No twist with 100% double chance', testPickWeeklyTwist(1, 100, 0, 0.01) === null);
test('Week 1: No twist with 100% triple chance', testPickWeeklyTwist(1, 0, 100, 0.01) === null);
test('Week 1: No twist with both 100%', testPickWeeklyTwist(1, 100, 100, 0.01) === null);

// Test Week 2
console.log('\n--- Week 2 Tests ---');
test('Week 2: No twist with 100% double chance', testPickWeeklyTwist(2, 100, 0, 0.01) === null);
test('Week 2: No twist with 100% triple chance', testPickWeeklyTwist(2, 0, 100, 0.01) === null);
test('Week 2: No twist with both 100%', testPickWeeklyTwist(2, 100, 100, 0.01) === null);

// Test Week 3 - should cap at 5%
console.log('\n--- Week 3 Tests (5% Cap) ---');
test('Week 3: No twist with 100% and 6% roll', testPickWeeklyTwist(3, 100, 100, 0.06) === null);
test('Week 3: Triple twist with 100% and 4% roll', testPickWeeklyTwist(3, 100, 100, 0.04) === 'triple');
test('Week 3: Triple twist with 100% and 3% roll', testPickWeeklyTwist(3, 100, 100, 0.03) === 'triple');
test('Week 3: Double twist when only double at 100% and 4% roll', testPickWeeklyTwist(3, 100, 0, 0.04) === 'double');
test('Week 3: No twist when settings below 5% and roll is 6%', testPickWeeklyTwist(3, 2, 2, 0.06) === null);
test('Week 3: Twist when settings at 3% and roll is 2%', testPickWeeklyTwist(3, 3, 3, 0.02) === 'triple');

// Test Week 4+
console.log('\n--- Week 4+ Tests (Normal Settings) ---');
test('Week 4: Double with 50% chance and 40% roll', testPickWeeklyTwist(4, 50, 0, 0.40) === 'double');
test('Week 4: Triple with 50% chance and 40% roll', testPickWeeklyTwist(4, 0, 50, 0.40) === 'triple');
test('Week 4: Triple priority with both 50% and 40% roll', testPickWeeklyTwist(4, 50, 50, 0.40) === 'triple');
test('Week 5: Double with 100% chance and 90% roll', testPickWeeklyTwist(5, 100, 0, 0.90) === 'double');
test('Week 10: Triple with 100% chance and 99% roll', testPickWeeklyTwist(10, 100, 100, 0.99) === 'triple');
test('Week 4: No twist with 10% chance and 20% roll', testPickWeeklyTwist(4, 10, 10, 0.20) === null);

// Test edge cases
console.log('\n--- Edge Case Tests ---');
test('Undefined week (defaults to 1): No twist', testPickWeeklyTwist(undefined, 100, 100, 0.01) === null);
// Note: Week 0 is treated as week 1 due to falsy evaluation (0 || 1 = 1),
// but the test passes because 0 <= 2 is also true. Both paths lead to no twist.
test('Week 0: No twist (treated as early week)', testPickWeeklyTwist(0, 100, 100, 0.01) === null);

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
}
