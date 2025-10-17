/**
 * Tests for Competition Results Contract
 * Run with: node types/test-competition-results.mjs
 */

import { 
  isCompetitionResult, 
  createCompetitionResult 
} from './dist/competition-results.js';

// Test utilities
let testCount = 0;
let passCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message || 'Expected true');
  }
}

function assertFalse(value, message) {
  if (value) {
    throw new Error(message || 'Expected false');
  }
}

console.log('=== Competition Results Contract Tests ===\n');

// Test 1: Valid POV result
test('Valid POV result passes type guard', () => {
  const result = {
    kind: 'POV',
    winnerId: 42
  };
  assertTrue(isCompetitionResult(result));
});

// Test 2: Valid HOH result
test('Valid HOH result passes type guard', () => {
  const result = {
    kind: 'HOH',
    winnerId: 17
  };
  assertTrue(isCompetitionResult(result));
});

// Test 3: Valid OTHER result
test('Valid OTHER result passes type guard', () => {
  const result = {
    kind: 'OTHER',
    winnerId: 99
  };
  assertTrue(isCompetitionResult(result));
});

// Test 4: Result with finalists
test('Result with finalists is valid', () => {
  const result = {
    kind: 'POV',
    winnerId: 42,
    finalists: [
      { id: 42, score: 95.5, name: 'Alice' },
      { id: 17, score: 88.2, name: 'Bob' }
    ]
  };
  assertTrue(isCompetitionResult(result));
});

// Test 5: Result with participants
test('Result with participants is valid', () => {
  const result = {
    kind: 'HOH',
    winnerId: 17,
    participants: [
      { id: 17, score: 92, name: 'Bob' },
      { id: 42, score: 89, name: 'Alice' },
      { id: 8, score: 85, name: 'Dave' }
    ]
  };
  assertTrue(isCompetitionResult(result));
});

// Test 6: Result with metadata
test('Result with metadata is valid', () => {
  const result = {
    kind: 'POV',
    winnerId: 42,
    metadata: {
      difficulty: 'hard',
      duration: 120
    }
  };
  assertTrue(isCompetitionResult(result));
});

// Test 7: String winnerId
test('String winnerId is valid', () => {
  const result = {
    kind: 'HOH',
    winnerId: 'player-123'
  };
  assertTrue(isCompetitionResult(result));
});

// Test 8: Invalid - missing kind
test('Missing kind fails type guard', () => {
  const result = {
    winnerId: 42
  };
  assertFalse(isCompetitionResult(result));
});

// Test 9: Invalid - missing winnerId
test('Missing winnerId fails type guard', () => {
  const result = {
    kind: 'POV'
  };
  assertFalse(isCompetitionResult(result));
});

// Test 10: Invalid - null winnerId
test('Null winnerId fails type guard', () => {
  const result = {
    kind: 'POV',
    winnerId: null
  };
  assertFalse(isCompetitionResult(result));
});

// Test 11: Invalid - undefined winnerId
test('Undefined winnerId fails type guard', () => {
  const result = {
    kind: 'HOH',
    winnerId: undefined
  };
  assertFalse(isCompetitionResult(result));
});

// Test 12: Invalid kind
test('Invalid kind fails type guard', () => {
  const result = {
    kind: 'INVALID',
    winnerId: 42
  };
  assertFalse(isCompetitionResult(result));
});

// Test 13: Invalid - null value
test('Null value fails type guard', () => {
  assertFalse(isCompetitionResult(null));
});

// Test 14: Invalid - non-object
test('Non-object fails type guard', () => {
  assertFalse(isCompetitionResult('not an object'));
  assertFalse(isCompetitionResult(123));
  assertFalse(isCompetitionResult(true));
});

// Test 15: Invalid - finalists not array
test('Non-array finalists fails type guard', () => {
  const result = {
    kind: 'POV',
    winnerId: 42,
    finalists: 'not an array'
  };
  assertFalse(isCompetitionResult(result));
});

// Test 16: Invalid - participants not array
test('Non-array participants fails type guard', () => {
  const result = {
    kind: 'HOH',
    winnerId: 17,
    participants: { id: 17 }
  };
  assertFalse(isCompetitionResult(result));
});

// Test 17: createCompetitionResult helper - basic
test('createCompetitionResult creates valid result', () => {
  const result = createCompetitionResult('POV', 42);
  assertTrue(isCompetitionResult(result));
  assertEquals(result.kind, 'POV');
  assertEquals(result.winnerId, 42);
});

// Test 18: createCompetitionResult with options
test('createCompetitionResult with options works', () => {
  const finalists = [
    { id: 42, score: 95, name: 'Alice' },
    { id: 17, score: 88, name: 'Bob' }
  ];
  const result = createCompetitionResult('HOH', 42, { finalists });
  assertTrue(isCompetitionResult(result));
  assertEquals(result.finalists.length, 2);
  assertEquals(result.finalists[0].id, 42);
});

// Test 19: createCompetitionResult with all options
test('createCompetitionResult with all options works', () => {
  const finalists = [{ id: 42, score: 95, name: 'Alice' }];
  const participants = [
    { id: 42, score: 95, name: 'Alice' },
    { id: 17, score: 88, name: 'Bob' }
  ];
  const metadata = { difficulty: 'hard' };
  
  const result = createCompetitionResult('OTHER', 42, {
    finalists,
    participants,
    metadata
  });
  
  assertTrue(isCompetitionResult(result));
  assertEquals(result.finalists.length, 1);
  assertEquals(result.participants.length, 2);
  assertEquals(result.metadata.difficulty, 'hard');
});

// Test 20: Empty arrays are valid
test('Empty finalists array is valid', () => {
  const result = {
    kind: 'POV',
    winnerId: 42,
    finalists: []
  };
  assertTrue(isCompetitionResult(result));
});

console.log('\n=== Test Summary ===');
console.log(`Total tests: ${testCount}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${testCount - passCount}`);

if (passCount === testCount) {
  console.log('\n✓ All tests passed!');
  process.exit(0);
} else {
  console.log('\n✗ Some tests failed');
  process.exit(1);
}
