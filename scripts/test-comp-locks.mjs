#!/usr/bin/env node

/**
 * Runtime validation test for comp-locks.js
 * Tests the weekly submission lock functionality
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔒 Testing comp-locks.js functionality...\n');

// Read and evaluate the comp-locks module
const compLocksPath = join(__dirname, '../js/comp-locks.js');
const compLocksCode = readFileSync(compLocksPath, 'utf8');

// Create a minimal global/window mock with localStorage
const localStorageMock = new Map();
const global = {
  localStorage: {
    getItem: (key) => localStorageMock.get(key) || null,
    setItem: (key, value) => localStorageMock.set(key, value),
    removeItem: (key) => localStorageMock.delete(key),
    get length() { return localStorageMock.size; },
    key: (index) => {
      const keys = Array.from(localStorageMock.keys());
      return keys[index] || null;
    }
  },
  console: console
};

// Evaluate the module
try {
  const moduleWrapper = new Function('window', compLocksCode);
  moduleWrapper(global);
} catch (error) {
  console.error('❌ Failed to load comp-locks.js:', error.message);
  process.exit(1);
}

// Test suite
let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ ${description}`);
    passed++;
  } catch (error) {
    console.error(`❌ ${description}: ${error.message}`);
    failed++;
  }
}

// Run tests
console.log('Module Structure Tests:');
test('CompLocks module is defined', () => {
  if (!global.CompLocks) throw new Error('CompLocks not found');
});

test('hasSubmittedThisWeek method exists', () => {
  if (typeof global.CompLocks.hasSubmittedThisWeek !== 'function') {
    throw new Error('hasSubmittedThisWeek not a function');
  }
});

test('lockSubmission method exists', () => {
  if (typeof global.CompLocks.lockSubmission !== 'function') {
    throw new Error('lockSubmission not a function');
  }
});

test('clearWeekLocks method exists', () => {
  if (typeof global.CompLocks.clearWeekLocks !== 'function') {
    throw new Error('clearWeekLocks not a function');
  }
});

test('clearAllLocks method exists', () => {
  if (typeof global.CompLocks.clearAllLocks !== 'function') {
    throw new Error('clearAllLocks not a function');
  }
});

console.log('\nFunctionality Tests:');

// Clear any existing locks
global.CompLocks.clearAllLocks();

test('Initial state is unlocked', () => {
  const isLocked = global.CompLocks.hasSubmittedThisWeek(1, 'hoh', 'quickTap', 1);
  if (isLocked) throw new Error('Should not be locked initially');
});

test('Can lock submission', () => {
  global.CompLocks.lockSubmission(1, 'hoh', 'quickTap', 1);
  const isLocked = global.CompLocks.hasSubmittedThisWeek(1, 'hoh', 'quickTap', 1);
  if (!isLocked) throw new Error('Should be locked after lockSubmission');
});

test('Lock is player-specific', () => {
  const isLocked = global.CompLocks.hasSubmittedThisWeek(1, 'hoh', 'quickTap', 2);
  if (isLocked) throw new Error('Different player should not be locked');
});

test('Lock is week-specific', () => {
  const isLocked = global.CompLocks.hasSubmittedThisWeek(2, 'hoh', 'quickTap', 1);
  if (isLocked) throw new Error('Different week should not be locked');
});

test('Lock is phase-specific', () => {
  const isLocked = global.CompLocks.hasSubmittedThisWeek(1, 'final3_comp1', 'quickTap', 1);
  if (isLocked) throw new Error('Different phase should not be locked');
});

test('Lock is game-specific', () => {
  const isLocked = global.CompLocks.hasSubmittedThisWeek(1, 'hoh', 'memoryMatch', 1);
  if (isLocked) throw new Error('Different game should not be locked');
});

test('clearWeekLocks clears specific week', () => {
  global.CompLocks.lockSubmission(2, 'hoh', 'quickTap', 1);
  global.CompLocks.clearWeekLocks(1);
  const week1Locked = global.CompLocks.hasSubmittedThisWeek(1, 'hoh', 'quickTap', 1);
  const week2Locked = global.CompLocks.hasSubmittedThisWeek(2, 'hoh', 'quickTap', 1);
  if (week1Locked) throw new Error('Week 1 should be unlocked after clearWeekLocks');
  if (!week2Locked) throw new Error('Week 2 should remain locked');
});

test('clearAllLocks clears all locks', () => {
  global.CompLocks.clearAllLocks();
  const week2Locked = global.CompLocks.hasSubmittedThisWeek(2, 'hoh', 'quickTap', 1);
  if (week2Locked) throw new Error('All locks should be cleared');
});

console.log('\nIntegration Tests:');

global.CompLocks.clearAllLocks();

test('Multiple players can be locked independently', () => {
  global.CompLocks.lockSubmission(1, 'hoh', 'quickTap', 1);
  global.CompLocks.lockSubmission(1, 'hoh', 'quickTap', 2);
  global.CompLocks.lockSubmission(1, 'hoh', 'quickTap', 3);
  
  const p1Locked = global.CompLocks.hasSubmittedThisWeek(1, 'hoh', 'quickTap', 1);
  const p2Locked = global.CompLocks.hasSubmittedThisWeek(1, 'hoh', 'quickTap', 2);
  const p3Locked = global.CompLocks.hasSubmittedThisWeek(1, 'hoh', 'quickTap', 3);
  const p4Locked = global.CompLocks.hasSubmittedThisWeek(1, 'hoh', 'quickTap', 4);
  
  if (!p1Locked || !p2Locked || !p3Locked) {
    throw new Error('All locked players should be locked');
  }
  if (p4Locked) {
    throw new Error('Unlocked player should not be locked');
  }
});

test('Final 3 phases are tracked separately', () => {
  global.CompLocks.lockSubmission(5, 'final3_comp1', 'memoryMatch', 1);
  global.CompLocks.lockSubmission(5, 'final3_comp2', 'quickTap', 1);
  global.CompLocks.lockSubmission(5, 'final3_comp3', 'reactionRoyale', 1);
  
  const f3p1 = global.CompLocks.hasSubmittedThisWeek(5, 'final3_comp1', 'memoryMatch', 1);
  const f3p2 = global.CompLocks.hasSubmittedThisWeek(5, 'final3_comp2', 'quickTap', 1);
  const f3p3 = global.CompLocks.hasSubmittedThisWeek(5, 'final3_comp3', 'reactionRoyale', 1);
  
  if (!f3p1 || !f3p2 || !f3p3) {
    throw new Error('All Final 3 phases should be locked independently');
  }
});

test('Backwards compatibility: fails gracefully', () => {
  // Simulate localStorage failure
  const originalGetItem = global.localStorage.getItem;
  global.localStorage.getItem = () => { throw new Error('Storage error'); };
  
  // Should return false (fail open) on error
  const result = global.CompLocks.hasSubmittedThisWeek(1, 'hoh', 'quickTap', 99);
  
  // Restore
  global.localStorage.getItem = originalGetItem;
  
  if (result !== false) {
    throw new Error('Should fail open (return false) on localStorage error');
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!\n');
  process.exit(0);
}
